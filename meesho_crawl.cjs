#!/usr/bin/env node
/**
 * Meesho Complete Category Crawler
 * 
 * Discovered APIs & required headers:
 * - POST /api/cataloging/bulkCatalogUpload/fetchCategoryTreeOld
 *   Body: {"bulk_upload_enabled":false,"supplier_id":4402738,"identifier":"req4n"}
 * 
 * - POST /api/cataloging/catalog-upload/fetch-your-categories-list
 *   Body: {"supplier_id":4402738,"file_type":"SINGLE_CATALOG_UPLOAD"}
 *
 * - POST /api/cataloging/catalog-upload/search-catalog
 *   Body: {"query":"...","offset":0,"size":25,"supplier_id":4402738,...}
 *
 * Required headers:
 *   identifier: req4n
 *   client-type: d-web
 *   client-package-version: 1.0.1
 *   supplier-id: 4402738
 *   browser-id: NncgKyAyMzkgKyAxaGN1MDFoY3F6bw==
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = './meesho_output';
const CDP_URL = 'http://localhost:9222';
const BASE_URL = 'https://supplier.meesho.com';
const SUPPLIER_ID = 4402738;
const IDENTIFIER = 'req4n';

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// API caller using page.evaluate (runs inside Chrome with real session)
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
        const data = await res.json();
        return { ok: res.ok, status: res.status, data };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
    {
      base: BASE_URL,
      ep: endpoint,
      bd: body,
      headers: {
        'identifier': IDENTIFIER,
        'client-type': 'd-web',
        'client-package-version': '1.0.1',
        'supplier-id': String(SUPPLIER_ID),
        'browser-id': 'NncgKyAyMzkgKyAxaGN1MDFoY3F6bw==',
        'accept': 'application/json, text/plain, */*',
      },
    }
  );
}

// ─── Build category tree from flat list ─────────────────────────────────────
function buildTree(flatList) {
  // flatList items: {sub_sub_category_name, sub_sub_category_id, sub_category_name, category_name, super_category_name}
  const tree = {};
  
  for (const item of flatList) {
    const { super_category_name, category_name, sub_category_name, sub_sub_category_name, sub_sub_category_id, image_link } = item;
    
    if (!tree[super_category_name]) {
      tree[super_category_name] = { name: super_category_name, level: 1, children: {} };
    }
    if (!tree[super_category_name].children[category_name]) {
      tree[super_category_name].children[category_name] = { name: category_name, level: 2, children: {} };
    }
    if (!tree[super_category_name].children[category_name].children[sub_category_name]) {
      tree[super_category_name].children[category_name].children[sub_category_name] = { name: sub_category_name, level: 3, children: {} };
    }
    tree[super_category_name].children[category_name].children[sub_category_name].children[sub_sub_category_name] = {
      id: sub_sub_category_id,
      name: sub_sub_category_name,
      level: 4,
      leaf: true,
      image: image_link,
      path: `${super_category_name} > ${category_name} > ${sub_category_name} > ${sub_sub_category_name}`,
    };
  }
  
  return tree;
}

function treeToArray(tree, parentId = null, parentPath = '') {
  const result = [];
  for (const [name, node] of Object.entries(tree)) {
    const currentPath = parentPath ? `${parentPath} > ${name}` : name;
    const entry = {
      category_id: node.id || null,
      category_name: name,
      parent_category_id: parentId,
      path: currentPath,
      level: node.level,
      leaf: node.leaf || false,
      image: node.image || null,
    };
    
    if (node.children && Object.keys(node.children).length > 0) {
      entry.children = treeToArray(node.children, node.id || null, currentPath);
    } else {
      entry.children = [];
    }
    
    result.push(entry);
  }
  return result;
}

// ─── Main Crawler ────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  MEESHO COMPLETE CATEGORY CRAWLER');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const browser = await chromium.connectOverCDP(CDP_URL);
  const context = browser.contexts()[0];
  const pages = context.pages();
  let page = pages.find(p => p.url().includes('meesho.com'));
  if (!page) {
    page = await context.newPage();
    await page.goto(`${BASE_URL}/panel/v3/new/cataloging/${IDENTIFIER}/catalogs/single/select-category`, {
      waitUntil: 'domcontentloaded', timeout: 20000,
    });
    await page.waitForTimeout(3000);
  }
  console.log(`Using tab: ${page.url()}\n`);

  // ── 1. Fetch full category tree (all sub-sub-categories) ──────────────────
  console.log('[1/5] Fetching full category tree (fetchCategoryTreeOld)...');
  const treeRaw = await api(page, '/api/cataloging/bulkCatalogUpload/fetchCategoryTreeOld', {
    bulk_upload_enabled: false,
    supplier_id: SUPPLIER_ID,
    identifier: IDENTIFIER,
  });
  
  console.log(`  Status: ${treeRaw.status}`);
  let allSscats = [];
  if (treeRaw.ok && treeRaw.data?.items) {
    const sscatItem = treeRaw.data.items.find(i => i.type === 'sub-sub-category');
    allSscats = sscatItem?.data || [];
    console.log(`  ✅ Found ${allSscats.length} sub-sub-categories`);
  }
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'raw_category_tree.json'), JSON.stringify(treeRaw.data, null, 2));

  // ── 2. Fetch flat hierarchy list ───────────────────────────────────────────
  console.log('\n[2/5] Fetching flat category hierarchy list...');
  const flatRaw = await api(page, '/api/cataloging/catalog-upload/fetch-your-categories-list', {
    supplier_id: SUPPLIER_ID,
    file_type: 'SINGLE_CATALOG_UPLOAD',
  });
  
  console.log(`  Status: ${flatRaw.status}`);
  let flatList = [];
  if (flatRaw.ok && Array.isArray(flatRaw.data)) {
    flatList = flatRaw.data;
    console.log(`  ✅ Found ${flatList.length} categories in flat list`);
    if (flatList[0]) console.log(`  Sample: ${JSON.stringify(flatList[0])}`);
  }
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'raw_flat_categories.json'), JSON.stringify(flatRaw.data, null, 2));

  // ── 3. Search-based discovery (find ALL leaf categories) ──────────────────
  console.log('\n[3/5] Search-based category discovery...');
  
  // First, get the super categories from the tree
  const superCategories = [...new Set(flatList.map(i => i.super_category_name).filter(Boolean))];
  console.log(`  Super categories from flat list: ${superCategories.join(', ')}`);
  
  // Also try to get all super categories from the sscat data
  const allParentNames = [...new Set(allSscats.map(i => i.parent_name).filter(Boolean))];
  
  // Search with common terms to find all categories
  const searchTerms = [
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  ];
  
  const allSearchResults = [];
  const seenIds = new Set();
  
  console.log('  Searching all categories by alphabet...');
  for (const term of searchTerms) {
    const result = await api(page, '/api/cataloging/catalog-upload/search-catalog', {
      query: term,
      offset: 0,
      size: 200,  // max size
      supplier_id: SUPPLIER_ID,
      bulk_upload_enabled: false,
      supplier_enabled: true,
      identifier: IDENTIFIER,
    });
    
    if (result.ok && result.data?.results) {
      let newCount = 0;
      for (const cat of result.data.results) {
        if (!seenIds.has(cat.id)) {
          seenIds.add(cat.id);
          allSearchResults.push(cat);
          newCount++;
        }
      }
      process.stdout.write(`  "${term}": ${result.data.results.length} results (${newCount} new, total: ${allSearchResults.length})\n`);
    }
    
    await new Promise(r => setTimeout(r, 150));
  }
  
  console.log(`\n  ✅ Total unique categories from search: ${allSearchResults.length}`);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'raw_search_results.json'), JSON.stringify(allSearchResults, null, 2));

  // ── 4. Build unified category hierarchy ───────────────────────────────────
  console.log('\n[4/5] Building category hierarchy...');
  
  // Merge data: use search results (which have chain/path) + flat list + sscat list
  const categoryMap = {};
  
  // From search results: {name, chain:["L1","L2","L3","L4"], category, id}
  for (const cat of allSearchResults) {
    const [superCat, catName, subCat, ssCat] = cat.chain || [];
    const key = cat.id;
    
    categoryMap[key] = {
      category_id: String(cat.id),
      category_name: ssCat || catName || cat.name,
      parent_category_id: null,  // will resolve
      path: cat.chain?.join(' > ') || cat.name,
      level: cat.chain?.length || 1,
      leaf: cat.category === 'sub-sub-category',
      super_category: superCat,
      category: catName,
      sub_category: subCat,
      sub_sub_category: ssCat,
      display_name: cat.name,
    };
  }
  
  // Enhance with sscat data (has min/max products)
  for (const sscat of allSscats) {
    const key = sscat.id;
    if (categoryMap[key]) {
      categoryMap[key].min_products = sscat.data?.min_products;
      categoryMap[key].max_products = sscat.data?.max_products;
      categoryMap[key].parent_name = sscat.parent_name;
      categoryMap[key].parent_id = sscat.parent_id;
    }
  }
  
  // ── 5. Build the full tree from flat list ─────────────────────────────────
  const tree = buildTree(flatList);
  const treeArray = treeToArray(tree);
  
  // Also create from search results (more comprehensive)
  const superCategoryMap = {};
  for (const cat of Object.values(categoryMap)) {
    const sc = cat.super_category || 'Unknown';
    const c = cat.category || 'Unknown';
    const sub = cat.sub_category || 'Unknown';
    const ss = cat.sub_sub_category || cat.category_name;
    
    if (!superCategoryMap[sc]) superCategoryMap[sc] = { name: sc, level: 1, children: {} };
    if (!superCategoryMap[sc].children[c]) superCategoryMap[sc].children[c] = { name: c, level: 2, children: {} };
    if (!superCategoryMap[sc].children[c].children[sub]) superCategoryMap[sc].children[c].children[sub] = { name: sub, level: 3, children: {} };
    superCategoryMap[sc].children[c].children[sub].children[ss] = {
      id: cat.category_id,
      name: ss,
      level: 4,
      leaf: true,
      min_products: cat.min_products,
      max_products: cat.max_products,
    };
  }
  
  const fullTreeArray = treeToArray(superCategoryMap);
  
  // Count stats
  let leafCount = 0;
  function countLeaves(nodes) {
    for (const n of nodes) {
      if (n.leaf) leafCount++;
      if (n.children?.length) countLeaves(n.children);
    }
  }
  countLeaves(fullTreeArray);
  
  // Save output files
  console.log('\n[5/5] Saving output files...');
  
  // categories.json - full tree
  const categoriesFile = path.join(OUTPUT_DIR, 'categories.json');
  fs.writeFileSync(categoriesFile, JSON.stringify(fullTreeArray, null, 2));
  console.log(`  ✅ categories.json: ${fullTreeArray.length} top-level, ${leafCount} leaf categories`);
  
  // leaf_categories.json
  const leafCategories = Object.values(categoryMap).filter(c => c.leaf);
  const leafFile = path.join(OUTPUT_DIR, 'leaf_categories.json');
  fs.writeFileSync(leafFile, JSON.stringify(leafCategories, null, 2));
  console.log(`  ✅ leaf_categories.json: ${leafCategories.length} leaf categories`);
  
  // flat_list.json - simple flat view for reference
  const flatView = Object.values(categoryMap).map(c => ({
    id: c.category_id,
    name: c.display_name || c.category_name,
    path: c.path,
    level: c.level,
    leaf: c.leaf,
    super_category: c.super_category,
    category: c.category,
    sub_category: c.sub_category,
    sub_sub_category: c.sub_sub_category,
    min_products: c.min_products,
    max_products: c.max_products,
  }));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'flat_categories.json'), JSON.stringify(flatView, null, 2));
  
  // Print summary
  console.log('\n\n══════════════════════════════════════════════');
  console.log('  CRAWL COMPLETE — SUMMARY');
  console.log('══════════════════════════════════════════════');
  
  const superCats = [...new Set(flatView.map(c => c.super_category).filter(Boolean))].sort();
  console.log(`\nSuper Categories (${superCats.length}):`);
  for (const sc of superCats) {
    const count = flatView.filter(c => c.super_category === sc && c.leaf).length;
    console.log(`  • ${sc} (${count} leaf categories)`);
  }
  
  console.log(`\nTotal unique categories: ${flatView.length}`);
  console.log(`Total leaf categories: ${leafCategories.length}`);
  console.log(`\nOutput files:`);
  console.log(`  → meesho_output/categories.json`);
  console.log(`  → meesho_output/leaf_categories.json`);
  console.log(`  → meesho_output/flat_categories.json`);
  
  await browser.close();
}

main().catch(e => {
  console.error('Error:', e.message);
  console.error(e.stack);
  process.exit(1);
});
