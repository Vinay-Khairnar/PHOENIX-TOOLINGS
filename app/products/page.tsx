'use client';

import { useState, useEffect } from 'react';
import { Upload, PackageSearch, Trash2, Search, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/format';

interface Product { id: string; name: string; articleNumber: string | null; price: number; }

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProducts = async (q = '', p = 1) => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-8">
        <div>
          <h1 className="text-[34px] font-semibold tracking-tight">Products</h1>
          <p className="text-[#7a7a7a]">Manage your product catalog</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {products.length > 0 && (
            <button 
              onClick={handleDeleteAll}
              disabled={isDeletingAll}
              className="bg-red-50 text-red-600 border border-red-200 rounded-[11px] py-2 px-4 font-medium text-[14px] hover:bg-red-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 flex-1 sm:flex-none"
            >
              {isDeletingAll ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</>
              ) : (
                <><Trash2 className="w-4 h-4" /> Delete All</>
              )}
            </button>
          )}
          <label className={`bg-[#0066cc] text-white rounded-[11px] py-2 px-4 text-[14px] font-semibold hover:bg-[#0071e3] transition cursor-pointer flex items-center justify-center gap-2 flex-1 sm:flex-none ${isUploading ? 'opacity-70 pointer-events-none' : ''}`}>
            {isUploading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</>
            ) : (
              <><Upload className="w-4 h-4" /> Import Excel/CSV/PDF</>
            )}
            <input type="file" accept=".csv,.xlsx,.xls,.pdf" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
          </label>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-[#0066cc] transition-colors" />
            <input 
              type="text" 
              placeholder="Search products by description or part no..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 text-[15px] outline-none focus:bg-white focus:ring-2 focus:ring-[#0066cc]/20 focus:border-[#0066cc] transition-all"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 backdrop-blur-sm text-xs uppercase tracking-wider font-semibold text-slate-500 divide-x divide-slate-200">
                <th className="py-4 px-6 w-20 whitespace-nowrap">Sr. No.</th>
                <th className="py-4 px-6 w-1/4">Part No.</th>
                <th className="py-4 px-6 w-2/4">Description</th>
                <th className="py-4 px-6 w-1/6 text-right">Price</th>
                <th className="py-4 px-6 w-1/12 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-[#0066cc] mb-4" />
                    <h3 className="text-slate-900 font-medium text-[16px] mb-1">Loading products...</h3>
                    <p className="text-slate-500 text-[14px]">Please wait while we fetch your catalog.</p>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
                      <PackageSearch className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-slate-900 font-medium text-[16px] mb-1">No products found</h3>
                    <p className="text-slate-500 text-[14px]">Try adjusting your search query or import some products.</p>
                  </td>
                </tr>
              ) : (
                products.map((product, index) => (
                  <tr key={product.id} className="group hover:bg-blue-50/30 transition-colors duration-200 divide-x divide-slate-100">
                    <td className="py-4 px-6 text-[13px] text-slate-400 font-medium tabular-nums text-center">
                      {(page - 1) * 50 + index + 1}
                    </td>
                    <td className="py-4 px-6 text-[14px]">
                      {product.articleNumber ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 group-hover:bg-white group-hover:border-slate-300 transition-colors">
                          {product.articleNumber}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="py-4 px-6 text-[14px] text-slate-900 font-medium">
                      {product.name}
                    </td>
                    <td className="py-4 px-6 text-[14px] text-right text-slate-900 font-semibold tabular-nums">
                      {formatCurrency(product.price)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button 
                        onClick={() => handleDelete(product.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="text-[13px] text-slate-500 font-medium">
              Showing <span className="text-slate-900 font-semibold">{(page - 1) * 50 + 1}</span> to <span className="text-slate-900 font-semibold">{Math.min(page * 50, totalCount)}</span> of <span className="text-slate-900 font-semibold">{totalCount}</span> results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-sm"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-sm"
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
