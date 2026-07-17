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
    <div className="animate-in px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Products</h1>
          <p className="text-slate-500 mt-1">Manage your product catalog</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {products.length > 0 && (
            <button 
              onClick={handleDeleteAll}
              disabled={isDeletingAll}
              className="flex items-center gap-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 px-5 py-3 sm:py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm disabled:opacity-50 flex-1 sm:flex-none justify-center"
            >
              {isDeletingAll ? (
                <><Loader2 className="w-5 h-5 sm:w-4 sm:h-4 animate-spin" /> Deleting...</>
              ) : (
                <><Trash2 className="w-5 h-5 sm:w-4 sm:h-4" /> Delete All</>
              )}
            </button>
          )}
          <label className={`flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 sm:py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm shadow-indigo-200 cursor-pointer flex-1 sm:flex-none ${isUploading ? 'opacity-70 pointer-events-none' : ''}`}>
            {isUploading ? (
              <><Loader2 className="w-5 h-5 sm:w-4 sm:h-4 animate-spin" /> Importing...</>
            ) : (
              <><Upload className="w-5 h-5 sm:w-4 sm:h-4" /> Import Excel/CSV/PDF</>
            )}
            <input type="file" accept=".csv,.xlsx,.xls,.pdf" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
          </label>
        </div>
      </div>

      <div className="bg-transparent sm:bg-white sm:rounded-2xl sm:shadow-sm sm:border sm:border-slate-200 overflow-hidden">
        <div className="p-0 pb-4 sm:p-4 sm:border-b sm:border-slate-100 sm:bg-slate-50/50">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search products by description or part no..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 sm:py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm sm:shadow-none"
            />
          </div>
        </div>
        
        <div className="overflow-hidden sm:overflow-x-auto">
          <table className="w-full text-left text-sm block sm:table">
            <thead className="bg-slate-50/80 text-slate-500 font-medium hidden sm:table-header-group">
              <tr>
                <th className="px-6 py-4 w-20 whitespace-nowrap">Sr. No.</th>
                <th className="px-6 py-4 w-1/4">Part No.</th>
                <th className="px-6 py-4 w-2/4">Description</th>
                <th className="px-6 py-4 w-1/6 text-right">Price</th>
                <th className="px-6 py-4 w-1/12 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-0 sm:divide-y divide-slate-100 block sm:table-row-group">
              {isLoading ? (
                <tr className="block sm:table-row">
                  <td colSpan={5} className="px-6 py-12 text-center block sm:table-cell">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-indigo-600 mb-4" />
                    <h3 className="text-slate-900 font-medium text-base mb-1">Loading products...</h3>
                    <p className="text-slate-500 text-sm">Please wait while we fetch your catalog.</p>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr className="block sm:table-row">
                  <td colSpan={5} className="px-6 py-12 text-center block sm:table-cell">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
                      <PackageSearch className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-slate-900 font-medium text-base mb-1">No products found</h3>
                    <p className="text-slate-500 text-sm">Try adjusting your search query or import some products.</p>
                  </td>
                </tr>
              ) : (
                products.map((product, index) => (
                  <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group block sm:table-row bg-white p-4 sm:p-0 mb-4 sm:mb-0 rounded-2xl sm:rounded-none shadow-sm sm:shadow-none border border-slate-100 sm:border-0">
                    <td className="px-1 sm:px-6 py-2 sm:py-4 flex justify-between items-center sm:table-cell border-b sm:border-0 border-slate-50">
                      <span className="sm:hidden text-xs font-semibold text-slate-400 uppercase tracking-wider">Sr. No.</span>
                      <span className="text-slate-500 font-medium tabular-nums sm:text-center">
                        {(page - 1) * 50 + index + 1}
                      </span>
                    </td>
                    <td className="px-1 sm:px-6 py-2 sm:py-4 flex justify-between items-center sm:table-cell border-b sm:border-0 border-slate-50">
                      <span className="sm:hidden text-xs font-semibold text-slate-400 uppercase tracking-wider">Part No.</span>
                      {product.articleNumber ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 group-hover:bg-white transition-colors">
                          {product.articleNumber}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-1 sm:px-6 py-2 sm:py-4 flex justify-between items-start sm:items-center sm:table-cell border-b sm:border-0 border-slate-50 flex-col sm:flex-row gap-1 sm:gap-0">
                      <span className="sm:hidden text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</span>
                      <span className="font-medium text-slate-900 text-right sm:text-left w-full sm:w-auto break-words">
                        {product.name}
                      </span>
                    </td>
                    <td className="px-1 sm:px-6 py-2 sm:py-4 flex justify-between items-center sm:table-cell border-b sm:border-0 border-slate-50 sm:text-right">
                      <span className="sm:hidden text-xs font-semibold text-slate-400 uppercase tracking-wider">Price</span>
                      <span className="text-slate-900 font-medium tabular-nums w-full sm:w-auto text-right">
                        {formatCurrency(product.price)}
                      </span>
                    </td>
                    <td className="px-1 sm:px-6 py-4 sm:py-4 flex justify-end sm:table-cell mt-2 sm:mt-0 sm:text-right">
                      <div className="flex justify-end gap-2 w-full">
                        <button 
                          onClick={() => handleDelete(product.id)}
                          className="flex-1 sm:flex-none flex justify-center items-center gap-2 p-2.5 sm:p-1.5 text-slate-600 sm:text-slate-400 bg-slate-50 sm:bg-transparent hover:text-red-600 hover:bg-red-50 rounded-xl sm:rounded-lg transition-colors font-medium text-sm sm:text-base border border-slate-200 sm:border-0"
                          title="Delete product"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="sm:hidden">Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 sm:border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0 sm:bg-slate-50/50 bg-transparent rounded-b-2xl sm:rounded-none">
            <div className="text-sm text-slate-500 font-medium text-center sm:text-left">
              Showing <span className="text-slate-900 font-semibold">{(page - 1) * 50 + 1}</span> to <span className="text-slate-900 font-semibold">{Math.min(page * 50, totalCount)}</span> of <span className="text-slate-900 font-semibold">{totalCount}</span> results
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex-1 sm:flex-none px-4 py-3 sm:py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-sm"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex-1 sm:flex-none px-4 py-3 sm:py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-sm"
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
