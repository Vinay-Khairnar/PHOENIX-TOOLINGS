# Frontend

## Framework
Next.js 15 with App Router.

## Styling
Tailwind CSS v4 with a custom Apple-inspired minimalist design system:
- High contrast, edge-to-edge layouts.
- Primary color: Action Blue (`#0066cc`).
- Typography: Inter (as a stand-in for SF Pro) with negative letter-spacing for headlines.
- Minimal borders, avoiding shadows except on product/document representations.

## State Management
Zustand is used for the quotation builder to manage the transient state of the cart (selected customer, products, quantities, discounts) before it is saved to the database.

## PWA
Configured via `@ducanh2912/next-pwa` to allow offline installation and usage (caching static assets and API responses where applicable).
