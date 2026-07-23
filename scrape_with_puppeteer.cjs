const puppeteer = require('puppeteer');
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

async function scrapeImages(browser, targetUrl, slug, dbId) {
  console.log(`\n=================================================`);
  console.log(`Scraping Photos for: ${targetUrl}`);
  console.log(`=================================================`);

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  try {
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise(r => setTimeout(r, 4000));

    // Scroll to load all images in model carousel/gallery
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 300));
      await new Promise(r => setTimeout(r, 800));
    }

    // Extract all image sources from gallery and main display
    const rawImageUrls = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      const found = [];
      imgs.forEach(img => {
        const src = img.currentSrc || img.src || img.getAttribute('data-src') || '';
        if (src && (src.includes('bambulab') || src.includes('makerworld') || src.includes('oss') || src.includes('cdn'))) {
          if (!src.includes('avatar') && !src.includes('icon') && !src.includes('logo') && !src.includes('svg')) {
            found.push(src);
          }
        }
      });
      return Array.from(new Set(found));
    });

    console.log(`Found ${rawImageUrls.length} image URLs in page DOM.`);

    const uploadedUrls = [];

    for (let i = 0; i < Math.min(rawImageUrls.length, 8); i++) {
      const imgUrl = rawImageUrls[i];
      try {
        const buffer = await fetchBuffer(imgUrl);
        if (buffer.length < 25000) continue; // Skip icons < 25KB

        const fileExt = 'jpeg';
        const fileName = `scraped/${slug}_${Date.now()}_${i}.${fileExt}`;

        const { error: uploadErr } = await supabase.storage
          .from('product-images')
          .upload(fileName, buffer, { contentType: 'image/jpeg', upsert: true });

        if (!uploadErr) {
          const { data: pubData } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName);

          if (pubData?.publicUrl) {
            uploadedUrls.push(pubData.publicUrl);
            console.log(`  ✅ Uploaded image ${i+1} to Supabase Storage: ${pubData.publicUrl}`);
          }
        } else {
          console.warn('  Upload warning:', uploadErr.message);
        }
      } catch (e) {
        console.warn(`  Failed downloading image: ${e.message}`);
      }
    }

    if (uploadedUrls.length > 0) {
      const mainImg = uploadedUrls[0];
      const imageUrlJSON = JSON.stringify({
        main_image: mainImg,
        images: uploadedUrls,
        makerworld_url: targetUrl,
        slug: slug,
        dimensions: slug.includes('hairstylist') ? '115 × 65 × 80 mm' : '135 × 95 × 120 mm',
      });

      const { error: updateErr } = await supabase
        .from('products')
        .update({ image_url: imageUrlJSON })
        .eq('id', dbId);

      if (updateErr) {
        console.error('DB Update Error:', updateErr);
      } else {
        console.log(`🎉 Successfully updated product ${dbId} with ${uploadedUrls.length} Supabase images!`);
      }
    } else {
      console.warn('No high-res product photos downloaded.');
    }
  } catch (err) {
    console.error('Error during scraping:', err.message);
  } finally {
    await page.close();
  }
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // Fetch the 2 target product IDs from Supabase
  const { data: products } = await supabase.from('products').select('*');

  const pikachuProd = products?.find(p => p.name.includes('Pikachu'));
  const hairstylistProd = products?.find(p => p.name.includes('Hairstylist'));

  if (pikachuProd) {
    await scrapeImages(
      browser,
      'https://makerworld.com/en/models/2547928-pikachu-glasses-holder-no-supports-snap-fit#profileId-2805803',
      '2547928-pikachu-glasses-holder',
      pikachuProd.id
    );
  }

  if (hairstylistProd) {
    await scrapeImages(
      browser,
      'https://makerworld.com/en/models/2666445-hairstylist-business-card-holder#profileId-2950581',
      '2666445-hairstylist-business-card-holder',
      hairstylistProd.id
    );
  }

  await browser.close();
}

main();
