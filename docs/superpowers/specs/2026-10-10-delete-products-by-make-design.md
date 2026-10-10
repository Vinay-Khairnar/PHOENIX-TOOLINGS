# Design Specification: Delete Products by Make

**Date:** 2026-10-10  
**Feature:** Delete products by Make from the Product catalog  
**Status:** Approved  

---

## 1. Overview
In the Product catalog (`/products`), users can currently delete individual products or delete all products entirely. This feature adds the ability to select a specific `Make` (e.g., `ISCAR`) and delete all products associated with that Make, while preserving the Make entry in the system for future additions and imports.

---

## 2. User Experience & Workflow

1. **Trigger Button**:
   - On `app/products/page.tsx`, when products exist, a `"Delete by Make"` button is displayed in the top header action group alongside `"Delete All"`, `"Add Product"`, and `"Import Excel/CSV/PDF"`.
   - Clicking `"Delete by Make"` opens the `DeleteByMakeModal`.

2. **Modal Interaction (`DeleteByMakeModal`)**:
   - **Make Selection**: A dropdown list of available Makes.
     - Fetches existing makes from `/api/products/makes`.
     - Also pulls distinct makes currently assigned to products in the `Product` table so any imported makes are always present.
   - **Product Count Preview**:
     - When a Make is selected, the modal queries `/api/products/by-make?make=<MAKE>` to fetch the exact count of products matching that Make.
     - Shows a preview badge / alert: e.g., *"145 products found for make ISCAR"*.
   - **Safety Controls**:
     - If count is 0: The delete button is disabled with message *"No products found for this make"*.
     - If count > 0: An alert highlights that this bulk deletion is permanent. The button displays *"Delete <count> <MAKE> Products"*.
   - **Execution & Feedback**:
     - Clicking the confirm button shows a loading spinner (`Deleting...`).
     - Upon completion:
       - Modal closes.
       - Toast notification confirms deletion (e.g., *"Successfully deleted 145 products for ISCAR"*).
       - Product list on `/products` re-fetches to reflect updated counts and catalog.

---

## 3. Architecture & API Design

### 3.1 Backend Route: `app/api/products/by-make/route.ts`

- **GET `/api/products/by-make?make=<MAKE>`**:
  - Validates `make` query parameter.
  - Queries `supabase.from('Product')` count where `make.ilike.<MAKE>`.
  - Returns:
    ```json
    { "make": "ISCAR", "count": 145 }
    ```

- **DELETE `/api/products/by-make?make=<MAKE>`** (also supports JSON body `{ make: string }`):
  - Validates `make` parameter.
  - Normalizes Make to uppercase.
  - Counts matching rows for return metadata.
  - Deletes matching rows from `Product` table where `make.ilike.<MAKE>` (case-insensitive for safety).
  - Note: Does not delete rows from `Make` table (preserves the make entry).
  - Returns:
    ```json
    { "success": true, "deletedCount": 145, "make": "ISCAR" }
    ```

### 3.2 Frontend Components

- **`app/components/DeleteByMakeModal.tsx`**:
  - Modal with backdrop and close button.
  - State: `selectedMake`, `makesList`, `productCount`, `isLoadingCount`, `isDeleting`.
  - Clean UI following project design system (Tailwind CSS, Lucide icons, glassmorphic / card modal styling).
  
- **`app/products/page.tsx`**:
  - Add state `isDeleteByMakeOpen` (`boolean`).
  - Add `"Delete by Make"` button in header actions.
  - Render `<DeleteByMakeModal>` and wire up success callback to `fetchProducts(search, 1)`.

---

## 4. Error Handling & Edge Cases

- **Empty Make Selection**: Prevent submission if no Make is selected.
- **Zero Products**: Disable the delete button if no products belong to the selected Make.
- **Network / Server Errors**: Display user-friendly toast messages with failure details and reset loading state.
- **Case Sensitivity**: Treat make comparisons with `ilike` or trimmed uppercase to handle casing variations.
- **Concurrent Operations**: Disable modal buttons while delete is in progress to prevent duplicate clicks.
