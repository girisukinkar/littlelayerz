const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://wgboyqvwrxzhzmibooyd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnYm95cXZ3cnh6aHptaWJvb3lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzA3MjgsImV4cCI6MjA5NzIwNjcyOH0.idbxjPuhH05VYs4yhFykI_ryoo2ypRtuDG9VQcmw5hU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function scrapeLikeHuman(urlArg) {
  console.log(`\n=================================================`);
  console.log(`MakerWorld Human-Style Image Downloader & Scraper`);
  console.log(`Target URL: ${urlArg}`);
  console.log(`=================================================\n`);

  let browser;
  let page;

  try {
    try {
      console.log('Connecting to active browser via CDP (http://127.0.0.1:9222)...');
      browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
      const context = browser.contexts()[0];
      page = context.pages().find(p => p.url().includes('makerworld.com')) || await context.newPage();
    } catch (e) {
      console.log('Launching browser session...');
      browser = await chromium.launch({ headless: false });
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        viewport: { width: 1400, height: 900 }
      });
      page = await context.newPage();
    }

    await page.goto(urlArg, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3000);

    // Extract title & slug
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

    // Ensure local directory exists: public/images/catalog/<slug>/
    const localDir = path.join(__dirname, '..', 'public', 'images', 'catalog', slug);
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }

    console.log(`📁 Local directory ready: public/images/catalog/${slug}/`);

    // Human-style image extraction: Convert image element to base64 Data URL inside browser context
    const imageBase64List = await page.evaluate(async () => {
      const imgs = Array.from(document.querySelectorAll('img'));
      const results = [];

      for (const img of imgs) {
        const src = img.currentSrc || img.src || '';
        if (src && (src.includes('bambulab') || src.includes('makerworld') || src.includes('oss') || src.includes('cdn'))) {
          if (!src.includes('avatar') && !src.includes('icon') && !src.includes('logo') && !src.includes('svg')) {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth || img.width || 800;
              canvas.height = img.naturalHeight || img.height || 600;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
              if (dataUrl.length > 5000) {
                results.push(dataUrl);
              }
            } catch (e) {
              // Ignore cross-origin canvas taint
            }
          }
        }
      }
      return results;
    });

    console.log(`Extracted ${imageBase64List.length} image buffers from browser session.`);

    const localImagePaths = [];
    const supabaseUrls = [];

    for (let i = 0; i < Math.min(imageBase64List.length, 5); i++) {
      const base64Data = imageBase64List[i].replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // 1. Save Image to Local Directory (like "Save Image As...")
      const localFileName = `cover_${i + 1}.jpg`;
      const localFilePath = path.join(localDir, localFileName);
      fs.writeFileSync(localFilePath, buffer);
      console.log(`💾 Saved to local directory: public/images/catalog/${slug}/${localFileName}`);
      localImagePaths.push(`/images/catalog/${slug}/${localFileName}`);

      // 2. Upload from local directory to Supabase Storage
      const storagePath = `catalog/${slug}/${localFileName}`;
      const { error: uploadErr } = await supabase.storage
        .from('product-images')
        .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true });

      if (!uploadErr) {
        const { data: pubData } = supabase.storage.from('product-images').getPublicUrl(storagePath);
        if (pubData?.publicUrl) {
          supabaseUrls.push(pubData.publicUrl);
          console.log(`☁️ Uploaded to Supabase Storage: ${pubData.publicUrl}`);
        }
      }
    }

    const mainPhoto = supabaseUrls[0] || localImagePaths[0] || '/placeholder.png';
    const photosList = supabaseUrls.length > 0 ? supabaseUrls : localImagePaths;

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
      main_image: mainPhoto,
      images: photosList,
      makerworld_url: urlArg,
      slug: slug,
      dimensions: dimensions,
      local_paths: localImagePaths,
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

      if (updateErr) console.error('❌ Update Error:', updateErr);
      else console.log('✅ Updated product in Supabase database!', updated[0]?.id);
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from('products')
        .insert(payload)
        .select();

      if (insertErr) console.error('❌ Insert Error:', insertErr);
      else console.log('🎉 Added product to Supabase database!', inserted[0]?.id);
    }

  } catch (err) {
    console.error('Human Scraper Exception:', err.message);
  }
}

const targetUrl = process.argv[2] || 'https://makerworld.com/en/models/2547928-pikachu-glasses-holder';
scrapeLikeHuman(targetUrl);
