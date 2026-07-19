#!/usr/bin/env node
/**
 * Fetch per-leaf-category data: image_link + required_images_count
 * from: POST /api/cataloging/catalog-upload/fetch-sscat-image
 * Body: {"sub_sub_category_id": <id>, "identifier": "req4n"}
 * 
 * Also fetches image specs for all 3850 categories and saves to:
 * meesho_output/attributes.json
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = './meesho_output';
const ATTR_FILE = path.join(OUTPUT_DIR, 'attributes.json');
const DONE_FILE = path.join(OUTPUT_DIR, 'attr_done.json');
const CDP_URL = 'http://localhost:9222';
const BASE_URL = 'https://supplier.meesho.com';
const SUPPLIER_ID = 4402738;
const IDENTIFIER = 'req4n';
const DELAY_MS = 200;

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const leafCats = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'leaf_categories.json'), 'utf-8'));
const done = fs.existsSync(DONE_FILE) ? new Set(JSON.parse(fs.readFileSync(DONE_FILE, 'utf-8'))) : new Set();
const existing = fs.existsSync(ATTR_FILE) ? JSON.parse(fs.readFileSync(ATTR_FILE, 'utf-8')) : {};
const remaining = leafCats.filter(c => !done.has(c.id));

console.log(`Total: ${leafCats.length} | Done: ${done.size} | Remaining: ${remaining.length}`);

async function api(page, endpoint, body) {
  return page.evaluate(
    async ({ base, ep, bd, headers }) => {
      try {
        const res = await fetch(`${base}${ep}`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json;charset=UTF-8' },
          credentials: 'include',
          body: JSON.stringify(bd),
        });
        const data = await res.json().catch(() => null);
        return { ok: res.ok, status: res.status, data };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
    { base: BASE_URL, ep: endpoint, bd: body,
      headers: { 'identifier': IDENTIFIER, 'client-type': 'd-web',
        'client-package-version': '1.0.1', 'supplier-id': String(SUPPLIER_ID),
        'browser-id': 'NncgKyAyMzkgKyAxaGN1MDFoY3F6bw==', 'accept': 'application/json, text/plain, */*' },
    }
  );
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  if (remaining.length === 0) {
    console.log('All categories already done!');
    return;
  }

  console.log('\nConnecting to Chrome...');
  const browser = await chromium.connectOverCDP(CDP_URL);
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes('meesho.com'));
  if (!page) {
    page = await context.newPage();
    await page.goto(`${BASE_URL}/panel/v3/new/cataloging/${IDENTIFIER}/catalogs/single/select-category`, {
      waitUntil: 'domcontentloaded', timeout: 20000
    });
    await sleep(2000);
  }

  // Test the endpoint
  console.log('\nTesting fetch-sscat-image endpoint...');
  const test = await api(page, '/api/cataloging/catalog-upload/fetch-sscat-image', {
    sub_sub_category_id: 10000, identifier: IDENTIFIER
  });
  console.log(`Test: status=${test.status}, data=${JSON.stringify(test.data)}`);

  const allAttrs = { ...existing };
  const startTime = Date.now();

  for (let i = 0; i < remaining.length; i++) {
    const cat = remaining[i];
    
    try {
      const imageRes = await api(page, '/api/cataloging/catalog-upload/fetch-sscat-image', {
        sub_sub_category_id: parseInt(cat.id),
        identifier: IDENTIFIER,
      });

      allAttrs[cat.id] = {
        category_id: cat.id,
        category_name: cat.name,
        path: cat.path,
        super_category: cat.super_category,
        category: cat.category,
        sub_category: cat.sub_category,
        min_products: cat.min_products,
        max_products: cat.max_products,
        image_link: imageRes.data?.image_link || null,
        required_images_count: imageRes.data?.required_images_count || null,
      };
      done.add(cat.id);
    } catch (e) {
      done.add(cat.id);
      allAttrs[cat.id] = { category_id: cat.id, category_name: cat.name, error: e.message };
    }

    if ((i + 1) % 20 === 0 || i === remaining.length - 1) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = (i + 1) / elapsed;
      const pct = Math.round((i + 1) / remaining.length * 100);
      const eta = Math.round((remaining.length - i - 1) / rate / 60);
      process.stdout.write(`\r  [${i+1}/${remaining.length}] ${pct}% | ${rate.toFixed(1)}/s | ETA: ~${eta}min    `);
      
      // Save progress
      fs.writeFileSync(DONE_FILE, JSON.stringify([...done]));
      fs.writeFileSync(ATTR_FILE, JSON.stringify(allAttrs, null, 2));
      
      // Also write to public folder for live UI updates
      try {
        fs.writeFileSync(path.join('./public/meesho/attributes.json'), JSON.stringify(allAttrs, null, 2));
      } catch (e) {}
    }

    await sleep(DELAY_MS);
  }

  // Update public/meesho dir
  const publicAttr = path.join('./public/meesho/attributes.json');
  fs.writeFileSync(publicAttr, JSON.stringify(allAttrs, null, 2));

  console.log(`\n\n✅ Done! ${Object.keys(allAttrs).length} categories with image data`);
  console.log(`Saved to ${ATTR_FILE} and ${publicAttr}`);
  
  // Summary
  const withImages = Object.values(allAttrs).filter(a => a.image_link);
  console.log(`Categories with images: ${withImages.length}`);
  
  await browser.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
