#!/usr/bin/env python3
"""
Properly decrypt Chrome macOS cookies and use them to sniff Meesho category API.
Uses the correct Chrome macOS encryption: PBKDF2 + AES-128-CBC.
"""

import sqlite3
import subprocess
import hashlib
import hmac
import json
import os
import sys
import struct
import shutil
from pathlib import Path

# Try to import crypto libs
try:
    from Crypto.Cipher import AES
    from Crypto.Protocol.KDF import PBKDF2
    CRYPTO_AVAILABLE = True
except ImportError:
    try:
        from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
        from cryptography.hazmat.primitives import hashes, padding
        from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
        from cryptography.hazmat.backends import default_backend
        CRYPTO_AVAILABLE = True
        USE_CRYPTOGRAPHY_LIB = True
    except ImportError:
        CRYPTO_AVAILABLE = False
        USE_CRYPTOGRAPHY_LIB = False

OUTPUT_DIR = Path('./meesho_output')
OUTPUT_DIR.mkdir(exist_ok=True)


def get_chrome_key():
    """Get Chrome Safe Storage key from macOS Keychain."""
    try:
        result = subprocess.run(
            ['security', 'find-generic-password', '-wa', 'Chrome Safe Storage'],
            capture_output=True, text=True
        )
        key = result.stdout.strip()
        if key:
            return key
    except Exception:
        pass
    
    # Fallback
    try:
        result = subprocess.run(
            ['security', 'find-generic-password', '-wa', 'Chrome'],
            capture_output=True, text=True
        )
        key = result.stdout.strip()
        if key:
            return key
    except Exception:
        pass
    
    return None


def decrypt_value(encrypted_value: bytes, key: bytes) -> str:
    """Decrypt Chrome cookie value using AES-128-CBC."""
    if not encrypted_value:
        return ''
    
    # Check for v10/v11 prefix
    if len(encrypted_value) < 3:
        return encrypted_value.decode('utf-8', errors='replace')
    
    prefix = encrypted_value[:3]
    if prefix not in (b'v10', b'v11'):
        # Try plain text
        return encrypted_value.decode('utf-8', errors='replace')
    
    payload = encrypted_value[3:]
    iv = b' ' * 16  # Chrome uses 16 spaces as IV
    
    try:
        if 'USE_CRYPTOGRAPHY_LIB' in globals() and USE_CRYPTOGRAPHY_LIB:
            cipher = Cipher(
                algorithms.AES(key),
                modes.CBC(iv),
                backend=default_backend()
            )
            decryptor = cipher.decryptor()
            decrypted = decryptor.update(payload) + decryptor.finalize()
            # Remove PKCS7 padding
            pad_len = decrypted[-1]
            if pad_len <= 16:
                decrypted = decrypted[:-pad_len]
            return decrypted.decode('utf-8', errors='replace')
        else:
            from Crypto.Cipher import AES as _AES
            cipher = _AES.new(key, _AES.MODE_CBC, iv)
            decrypted = cipher.decrypt(payload)
            # Remove PKCS7 padding
            pad_len = decrypted[-1]
            if pad_len <= 16:
                decrypted = decrypted[:-pad_len]
            return decrypted.decode('utf-8', errors='replace')
    except Exception as e:
        return f'<decrypt_error: {e}>'


def derive_key(password: str) -> bytes:
    """Derive AES key from Chrome Safe Storage password."""
    salt = b'saltysalt'
    iterations = 1003
    key_length = 16
    
    if 'USE_CRYPTOGRAPHY_LIB' in globals() and USE_CRYPTOGRAPHY_LIB:
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA1(),
            length=key_length,
            salt=salt,
            iterations=iterations,
            backend=default_backend()
        )
        return kdf.derive(password.encode('utf-8'))
    else:
        return PBKDF2(
            password.encode('utf-8'),
            salt,
            dkLen=key_length,
            count=iterations,
            prf=lambda p, s: hmac.new(p, s, hashlib.sha1).digest()
        )


def main():
    print('=' * 60)
    print('Meesho Cookie Decryptor')
    print('=' * 60)
    
    if not CRYPTO_AVAILABLE:
        print('ERROR: No crypto library available.')
        print('Install one of:')
        print('  pip install pycryptodome')
        print('  pip install cryptography')
        sys.exit(1)
    
    # Get Chrome encryption key
    print('\n[1/4] Getting Chrome Safe Storage key from macOS Keychain...')
    password = get_chrome_key()
    if not password:
        print('ERROR: Could not get Chrome key from Keychain')
        sys.exit(1)
    print(f'      Key obtained (length: {len(password)})')
    
    # Derive AES key
    print('\n[2/4] Deriving AES encryption key...')
    key = derive_key(password)
    print(f'      Key derived: {key.hex()}')
    
    # Connect to Chrome cookie DB
    print('\n[3/4] Reading Chrome cookie database...')
    db_copy = OUTPUT_DIR / 'chrome_cookies_copy.db'
    
    if not db_copy.exists():
        # Copy fresh
        chrome_db = Path.home() / 'Library/Application Support/Google/Chrome/Default/Cookies'
        shutil.copy2(chrome_db, db_copy)
        print(f'      Copied DB from {chrome_db}')
    
    conn = sqlite3.connect(str(db_copy))
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT name, encrypted_value, host_key, path, expires_utc, 
               is_secure, is_httponly, samesite, value
        FROM cookies
        WHERE host_key LIKE '%meesho%' OR host_key LIKE '%supplier%'
        ORDER BY host_key, name
    """)
    
    rows = cursor.fetchall()
    conn.close()
    print(f'      Found {len(rows)} Meesho cookies')
    
    # Decrypt all cookies
    print('\n[4/4] Decrypting cookies...\n')
    
    cookies = []
    playwright_cookies = []
    
    for name, enc_val, host, path_val, expires, is_secure, is_httponly, samesite, plain_val in rows:
        value = plain_val or ''
        
        if not value and enc_val:
            value = decrypt_value(enc_val, key)
        
        cookies.append({
            'name': name,
            'value': value,
            'domain': host,
            'path': path_val,
            'secure': bool(is_secure),
            'httpOnly': bool(is_httponly),
        })
        
        # Playwright format
        playwright_cookies.append({
            'name': name,
            'value': value,
            'domain': host.lstrip('.'),
            'path': path_val,
            'secure': bool(is_secure),
            'httpOnly': bool(is_httponly),
            'sameSite': 'Lax' if samesite == 1 else ('Strict' if samesite == 2 else 'None'),
        })
        
        display = value[:80] + ('...' if len(value) > 80 else '')
        marker = '🔑' if name in ('connect.sid', '_session', 'token', 'auth') else '  '
        print(f'  {marker} {name}: {display}')
    
    # Save files
    cookies_file = OUTPUT_DIR / 'meesho_cookies_clean.json'
    playwright_file = OUTPUT_DIR / 'meesho_cookies_playwright.json'
    
    with open(cookies_file, 'w') as f:
        json.dump(cookies, f, indent=2)
    
    with open(playwright_file, 'w') as f:
        json.dump(playwright_cookies, f, indent=2)
    
    print(f'\n✅ Saved {len(cookies)} decrypted cookies to:')
    print(f'   {cookies_file}')
    print(f'   {playwright_file}')
    
    # Check session cookie
    session = next((c for c in cookies if c['name'] == 'connect.sid'), None)
    if session and session['value']:
        print(f'\n✅ Session cookie found: connect.sid = {session["value"][:60]}...')
    else:
        print('\n⚠️  No session cookie found — not logged in on Chrome Default profile')
    
    # Build cookie header string for raw HTTP requests
    cookie_header = '; '.join(f"{c['name']}={c['value']}" for c in cookies if c['value'] and 'meesho.com' in c['domain'])
    header_file = OUTPUT_DIR / 'cookie_header.txt'
    with open(header_file, 'w') as f:
        f.write(cookie_header)
    print(f'\n✅ Cookie header string saved to {header_file}')


if __name__ == '__main__':
    main()
