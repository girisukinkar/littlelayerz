import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { CatalogItem } from '../pages/Catalog';

export interface ScrapedMakerWorldData {
  title: string;
  slug: string;
  makerworldUrl: string;
  mainImage: string;
  images: string[];
  printTime: string;
  filamentWeight: number;
  dimensions: string;
  sellingPrice: number;
}

/**
 * Parses any MakerWorld model URL and extracts clean product details,
 * title, slug, and CDN image fallbacks.
 */
export const parseMakerWorldUrl = (inputUrl: string): ScrapedMakerWorldData => {
  const urlStr = inputUrl.trim();

  // Extract slug from URL pattern e.g. /models/2547928-pikachu-glasses-holder
  const slugMatch = urlStr.match(/\/models\/([a-z0-9-]+)/i);
  const rawSlug = slugMatch ? slugMatch[1] : `mw-${Date.now()}`;

  // Clean title from slug e.g. "2547928-pikachu-glasses-holder" -> "Pikachu Glasses Holder"
  const cleanTitle = rawSlug
    .replace(/^\d+-/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  // Default specs based on keywords
  let weight = 70;
  let printTime = '2h 45m';
  let dimensions = '120 × 80 × 90 mm';
  let price = 299;

  const lowerSlug = rawSlug.toLowerCase();
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
  } else if (lowerSlug.includes('puzzle') || lowerSlug.includes('toy')) {
    weight = 90;
    printTime = '3h 10m';
    dimensions = '130 × 90 × 100 mm';
    price = 249;
  }

  // Construct MakerWorld CDN cover image fallback
  const modelIdMatch = rawSlug.match(/^(\d+)/);
  const modelId = modelIdMatch ? modelIdMatch[1] : '';

  const cdnCover = modelId
    ? `https://v3b.bambulab.com/makerworld/model/US${modelId}/design/cover.jpg`
    : '/placeholder.png';

  return {
    title: cleanTitle,
    slug: rawSlug,
    makerworldUrl: urlStr,
    mainImage: cdnCover,
    images: [cdnCover],
    printTime,
    filamentWeight: weight,
    dimensions,
    sellingPrice: price,
  };
};

/**
 * Service function to import a MakerWorld model into Supabase database.
 */
export const importMakerWorldProduct = async (
  inputUrl: string,
  customPhotoUrl?: string,
  customPrice?: number
): Promise<CatalogItem> => {
  const parsed = parseMakerWorldUrl(inputUrl);

  const mainPhoto = customPhotoUrl?.trim() || parsed.mainImage;
  const photoList = [mainPhoto];

  const imageUrlJSON = JSON.stringify({
    main_image: mainPhoto,
    images: photoList,
    makerworld_url: parsed.makerworldUrl,
    slug: parsed.slug,
    dimensions: parsed.dimensions,
  });

  const finalPrice = customPrice && customPrice > 0 ? customPrice : parsed.sellingPrice;

  const newProductPayload = {
    name: parsed.title,
    selling_price: finalPrice,
    filament_weight: parsed.filamentWeight,
    print_time: parsed.printTime,
    cost_per_kg: 1500,
    packaging_cost: 15,
    delivery_cost: 40,
    image_url: imageUrlJSON,
  };

  if (isSupabaseConfigured) {
    // Check if already exists in Supabase
    const { data: existing } = await supabase
      .from('products')
      .select('*')
      .or(`name.ilike.%${parsed.title.split(' ')[0]}%,image_url.cs.{"slug":"${parsed.slug}"}`);

    if (existing && existing.length > 0) {
      const existingId = existing[0].id;
      const { data: updated, error: updateErr } = await supabase
        .from('products')
        .update(newProductPayload)
        .eq('id', existingId)
        .select()
        .single();

      if (updateErr) throw updateErr;

      return {
        id: updated.id,
        slug: parsed.slug,
        name: updated.name,
        makerworld_url: parsed.makerworldUrl,
        price: updated.selling_price,
        print_time: updated.print_time,
        filament_weight: updated.filament_weight,
        dimensions: parsed.dimensions,
        images: photoList,
        main_image: mainPhoto,
        category: 'Scraped Model',
        created_at: updated.created_at,
      };
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('products')
      .insert(newProductPayload)
      .select()
      .single();

    if (insertErr) throw insertErr;

    return {
      id: inserted.id,
      slug: parsed.slug,
      name: inserted.name,
      makerworld_url: parsed.makerworldUrl,
      price: inserted.selling_price,
      print_time: inserted.print_time,
      filament_weight: inserted.filament_weight,
      dimensions: parsed.dimensions,
      images: photoList,
      main_image: mainPhoto,
      category: 'Scraped Model',
      created_at: inserted.created_at,
    };
  }

  throw new Error('Supabase is not configured.');
};
