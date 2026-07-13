'use client';

import { useState, useEffect } from 'react';
import { Upload, PackageSearch, Trash2, Search, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/format';

interface Product { id: string; name: string; sku: string | null; articleNumber: string | null; price: number; discount: number; }

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchProducts = async (q = '', p = 1) => {
    try {
      const res = await fetch(`/api/products?q=${encodeURIComponent(q)}&page=${p}`);
      const data = await res.json();
      if (data.products) {
        setProducts(data.products);
        setTotalPages(data.totalPages);
        setTotalCount(data.totalCount);
      } else if (Array.isArray(data)) {
        setProducts(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1); // Reset page on search change
      fetchProducts(search, 1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  
  useEffect(() => {
    if (page > 1 || !search) {
        fetchProducts(search, page);
    }
  }, [page]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchProducts(search, page);
        toast.success('Product deleted');
      } else {
        throw new Error('Delete failed');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error deleting product');
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('WARNING: Are you sure you want to delete ALL products? This action cannot be undone.')) return;
    setIsDeletingAll(true);
    try {
      const res = await fetch('/api/products/all', { method: 'DELETE' });
      if (res.ok) {
        setSearch('');
        setPage(1);
        fetchProducts('', 1);
        toast.success('All products deleted');
      } else {
        toast.error('Failed to delete all products.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error deleting all products');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const loadingToast = toast.loading('Importing products...');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/products/import', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      toast.success('Products imported successfully!', { id: loadingToast });
      fetchProducts(search, page);
    } catch (error) {
      console.error(error);
      toast.error('Error importing products.', { id: loadingToast });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="flex-1 w-full max-w-[1000px] mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-[34px] font-semibold tracking-tight">Products</h1>
          <p className="text-[#7a7a7a]">Manage your product catalog</p>
        </div>
        <div className="flex gap-2">
          {products.length > 0 && (
            <button 
              onClick={handleDeleteAll}
              disabled={isDeletingAll}
              className="bg-red-50 text-red-600 border border-red-200 rounded-[11px] py-2 px-4 font-medium text-[14px] hover:bg-red-100 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isDeletingAll ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</>
              ) : (
                <><Trash2 className="w-4 h-4" /> Delete All</>
              )}
            </button>
          )}
          <label className={`bg-[#0066cc] text-white rounded-[11px] py-2 px-4 text-[14px] font-semibold hover:bg-[#0071e3] transition cursor-pointer flex items-center gap-2 ${isUploading ? 'opacity-70 pointer-events-none' : ''}`}>
            {isUploading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</>
            ) : (
              <><Upload className="w-4 h-4" /> Import Excel/CSV</>
            )}
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
          </label>
        </div>
      </div>

      <div className="bg-white border border-[#e0e0e0] rounded-[18px] overflow-hidden shadow-[0_5px_30px_rgba(0,0,0,0.05)]">
        <div className="p-4 border-b border-[#f0f0f0]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7a7a7a] w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search products by name or SKU..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#f5f5f7] border-none rounded-[11px] py-4 pl-12 pr-4 text-[17px] outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
          </div>
        </div>
        
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#e0e0e0] bg-[#f5f5f7]">
              <th className="py-4 px-6 font-medium w-1/4">Name</th>
              <th className="py-4 px-6 font-medium w-1/6">SKU</th>
              <th className="py-4 px-6 font-medium w-1/6">Article No.</th>
              <th className="py-4 px-6 font-medium w-1/6 text-right">Price</th>
              <th className="py-4 px-6 font-medium w-1/12 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center">
                  <PackageSearch className="w-12 h-12 mx-auto mb-3 text-[#e0e0e0]" />
                  <p className="text-[#7a7a7a] font-medium">No products found</p>
                </td>
              </tr>
            ) : (
              products.map(product => (
                <tr key={product.id} className="border-b border-[#f0f0f0] last:border-b-0 hover:bg-[#fafafc] group">
                  <td className="py-4 px-6 text-[14px] font-medium">{product.name}</td>
                  <td className="py-4 px-6 text-[14px] text-[#7a7a7a]">{product.sku || '-'}</td>
                  <td className="py-4 px-6 text-[14px] text-[#7a7a7a]">{product.articleNumber || '-'}</td>
                  <td className="py-4 px-6 text-[14px] text-right font-medium">{formatCurrency(product.price)}</td>
                  <td className="py-4 px-6 text-right">
                    <button 
                      onClick={() => handleDelete(product.id)}
                      className="p-2 text-[#7a7a7a] opacity-0 group-hover:opacity-100 hover:text-red-600 hover:bg-red-50 rounded-full transition"
                      title="Delete product"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="p-4 border-t border-[#f0f0f0] flex items-center justify-between bg-[#fafafc]">
            <div className="text-[14px] text-[#7a7a7a]">
              Showing {(page - 1) * 50 + 1} to {Math.min(page * 50, totalCount)} of {totalCount} results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-full border border-[#e0e0e0] bg-white text-[14px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] disabled:opacity-50 transition"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-full border border-[#e0e0e0] bg-white text-[14px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] disabled:opacity-50 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
