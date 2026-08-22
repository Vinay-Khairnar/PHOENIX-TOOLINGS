import React, { useState, useEffect } from 'react';
import { Pencil, X, Loader2, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

interface Product {
  id: string;
  name: string;
  itemNumber: string | null;
  drawingNumber?: string | null;
  make?: string | null;
  price: number;
}

interface EditProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MAKE_OPTIONS = [
  'PHOENIX',
  'ISCAR',
  'CTC PRECISION',
  'HNTI OIL',
  'REGO-FIX',
  'ADDISON',
];

export default function EditProductModal({ product, isOpen, onClose, onSuccess }: EditProductModalProps) {
  const [name, setName] = useState('');
  const [itemNumber, setItemNumber] = useState('');
  const [drawingNumber, setDrawingNumber] = useState('');
  const [make, setMake] = useState('');
  const [price, setPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync form when product changes
  useEffect(() => {
    if (product) {
      setName(product.name);
      setItemNumber(product.itemNumber || '');
      setDrawingNumber(product.drawingNumber || '');
      setMake(product.make || '');
      setPrice(String(product.price));
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Product Description is required');
    if (!make) return toast.error('Make is required');
    if (!price || isNaN(parseFloat(price))) return toast.error('Valid price is required');

    setIsSubmitting(true);
    const loadingToast = toast.loading('Saving changes...');

    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          itemNumber: itemNumber.trim() || null,
          drawingNumber: drawingNumber.trim() || null,
          make: make.toUpperCase(),
          price: parseFloat(price),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update product');
      }

      toast.success('Product updated!', { id: loadingToast });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error updating product.', { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 relative">
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 transition-colors disabled:opacity-50"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold mb-1 text-gray-800">Edit Product</h2>
        <p className="text-sm text-gray-400 mb-6 truncate">{product.name}</p>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Product Description <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-gray-50 border border-gray-200 text-gray-700 py-2.5 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="e.g. AX 10-CF Ø 10.0 mm"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-sm font-medium text-gray-700">Item No.</label>
              <input
                type="text"
                value={itemNumber}
                onChange={(e) => setItemNumber(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-gray-50 border border-gray-200 text-gray-700 py-2.5 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="e.g. 9911.45986"
              />
            </div>

            <div className="flex flex-col gap-1 flex-1">
              <label className="text-sm font-medium text-gray-700">Drawing No.</label>
              <input
                type="text"
                value={drawingNumber}
                onChange={(e) => setDrawingNumber(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-gray-50 border border-gray-200 text-gray-700 py-2.5 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="e.g. PT-2025-001"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Price <span className="text-red-500">*</span></label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onFocus={(e) => e.target.select()}
              disabled={isSubmitting}
              className="w-full bg-gray-50 border border-gray-200 text-gray-700 py-2.5 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="₹ 0.00"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Make <span className="text-red-500">*</span></label>
            <div className="relative">
              <select
                value={make}
                onChange={(e) => setMake(e.target.value)}
                disabled={isSubmitting}
                className="appearance-none w-full bg-gray-50 border border-gray-200 text-gray-700 py-2.5 px-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer transition-all"
              >
                <option value="" disabled>Select Make</option>
                {MAKE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                <ChevronDown className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 mt-6">
            <button
              type="submit"
              disabled={isSubmitting || !name || !price || !make}
              className="w-full flex items-center justify-center gap-2 bg-[#5B4AEB] hover:bg-[#4d3ddf] text-white py-3.5 px-6 rounded-xl transition-all font-semibold shadow-md active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:pointer-events-none"
            >
              {isSubmitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
              ) : (
                <><Pencil className="w-5 h-5" /> Save Changes</>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
