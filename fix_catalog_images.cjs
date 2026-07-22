const fs = require('fs');
const path = require('path');

const catalogPath = path.join(__dirname, 'src', 'data', 'catalog_puzzles.json');
const publicDir = path.join(__dirname, 'public');

if (!fs.existsSync(catalogPath)) {
  console.error('Catalog JSON not found:', catalogPath);
  process.exit(1);
}

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
console.log(`Processing ${catalog.length} items to remove diamond/reward icons...`);

let totalFixed = 0;

catalog.forEach((item) => {
  const filteredImages = [];

  item.images.forEach((relUrl) => {
    const fullPath = path.join(publicDir, relUrl);
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      // Skip small icons (< 60 KB) which are points/boosts/diamonds or placeholders
      if (stats.size > 60000) {
        filteredImages.push(relUrl);
      } else {
        console.log(`  [${item.slug}] Removing small icon ${relUrl} (${stats.size} bytes)`);
      }
    } else {
      console.log(`  [${item.slug}] File missing ${relUrl}`);
    }
  });

  if (filteredImages.length > 0) {
    item.images = filteredImages;
    item.main_image = filteredImages[0];
    totalFixed++;
  } else {
    console.warn(`  [${item.slug}] No images remaining > 60KB, keeping all.`);
  }
});

fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
console.log(`Successfully updated ${totalFixed} catalog items! Main image now points to real 3D product photo.`);
