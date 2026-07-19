#!/usr/bin/env node
/**
 * Parse the complete Meesho category tree from local data.
 * 
 * Input:  meesho_output/endpoint_getCategoryTree.json
 *         Format: [{type:"super-category", id, name, children:[{type:"category",...}]}]
 * 
 * Outputs:
 *   categories.json       — full nested tree
 *   leaf_categories.json  — flat list of all leaf (sub-sub-category) nodes
 *   attributes.json       — placeholder (attributes require per-category API calls)
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = './meesho_output';

// Type label map for clean output
const LEVEL_MAP = {
  'super-category': 1,
  'category': 2,
  'sub-category': 3,
  'sub-sub-category': 4,
};

const TYPE_LABEL = {
  'super-category': 'super_category',
  'category': 'category',
  'sub-category': 'sub_category',
  'sub-sub-category': 'leaf_category',
};

// Load the raw tree
console.log('Loading getCategoryTree.json...');
const rawTree = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'endpoint_getCategoryTree.json'), 'utf-8'));
console.log(`  ${rawTree.length} top-level super-categories\n`);

// ─── Recursive tree transformer ──────────────────────────────────────────────
function transformNode(node, parentPath = '', ancestorIds = []) {
  const level = LEVEL_MAP[node.type] || 0;
  const currentPath = parentPath ? `${parentPath} > ${node.name}` : node.name;
  const isLeaf = node.type === 'sub-sub-category' || !node.children || node.children.length === 0;
  
  const transformed = {
    id: node.id,
    name: node.name,
    type: TYPE_LABEL[node.type] || node.type,
    level,
    leaf: isLeaf,
    path: currentPath,
    ancestor_ids: [...ancestorIds],
  };
  
  if (node.data) {
    transformed.min_products = node.data.min_products;
    transformed.max_products = node.data.max_products;
  }
  
  if (node.children && node.children.length > 0) {
    transformed.children = node.children.map(child =>
      transformNode(child, currentPath, [...ancestorIds, node.id])
    );
  } else {
    transformed.children = [];
  }
  
  return transformed;
}

// Transform entire tree
const tree = rawTree.map(superCat => transformNode(superCat));

// ─── Extract leaf categories ──────────────────────────────────────────────────
function extractLeaves(nodes, result = []) {
  for (const node of nodes) {
    if (node.leaf && node.type === 'leaf_category') {
      result.push({
        id: String(node.id),
        name: node.name,
        path: node.path,
        level: node.level,
        min_products: node.min_products || null,
        max_products: node.max_products || null,
        ancestor_ids: node.ancestor_ids,
        // Extract hierarchy from path
        super_category: node.path.split(' > ')[0] || null,
        category: node.path.split(' > ')[1] || null,
        sub_category: node.path.split(' > ')[2] || null,
        leaf_category: node.path.split(' > ')[3] || null,
      });
    }
    if (node.children?.length) extractLeaves(node.children, result);
  }
  return result;
}

const leafCategories = extractLeaves(tree);

// ─── Build stats ──────────────────────────────────────────────────────────────
let totalCats = 0, totalSubs = 0, totalLeaves = 0;
tree.forEach(sc => {
  sc.children.forEach(c => {
    totalCats++;
    c.children.forEach(sub => {
      totalSubs++;
      totalLeaves += sub.children.length;
    });
  });
});

// ─── Save files ───────────────────────────────────────────────────────────────
fs.writeFileSync(path.join(OUTPUT_DIR, 'categories.json'), JSON.stringify(tree, null, 2));
fs.writeFileSync(path.join(OUTPUT_DIR, 'leaf_categories.json'), JSON.stringify(leafCategories, null, 2));

// Save a compact version for easy reading
const compact = tree.map(sc => ({
  id: sc.id,
  name: sc.name,
  child_count: sc.children.length,
  children: sc.children.map(c => ({
    id: c.id,
    name: c.name,
    child_count: c.children.length,
    children: c.children.map(sub => ({
      id: sub.id,
      name: sub.name,
      leaf_count: sub.children.length,
      leaves: sub.children.map(lc => ({ id: lc.id, name: lc.name })),
    })),
  })),
}));
fs.writeFileSync(path.join(OUTPUT_DIR, 'categories_compact.json'), JSON.stringify(compact, null, 2));

// ─── Print full summary ───────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════════════════════════');
console.log('  MEESHO COMPLETE CATEGORY SYSTEM');
console.log('═══════════════════════════════════════════════════════════════\n');
console.log(`Super Categories:  ${tree.length}`);
console.log(`Categories:        ${totalCats}`);
console.log(`Sub-Categories:    ${totalSubs}`);
console.log(`Leaf Categories:   ${totalLeaves}\n`);

tree.forEach(sc => {
  let catCount = 0, subCount = 0, leafCount = 0;
  sc.children.forEach(c => {
    catCount++;
    c.children.forEach(sub => {
      subCount++;
      leafCount += sub.children.length;
    });
  });
  console.log(`📁 ${sc.name} (id:${sc.id})`);
  console.log(`   → ${catCount} categories, ${subCount} sub-cats, ${leafCount} leaves`);
  
  // Show first few leaves
  sc.children.slice(0, 2).forEach(c => {
    console.log(`   ├── ${c.name}`);
    c.children.slice(0, 2).forEach(sub => {
      console.log(`   │   ├── ${sub.name}`);
      sub.children.slice(0, 3).forEach(lc => {
        console.log(`   │   │   • ${lc.name} (id:${lc.id})`);
      });
      if (sub.children.length > 3) console.log(`   │   │   ... +${sub.children.length - 3} more`);
    });
    if (c.children.length > 2) console.log(`   │   ... +${c.children.length - 2} more sub-cats`);
  });
  if (sc.children.length > 2) console.log(`   ... +${sc.children.length - 2} more categories`);
  console.log();
});

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  OUTPUT FILES');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  categories.json          ${leafCategories.length + totalSubs + totalCats + tree.length} total nodes, full nested tree`);
console.log(`  categories_compact.json  human-readable summary`);
console.log(`  leaf_categories.json     ${leafCategories.length} leaf categories (flat list)`);
console.log('\nDone! ✅');
