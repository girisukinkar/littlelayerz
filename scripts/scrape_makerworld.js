import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wgboyqvwrxzhzmibooyd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnYm95cXZ3cnh6aHptaWJvb3lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzA3MjgsImV4cCI6MjA5NzIwNjcyOH0.idbxjPuhH05VYs4yhFykI_ryoo2ypRtuDG9VQcmw5hU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function parseUrl(urlStr) {
  const clean = urlStr.trim();
  const slugMatch = clean.match(/\/models\/([a-z0-9-]+)/i);
  const slug = slugMatch ? slugMatch[1] : `mw-${Date.now()}`;

  const title = slug
    .replace(/^\d+-/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const modelIdMatch = slug.match(/^(\d+)/);
  const modelId = modelIdMatch ? modelIdMatch[1] : '';

  const cdnCover = modelId
    ? `https://v3b.bambulab.com/makerworld/model/US${modelId}/design/cover.jpg`
    : 'https://makerworld.com/placeholder.png';

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
  } else if (lowerSlug.includes('keychain') || lowerSlug.includes('card')) {
    weight = 35;
    printTime = '1h 15m';
    dimensions = '80 × 50 × 40 mm';
    price = 149;
  }

  return { title, slug, url: clean, cdnCover, weight, printTime, dimensions, price };
}

async function main() {
  const urlArg = process.argv[2];
  if (!urlArg) {
    console.log('\n=================================================');
    console.log('MakerWorld Import Service');
    console.log('Usage: node scripts/scrape_makerworld.js <MAKERWORLD_URL> [PHOTO_URL] [SELLING_PRICE]');
    console.log('Example: node scripts/scrape_makerworld.js https://makerworld.com/en/models/2547928-pikachu-glasses-holder');
    console.log('=================================================\n');
    process.exit(0);
  }

  const customPhoto = process.argv[3];
  const customPrice = parseFloat(process.argv[4]);

  const parsed = parseUrl(urlArg);
  const finalImage = customPhoto?.trim() || parsed.cdnCover;
  const finalPrice = customPrice && customPrice > 0 ? customPrice : parsed.price;

  console.log(`\nImporting MakerWorld Model...`);
  console.log(`📌 Title: ${parsed.title}`);
  console.log(`📌 Slug: ${parsed.slug}`);
  console.log(`📌 Price: ₹${finalPrice}`);
  console.log(`📌 Dimensions: ${parsed.dimensions}`);

  const imageUrlJSON = JSON.stringify({
    main_image: finalImage,
    images: [finalImage],
    makerworld_url: parsed.url,
    slug: parsed.slug,
    dimensions: parsed.dimensions,
  });

  const payload = {
    name: parsed.title,
    selling_price: finalPrice,
    filament_weight: parsed.weight,
    print_time: parsed.printTime,
    cost_per_kg: 1500,
    packaging_cost: 15,
    delivery_cost: 40,
    image_url: imageUrlJSON,
  };

  const { data: existing } = await supabase
    .from('products')
    .select('id')
    .or(`name.ilike.%${parsed.title.split(' ')[0]}%,image_url.cs.{"slug":"${parsed.slug}"}`);

  if (existing && existing.length > 0) {
    const { data: updated, error: updateErr } = await supabase
      .from('products')
      .update(payload)
      .eq('id', existing[0].id)
      .select();

    if (updateErr) console.error('❌ Update Error:', updateErr);
    else console.log('✅ Successfully updated product in Supabase database!', updated);
  } else {
    const { data: inserted, error: insertErr } = await supabase
      .from('products')
      .insert(payload)
      .select();

    if (insertErr) console.error('❌ Insert Error:', insertErr);
    else console.log('🎉 Successfully added product to Supabase catalog!', inserted);
  }
}

main();
