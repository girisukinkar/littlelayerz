---
name: makerworld-scraper
description: Scrapes MakerWorld 3D model collections, extracts high-res product photos, skips previously scraped items, and appends new products to the catalog page.
---

# MakerWorld Collection Scraper Skill

Use this skill whenever you need to scrape 3D models from any MakerWorld collection URL, download high-resolution showcase image galleries, skip already-scraped products, and update the **All Catalog** page in Dexter3D ERP.

## Features
1. **Incremental Scraping**: Automatically compares incoming collection items against `src/data/catalog_puzzles.json`. Items that have already been scraped are **skipped**.
2. **Icon & Diamond Filtering**: Automatically filters out MakerWorld point/boost diamond icons (< 60 KB) and non-product graphics.
3. **Multi-Photo Gallery Extraction**: Downloads top 10 high-resolution model photos into `public/images/catalog/<model-slug>/`.
4. **All Catalog Integration**: Appends newly scraped product records into the central catalog database (`src/data/catalog_puzzles.json`) with customizable pricing fields.

## Usage

### Command Line
Run the scraper script via Node.js by passing any MakerWorld collection link as the first argument:

```bash
node scrape_makerworld_collection.cjs "https://makerworld.com/en/collections/31475311-kids-puzzle"
```

If no URL argument is provided, it defaults to the Kids Puzzle collection URL:
```bash
node scrape_makerworld_collection.cjs
```

### Execution Steps
1. The script connects to the active browser via CDP (`http://127.0.0.1:9222`) or launches a headless Chromium browser instance.
2. It loads existing product slugs from `src/data/catalog_puzzles.json`.
3. It scrolls through the specified MakerWorld collection URL to lazy-load all model cards.
4. It compares all collection links against `existingSlugs`.
5. It processes **only new models**, downloading showcase photos and filtering out small icons.
6. It appends the new product records to `src/data/catalog_puzzles.json`.
7. The **All Catalog** page (`/catalog`) reloads and renders all catalog items with full pricing and PDF export capabilities.

## Data Schema & Output

- **Images Output Folder**: `public/images/catalog/<model-slug>/`
- **JSON Database Path**: `src/data/catalog_puzzles.json`

### Record Structure
```json
{
  "id": "mw-803587-minion-bros-keychain",
  "slug": "803587-minion-bros-keychain",
  "name": "Minion Bros Keychain",
  "author": "Designer Name",
  "description": "3D Model details...",
  "makerworld_url": "https://makerworld.com/en/models/803587-minion-bros-keychain",
  "price": 299,
  "cost_price": 50,
  "print_time": "2h 15m",
  "filament_weight": 45,
  "images": [
    "/images/catalog/803587-minion-bros-keychain/image_2.png",
    "/images/catalog/803587-minion-bros-keychain/image_3.jpg"
  ],
  "main_image": "/images/catalog/803587-minion-bros-keychain/image_2.png",
  "category": "Scraped Model",
  "created_at": "2026-07-22T23:58:00.000Z"
}
```
