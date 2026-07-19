#!/usr/bin/env node
/**
 * Capture the exact request headers that Meesho APIs require.
 * We intercept the actual request as the page makes it, then replay with those headers.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = './meesho_output';
const CDP_URL = 'http://localhost:9222';
const TARGET_URL = 'https://supplier.meesho.com/panel/v3/new/cataloging/req4n/catalogs/single/select-category';
const BASE_URL = 'https://supplier.meesho.com';

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const capturedRequests = [];
const IGNORE_PATTERNS = [
  /mixpanel/i, /sentry/i, /amplitude/i, /facebook\.net/i,
  /\.woff2?$/, /\.png(?:\?|$)/, /\.jpg/, /\.svg/, /\.css$/, /heartbeat/i,
];

async function main() {
  console.log('Connecting to Chrome via CDP...');
  const browser = await chromium.connectOverCDP(CDP_URL);
  const context = browser.contexts()[0];
  const pages = context.pages();
  let page = pages.find(p => p.url().includes('meesho.com'));
  
  if (!page) {
    page = await context.newPage();
  }
  
  console.log(`Tab: ${page.url()}`);

  // Intercept requests to capture headers
  page.on('request', req => {
    const url = req.url();
    const type = req.resourceType();
    if (['fetch', 'xhr'].includes(type) && url.includes('meesho.com')) {
      if (!IGNORE_PATTERNS.some(p => p.test(url))) {
        const entry = {
          url,
          method: req.method(),
          headers: req.headers(),
          postData: req.postData(),
        };
        capturedRequests.push(entry);
        console.log(`  → [${req.method()}] ${url.replace(BASE_URL, '')}`);
        if (req.method() === 'POST') {
          console.log(`    Headers: ${JSON.stringify(Object.fromEntries(
            Object.entries(req.headers()).filter(([k]) => !k.startsWith(':') && k !== 'cookie')
          ), null, 4)}`);
        }
      }
    }
  });

  page.on('response', async res => {
    const url = res.url();
    const req = capturedRequests.find(r => r.url === url);
    if (req && !req.responseBody) {
      try {
        const ct = res.headers()['content-type'] || '';
        if (ct.includes('json')) {
          req.responseBody = await res.json().catch(() => null);
          req.status = res.status();
          
          // Show category-related responses
          if (/categor|catalog|attribute|taxonomy|vertical/i.test(url)) {
            console.log(`\n  📦 CATEGORY RESPONSE [${res.status()}]:`);
            console.log(`    ${JSON.stringify(req.responseBody).substring(0, 600)}\n`);
          }
        }
      } catch (e) {}
    }
  });

  // Reload the page to trigger all initial API calls fresh
  console.log('\nReloading page to capture fresh API calls...');
  try {
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
  } catch (e) {
    console.log('Nav:', e.message.substring(0, 60));
  }
  
  await page.waitForTimeout(6000);
  
  console.log(`\nCapturing search-triggered API calls...`);
  
  // Interact with search to trigger category search APIs
  const inputs = await page.locator('input').all();
  for (const inp of inputs) {
    try {
      if (await inp.isVisible({ timeout: 500 })) {
        const ph = await inp.getAttribute('placeholder') || '';
        console.log(`Found input: "${ph}"`);
        await inp.click();
        await inp.fill('Saree');
        await page.waitForTimeout(2000);
        await inp.fill('Kurti');
        await page.waitForTimeout(2000);
        await inp.clear();
        await page.waitForTimeout(1000);
        break;
      }
    } catch (e) {}
  }
  
  await page.waitForTimeout(3000);
  
  // Save all captured requests
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'captured_requests_with_headers.json'),
    JSON.stringify(capturedRequests, null, 2)
  );
  
  console.log(`\n\n📊 Captured ${capturedRequests.length} API calls`);
  
  // Show category-related ones
  const catRequests = capturedRequests.filter(r => /categor|catalog|attribute|taxonomy|vertical/i.test(r.url));
  console.log(`\n🎯 CATEGORY API CALLS (${catRequests.length}):`);
  catRequests.forEach(r => {
    console.log(`\n  [${r.method}] ${r.url.replace(BASE_URL, '')}`);
    if (r.headers) {
      const important = ['content-type', 'x-supplier-id', 'az-identifier', 'client-type', 'x-client-type', 
        'x-requested-with', 'authorization', 'x-auth-token', 'x-session-token', 'x-csrf-token',
        'x-supplier-identifier', 'x-user-id', 'supplier-id', 'x-az-identifier'];
      const filteredHeaders = Object.fromEntries(
        Object.entries(r.headers).filter(([k]) => important.some(h => k.toLowerCase().includes(h.replace('x-', ''))))
      );
      console.log(`  Key headers: ${JSON.stringify(filteredHeaders)}`);
    }
    if (r.postData) console.log(`  Body: ${r.postData.substring(0, 200)}`);
    if (r.responseBody) console.log(`  Response: ${JSON.stringify(r.responseBody).substring(0, 400)}`);
  });
  
  // Also extract auth info
  console.log('\n\n🔑 AUTH HEADERS FOUND:');
  const authHeaders = new Set();
  capturedRequests.forEach(r => {
    if (r.headers) {
      Object.entries(r.headers).forEach(([k, v]) => {
        if (/auth|token|session|supplier|client|identifier|x-[a-z]/i.test(k) && !k.startsWith(':')) {
          authHeaders.add(`${k}: ${v}`);
        }
      });
    }
  });
  [...authHeaders].forEach(h => console.log(`  ${h}`));

  await browser.close();
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
