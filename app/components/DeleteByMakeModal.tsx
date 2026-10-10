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

const DEFAULT_KNOWN_MAKES = [
  'ISCAR',
  'PHOENIX',
  'CTC PRECISION',
  'HNTI OIL',
  'REGO-FIX',
  'ADDISON',
];

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

  // Fetch makes whenever modal opens
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
      const makeSet = new Set<string>();
      const options: MakeOption[] = [];

      if (Array.isArray(data)) {
        data.forEach((m) => {
          if (m?.name) {
            const upper = m.name.trim().toUpperCase();
            if (!makeSet.has(upper)) {
              makeSet.add(upper);
              options.push({ id: m.id || upper, name: upper });
            }
          }
        });
      }

      // Merge default known makes so common makes are always present
      DEFAULT_KNOWN_MAKES.forEach((dm) => {
        if (!makeSet.has(dm)) {
          makeSet.add(dm);
          options.push({ id: dm, name: dm });
        }
      });

      options.sort((a, b) => a.name.localeCompare(b.name));
      setMakes(options);
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

    if (productCount === 0) {
      toast.error(`No products found for ${selectedMake}`);
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/products/by-make?make=${encodeURIComponent(selectedMake)}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (res.ok) {
        const deletedCount = data.count ?? productCount ?? 0;
        toast.success(`Successfully deleted ${deletedCount} ${selectedMake} product${deletedCount === 1 ? '' : 's'}`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative border border-slate-100 animate-in zoom-in-95 duration-200">
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
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors disabled:opacity-50"
            title="Close modal"
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
            <div className="transition-all">
              {isLoadingCount ? (
                <div className="flex items-center justify-center gap-2 text-slate-500 text-sm py-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  <span>Checking product catalog for {selectedMake}...</span>
                </div>
              ) : productCount !== null && productCount > 0 ? (
                <div className="bg-red-50/70 border border-red-200/80 rounded-xl p-4 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-900">
                        {productCount.toLocaleString()} {selectedMake} product{productCount === 1 ? '' : 's'} found
                      </p>
                      <p className="text-xs text-red-700 mt-1 leading-relaxed">
                        This action will permanently delete all {productCount.toLocaleString()}{' '}
                        products under make <span className="font-semibold">{selectedMake}</span>.
                        The make name itself will remain available for future use.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
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
            disabled={
              !selectedMake ||
              isLoadingCount ||
              isDeleting ||
              productCount === null ||
              productCount === 0
            }
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
                    ? `Delete ${productCount.toLocaleString()} Products`
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
