# Antigravity Build Prompt — GST Invoice Generator

Read `GST_INVOICE_GENERATOR_SPEC.md` completely before making any changes.

This is the product specification for the GST Invoice Generator I want you to build.

## First: Inspect Before Coding

Before changing code:

1. Inspect the existing repository.
2. Identify the frontend framework, language, package manager and current architecture.
3. Inspect existing components and reusable UI.
4. Inspect the existing Supabase integration.
5. Inspect existing Supabase migrations/tables if available.
6. Identify how authentication is currently handled.
7. Identify existing environment variables/configuration.
8. Check existing PDF/reporting dependencies.
9. Check existing testing, linting and type-checking setup.
10. Do not blindly rewrite or replace the current project.

## Supabase Is the Primary Backend

This application uses Supabase as the primary backend from the MVP.

Use:

- Supabase PostgreSQL for persistent data
- Supabase Auth for authentication
- Supabase Storage for business logos and optionally generated invoice PDFs
- Supabase Row Level Security for data isolation
- Supabase migrations for schema changes

Do NOT use localStorage as the primary database.

Keep Supabase data access behind a clean repository/service layer.

## Before Implementation

First provide an implementation plan covering:

1. Current project architecture
2. Proposed architecture
3. Page and route structure
4. Component structure
5. Supabase database schema
6. Table relationships
7. Indexes and constraints
8. RLS policies
9. Authentication flow
10. Invoice calculation architecture
11. GST calculation logic
12. PDF generation approach
13. Dashboard aggregation strategy
14. Testing strategy
15. MVP phases
16. Technical risks/ambiguities

Do not start a large implementation until this plan is clear.

## Implementation Order

Implement incrementally:

### Phase 1 — Application Shell

- Navigation
- Dashboard
- Create Invoice
- Invoices
- Products
- Customers
- Reports
- Settings

### Phase 2 — Supabase Foundation

- Auth
- Business profile
- Database migrations
- RLS
- Business/user relationships
- Secure data access layer

### Phase 3 — Master Data

- Customers
- Products
- Business settings
- Logo upload

### Phase 4 — Invoice Engine

- Invoice creation
- Multiple products
- Quantity
- Pricing
- Item discounts
- Invoice discounts
- Shipping
- GST
- CGST/SGST
- IGST
- Payment status
- Amount paid
- Balance due
- Notes
- Terms
- Amount in words

### Phase 5 — Invoice PDF

- Live preview
- Compact professional GST invoice
- A4 layout
- Multi-page support
- Logo
- Correct ₹ formatting
- Download PDF

### Phase 6 — Invoice History

Every generated invoice must automatically be persisted in Supabase.

Implement:

- Search
- Filters
- Sorting
- View
- Edit where appropriate
- Duplicate
- Download PDF
- Delete according to the chosen data-retention policy

Most importantly, store historical snapshots so old invoices never change when master data changes.

### Phase 7 — Sales Dashboard

Implement:

- Today's sales
- Monthly sales
- Total sales
- Total GST
- Discounts
- Pending payments
- Invoice count
- Sales charts
- Recent invoices
- Top products
- Top customers
- Date filters

Dashboard figures must be calculated from the actual invoice records and must reconcile with invoice history.

### Phase 8 — Reports / Export

Implement:

- CSV export
- Excel export

Keep the data structure ready for future GST/accounting reports.

### Phase 9 — Testing and Hardening

Run:

- Unit tests
- Integration tests where appropriate
- Type checking
- Linting
- Production build

Fix all critical errors.

## Critical Calculation Requirements

The GST engine must correctly support:

- 0%
- 5%
- 12%
- 18%
- 28%
- Custom GST rates

Determine whether the transaction is intra-state or inter-state.

Same state:

CGST + SGST

Different state:

IGST

Do not simply display generic GST when a CGST/SGST or IGST breakdown is required.

The default GST rate should be 18%, but it must be configurable.

## Critical Historical Data Requirement

An invoice is a historical financial record.

When an invoice is created, snapshot:

- Seller/business details
- Customer details
- Billing address
- Shipping address
- Product name
- Product description
- HSN/SAC
- Quantity
- Unit price
- Discounts
- GST rate
- GST amounts
- Shipping
- Totals

If the product/customer/business settings change later, the old invoice must remain unchanged.

## Critical Security Requirement

Use Supabase RLS.

A user must only access data belonging to businesses they are authorized to access.

Never expose the Supabase service-role key in frontend code.

Do not create insecure policies merely to make development easier.

## UI Requirements

The UI should be:

- Modern
- Clean
- Professional
- Responsive
- Fast
- Compact
- Easy for a small-business owner

Avoid:

- Unnecessary animations
- Excessive gradients
- Clutter
- Huge whitespace
- Complicated navigation
- Overengineering

The invoice creation flow should be fast enough for WhatsApp orders.

## MVP Boundary

Do NOT build these yet unless required for the MVP to work:

- Inventory
- Profit calculation
- Marketplace integrations
- Automated WhatsApp
- Email automation
- Payment links
- Recurring invoices
- Credit notes
- Debit notes
- Multi-business advanced features
- Accounting integrations

However, keep the architecture ready for them.

## Definition of Done

Do not consider the project complete merely because the screens exist.

The MVP is complete only when:

- Business details can be saved
- Logo can be uploaded
- Customers can be created and reused
- Products can be created and reused
- Multiple products can be added to an invoice
- Item discounts work
- Invoice discounts work
- Shipping works
- 0/5/12/18/28/custom GST works
- CGST/SGST works
- IGST works
- Payment status works
- Amount paid and balance work
- Amount in words works
- Live invoice preview works
- PDF generation works
- PDF is professional and compact
- Invoice is persisted in Supabase
- Invoice history works
- Historical snapshots are preserved
- Dashboard totals reconcile with invoices
- Dashboard filters work
- Product sales analytics work
- Customer sales analytics work
- CSV/Excel export works
- RLS is enabled and tested
- Tests pass
- Type checks pass
- Lint passes
- Production build passes
- No critical runtime/console errors remain

## Development Discipline

After each major implementation phase:

1. Run tests.
2. Run type checking.
3. Run lint.
4. Run build.
5. Inspect the UI.
6. Fix issues before proceeding.

Do not leave broken intermediate code.

Do not make large unrelated refactors.

Do not remove existing functionality unless explicitly required.

If an ambiguity materially affects GST calculations, accounting behavior, security, data integrity or architecture, stop and explain the issue instead of silently making a risky assumption.

## Final Verification

At the end, provide:

1. What was implemented
2. Supabase migrations created
3. Tables created/changed
4. RLS policies created
5. Environment variables required
6. Tests added
7. Tests passed
8. Build status
9. Known limitations
10. Recommended next phase

Start by inspecting the project and producing the implementation plan. Do not immediately start rewriting the application.
