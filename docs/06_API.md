# API

## Endpoints

### `/api/products`
- `GET`: Search and list products.
- `POST`: Create a new product.

### `/api/products/import`
- `POST`: Accept a CSV file, parse via PapaParse, and bulk insert into SQLite.

### `/api/customers`
- `GET`: List customers.
- `POST`: Create a customer.

### `/api/quotations`
- `GET`: List historical quotes.
- `POST`: Save a new quote.

### `/api/quotations/[id]/pdf`
- `GET`: Generate and return the PDF blob for a specific quotation.

### `/api/settings`
- `GET`: Fetch current company settings.
- `POST`: Update company settings.
