#!/usr/bin/env node
/**
 * Step 1: Extract cookies from Chrome's SQLite cookie DB
 * This gives us the session cookies without needing Chrome to be closed.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = './meesho_output';
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Copy the cookie DB to avoid lock issues
const cookieDbSrc = path.join(process.env.HOME, 'Library/Application Support/Google/Chrome/Default/Cookies');
const cookieDbCopy = path.join(OUTPUT_DIR, 'chrome_cookies_copy.db');

try {
  fs.copyFileSync(cookieDbSrc, cookieDbCopy);
  console.log('Copied Chrome cookie DB');
} catch (e) {
  console.error('Could not copy cookie DB:', e.message);
  process.exit(1);
}

// Use sqlite3 CLI to dump meesho cookies
try {
  const result = execSync(`sqlite3 "${cookieDbCopy}" "SELECT name, value, host_key, path, expires_utc, is_secure, is_httponly, samesite FROM cookies WHERE host_key LIKE '%meesho%' ORDER BY host_key, name;"`, {
    encoding: 'utf-8',
  });
  
  if (!result.trim()) {
    console.log('⚠️  No Meesho cookies found in Chrome Default profile.');
    console.log('This means you may not be logged in on Chrome Default profile.');
    console.log('Trying to get all supplier-related cookies...');
    
    const result2 = execSync(`sqlite3 "${cookieDbCopy}" "SELECT name, value, host_key, path FROM cookies WHERE host_key LIKE '%supplier%' OR host_key LIKE '%meesho%' LIMIT 50;"`, {
      encoding: 'utf-8',
    });
    console.log('Supplier cookies:', result2 || 'None found');
  } else {
    console.log('✅ Meesho cookies found!');
    
    // Parse and save cookies
    const cookies = [];
    result.trim().split('\n').forEach(line => {
      const parts = line.split('|');
      if (parts.length >= 4) {
        cookies.push({
          name: parts[0],
          value: parts[1],
          domain: parts[2],
          path: parts[3],
        });
        console.log(`  Cookie: ${parts[0]} = ${parts[1].substring(0, 50)}...`);
      }
    });
    
    fs.writeFileSync(path.join(OUTPUT_DIR, 'meesho_cookies.json'), JSON.stringify(cookies, null, 2));
    console.log(`\nSaved ${cookies.length} cookies to meesho_output/meesho_cookies.json`);
  }
} catch (e) {
  console.error('sqlite3 error:', e.message);
  console.log('\nTrying alternative: list all cookies for .meesho.com...');
  try {
    const result = execSync(`sqlite3 "${cookieDbCopy}" ".tables"`, { encoding: 'utf-8' });
    console.log('DB tables:', result);
  } catch (e2) {
    console.error('sqlite3 not found or DB error:', e2.message);
  }
}
