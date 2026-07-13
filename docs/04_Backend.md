# Backend

## Framework
Next.js API Routes and Server Actions.

## Modules
1. **Products**: CRUD operations, CSV import parsing.
2. **Customers**: CRUD operations.
3. **Quotations**: Saving quotes, calculating totals.
4. **Settings**: Managing company details.
5. **PDF Generator**: Compiling the Quote object into a PDF document using `pdf-lib`.

## PDF Generation
The PDF is generated on the server (or dynamically in the browser if preferred, but `pdf-lib` works well in Next.js API routes). It uses a clean, Apple-inspired minimalist template.
