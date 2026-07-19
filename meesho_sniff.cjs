#!/usr/bin/env node
/**
 * Meesho Category Scraper — Full Recursive Crawler
 * 
 * Discovered APIs:
 * 1. POST /api/cataloging/bulkCatalogUpload/fetchCategoryTreeOld  → full tree
 * 2. POST /api/cataloging/catalog-upload/fetch-your-categories-list → flat list
 * 3. POST /api/cataloging/singleCatalogUpload/getCatalogUploadPerformance → sscat list
 * 
 * Uses real Chrome via CDP to bypass Akamai bot detection.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = './meesho_output';
const CDP_URL = 'http://localhost:9222';
const BASE_URL = 'https://supplier.meesho.com';

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ─── API call helper via page.evaluate (runs inside Chrome) ─────────────────
async function apiPost(page, endpoint, body = {}) {
  return page.evaluate(async ({ url, body }) => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return { ok: res.ok, status: res.status, data };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, { url: `${BASE_URL}${endpoint}`, body });
}

async function apiGet(page, endpoint, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${BASE_URL}${endpoint}${qs ? '?' + qs : ''}`;
  return page.evaluate(async ({ url }) => {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      return { ok: res.ok, status: res.status, data };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, { url });
}

// ─── Main Scraper ────────────────────────────────────────────────────────────
async function main() {
  console.log('Connecting to Chrome via CDP...');
  const browser = await chromium.connectOverCDP(CDP_URL);
  const context = browser.contexts()[0];
  const pages = context.pages();
  
  // Get the Meesho page
  let page = pages.find(p => p.url().includes('meesho.com'));
  if (!page) {
    console.log('No Meesho tab found. Creating one...');
    page = await context.newPage();
    await page.goto(`${BASE_URL}/panel/v3/new/cataloging/req4n/catalogs/single/select-category`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(3000);
  }
  
  console.log(`Using tab: ${page.url()}\n`);
  
  // ─── STEP 1: Fetch the complete category tree ──────────────────────────────
  console.log('═══════════════════════════════════════');
  console.log('STEP 1: Fetching full category tree...');
  console.log('═══════════════════════════════════════');
  
  const treeResult = await apiPost(page, '/api/cataloging/bulkCatalogUpload/fetchCategoryTreeOld', {});
  console.log(`Status: ${treeResult.status}, OK: ${treeResult.ok}`);
  if (treeResult.data) {
    console.log(`Response keys: ${Object.keys(treeResult.data).join(', ')}`);
    console.log(`Preview: ${JSON.stringify(treeResult.data).substring(0, 500)}`);
  }
  fs.writeFileSync(path.join(OUTPUT_DIR, 'raw_category_tree.json'), JSON.stringify(treeResult.data, null, 2));
  
  // ─── STEP 2: Fetch the flat category list ─────────────────────────────────
  console.log('\n═══════════════════════════════════════');
  console.log('STEP 2: Fetching all categories flat list...');
  console.log('═══════════════════════════════════════');
  
  const flatListResult = await apiPost(page, '/api/cataloging/catalog-upload/fetch-your-categories-list', {});
  console.log(`Status: ${flatListResult.status}, OK: ${flatListResult.ok}`);
  if (flatListResult.data) {
    const dataArr = Array.isArray(flatListResult.data) ? flatListResult.data : (flatListResult.data.data || []);
    console.log(`Found ${dataArr.length} categories`);
    if (dataArr.length > 0) console.log(`Sample: ${JSON.stringify(dataArr.slice(0, 2), null, 2)}`);
  }
  fs.writeFileSync(path.join(OUTPUT_DIR, 'raw_flat_categories.json'), JSON.stringify(flatListResult.data, null, 2));
  
  // ─── STEP 3: Fetch subcategory performance list (has IDs) ─────────────────
  console.log('\n═══════════════════════════════════════');
  console.log('STEP 3: Fetching subcategory list with IDs...');
  console.log('═══════════════════════════════════════');
  
  const perfResult = await apiPost(page, '/api/cataloging/singleCatalogUpload/getCatalogUploadPerformance', {});
  console.log(`Status: ${perfResult.status}, OK: ${perfResult.ok}`);
  if (perfResult.data) {
    console.log(`Response keys: ${Object.keys(perfResult.data).join(', ')}`);
    if (perfResult.data.items) {
      const sscats = perfResult.data.items.find(i => i.type === 'sub-sub-category');
      if (sscats) {
        console.log(`Found ${sscats.data?.length} sub-sub-categories`);
        console.log(`Sample: ${JSON.stringify(sscats.data?.slice(0, 3), null, 2)}`);
      }
    }
  }
  fs.writeFileSync(path.join(OUTPUT_DIR, 'raw_sscat_list.json'), JSON.stringify(perfResult.data, null, 2));
  
  // ─── STEP 4: Try additional category search/detail endpoints ──────────────
  console.log('\n═══════════════════════════════════════');
  console.log('STEP 4: Probing additional endpoints...');
  console.log('═══════════════════════════════════════');
  
  const endpointsToTry = [
    ['/api/cataloging/singleCatalogUpload/getCategories', {}],
    ['/api/cataloging/singleCatalogUpload/getCategoryTree', {}],
    ['/api/cataloging/singleCatalogUpload/fetchCategories', {}],
    ['/api/cataloging/bulkCatalogUpload/getCategoryAttributes', {}],
    ['/api/cataloging/catalog-upload/get-category-attributes', {}],
    ['/api/cataloging/catalog-upload/fetch-category-tree', {}],
    ['/api/cataloging/catalog-upload/categories', {}],
    ['/api/v2/category/tree', {}],
    ['/api/cataloging/singleCatalogUpload/getSubCategories', {}],
  ];
  
  const probeResults = {};
  for (const [ep, body] of endpointsToTry) {
    const r = await apiPost(page, ep, body);
    if (r.ok && r.data && !r.data.error) {
      console.log(`✅ ${ep} → ${JSON.stringify(r.data).substring(0, 150)}`);
      probeResults[ep] = r.data;
    } else {
      const err = r.data?.error || r.data?.message || r.error || r.status;
      console.log(`   ${ep} → ${err}`);
    }
    await new Promise(r => setTimeout(r, 300));
  }
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'probe_results.json'), JSON.stringify(probeResults, null, 2));

  // ─── STEP 5: Try searching for categories by name ─────────────────────────
  console.log('\n═══════════════════════════════════════');
  console.log('STEP 5: Testing category search API...');
  console.log('═══════════════════════════════════════');
  
  const searchTerms = ['Saree', 'Kurti', 'T-shirt', 'Shoes', 'Watch', 'Electronics'];
  const searchResults = {};
  
  for (const term of searchTerms) {
    const r1 = await apiPost(page, '/api/cataloging/singleCatalogUpload/getCategories', { search: term, query: term, keyword: term });
    const r2 = await apiPost(page, '/api/cataloging/bulkCatalogUpload/fetchCategoryTreeOld', { search: term, query: term });
    
    if (r1.ok && r1.data) {
      console.log(`  Search "${term}" /getCategories: ${JSON.stringify(r1.data).substring(0, 200)}`);
      searchResults[`getCategories_${term}`] = r1.data;
    }
    if (r2.ok && r2.data && JSON.stringify(r2.data) !== JSON.stringify(treeResult.data)) {
      console.log(`  Search "${term}" /fetchCategoryTreeOld: ${JSON.stringify(r2.data).substring(0, 200)}`);
    }
    await new Promise(r => setTimeout(r, 200));
  }
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'search_results.json'), JSON.stringify(searchResults, null, 2));
  
  await browser.close();
  
  console.log('\n\n✅ Raw data collection complete!');
  console.log('Files saved:');
  console.log('  → meesho_output/raw_category_tree.json');
  console.log('  → meesho_output/raw_flat_categories.json');
  console.log('  → meesho_output/raw_sscat_list.json');
  console.log('  → meesho_output/probe_results.json');
  console.log('\nRun meesho_build_tree.cjs next to build the clean hierarchy.');
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
