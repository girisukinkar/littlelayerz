#!/usr/bin/env node
/**
 * Build the complete Meesho category hierarchy from the raw data.
 * 
 * Raw tree data has:
 *   sub-sub-category → parent_name (sub_category), parent_id
 * 
 * We need to also get the sub_category → category → super_category links.
 * We do this by calling the search API and the category-list API.
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
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch(e) { data = text; }
        return { ok: res.ok, status: res.status, data };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
    { base: BASE_URL, ep: endpoint, bd: body,
      headers: {
        'identifier': IDENTIFIER, 'client-type': 'd-web',
        'client-package-version': '1.0.1', 'supplier-id': String(SUPPLIER_ID),
        'browser-id': 'NncgKyAyMzkgKyAxaGN1MDFoY3F6bw==',
        'accept': 'application/json, text/plain, */*',
      },
    }
  );
}

async function main() {
  console.log('Connecting to Chrome...');
  const browser = await chromium.connectOverCDP(CDP_URL);
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes('meesho.com'));
  if (!page) { page = await context.newPage(); await page.waitForTimeout(1000); }
  
  // ── Load raw tree data ──────────────────────────────────────────────────────
  console.log('\nLoading raw_category_tree.json (3777 sub-sub-categories)...');
  const rawTree = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'raw_category_tree.json'), 'utf-8'));
  const allSscats = rawTree.items?.find(i => i.type === 'sub-sub-category')?.data || [];
  console.log(`  ${allSscats.length} sub-sub-categories loaded`);

  // Unique sub_category (parent) IDs from the tree
  const subCatIds = [...new Set(allSscats.map(s => s.parent_id))];
  console.log(`  ${subCatIds.length} unique sub-categories (parent IDs)`);

  // ── Try to get the full category hierarchy ──────────────────────────────────
  console.log('\nProbing for category hierarchy endpoints...');
  
  // Try the category tree endpoint that includes parent hierarchy
  const endpointsToTry = [
    ['/api/cataloging/singleCatalogUpload/getCategoryTree', { supplier_id: SUPPLIER_ID, identifier: IDENTIFIER }],
    ['/api/cataloging/catalog-upload/get-category-tree', { supplier_id: SUPPLIER_ID }],
    ['/api/cataloging/bulkCatalogUpload/getCategoryTree', { supplier_id: SUPPLIER_ID }],
    ['/api/cataloging/catalog-upload/fetch-categories', { supplier_id: SUPPLIER_ID }],
    ['/api/v2/cataloging/categories', {}],
    ['/api/cataloging/catalog-upload/get-all-categories', { supplier_id: SUPPLIER_ID }],
  ];
  
  let fullHierarchy = null;
  for (const [ep, bd] of endpointsToTry) {
    const r = await api(page, ep, bd);
    if (r.ok && r.data && !r.data.message) {
      console.log(`  ✅ ${ep} → ${JSON.stringify(r.data).substring(0, 200)}`);
      fullHierarchy = r.data;
      fs.writeFileSync(path.join(OUTPUT_DIR, `endpoint_${ep.split('/').pop()}.json`), JSON.stringify(r.data, null, 2));
    } else {
      console.log(`     ${ep} → ${r.status} ${r.data?.message || r.error || ''}`);
    }
    await new Promise(r => setTimeout(r, 200));
  }

  // ── Search ALL categories using alphabet to get the chain (hierarchy path) ──
  console.log('\nUsing search API to get hierarchy chains for all categories...');
  
  const seenIds = new Set();
  const searchCats = [];
  
  // Use both single chars and common category keywords
  const terms = [
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    'Saree', 'Kurti', 'Shirt', 'Dress', 'Shoe', 'Watch', 'Phone', 'Toy',
    'Bag', 'Jewel', 'Kitchen', 'Bed', 'Laptop', 'Chair', 'Book', 'Sport',
    'Beauty', 'Health', 'Garden', 'Pet', 'Auto', 'Baby', 'Art', 'Music',
  ];

  for (const term of terms) {
    const result = await api(page, '/api/cataloging/catalog-upload/search-catalog', {
      query: term,
      offset: 0,
      size: 200,
      supplier_id: SUPPLIER_ID,
      bulk_upload_enabled: false,
      supplier_enabled: true,
      identifier: IDENTIFIER,
    });
    
    if (result.ok && Array.isArray(result.data?.results)) {
      let newCount = 0;
      for (const cat of result.data.results) {
        if (!seenIds.has(cat.id)) {
          seenIds.add(cat.id);
          searchCats.push(cat);
          newCount++;
        }
      }
      if (newCount > 0 || result.data.results.length > 0) {
        process.stdout.write(`  "${term}": ${result.data.results.length} results, ${newCount} new (total: ${searchCats.length})\n`);
      }
    } else {
      process.stdout.write(`  "${term}": ${result.status} ${JSON.stringify(result.data).substring(0, 80)}\n`);
    }
    
    await new Promise(r => setTimeout(r, 300));
  }
  
  console.log(`\n  ✅ Got ${searchCats.length} categories with hierarchy chains`);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'search_cats.json'), JSON.stringify(searchCats, null, 2));

  // ── Build comprehensive hierarchy from search results ──────────────────────
  console.log('\nBuilding complete hierarchy...');
  
  // Build id→chain map from search results
  const idToChain = {};
  for (const cat of searchCats) {
    idToChain[String(cat.id)] = cat.chain || [];
  }
  
  // Map from sscat data (has parent info):
  //   sscat.id → sscat name, parent_name (=sub_cat), parent_id
  // From search: chain = [super_cat, cat, sub_cat, sscat]
  
  // Build a node map for super/cat/subcat levels
  const nodeMap = {}; // id → node
  
  // First pass: add all sscats
  for (const ss of allSscats) {
    nodeMap[ss.id] = {
      id: ss.id,
      name: ss.name,
      type: 'sub_sub_category',
      parent_id: ss.parent_id,
      parent_name: ss.parent_name,
      min_products: ss.data?.min_products,
      max_products: ss.data?.max_products,
      chain: idToChain[ss.id] || null,
    };
  }
  
  // Build category tree from chains
  const superCats = {};  // super_cat_name → { categories: {} }
  
  for (const ss of Object.values(nodeMap)) {
    const chain = ss.chain;
    if (!chain || chain.length < 2) {
      // No chain info - put in Unknown
      const sc = 'Unknown';
      const c = ss.parent_name || 'Unknown';
      if (!superCats[sc]) superCats[sc] = { name: sc, id: null, categories: {} };
      if (!superCats[sc].categories[c]) superCats[sc].categories[c] = { name: c, sub_categories: {} };
      if (!superCats[sc].categories[c].sub_categories[ss.parent_name]) {
        superCats[sc].categories[c].sub_categories[ss.parent_name] = { name: ss.parent_name, id: ss.parent_id, leaf_categories: [] };
      }
      superCats[sc].categories[c].sub_categories[ss.parent_name].leaf_categories.push({
        id: ss.id, name: ss.name, min_products: ss.min_products, max_products: ss.max_products,
      });
    } else {
      const [scName, cName, subName, ssName] = chain;
      
      if (!superCats[scName]) superCats[scName] = { name: scName, id: null, categories: {} };
      if (!superCats[scName].categories[cName]) superCats[scName].categories[cName] = { name: cName, sub_categories: {} };
      const subKey = subName || ss.parent_name;
      if (!superCats[scName].categories[cName].sub_categories[subKey]) {
        superCats[scName].categories[cName].sub_categories[subKey] = { name: subKey, id: ss.parent_id, leaf_categories: [] };
      }
      superCats[scName].categories[cName].sub_categories[subKey].leaf_categories.push({
        id: ss.id,
        name: ss.name,
        min_products: ss.min_products,
        max_products: ss.max_products,
        path: chain.join(' > '),
      });
    }
  }
  
  // Convert to final JSON format
  const finalTree = Object.values(superCats).map(sc => ({
    category_id: sc.id,
    category_name: sc.name,
    level: 1,
    leaf: false,
    path: sc.name,
    children: Object.values(sc.categories).map(c => ({
      category_id: c.id || null,
      category_name: c.name,
      level: 2,
      leaf: false,
      path: `${sc.name} > ${c.name}`,
      children: Object.values(c.sub_categories).map(sub => ({
        category_id: sub.id,
        category_name: sub.name,
        level: 3,
        leaf: false,
        path: `${sc.name} > ${c.name} > ${sub.name}`,
        children: sub.leaf_categories.map(lc => ({
          category_id: lc.id,
          category_name: lc.name,
          level: 4,
          leaf: true,
          path: lc.path || `${sc.name} > ${c.name} > ${sub.name} > ${lc.name}`,
          min_products: lc.min_products,
          max_products: lc.max_products,
          children: [],
        })),
      })),
    })),
  }));
  
  // Create flat leaf list
  const leafList = [];
  function extractLeaves(nodes) {
    for (const n of nodes) {
      if (n.leaf) {
        leafList.push({
          category_id: n.category_id,
          category_name: n.category_name,
          path: n.path,
          level: n.level,
          min_products: n.min_products,
          max_products: n.max_products,
        });
      }
      if (n.children?.length) extractLeaves(n.children);
    }
  }
  extractLeaves(finalTree);
  
  // Save outputs
  fs.writeFileSync(path.join(OUTPUT_DIR, 'categories.json'), JSON.stringify(finalTree, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'leaf_categories.json'), JSON.stringify(leafList, null, 2));
  
  // Print summary
  console.log('\n══════════════════════════════════════════════════');
  console.log('  CRAWL COMPLETE');
  console.log('══════════════════════════════════════════════════');
  console.log(`\nSUPER CATEGORIES (${finalTree.length}):`);
  finalTree.sort((a, b) => a.category_name.localeCompare(b.category_name)).forEach(sc => {
    let catCount = 0, subCount = 0, leafCount = 0;
    sc.children.forEach(c => { catCount++; c.children.forEach(sub => { subCount++; leafCount += sub.children.length; }); });
    console.log(`  📁 ${sc.category_name}: ${catCount} categories, ${subCount} sub-cats, ${leafCount} leaf`);
  });
  
  console.log(`\nTotal leaf categories: ${leafList.length}`);
  console.log(`Total sscat in raw tree: ${allSscats.length}`);
  console.log(`\nOutput files:`);
  console.log(`  → meesho_output/categories.json (full tree)`);
  console.log(`  → meesho_output/leaf_categories.json (flat leaf list)`);
  
  await browser.close();
}

main().catch(e => { console.error('Error:', e); process.exit(1); });
