# Database

## Engine
SQLite, utilizing a local `dev.db` file for complete simplicity and offline-first capabilities.

## Schema Highlights
- **Product**: `id`, `name`, `sku`, `price`. SQLite FTS5 extension concepts can be simulated or implemented via raw queries for ultra-fast product searching.
- **Customer**: `id`, `name`, `email`, `phone`, `address`.
- **Quote**: `id`, `quoteNumber`, `customerId`, `discount`, `total`, `status`, `createdAt`.
- **QuoteItem**: `id`, `quoteId`, `productId`, `name`, `price`, `quantity`. Snapshots of product details at the time of quoting.
- **Settings**: Single row table containing `companyName`, `email`, `phone`, `address`.

## ORM
Prisma is used for all schema migrations and type-safe query building.
