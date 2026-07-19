#!/usr/bin/env node
/**
 * Navigate to the actual single catalog upload form with a category selected
 * and intercept the attribute API call.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = './meesho_output';
const CDP_URL = 'http://localhost:9222';
const BASE_URL = 'https://supplier.meesho.com';
const SUPPLIER_ID = 4402738;
const IDENTIFIER = 'req4n';

async function main() {
  const browser = await chromium.connectOverCDP(CDP_URL);
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes('meesho.com')) || await context.newPage();
  
  const captured = [];
  page.on('request', req => {
    if (['fetch', 'xhr'].includes(req.resourceType()) && req.url().includes('meesho')) {
      const entry = { url: req.url().replace(BASE_URL, ''), method: req.method(), postData: req.postData(), headers: req.headers() };
      captured.push(entry);
      // Print all non-noise API calls
      if (!/(sentry|mixpanel|beacon|prefetch|socket|analytics|count|config|unread)/i.test(entry.url)) {
        console.log(`  → [${entry.method}] ${entry.url.substring(0, 120)}`);
        if (entry.postData) console.log(`    Body: ${entry.postData.substring(0, 200)}`);
      }
    }
  });
  
  page.on('response', async res => {
    const url = res.url().replace(BASE_URL, '');
    const hit = captured.find(c => c.url === url && !c.response);
    if (hit) {
      try {
        const ct = res.headers()['content-type'] || '';
        if (ct.includes('json')) {
          hit.response = await res.json().catch(() => null);
          hit.status = res.status();
          
          // Show category/attribute responses
          if (/(categor|attribute|form|field|variant|property)/i.test(url)) {
            console.log(`\n    📦 [${res.status()}] ${url}: ${JSON.stringify(hit.response).substring(0, 400)}\n`);
          }
        }
      } catch(e) {}
    }
  });
  
  // Go to the category selection page
  console.log('Step 1: Navigate to category selection page...');
  await page.goto(`${BASE_URL}/panel/v3/new/cataloging/${IDENTIFIER}/catalogs/single/select-category`, {
    waitUntil: 'domcontentloaded', timeout: 20000
  });
  await page.waitForTimeout(3000);
  
  // Try to click on a category (Tshirts)
  console.log('Step 2: Searching for Tshirts...');
  const searchInput = await page.locator('input').first();
  if (await searchInput.isVisible()) {
    await searchInput.click();
    await searchInput.fill('Tshirts');
    await page.waitForTimeout(2000);
    
    // Click the first result
    const results = await page.locator('[class*="result"], [class*="item"], [class*="option"], li').all();
    console.log(`Found ${results.length} result items`);
    
    for (const r of results.slice(0, 3)) {
      try {
        const text = await r.textContent();
        console.log(`  Item: "${text?.trim().substring(0, 60)}"`);
      } catch(e) {}
    }
    
    // Click first visible result
    for (const r of results.slice(0, 5)) {
      try {
        if (await r.isVisible()) {
          await r.click();
          console.log('  Clicked result!');
          await page.waitForTimeout(3000);
          break;
        }
      } catch(e) {}
    }
  }
  
  console.log(`\nCurrent URL: ${page.url()}`);
  
  // See what happened
  const title = await page.title();
  console.log(`Title: ${title}`);
  
  await page.waitForTimeout(5000);
  
  // Check all captured requests
  const interesting = captured.filter(c => 
    !/(sentry|mixpanel|beacon|prefetch|socket|analytics|count|config|unread|promotion|gcm)/i.test(c.url)
  );
  
  console.log(`\nInteresting API calls (${interesting.length}):`);
  interesting.forEach(c => {
    console.log(`  [${c.method}] ${c.url}`);
    if (c.postData) console.log(`    Body: ${c.postData.substring(0, 150)}`);
    if (c.response) {
      const keys = typeof c.response === 'object' ? Object.keys(c.response).join(', ') : 'raw';
      console.log(`    Resp[${c.status}] keys: ${keys}`);
      console.log(`    ${JSON.stringify(c.response).substring(0, 300)}`);
    }
  });
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'step2_requests.json'), JSON.stringify(captured, null, 2));
  await browser.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
