#!/usr/bin/env node
/**
 * Decrypt Chrome cookies on macOS using the Keychain encryption key.
 * Chrome on macOS encrypts cookie values using AES-128-CBC with a key 
 * derived from the "Chrome Safe Storage" keychain entry.
 */

const { execSync, spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = './meesho_output';

// Get Chrome encryption key from macOS Keychain
function getChromeSafeStorageKey() {
  try {
    const result = execSync(
      'security find-generic-password -wa "Chrome Safe Storage"',
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    );
    return result.trim();
  } catch (e) {
    // Try with Chrome
    try {
      const result = execSync(
        'security find-generic-password -wa "Chrome" -s "Chrome Safe Storage"',
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
      );
      return result.trim();
    } catch (e2) {
      console.error('Could not get Chrome Safe Storage key from Keychain');
      console.error('You may need to allow access when prompted');
      return null;
    }
  }
}

// Derive AES key from Chrome password
function deriveKey(password) {
  // Chrome uses PBKDF2 with SHA1, 1003 iterations, salt='saltysalt', key length 16
  return crypto.pbkdf2Sync(
    Buffer.from(password, 'utf-8'),
    Buffer.from('saltysalt'),
    1003,
    16,
    'sha1'
  );
}

// Decrypt a Chrome cookie value
function decryptCookie(encryptedValue, key) {
  if (!encryptedValue || !Buffer.isBuffer(encryptedValue)) {
    return null;
  }
  
  const encBuf = Buffer.isBuffer(encryptedValue) ? encryptedValue : Buffer.from(encryptedValue);
  
  // Check for 'v10' or 'v11' prefix
  const prefix = encBuf.slice(0, 3).toString();
  if (prefix !== 'v10' && prefix !== 'v11') {
    // Not encrypted or different format
    return encBuf.toString('utf-8');
  }
  
  try {
    const iv = Buffer.alloc(16, ' ');
    const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
    const payload = encBuf.slice(3);
    let decrypted = decipher.update(payload);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf-8');
  } catch (e) {
    return null;
  }
}

async function main() {
  console.log('Getting Chrome Safe Storage key from macOS Keychain...');
  console.log('(If prompted, click "Always Allow" to grant access)\n');
  
  const password = getChromeSafeStorageKey();
  if (!password) {
    console.error('Failed to get encryption key. Cannot decrypt cookies.');
    process.exit(1);
  }
  
  console.log('✅ Got encryption key');
  const key = deriveKey(password);
  
  // Read cookie DB (use our copy)
  const cookieDbCopy = path.join(OUTPUT_DIR, 'chrome_cookies_copy.db');
  if (!fs.existsSync(cookieDbCopy)) {
    console.error('Cookie DB copy not found. Run meesho_get_cookies.cjs first.');
    process.exit(1);
  }
  
  // Query the DB using sqlite3 CLI with BLOB output
  console.log('\nQuerying Meesho cookies from DB...');
  
  // Use Python to read SQLite with binary data since sqlite3 CLI strips binary
  const pythonScript = `
import sqlite3
import json
import sys
import os

db_path = "${cookieDbCopy}"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get all meesho cookies
cursor.execute("""
  SELECT name, encrypted_value, host_key, path, expires_utc, is_secure, is_httponly, samesite, value
  FROM cookies 
  WHERE host_key LIKE '%meesho%' OR host_key LIKE '%supplier%'
  ORDER BY host_key, name
""")

rows = cursor.fetchall()
result = []
for row in rows:
    name, enc_val, host, path_val, expires, is_secure, is_httponly, samesite, plain_value = row
    result.append({
        "name": name,
        "encrypted_value_hex": enc_val.hex() if enc_val else "",
        "encrypted_value_prefix": enc_val[:3].decode('utf-8', errors='replace') if enc_val and len(enc_val) >= 3 else "",
        "plain_value": plain_value or "",
        "host_key": host,
        "path": path_val,
        "is_secure": bool(is_secure),
        "is_httponly": bool(is_httponly),
    })

conn.close()
print(json.dumps(result, indent=2))
`;
  
  const pyResult = spawnSync('python3', ['-c', pythonScript], { encoding: 'utf-8' });
  
  if (pyResult.error || pyResult.status !== 0) {
    console.error('Python error:', pyResult.stderr);
    process.exit(1);
  }
  
  const rows = JSON.parse(pyResult.stdout);
  console.log(`Found ${rows.length} Meesho cookies\n`);
  
  const decryptedCookies = [];
  
  for (const row of rows) {
    let value = row.plain_value;
    
    if (!value && row.encrypted_value_hex) {
      const encBuf = Buffer.from(row.encrypted_value_hex, 'hex');
      value = decryptCookie(encBuf, key) || '';
    }
    
    decryptedCookies.push({
      name: row.name,
      value,
      domain: row.host_key,
      path: row.path,
      secure: row.is_secure,
      httpOnly: row.is_httponly,
    });
    
    const display = value.length > 60 ? value.substring(0, 60) + '...' : value;
    console.log(`  ${row.name}: ${display || '(empty)'}`);
  }
  
  const outputPath = path.join(OUTPUT_DIR, 'meesho_cookies_decrypted.json');
  fs.writeFileSync(outputPath, JSON.stringify(decryptedCookies, null, 2));
  console.log(`\n✅ Saved ${decryptedCookies.length} decrypted cookies to ${outputPath}`);
  
  // Check if we have a session cookie
  const sessionCookie = decryptedCookies.find(c => c.name === 'connect.sid');
  if (sessionCookie && sessionCookie.value) {
    console.log('\n✅ Session cookie (connect.sid) found and decrypted!');
  } else {
    console.log('\n⚠️  connect.sid cookie is empty — you may not be logged in on Chrome Default profile');
    console.log('Please open Chrome, log into supplier.meesho.com, then re-run this script');
  }
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
