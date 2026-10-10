# Delete Products by Make Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users on the Products page to select a Make from a dropdown and delete all products associated with that Make in a single confirmed action, while preserving the Make entry in the system.

**Architecture:** Next.js Route Handler (`/api/products/by-make`) interacts with Supabase `Product` table to query counts and execute bulk deletes. A React modal component (`DeleteByMakeModal`) integrates into `app/products/page.tsx` offering make selection, live product count preview, safety warnings, and loading feedback.

**Tech Stack:** Next.js 15 (App Router), React, TypeScript, Tailwind CSS, Lucide React, Supabase Client, react-hot-toast.

---

### Task 1: Create Backend API Route for Products by Make (`/api/products/by-make`)

**Files:**
- Create: `app/api/products/by-make/route.ts`

- [ ] **Step 1: Write Route Handler for GET and DELETE**

Create `app/api/products/by-make/route.ts` supporting:
- `GET`: Takes `?make=...`, counts products in Supabase `Product` table using `.ilike('make', normalizedMake)`. Returns `{ make, count }`.
- `DELETE`: Takes `?make=...` (query or JSON body), verifies make is provided, counts matching records, executes `.delete().ilike('make', normalizedMake)` on `Product` table, and returns `{ success: true, count, make }`.

```typescript
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const make = searchParams.get('make');

    if (!make || !make.trim()) {
      return NextResponse.json({ error: 'Make is required' }, { status: 400 });
    }

    const normalizedMake = make.trim();

    const { count, error } = await supabase
      .from('Product')
      .select('*', { count: 'exact', head: true })
      .ilike('make', normalizedMake);

    if (error) throw error;

    return NextResponse.json({
      make: normalizedMake,
      count: count || 0,
    });
  } catch (error) {
    console.error('Failed to get product count by make:', error);
    return NextResponse.json({ error: 'Failed to get product count' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let make = searchParams.get('make');

    if (!make) {
      try {
        const body = await request.json();
        make = body?.make;
      } catch {
        // Body was empty or not JSON
      }
    }

    if (!make || !make.trim()) {
      return NextResponse.json({ error: 'Make is required' }, { status: 400 });
    }

    const normalizedMake = make.trim();

    // First check count of products to be deleted
    const { count, error: countError } = await supabase
      .from('Product')
      .select('*', { count: 'exact', head: true })
      .ilike('make', normalizedMake);

    if (countError) throw countError;

    // Delete matching products from Product table
    const { error: deleteError } = await supabase
      .from('Product')
      .delete()
      .ilike('make', normalizedMake);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      success: true,
      count: count || 0,
      make: normalizedMake,
    });
  } catch (error) {
    console.error('Failed to delete products by make:', error);
    return NextResponse.json({ error: 'Failed to delete products' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify API endpoints with curl**

Run:
```bash
curl -s "http://localhost:3000/api/products/by-make?make=ISCAR"
```
Expected output: JSON containing `{ "make": "ISCAR", "count": ... }`.

- [ ] **Step 3: Commit**

```bash
git add app/api/products/by-make/route.ts
git commit -m "feat(api): add GET and DELETE endpoints for products by make"
```

---

### Task 2: Build `DeleteByMakeModal` Component

**Files:**
- Create: `app/components/DeleteByMakeModal.tsx`

- [ ] **Step 1: Create `DeleteByMakeModal` component**

Features:
- Fetches available makes from `/api/products/makes`.
- Dropdown select for available makes.
- When a make is selected, fetches the count from `/api/products/by-make?make=...`.
- Shows warning badge with number of products to be deleted.
- If count is 0, button is disabled with explanation.
- If count > 0, button allows deletion with loading spinner.
- Calls `DELETE /api/products/by-make?make=...`.
- Shows success toast via `react-hot-toast` and calls `onSuccess()`.

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertTriangle, Trash2, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

interface DeleteByMakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface MakeOption {
  id: string;
  name: string;
}

export default function DeleteByMakeModal({
  isOpen,
  onClose,
  onSuccess,
}: DeleteByMakeModalProps) {
  const [makes, setMakes] = useState<MakeOption[]>([]);
  const [isLoadingMakes, setIsLoadingMakes] = useState(false);
  const [selectedMake, setSelectedMake] = useState('');
  const [productCount, setProductCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch makes when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchMakes();
      setSelectedMake('');
      setProductCount(null);
    }
  }, [isOpen]);

  const fetchMakes = async () => {
    setIsLoadingMakes(true);
    try {
      const res = await fetch('/api/products/makes');
      const data = await res.json();
      if (Array.isArray(data)) {
        setMakes(data);
      }
    } catch (e) {
      console.error('Failed to fetch makes:', e);
      toast.error('Failed to load makes');
    } finally {
      setIsLoadingMakes(false);
    }
  };

  // Fetch product count when selectedMake changes
  useEffect(() => {
    if (!selectedMake) {
      setProductCount(null);
      return;
    }

    const fetchCount = async () => {
      setIsLoadingCount(true);
      try {
        const res = await fetch(`/api/products/by-make?make=${encodeURIComponent(selectedMake)}`);
        const data = await res.json();
        if (res.ok) {
          setProductCount(data.count ?? 0);
        } else {
          setProductCount(0);
        }
      } catch (e) {
        console.error('Failed to fetch product count:', e);
        setProductCount(0);
      } finally {
        setIsLoadingCount(false);
      }
    };

    fetchCount();
  }, [selectedMake]);

  const handleDelete = async () => {
    if (!selectedMake) {
      toast.error('Please select a make first');
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/products/by-make?make=${encodeURIComponent(selectedMake)}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(`Successfully deleted ${data.count || productCount || 0} ${selectedMake} products`);
        onSuccess();
        onClose();
      } else {
        toast.error(data.error || 'Failed to delete products');
      }
    } catch (e) {
      console.error('Error deleting products by make:', e);
      toast.error('Failed to delete products');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Delete by Make</h2>
              <p className="text-xs text-slate-500">Remove all products of a selected make</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Make selection dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Select Make
            </label>
            <div className="relative">
              <select
                value={selectedMake}
                onChange={(e) => setSelectedMake(e.target.value)}
                disabled={isLoadingMakes || isDeleting}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all disabled:opacity-50"
              >
                <option value="">-- Choose Make --</option>
                {makes.map((m) => (
                  <option key={m.id || m.name} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                {isLoadingMakes ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </div>
          </div>

          {/* Product count & warning box */}
          {selectedMake && (
            <div className="rounded-xl border p-4 transition-all">
              {isLoadingCount ? (
                <div className="flex items-center gap-2 text-slate-500 text-sm py-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Checking product catalog...</span>
                </div>
              ) : productCount !== null && productCount > 0 ? (
                <div className="bg-red-50/70 border border-red-200/80 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-900">
                        {productCount.toLocaleString()} {selectedMake} products found
                      </p>
                      <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
                        This action will permanently delete all {productCount.toLocaleString()}{' '}
                        products under make <span className="font-semibold">{selectedMake}</span>.
                        The make name itself will remain available.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
                  <p className="text-sm font-medium text-slate-600">
                    No products found under <span className="font-semibold">{selectedMake}</span>.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!selectedMake || isLoadingCount || isDeleting || (productCount !== null && productCount === 0)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-all shadow-sm shadow-red-200 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>
                  {productCount && productCount > 0
                    ? `Delete ${productCount} Products`
                    : 'Delete Products'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify component compiles with Next.js build check**

Run:
```bash
npx tsc --noEmit
```
Expected: Pass without TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/DeleteByMakeModal.tsx
git commit -m "feat(ui): create DeleteByMakeModal component"
```

---

### Task 3: Integrate "Delete by Make" in Products Page (`app/products/page.tsx`)

**Files:**
- Modify: `app/products/page.tsx`

- [ ] **Step 1: Update `app/products/page.tsx`**

1. Import `DeleteByMakeModal`.
2. Add `const [isDeleteByMakeOpen, setIsDeleteByMakeOpen] = useState(false);`.
3. Add the `"Delete by Make"` button in the action bar next to `"Delete All"`:
```tsx
<button
  onClick={() => setIsDeleteByMakeOpen(true)}
  disabled={isDeletingAll}
  className="flex items-center gap-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 px-5 py-3 sm:py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm disabled:opacity-50 flex-1 sm:flex-none justify-center"
>
  <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" /> Delete by Make
</button>
```
4. Render `<DeleteByMakeModal>`:
```tsx
<DeleteByMakeModal
  isOpen={isDeleteByMakeOpen}
  onClose={() => setIsDeleteByMakeOpen(false)}
  onSuccess={() => {
    setPage(1);
    fetchProducts(search, 1);
  }}
/>
```

- [ ] **Step 2: Verify TypeScript and page loads cleanly**

Run:
```bash
npx tsc --noEmit
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/products/page.tsx
git commit -m "feat: integrate Delete by Make button and modal on products page"
```

---

### Task 4: End-to-End Verification

**Files:**
- Test via browser or curl

- [ ] **Step 1: Verify API with sample make**
- [ ] **Step 2: Verify UI modal in browser**
- [ ] **Step 3: Commit any final polish**
