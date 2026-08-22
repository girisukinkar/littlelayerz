# GST Invoice Generator — Complete Product Specification

## 1. Product Overview

Build a modern, responsive GST Invoice Generator designed initially for small businesses that receive orders through WhatsApp.

The application should make it extremely fast to:

1. Create an invoice.
2. Add/select a customer.
3. Add/select products.
4. Automatically calculate GST.
5. Apply item-level or invoice-level discounts.
6. Add shipping charges.
7. Add notes and terms.
8. Preview the invoice.
9. Download a compact professional PDF.
10. Automatically save the invoice to invoice history.
11. View sales performance from a dashboard.

The architecture must be future-ready so the application can later become a lightweight business management / mini-ERP system.

---

# 2. Primary User Flow

The main workflow should be:

Dashboard
→ Create Invoice
→ Select/Add Customer
→ Add Products
→ Apply Discounts
→ Add Shipping
→ Select Payment Status
→ Add Notes
→ Preview Invoice
→ Generate PDF
→ Save Invoice
→ Update Dashboard

The normal WhatsApp order should be convertible into a PDF invoice in approximately 1–2 minutes.

---

# 3. Application Navigation

Use a simple main navigation:

- Dashboard
- Create Invoice
- Invoices
- Products
- Customers
- Reports
- Settings

The Dashboard should be the default landing page.

Keep the UI clean, modern, compact and suitable for a small-business owner who may not be technically experienced.

---

# 4. Business / Seller Settings

Create a Business Settings page.

Fields:

- Business name
- Business logo
- Business address
- GSTIN
- State
- State code
- Phone number
- Email
- Website (optional)
- UPI ID (optional)
- Bank account details (optional)
- Default invoice prefix
- Default GST rate
- Default notes
- Default terms and conditions

Logo upload should support common image formats.

Business details should be saved and automatically used for future invoices.

Allow the user to edit business details without modifying historical invoices.

---

# 5. Invoice Details

Every invoice must have:

- Invoice number
- Invoice date
- Due date (optional)
- Place of supply
- Payment status

Invoice numbers should be automatically generated sequentially.

Example:

INV-0001
INV-0002
INV-0003

Allow manual editing of the invoice number when necessary.

Default invoice date should be today's date.

---

# 6. Customer Management

Create a Customers section.

Customer fields:

- Customer name
- Phone number
- Email
- GSTIN (optional)
- Billing address
- Shipping address
- State
- State code

Provide:

`+ Add Customer`

Allow customers to be searched and selected while creating an invoice.

Provide:

`Shipping address same as billing address`

When enabled, automatically copy billing details.

Store customers for future use.

Customer page should eventually show:

- Total orders
- Total amount spent
- Last purchase date
- Outstanding amount
- Invoice history

---

# 7. Product Management

Create a Products section.

Product fields:

- Product name
- SKU (optional)
- HSN/SAC code (optional)
- Default price
- Default GST rate
- Description
- Category (optional)
- Active/inactive status

Provide:

`+ Add Product`

During invoice creation, allow searching/selecting an existing product.

Selecting a product should automatically populate:

- Product name
- HSN/SAC
- Price
- GST rate
- Description

Allow the user to override the price or GST rate for a particular invoice without changing the saved product.

---

# 8. Invoice Product Table

Allow unlimited products per invoice.

Each invoice item should contain:

- Product name
- Description (optional)
- HSN/SAC
- Quantity
- Unit price
- Item discount
- Discount type
- GST rate
- Taxable amount
- GST amount
- Final amount

Discount type:

- Percentage
- Fixed amount

Provide:

`+ Add Item`

Allow:

- Edit item
- Delete item
- Duplicate item
- Reorder items if practical

---

# 9. GST Calculation

Default GST rate:

18%

But do NOT hard-code 18% as the only option.

Provide:

- 0%
- 5%
- 12%
- 18%
- 28%
- Custom %

GST must be configurable per product/item.

Calculation:

Gross Amount = Quantity × Unit Price

Item Discount = configured discount

Taxable Amount = Gross Amount - Item Discount

GST Amount = Taxable Amount × GST Rate

Item Total = Taxable Amount + GST Amount

---

# 10. Intra-State vs Inter-State GST

Automatically determine GST type based on seller state and place of supply/customer state.

If seller state and place of supply are the same:

Use:

- CGST
- SGST

Example:

18% GST:

CGST = 9%
SGST = 9%

If seller state and place of supply are different:

Use:

- IGST

Example:

IGST = 18%

The invoice must clearly display the applicable tax type.

Do not simply display "GST 18%" when the invoice requires CGST/SGST or IGST breakdown.

---

# 11. Invoice-Level Discount

Support an optional whole-invoice discount.

Discount types:

- Percentage
- Fixed amount

Example:

Subtotal = ₹1,000
Invoice Discount = ₹100
Taxable amount = ₹900

Clearly distinguish:

- Item Discount
- Invoice Discount

Prevent discounts from producing invalid negative taxable values.

---

# 12. Shipping Charges

Create an optional shipping section.

Fields:

- Shipping charge
- Shipping GST rate

Allow shipping to be:

- No GST
- Same GST rate
- Custom GST rate

Keep shipping tax logic modular so it can be expanded later.

---

# 13. Payment Information

Support:

Payment Status:

- Paid
- Partially Paid
- Unpaid

Fields:

- Amount paid
- Balance due
- Payment method

Payment methods:

- UPI
- Bank Transfer
- Cash
- Card
- Other

If fully paid, display a clear PAID indicator on the invoice.

Balance:

Balance Due = Grand Total - Amount Paid

Do not allow amount paid to exceed the grand total unless explicitly configured later.

---

# 14. Notes and Terms

Provide two separate optional fields:

## Notes

Example:

"Thank you for your order."

## Terms & Conditions

Example:

"Goods once sold cannot be returned unless damaged."

Both should appear near the bottom of the invoice.

Allow default text to be configured in Settings.

---

# 15. Invoice Summary

At the bottom of the invoice show:

- Subtotal
- Item discounts
- Invoice discount
- Shipping
- Taxable value
- CGST
- SGST
- IGST
- Total GST
- Grand Total
- Amount Paid
- Balance Due

Use Indian currency formatting:

₹1,121.00

---

# 16. Amount in Words

Automatically generate:

Amount in Words

Example:

"One Thousand One Hundred Twenty-One Rupees Only"

Use Indian numbering conventions where appropriate.

---

# 17. Invoice PDF

Generate a professional GST invoice PDF.

Requirements:

- A4 compatible
- Compact
- Professional
- Printer friendly
- WhatsApp friendly
- Clear typography
- Minimal whitespace
- Business logo
- Seller details
- Customer details
- Product table
- GST breakdown
- Totals
- Amount in words
- Payment status
- Notes
- Terms
- Signature area

Try to fit normal invoices on one page.

If there are many items, automatically continue onto additional pages without cutting or overlapping content.

Provide:

`Download PDF`

Filename example:

INV-0001-CustomerName.pdf

PDF generation must preserve:

- ₹ symbol
- Decimal values
- GST calculations
- Logo
- Invoice number
- Dates

---

# 18. Invoice Preview

Create a live invoice preview.

The user should be able to edit:

- Customer
- Products
- Quantity
- Price
- GST
- Discounts
- Shipping
- Payment
- Notes

The preview should update automatically.

Provide:

- Edit Invoice
- Preview
- Download PDF
- Save Invoice

---

# 19. Invoice History

Every generated invoice must automatically be saved.

Create a dedicated Invoices page.

Table columns:

- Invoice No.
- Date
- Customer
- Number of Items
- Subtotal
- Discount
- Shipping
- GST
- Total
- Payment Status

Actions:

- View
- Edit
- Duplicate
- Download PDF
- Delete

Search by:

- Invoice number
- Customer name
- Customer phone
- Product name

Filters:

- Date range
- Customer
- Payment status
- Amount

Sorting:

- Date
- Invoice number
- Customer
- Amount

---

# 20. Historical Invoice Integrity

Historical invoices must be immutable snapshots of the data used at creation time.

If a saved product changes from ₹150 to ₹180:

Old invoices must continue showing ₹150.

If a customer's address changes:

Old invoices must continue showing the old address.

If the business GST details change:

Old invoices must continue showing the historical seller information used when the invoice was created.

Store the relevant snapshot inside the invoice record.

This is a critical requirement.

---

# 21. Sales Dashboard

The Dashboard should provide a high-level overview of business sales.

Show cards for:

### Today's Sales

### This Month

### Total Sales

### Total GST

### Total Discounts

### Pending Payments

### Total Invoices

Example:

Today's Sales: ₹12,450
This Month: ₹85,600
Total Sales: ₹4,52,300
GST: ₹68,450
Discounts: ₹12,200
Pending: ₹25,000
Invoices: 126

Values must update automatically from invoice records.

---

# 22. Sales Overview Chart

Add a sales chart.

Allow:

- Daily
- Weekly
- Monthly
- Yearly

Example:

August 2026:

Week 1 → ₹18,500
Week 2 → ₹22,300
Week 3 → ₹31,200
Week 4 → ₹27,600

Chart should be simple and readable.

Do not overload the dashboard with unnecessary charts.

---

# 23. Product Sales Analytics

Show best-selling products.

Example:

| Product | Units Sold | Revenue |
|---|---:|---:|
| Keychain | 145 | ₹14,500 |
| Desk Organizer | 52 | ₹10,400 |
| Fridge Magnet | 82 | ₹8,200 |

Allow sorting by:

- Units sold
- Revenue
- Number of orders

This should prepare the system for future inventory management.

---

# 24. Customer Sales Analytics

Show top customers.

Example:

| Customer | Orders | Total Spent |
|---|---:|---:|
| Customer A | 12 | ₹18,500 |
| Customer B | 8 | ₹12,200 |

Clicking a customer should eventually show:

- Previous invoices
- Total purchases
- Number of orders
- Outstanding amount
- Last purchase date

---

# 25. Dashboard Date Filters

Support:

- Today
- Yesterday
- This Week
- This Month
- Last Month
- This Quarter
- This Year
- Custom Date Range

All dashboard metrics and charts should update based on the selected range.

---

# 26. Revenue Definitions

Keep these values separate:

Gross Sales
= Product value before discounts

Discounts
= Total discounts

Shipping
= Shipping charged

Taxable Sales
= Amount on which GST is calculated

GST
= CGST + SGST / IGST

Net Invoice Value
= Final amount charged

Do not treat GST collected as business revenue.

The data model should preserve these values separately for future accounting/reporting.

---

# 27. Recent Invoices Widget

Dashboard should include a Recent Invoices section.

Example:

| Invoice | Date | Customer | Amount | Status |
|---|---|---|---:|---|
| INV-0124 | 22 Aug | Rahul | ₹1,250 | Paid |
| INV-0123 | 22 Aug | Neha | ₹850 | Paid |
| INV-0122 | 21 Aug | Amit | ₹2,400 | Pending |

Clicking an invoice should open its details.

---

# 28. Sales Report Export

Allow exporting invoice history.

Initially support:

- CSV
- Excel

Export columns:

- Invoice number
- Invoice date
- Customer
- Product
- Quantity
- Unit price
- Taxable amount
- Item discount
- Invoice discount
- Shipping
- GST rate
- CGST
- SGST
- IGST
- Total GST
- Total
- Payment status

Future versions can support:

- GST reports
- Accounting exports
- PDF reports

---

# 29. WhatsApp Workflow

Because the initial business use case is WhatsApp orders, optimize for this.

After invoice generation provide:

- Download PDF
- Share on WhatsApp

WhatsApp message template should eventually support:

"Hi [Customer Name], thank you for your order with [Business Name]. Please find your invoice attached."

Do not automatically send messages without user confirmation.

Structure the application so WhatsApp integration can be expanded later.

---

# 30. Business Dashboard Layout

Suggested dashboard:

------------------------------------------------
BUSINESS DASHBOARD

[ Today's Sales ] [ This Month ] [ Total Sales ]

[ GST ] [ Pending ] [ Invoices ]

------------------------------------------------

Sales Overview

[                  Chart                 ]

------------------------------------------------

Top Products              Top Customers

Product A ₹15,400          Customer A ₹18,500
Product B ₹12,200          Customer B ₹12,200
Product C ₹9,800           Customer C ₹8,900

------------------------------------------------

Recent Invoices

Invoice | Date | Customer | Amount | Status

------------------------------------------------

Keep the interface fast and uncluttered.

---

# 31. Invoice Creation Layout

Suggested flow:

### Customer

Select existing customer or add new customer.

### Products

Add/search products.

### Discounts & Shipping

Configure item and invoice discounts and shipping.

### Payment

Payment status and amount.

### Notes

Notes and terms.

### Preview

Live invoice preview.

### Generate

Save invoice and generate PDF.

Avoid unnecessary multi-page forms if a compact single-page interface is practical.

---

# 32. Supabase Data Model

Design the Supabase PostgreSQL database around these core entities:

- businesses
- business_users
- customers
- products
- invoices
- invoice_items
- payments
- invoice_sequences

Optional future tables:

- product_categories
- inventory
- expenses
- sales_daily
- audit_logs

Recommended relationship:

Business
→ Business Users
→ Customers
→ Products
→ Invoices
→ Invoice Items
→ Payments

Every business-owned table must contain `business_id` where appropriate.

Recommended `invoices` fields include:

- id
- business_id
- invoice_number
- invoice_date
- due_date
- customer_id
- seller_snapshot
- customer_snapshot
- billing_address
- shipping_address
- place_of_supply
- subtotal
- item_discount
- invoice_discount
- shipping_amount
- taxable_amount
- cgst
- sgst
- igst
- total_gst
- grand_total
- amount_paid
- balance_due
- payment_status
- payment_method
- notes
- terms
- created_at
- updated_at

Recommended `invoice_items` fields include:

- id
- invoice_id
- product_id
- product_name_snapshot
- description_snapshot
- hsn_sac_snapshot
- quantity
- unit_price
- discount_type
- discount_value
- discount_amount
- taxable_amount
- gst_rate
- cgst
- sgst
- igst
- gst_amount
- line_total

Historical invoice data must be immutable snapshots.

If a product, customer or business setting changes later, old invoices must NOT change.

Use foreign keys, appropriate indexes, constraints and timestamps.

Use database migrations rather than manually changing production schema.

---

# 33. Invoice Calculation Engine

Separate calculation logic from the UI.

Create a reusable calculation engine that handles:

- Quantity
- Unit price
- Item discount
- Invoice discount
- Shipping
- GST
- CGST
- SGST
- IGST
- Rounding
- Grand total
- Amount paid
- Balance due

This calculation engine must be independently testable.

Do not duplicate calculations across UI components and PDF generation.

The PDF and dashboard must use the same source calculation logic.

---

# 34. Rounding

Use reliable monetary calculations.

Avoid JavaScript floating-point errors.

Use proper decimal/money handling.

Display monetary amounts to 2 decimal places.

Example:

₹1,250.00

Provide a configurable rounding mechanism for future accounting requirements.

---

# 35. Validation

Validate:

- GSTIN format
- Required customer name
- Required product name
- Quantity > 0
- Price >= 0
- Discount >= 0
- Discount cannot exceed applicable amount
- GST >= 0
- Shipping >= 0
- Amount paid >= 0
- Amount paid <= grand total

Show clear inline errors.

Do not allow invalid invoices to be generated.

---

# 36. Supabase Backend Architecture

Supabase is the primary backend and persistent data store for the MVP.

Use:

- Supabase PostgreSQL for application data
- Supabase Auth for authentication
- Supabase Storage for business logos and optionally generated invoice PDFs
- Supabase Row Level Security (RLS) for data isolation
- Supabase migrations for database schema changes

Do NOT use browser localStorage as the primary database.

Keep a clean repository/service/data-access layer so UI components are not tightly coupled to Supabase.

Suggested repositories/services:

- BusinessRepository
- CustomerRepository
- ProductRepository
- InvoiceRepository
- PaymentRepository
- StorageRepository

The application should be structured so backend implementation details remain separate from presentation components.

---

# 37. Future-Ready Architecture

Do not build these features now unless explicitly requested, but keep the architecture ready for:

- Inventory management
- Stock tracking
- Purchase invoices
- Sales reports
- GST reports
- Customer history
- Product analytics
- Expense tracking
- Profit calculation
- Cost of goods sold
- Product margins
- Monthly growth
- Average order value
- Repeat customer analysis
- Multiple businesses
- Multiple GST registrations
- Cloud sync
- User accounts
- Online invoice links
- Payment links
- Automated WhatsApp
- Email invoices
- Credit notes
- Debit notes
- Recurring invoices
- Meesho integration
- Amazon integration
- Flipkart integration
- Other marketplace integrations
- Accounting software integrations

Do not overbuild the MVP.

---

# 38. Future Profit Analytics

The current system should record enough data to later calculate:

- Product cost
- Profit per product
- Gross margin
- Net margin
- Monthly profit
- Best-margin products

Do not calculate profit currently unless cost data exists.

Never assume selling price equals profit.

---

# 39. Supabase Security

Implement security from the MVP.

Use Supabase Auth for user authentication.

Use Row Level Security (RLS) on all business/customer/product/invoice/payment tables.

Rules must ensure:

- A user can only access businesses they belong to.
- A user can only access customers belonging to their business.
- A user can only access products belonging to their business.
- A user can only access invoices belonging to their business.
- A user cannot read or modify another business's data.
- Storage objects must also be protected by business/user access rules.

Never expose the Supabase service-role key in frontend code.

Use server-side/secure functions where privileged operations are required.

Validate important calculations and permissions server-side where appropriate.

Do not expose GST/customer information publicly.

---

# 40. GST / Legal Disclaimer

The application is an invoicing and calculation tool.

Do not claim that using the application automatically guarantees GST/legal/accounting compliance.

GST rules can change.

Keep legal/accounting assumptions configurable wherever practical.

---

# 41. Testing Requirements

Create automated tests for:

1. 18% intra-state GST
2. 18% inter-state GST
3. 0% GST
4. 5% GST
5. 12% GST
6. 18% GST
7. 28% GST
8. Custom GST
9. Item discount percentage
10. Item discount fixed amount
11. Invoice discount percentage
12. Invoice discount fixed amount
13. Multiple products
14. Multiple GST rates on one invoice
15. Shipping
16. Shipping GST
17. CGST/SGST
18. IGST
19. Rounding
20. Amount in words
21. Partial payment
22. Fully paid invoice
23. Unpaid invoice
24. Balance calculation
25. Historical invoice snapshot
26. Dashboard sales totals
27. Date filters
28. Product sales totals
29. Customer sales totals

---

# 42. MVP Scope

Build these features first.

## Must Have

- Dashboard
- Business settings
- Logo
- Customer management
- Billing address
- Shipping address
- Product management
- Multiple products
- Quantity
- Price
- Default 18% GST
- Custom GST rates
- CGST
- SGST
- IGST
- Item discount
- Invoice discount
- Shipping
- Invoice number
- Invoice date
- Place of supply
- Notes
- Terms
- Payment status
- Amount paid
- Balance due
- Amount in words
- Live preview
- Compact PDF
- Invoice history
- Search
- Filters
- Sales dashboard
- Sales charts
- Product sales analytics
- Customer sales analytics
- CSV/Excel export

---

# 43. Phase 2

After MVP is stable:

- WhatsApp sharing
- Better customer history
- Inventory
- Stock alerts
- Payment reminders
- Profit calculation
- Product cost
- Sales reports
- GST reports

---

# 44. Phase 3

Later:

- User login
- Cloud database
- Multiple businesses
- Multiple GST registrations
- Team members
- Online invoice links
- Payment links
- Automated WhatsApp
- Email invoices
- Marketplace integrations
- Accounting integrations
- Mobile application

---

# 45. Design Direction

The UI should feel like a modern SaaS product.

Characteristics:

- Clean
- Minimal
- Professional
- Fast
- Spacious but not wasteful
- Strong visual hierarchy
- Clear tables
- Clear monetary figures
- Responsive
- Desktop-first but mobile-friendly

Avoid:

- Excessive animations
- Excessive gradients
- Cluttered dashboards
- Unnecessary popups
- Complicated navigation
- Huge empty spaces

Use consistent typography, spacing, buttons, cards and form controls.

---

# 46. Critical Product Principle

The application is not just a PDF generator.

The long-term product direction is:

WhatsApp Order
→ Invoice
→ Customer Record
→ Product Record
→ Sales Record
→ Dashboard
→ Inventory
→ Profit
→ Business Analytics

Build the MVP around this data flow.

---

# 47. Antigravity Implementation Instructions

Before writing code:

1. Read this entire specification.
2. Inspect the existing repository.
3. Identify the current framework, language, package manager and architecture.
4. Confirm how Supabase is currently configured.
5. Do not replace the existing stack unless there is a strong technical reason.
6. Identify reusable components already present.
7. Identify existing dependencies that can be reused.
8. Inspect existing Supabase tables/migrations if available.
9. Propose the application architecture.
10. Propose the Supabase PostgreSQL data model.
11. Propose relationships, indexes, constraints and RLS policies.
12. Propose the page/component structure.
13. Propose the PDF generation approach.
14. Propose the testing strategy.
15. Identify any ambiguities or technical risks.

Then create an implementation plan.

Do not implement everything in one uncontrolled change.

Implement incrementally:

### Step 1

Application shell and navigation.

### Step 2

Business settings.

### Step 3

Customer management.

### Step 4

Product management.

### Step 5

Invoice creation.

### Step 6

GST calculation engine.

### Step 7

Discount and shipping calculations.

### Step 8

Invoice preview.

### Step 9

PDF generation.

### Step 10

Invoice history.

### Step 11

Dashboard.

### Step 12

Sales analytics.

### Step 13

Export.

### Step 14

Automated tests.

After each major step:

- Run tests.
- Run linting/type checks.
- Verify the application builds.
- Fix errors before moving forward.
- Do not leave broken intermediate functionality.

---

# 48. Antigravity Prompt

Use this message together with this specification:

"Read GST_INVOICE_GENERATOR_SPEC.md completely before making any changes.

This document is the product specification for the application I want you to build.

First inspect the existing repository and understand the current technology stack, architecture and available dependencies.

Do not blindly rewrite the application.

First provide:

1. Current architecture assessment
2. Proposed architecture
3. Page structure
4. Component structure
5. Data model
6. Invoice calculation architecture
7. PDF generation approach
8. State/data persistence approach
9. Testing strategy
10. Implementation plan divided into logical phases

Then implement the application incrementally according to the specification.

Prioritize a working MVP rather than trying to implement every future feature.

Do not add unnecessary features that are not in the MVP.

Keep the architecture modular and future-ready.

The most important requirements are:

- Correct GST calculations
- Correct CGST/SGST vs IGST handling
- Accurate discounts
- Accurate shipping calculations
- Professional compact PDF
- Persistent invoice history
- Historical invoice snapshots
- Sales dashboard
- Product/customer history
- Reliable monetary calculations
- Automated tests

Do not consider a feature complete merely because the UI exists. Verify that the underlying calculations, persistence and PDF output actually work.

After implementation, run the full test/build/lint/type-check process and fix all issues.

Do not delete existing functionality unless explicitly required.

If you encounter an ambiguity that materially affects GST calculations, accounting behavior, data integrity or architecture, stop and explain the issue before making a potentially incorrect assumption."

---

# 49. Definition of Done

The MVP is complete only when:

- A business can configure its GST details.
- A customer can be created.
- A product can be created.
- An invoice can contain multiple products.
- Different products can have different GST rates.
- Item-level discounts work.
- Invoice-level discounts work.
- Shipping works.
- CGST/SGST works.
- IGST works.
- Payment status works.
- Invoice preview works.
- PDF generation works.
- PDF is compact and professional.
- Invoice automatically enters invoice history.
- Historical invoice data does not change when customer/product settings change.
- Dashboard totals match invoice history.
- Date filters work.
- Product sales analytics work.
- Customer sales analytics work.
- CSV/Excel export works.
- Automated tests pass.
- Application builds successfully.
- No critical console/runtime errors remain.

The first release should feel like a reliable small-business invoicing application, not a prototype.
