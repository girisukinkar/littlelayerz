# Dexter3D ERP & MakerWorld Catalog Manager

An e-commerce ERP, product management system, and automated **MakerWorld 3D Model Scraper** built with React, Vite, Tailwind CSS, Playwright, and Node.js.

---

## 🌟 Key Features

- **All 3D Catalog (`/catalog`)**:
  - Displays all scraped MakerWorld 3D models with high-resolution multi-photo showcases.
  - **Inline & Batch Price Editing**: Customize retail selling prices per product or apply a uniform base price across all items.
  - **Individual Photo Deletion**: Hover over any thumbnail or photo banner to remove unwanted images before exporting.
  - **Product Selection**: Select or deselect specific items to include in your customized catalog.
  - **PDF Catalog Export**: Generates a clean A4 print & PDF document with multi-angle showcase photo galleries and high-contrast price tags.
  - **Permanent Product Deletion**: Easily purge unwanted items from your catalog.

- **MakerWorld Scraper Integration**:
  - Incremental collection scraping (automatically skips already scraped models).
  - High-resolution photo gallery extraction.
  - Automatic filtering of MakerWorld point/boost diamond icons (< 60 KB).

---

## 🚀 Quick Start

### 1. Installation

Ensure dependencies are installed:

```bash
npm install
```

### 2. Development Server

Run the Vite development server:

```bash
npm run dev
```

Open [http://localhost:5173/catalog](http://localhost:5173/catalog) in your browser to view the **All Catalog** page.

---

## 🕷️ MakerWorld Collection Scraper

The scraper script allows you to pass **any MakerWorld collection URL**. It compares items against the existing catalog database (`src/data/catalog_puzzles.json`), **skips already scraped products**, downloads showcase photos for new items, and appends them to your catalog.

### Running the Scraper

To scrape a new or updated MakerWorld collection URL:

```bash
node scrape_makerworld_collection.cjs "https://makerworld.com/en/collections/YOUR_COLLECTION_ID"
```

If no URL is provided, it defaults to the Kids Puzzle collection:

```bash
node scrape_makerworld_collection.cjs
```

### How Incremental Scraping Works:
1. Connects to the browser via Chrome DevTools Protocol (`http://127.0.0.1:9222`) or Chromium.
2. Scrolls through the collection page to extract all model cards.
3. Compares all model IDs against existing entries in `src/data/catalog_puzzles.json`.
4. **Skips** any model already present in the catalog.
5. Downloads high-res model photos for new items into `public/images/catalog/<slug>/`.
6. Filters out small diamond/boost icons (< 60 KB).
7. Appends new product records to `src/data/catalog_puzzles.json`.

---

## 🛠️ Agent Skill: `makerworld-scraper`

A custom agent skill is registered in `.agents/skills/makerworld-scraper/SKILL.md`.

You can trigger this skill in your AI assistant workflow whenever you provide a MakerWorld collection URL to automatically scrape new models, update product photo galleries, and manage catalog items.

---

## 📦 Project Structure

```
ERP/
├── .agents/
│   └── skills/
│       └── makerworld-scraper/
│           └── SKILL.md            # Agent skill definition
├── public/
│   └── images/
│       └── catalog/                # Downloaded model showcase photos
├── src/
│   ├── data/
│   │   └── catalog_puzzles.json    # Master product catalog database
│   ├── pages/
│   │   ├── Catalog.tsx             # All 3D Catalog page component
│   │   ├── Products.tsx
│   │   └── Orders.tsx
│   └── App.tsx
├── scrape_makerworld_collection.cjs # CLI MakerWorld scraper script
├── fix_catalog_images.cjs          # Photo filtering utility
└── README.md
```

---

## 📄 License

MIT License. Designed for Dexter3D ERP.
