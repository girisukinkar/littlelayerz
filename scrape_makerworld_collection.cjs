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
        // Check size to remove small diamond/point icons (< 60 KB)
        const stats = fs.statSync(dest);
        if (stats.size < 60000) {
          fs.unlink(dest, () => {});
          return reject(new Error(`File too small (${stats.size} bytes), skipped icon.`));
        }
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
  const targetUrl = process.argv[2] || 'https://makerworld.com/en/collections/31475311-kids-puzzle';
  console.log(`=================================================`);
  console.log(`MakerWorld Collection Scraper`);
  console.log(`Target URL: ${targetUrl}`);
  console.log(`=================================================\n`);

  let browser;
  let page;

  try {
    console.log('Connecting to active browser via CDP (http://127.0.0.1:9222)...');
    browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    const context = browser.contexts()[0];
    page = context.pages().find(p => p.url().includes('makerworld.com')) || await context.newPage();
  } catch (cdpErr) {
    console.warn('CDP Connection failed, launching new Chromium instance:', cdpErr.message);
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
    });
    page = await context.newPage();
  }

  await page.bringToFront();

  // Load existing catalog database to skip existing items
  const catalogJsonPath = path.join(__dirname, 'src', 'data', 'catalog_puzzles.json');
  let catalogData = [];
  if (fs.existsSync(catalogJsonPath)) {
    try {
      catalogData = JSON.parse(fs.readFileSync(catalogJsonPath, 'utf-8'));
    } catch (e) {
      catalogData = [];
    }
  }

  const existingSlugs = new Set(catalogData.map(item => item.slug));
  console.log(`Loaded ${existingSlugs.size} existing models from catalog database.`);

  console.log('Navigating to collection page...');
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Scroll down to load all lazy-loaded cards
  console.log('Scrolling page to load all items...');
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1500);
  }

  // Extract model links from collection
  const allCollectionLinks = await page.evaluate(() => {
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

  console.log(`Total models found in collection: ${allCollectionLinks.length}`);

  // Filter out already scraped items!
  const newModelsToScrape = allCollectionLinks.filter(item => !existingSlugs.has(item.slug));

  console.log(`\n-------------------------------------------------`);
  console.log(`Already Scraped (Skipped): ${allCollectionLinks.length - newModelsToScrape.length}`);
  console.log(`New Models to Scrape: ${newModelsToScrape.length}`);
  console.log(`-------------------------------------------------\n`);

  if (newModelsToScrape.length === 0) {
    console.log('✨ All models in this collection are already scraped and up-to-date!');
    return;
  }

  const publicDir = path.join(__dirname, 'public', 'images', 'catalog');

  for (let i = 0; i < newModelsToScrape.length; i++) {
    const item = newModelsToScrape[i];
    console.log(`[${i + 1}/${newModelsToScrape.length}] Processing new model: ${item.title || item.slug}`);

    try {
      await page.goto(item.url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const details = await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        const title = h1 ? h1.innerText.trim() : '';

        const descEl = document.querySelector('.model-description, [class*="description"], [class*="Description"]');
        const description = descEl ? descEl.innerText.trim() : '';

        const authorEl = document.querySelector('[class*="design-user"], [class*="author"], [class*="Creator"]');
        const author = authorEl ? authorEl.innerText.trim() : '';

        const galleryImgs = Array.from(document.querySelectorAll('.swiper-slide img, [class*="carousel"] img, [class*="gallery"] img, [class*="Slide"] img, [class*="cover"] img, main img'));
        const imagesSet = new Set();

        galleryImgs.forEach(img => {
          let src = img.src || img.getAttribute('data-src') || img.getAttribute('srcset');
          if (!src) return;
          src = src.split(' ')[0];
          const width = img.naturalWidth || img.width || 500;
          const height = img.naturalHeight || img.height || 500;

          if (width < 150 || height < 150) return;
          if (src.includes('avatar') || src.includes('logo') || src.includes('icon') || src.includes('badge') || src.includes('point') || src.includes('boost')) return;

          if (src.includes('makerworld') || src.includes('bambu') || src.includes('oss') || src.includes('cdn') || src.includes('v2m') || src.includes('image')) {
            const cleanUrl = src.split('?x-oss-process')[0].split('?')[0];
            imagesSet.add(cleanUrl);
          }
        });

        return {
          title,
          description,
          author,
          images: Array.from(imagesSet).slice(0, 10)
        };
      });

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
          // ignore skipped small icons
        }
      }

      const itemRecord = {
        id: `mw-${item.slug}`,
        slug: item.slug,
        name: details.title || item.title || item.slug,
        author: details.author || '',
        description: details.description || '',
        makerworld_url: item.url,
        price: 299,
        cost_price: 50,
        print_time: '2h 15m',
        filament_weight: 45,
        images: localImages,
        main_image: localImages[0] || '',
        category: 'Scraped Model',
        created_at: new Date().toISOString()
      };

      catalogData.push(itemRecord);
      existingSlugs.add(item.slug);

    } catch (err) {
      console.error(`  Error processing ${item.slug}:`, err.message);
    }
  }

  fs.writeFileSync(catalogJsonPath, JSON.stringify(catalogData, null, 2));
  console.log(`\n🎉 Successfully added new models! Total catalog database count: ${catalogData.length}`);
}

main().catch(console.error);
