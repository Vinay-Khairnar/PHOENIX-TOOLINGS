# System Architecture

## Overview
QuoteMate is a monolithic Next.js 15 application utilizing the App Router. It is designed to be lightweight and fast, focusing exclusively on the core workflow of generating quotations.

## Tech Stack
- **Frontend**: Next.js 15, Tailwind CSS v4, Lucide React, Zustand (state management)
- **Backend**: Next.js Route Handlers
- **Database**: SQLite (local file-based)
- **ORM**: Prisma
- **PDF Generation**: pdf-lib
- **PWA**: @ducanh2912/next-pwa

## Architecture Layers
1. **Presentation Layer**: React Server Components and Client Components in `app/`.
2. **State Management**: Zustand for managing the active quotation builder state.
3. **API Layer**: Next.js Route Handlers (`app/api/*`) for client-side data fetching where necessary, though Server Actions and direct DB calls are preferred in Server Components.
4. **Data Access Layer**: Prisma Client interacting with the SQLite database.
