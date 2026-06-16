# Context

I have already created a Supabase project.

Project URL:
https://wgboyqvwrxzhzmibooyd.supabase.co

Supabase is already configured in the app and src/lib/supabase.ts exists.

Tech Stack:

- React
- Vite
- TypeScript
- TailwindCSS
- Supabase
- React Router
- Zustand
- TanStack Query

Keep everything simple and lightweight.

Avoid:

- Next.js
- Prisma
- Redux
- Material UI
- Server side rendering
- Overengineering

This is a single-user application for managing my 3D printing business using one Bambu Lab A1 Mini.

---

# Task

Build only the Products module.

Do not create Orders, Inventory, Analytics, Dashboard or Authentication yet.

---

# Create Product Page

Create a Products page with a modern dark UI.

Columns:

- Product Name
- Print Time
- Filament Weight (g)
- Cost per Kg
- Selling Price

Automatically calculate:

- Decimal Hours
- Filament Cost
- Electricity Cost
- Total Cost
- Profit
- Max Pieces Per Day

Electricity settings:

Electricity Rate = 7.1

Printer Power = 0.08 kW

Formula:

electricityCost = decimalHours × 0.08 × 7.1

Filament Cost:

(filamentWeight / 1000) × costPerKg

Total Cost:

filamentCost + electricityCost

Profit:

sellingPrice - totalCost

Max Pieces Per Day:

floor(24 / decimalHours)

---

# Smart Print Time Parser

Support:

12m

51m

1.7h

3h 25m

12h 15m

Examples:

12m = 0.2

1h 30m = 1.5

3h 25m = 3.42

Create utility functions for parsing.

---

# Database

The products table already exists.

Use Supabase directly.

Implement:

## Get Products

Fetch all products.

## Add Product

Insert a new product.

## Delete Product

Delete a product.

## Update Product

Edit existing products.

---

# UI Requirements

Modern dark theme.

Responsive.

Compact table.

Search box.

Add Product button.

Edit button.

Delete button.

Modal form for Add/Edit Product.

Loading state.

Empty state.

Success and error messages.

Cards at top:

- Total Products
- Total Revenue Potential
- Average Profit
- Average Print Time

---

# Folder Structure

Create:

src/pages/Products

src/components/products

src/hooks/useProducts.ts

src/utils/printTimeParser.ts

src/types/product.ts

Keep files under 200 lines.

Use TypeScript everywhere.

Use TanStack Query for Supabase operations.

Avoid direct API calls inside components.

Create reusable components.

Generate clean production-ready code.

After implementation, provide all created files with their contents and explain where each file should be placed.