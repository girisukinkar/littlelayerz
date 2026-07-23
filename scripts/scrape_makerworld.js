const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');

const SUPABASE_URL = 'https://wgboyqvwrxzhzmibooyd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnYm95cXZ3cnh6aHptaWJvb3lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzA3MjgsImV4cCI6MjA5NzIwNjcyOH0.idbxjPuhH05VYs4yhFykI_ryoo2ypRtuDG9VQcmw5hU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
      }
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  const urlArg = process.argv[2];
  if (!urlArg) {
    console.log('\n=================================================');
    console.log('MakerWorld Automatic Scraper & Supabase Uploader');
    console.log('Usage: node scripts/scrape_makerworld.js <MAKERWORLD_URL>');
    console.log('Example: node scripts/scrape_makerworld.js https://makerworld.com/en/models/2547928-pikachu-glasses-holder');
    console.log('=================================================\n');
    process.exit(0);
  }

  console.log(`\n=================================================`);
  console.log(`Scraping Target: ${urlArg}`);
  console.log(`=================================================`);

  let browser;
  let page;

  try {
    try {
      console.log('Connecting to browser via CDP (127.0.0.1:9222)...');
      browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
      const context = browser.contexts()[0];
      page = context.pages().find(p => p.url().includes('makerworld.com')) || await context.newPage();
    } catch (e) {
      console.log('Launching headless browser session...');
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        viewport: { width: 1400, height: 900 }
      });
      page = await context.newPage();
    }

    await page.goto(urlArg, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Scroll page to trigger lazy loading
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => window.scrollBy(0, 400));
      await page.waitForTimeout(800);
    }

    // Extract title
    let title = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      if (h1 && h1.innerText.trim()) return h1.innerText.trim();
      const meta = document.querySelector('meta[property="og:title"]');
      return meta ? meta.content.replace(' | MakerWorld', '').trim() : '';
    });

    const slugMatch = urlArg.match(/\/models\/([a-z0-9-]+)/i);
    const slug = slugMatch ? slugMatch[1] : `mw-${Date.now()}`;

    if (!title || title.includes('Just a moment')) {
      title = slug.replace(/^\d+-/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    console.log(`📌 Title: "${title}"`);
    console.log(`📌 Slug: "${slug}"`);

    // Extract all image URLs directly from rendered browser DOM
    const rawImageUrls = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      const list = [];
      imgs.forEach(img => {
        const src = img.currentSrc || img.src || img.getAttribute('data-src') || '';
        if (src && (src.includes('bambulab') || src.includes('makerworld') || src.includes('oss') || src.includes('cdn'))) {
          if (!src.includes('avatar') && !src.includes('icon') && !src.includes('logo') && !src.includes('svg')) {
            list.push(src);
          }
        }
      });
      return Array.from(new Set(list));
    });

    console.log(`Found ${rawImageUrls.length} image URLs in page DOM.`);

    const uploadedUrls = [];

    for (let i = 0; i < Math.min(rawImageUrls.length, 6); i++) {
      const imgUrl = rawImageUrls[i];
      try {
        const buffer = await fetchBuffer(imgUrl);
        if (buffer.length < 25000) continue;

        const fileName = `scraped/${slug}_${Date.now()}_${i}.jpeg`;
        const { error: uploadErr } = await supabase.storage
          .from('product-images')
          .upload(fileName, buffer, { contentType: 'image/jpeg', upsert: true });

        if (!uploadErr) {
          const { data: pubData } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName);

          if (pubData?.publicUrl) {
            uploadedUrls.push(pubData.publicUrl);
            console.log(`  ✅ Downloaded & uploaded image ${i+1} to Supabase Storage: ${pubData.publicUrl}`);
          }
        } else {
          uploadedUrls.push(imgUrl);
        }
      } catch (e) {
        console.warn(`  Failed image ${imgUrl}:`, e.message);
      }
    }

    const mainImg = uploadedUrls[0] || 'https://makerworld.com/placeholder.png';
    const imagesList = uploadedUrls.length > 0 ? uploadedUrls : [mainImg];

    let weight = 70;
    let printTime = '2h 45m';
    let dimensions = '120 × 80 × 90 mm';
    let price = 299;

    const lowerSlug = slug.toLowerCase();
    if (lowerSlug.includes('holder') || lowerSlug.includes('stand')) {
      weight = 65;
      printTime = '2h 30m';
      dimensions = '110 × 75 × 85 mm';
    } else if (lowerSlug.includes('organizer') || lowerSlug.includes('box')) {
      weight = 130;
      printTime = '4h 15m';
      dimensions = '160 × 120 × 95 mm';
      price = 349;
    }

    const imageUrlJSON = JSON.stringify({
      main_image: mainImg,
      images: imagesList,
      makerworld_url: urlArg,
      slug: slug,
      dimensions: dimensions,
    });

    const payload = {
      name: title,
      selling_price: price,
      filament_weight: weight,
      print_time: printTime,
      cost_per_kg: 1500,
      packaging_cost: 15,
      delivery_cost: 40,
      image_url: imageUrlJSON,
    };

    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .or(`name.ilike.%${title.split(' ')[0]}%,image_url.cs.{"slug":"${slug}"}`);

    if (existing && existing.length > 0) {
      const { data: updated, error: updateErr } = await supabase
        .from('products')
        .update(payload)
        .eq('id', existing[0].id)
        .select();

      if (updateErr) console.error('Update Error:', updateErr);
      else console.log('✅ Updated product record in Supabase database!', updated[0]?.id);
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from('products')
        .insert(payload)
        .select();

      if (insertErr) console.error('Insert Error:', insertErr);
      else console.log('🎉 Successfully added product record to Supabase database!', inserted[0]?.id);
    }
  } catch (err) {
    console.error('Scraper Exception:', err.message);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

main();
