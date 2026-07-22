const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const client = url.startsWith('https') ? https : http;
    const request = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
      }
    }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: Status ${response.statusCode}`));
      }

      const fileStream = fs.createWriteStream(dest);
      response.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve(dest);
      });
      fileStream.on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    });

    request.on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  console.log('Connecting to browser via CDP...');
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const page = context.pages().find(p => p.url().includes('makerworld.com')) || await context.newPage();

  await page.bringToFront();

  // Load existing unique models list or fetch from collection
  let modelLinks = [];
  if (fs.existsSync('unique_models.json')) {
    modelLinks = JSON.parse(fs.readFileSync('unique_models.json', 'utf-8'));
  }

  if (!modelLinks.length) {
    console.log('Navigating and scrolling collection page...');
    await page.goto('https://makerworld.com/en/collections/31475311-kids-puzzle', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1500);
    }

    modelLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/models/"]'));
      const itemsMap = new Map();

      links.forEach(a => {
        const href = a.href;
        const cleanHref = href.split('?')[0].split('#')[0];
        const match = cleanHref.match(/\/models\/(\d+-[a-z0-9-]+)/);
        if (match) {
          const slug = match[1];
          const titleText = a.innerText.trim() || a.getAttribute('title') || '';
          if (!itemsMap.has(slug) || (titleText && !itemsMap.get(slug).title)) {
            itemsMap.set(slug, {
              url: cleanHref,
              slug: slug,
              title: titleText
            });
          }
        }
      });

      return Array.from(itemsMap.values());
    });

    fs.writeFileSync('unique_models.json', JSON.stringify(modelLinks, null, 2));
  }

  console.log(`Found ${modelLinks.length} unique models to scrape.`);

  const publicDir = path.join(__dirname, 'public', 'images', 'catalog');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const catalogData = [];

  for (let i = 0; i < modelLinks.length; i++) {
    const item = modelLinks[i];
    console.log(`\n[${i + 1}/${modelLinks.length}] Processing: ${item.title || item.slug}`);

    try {
      await page.goto(item.url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const details = await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        const title = h1 ? h1.innerText.trim() : '';

        // Description
        const descEl = document.querySelector('.model-description, [class*="description"], [class*="Description"]');
        const description = descEl ? descEl.innerText.trim() : '';

        // Author
        const authorEl = document.querySelector('[class*="design-user"], [class*="author"], [class*="Creator"]');
        const author = authorEl ? authorEl.innerText.trim() : '';

        // Filter high quality showcase gallery images
        const galleryImgs = Array.from(document.querySelectorAll('.swiper-slide img, [class*="carousel"] img, [class*="gallery"] img, [class*="Slide"] img, [class*="cover"] img, main img'));
        const imagesSet = new Set();

        galleryImgs.forEach(img => {
          let src = img.src || img.getAttribute('data-src') || img.getAttribute('srcset');
          if (!src) return;
          src = src.split(' ')[0]; // in case of srcset
          const width = img.naturalWidth || img.width || 500;
          const height = img.naturalHeight || img.height || 500;

          // Skip small images, avatars, badges
          if (width < 150 || height < 150) return;
          if (src.includes('avatar') || src.includes('logo') || src.includes('icon') || src.includes('badge')) return;
          if (src.includes('makerworld') || src.includes('bambu') || src.includes('oss') || src.includes('cdn') || src.includes('v2m') || src.includes('image')) {
            // Strip resize parameters if possible to get original high-res image
            const cleanUrl = src.split('?x-oss-process')[0].split('?')[0];
            imagesSet.add(cleanUrl);
          }
        });

        // Fallback to any prominent image if gallery container is styled differently
        if (imagesSet.size === 0) {
          const allImgs = Array.from(document.querySelectorAll('img'));
          allImgs.forEach(img => {
            const src = img.src || img.getAttribute('data-src');
            if (src && !src.includes('avatar') && !src.includes('logo') && (img.width > 200 || !img.width)) {
              imagesSet.add(src.split('?')[0]);
            }
          });
        }

        return {
          title,
          description,
          author,
          images: Array.from(imagesSet).slice(0, 10) // Limit to top 10 best images per model
        };
      });

      console.log(`  Title: ${details.title || item.title}`);
      console.log(`  Found ${details.images.length} main model images.`);

      const itemFolder = path.join(publicDir, item.slug);
      if (!fs.existsSync(itemFolder)) {
        fs.mkdirSync(itemFolder, { recursive: true });
      }

      const localImages = [];
      for (let imgIdx = 0; imgIdx < details.images.length; imgIdx++) {
        const imgUrl = details.images[imgIdx];
        const ext = imgUrl.includes('.png') ? '.png' : imgUrl.includes('.webp') ? '.webp' : '.jpg';
        const filename = `image_${imgIdx + 1}${ext}`;
        const localPath = path.join(itemFolder, filename);
        const publicRelativeUrl = `/images/catalog/${item.slug}/${filename}`;

        try {
          await downloadFile(imgUrl, localPath);
          localImages.push(publicRelativeUrl);
          console.log(`    Saved ${filename}`);
        } catch (downloadErr) {
          console.error(`    Failed ${imgUrl}: ${downloadErr.message}`);
        }
      }

      const itemRecord = {
        id: `mw-${item.slug}`,
        slug: item.slug,
        name: details.title || item.title || item.slug,
        author: details.author || 'MakerWorld Designer',
        description: details.description || 'Custom 3D printable Kids Puzzle model from MakerWorld collection.',
        makerworld_url: item.url,
        price: 299, // default initial price (editable by user)
        cost_price: 50,
        print_time: '2h 15m',
        filament_weight: 45, // grams
        images: localImages,
        main_image: localImages[0] || '',
        category: 'Kids Puzzle',
        created_at: new Date().toISOString()
      };

      catalogData.push(itemRecord);

    } catch (err) {
      console.error(`  Error processing model ${item.slug}:`, err.message);
    }
  }

  const catalogJsonPath = path.join(__dirname, 'src', 'data', 'catalog_puzzles.json');
  const dataDir = path.dirname(catalogJsonPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(catalogJsonPath, JSON.stringify(catalogData, null, 2));
  console.log(`\nSuccessfully scraped all ${catalogData.length} items & saved images!`);

  await browser.close();
}

main().catch(console.error);
