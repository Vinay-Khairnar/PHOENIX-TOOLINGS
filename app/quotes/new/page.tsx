'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuoteBuilder } from '@/store/quote-builder';
import { Search, Plus, Trash2, FileText, Loader2, User, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/format';

interface Customer { id: string; name: string; email: string | null; phone: string | null; address: string | null; }
interface Product { id: string; name: string; sku: string | null; articleNumber: string | null; price: number; discount: number; }

export default function Home() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const customerInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { 
    customerName, setCustomerName,
    customerEmail, setCustomerEmail,
    customerPhone, setCustomerPhone,
    customerAddress, setCustomerAddress,
    contactPerson, setContactPerson,
    quoteDate, setQuoteDate,
    quoteNumber, setQuoteNumber,
    refNumber, setRefNumber,
    refDate, setRefDate,
    cgst, setCgst,
    sgst, setSgst,
    igst, setIgst,
    items, addItem, updateItemQuantity, updateItemDiscount, removeItem, 
    discount, setDiscount,
    fillCustomer,
    reset 
  } = useQuoteBuilder();

  useEffect(() => {
    fetch('/api/customers')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCustomers(data);
      })
      .catch(console.error);
  }, []);

  // Filter customers for autocomplete
  useEffect(() => {
    if (customerName.length < 1) {
      setFilteredCustomers([]);
      return;
    }
    const filtered = customers.filter(c =>
      c.name.toLowerCase().includes(customerName.toLowerCase())
    );
    setFilteredCustomers(filtered);
  }, [customerName, customers]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/products?q=${encodeURIComponent(searchQuery)}`)
        .then(res => res.json())
        .then(data => {
          if (data.products) setSearchResults(data.products);
          else if (Array.isArray(data)) setSearchResults(data);
        })
        .catch(console.error);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity * (1 - (item.discount || 0) / 100)), 0);
  const discountAmount = subtotal * (discount / 100);
  const taxableAmount = subtotal - discountAmount;
  const cgstAmount = taxableAmount * (cgst / 100);
  const sgstAmount = taxableAmount * (sgst / 100);
  const igstAmount = taxableAmount * (igst / 100);
  const total = taxableAmount + cgstAmount + sgstAmount + igstAmount;

  const handleSelectCustomer = (customer: Customer) => {
    fillCustomer(customer);
    setShowCustomerDropdown(false);
  };

  const handleGenerate = async () => {
    if (!customerName.trim()) {
      toast.error('Please enter customer name.');
      return;
    }
    if (!quoteNumber.trim()) {
      toast.error('Please enter a quote number.');
      return;
    }
    if (items.length === 0) {
      toast.error('Please add at least one item to the quote.');
      return;
    }

    setIsGenerating(true);
    const loadingToast = toast.loading('Generating quotation...');
    try {
      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
          customerAddress: customerAddress.trim() || undefined,
          contactPerson: contactPerson.trim() || undefined,
          quoteDate,
          quoteNumber: quoteNumber.trim(),
          refNumber: refNumber.trim() || undefined,
          refDate: refDate.trim() || undefined,
          cgst,
          sgst,
          igst,
          items,
          discount,
          total
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save quote');
      }
      const quote = await res.json();
      
      reset();
      toast.success('Quotation generated successfully!', { id: loadingToast });
      window.open(`/api/quotations/${quote.id}/pdf`, '_blank');
      router.push(`/quotes/${quote.id}`);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error generating quote', { id: loadingToast });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 w-full max-w-[1200px] mx-auto p-4 md:p-8 flex flex-col md:flex-row gap-8">
      {/* Left Column: Builder */}
      <div className="flex-1 flex flex-col gap-8 min-w-0">
        
        {/* Customer Details (Inline) */}
        <section className="bg-white border border-[#e0e0e0] rounded-[18px] p-6 shadow-sm">
          <h2 className="text-[20px] font-semibold tracking-tight mb-5 flex items-center gap-2">
            <User className="w-5 h-5 text-[#0066cc]" />
            Customer Details
          </h2>
          <div className="flex flex-col gap-4">
            {/* Customer Name with Autocomplete */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-[13px] text-[#7a7a7a] mb-1 font-medium">Customer Name *</label>
              <input 
                ref={customerInputRef}
                type="text"
                placeholder="Type customer name..."
                className="w-full bg-[#f5f5f7] border border-[#e0e0e0] rounded-[11px] p-3 text-[15px] outline-none focus:ring-2 focus:ring-[#0066cc]"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
              />
              {showCustomerDropdown && filteredCustomers.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-[#e0e0e0] rounded-[11px] shadow-lg max-h-[200px] overflow-y-auto">
                  {filteredCustomers.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-[#f5f5f7] border-b border-[#f0f0f0] last:border-b-0 transition-colors"
                      onClick={() => handleSelectCustomer(c)}
                    >
                      <div className="font-medium text-[14px]">{c.name}</div>
                      {(c.email || c.phone) && (
                        <div className="text-[12px] text-[#7a7a7a]">
                          {[c.email, c.phone].filter(Boolean).join(' • ')}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] text-[#7a7a7a] mb-1 font-medium">Email</label>
                <input 
                  type="email"
                  placeholder="customer@company.com"
                  className="w-full bg-[#f5f5f7] border border-[#e0e0e0] rounded-[11px] p-3 text-[15px] outline-none focus:ring-2 focus:ring-[#0066cc]"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[13px] text-[#7a7a7a] mb-1 font-medium">Phone</label>
                <input 
                  type="tel"
                  placeholder="+91 9890448625"
                  className="w-full bg-[#f5f5f7] border border-[#e0e0e0] rounded-[11px] p-3 text-[15px] outline-none focus:ring-2 focus:ring-[#0066cc]"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] text-[#7a7a7a] mb-1 font-medium">Address</label>
              <textarea 
                placeholder="Full address..."
                rows={2}
                className="w-full bg-[#f5f5f7] border border-[#e0e0e0] rounded-[11px] p-3 text-[15px] outline-none focus:ring-2 focus:ring-[#0066cc] resize-none"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[13px] text-[#7a7a7a] mb-1 font-medium">Kind Attn (Contact Person)</label>
              <input 
                type="text"
                placeholder="Mr. / Ms. Name"
                className="w-full bg-[#f5f5f7] border border-[#e0e0e0] rounded-[11px] p-3 text-[15px] outline-none focus:ring-2 focus:ring-[#0066cc]"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Quote Details */}
        <section className="bg-white border border-[#e0e0e0] rounded-[18px] p-6 shadow-sm">
          <h2 className="text-[20px] font-semibold tracking-tight mb-5">Quote Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] text-[#7a7a7a] mb-1 font-medium">Quote # *</label>
              <input 
                type="text"
                placeholder="PT/25-26/415"
                className="w-full bg-[#f5f5f7] border border-[#e0e0e0] rounded-[11px] p-3 text-[15px] outline-none focus:ring-2 focus:ring-[#0066cc]"
                value={quoteNumber}
                onChange={(e) => setQuoteNumber(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[13px] text-[#7a7a7a] mb-1 font-medium">Date</label>
              <input 
                type="date"
                className="w-full bg-[#f5f5f7] border border-[#e0e0e0] rounded-[11px] p-3 text-[15px] outline-none focus:ring-2 focus:ring-[#0066cc]"
                value={quoteDate}
                onChange={(e) => setQuoteDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[13px] text-[#7a7a7a] mb-1 font-medium">Reference No.</label>
              <input 
                type="text"
                placeholder="BY MAIL"
                className="w-full bg-[#f5f5f7] border border-[#e0e0e0] rounded-[11px] p-3 text-[15px] outline-none focus:ring-2 focus:ring-[#0066cc]"
                value={refNumber}
                onChange={(e) => setRefNumber(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[13px] text-[#7a7a7a] mb-1 font-medium">Reference Date</label>
              <input 
                type="date"
                className="w-full bg-[#f5f5f7] border border-[#e0e0e0] rounded-[11px] p-3 text-[15px] outline-none focus:ring-2 focus:ring-[#0066cc]"
                value={refDate}
                onChange={(e) => setRefDate(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Tax Settings */}
        <section className="bg-white border border-[#e0e0e0] rounded-[18px] p-6 shadow-sm">
          <h2 className="text-[20px] font-semibold tracking-tight mb-5">Tax Settings</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[13px] text-[#7a7a7a] mb-1 font-medium">CGST %</label>
              <input 
                type="number"
                min="0" max="100" step="0.5"
                className="w-full bg-[#f5f5f7] border border-[#e0e0e0] rounded-[11px] p-3 text-[15px] outline-none focus:ring-2 focus:ring-[#0066cc]"
                value={cgst}
                onChange={(e) => setCgst(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="block text-[13px] text-[#7a7a7a] mb-1 font-medium">SGST %</label>
              <input 
                type="number"
                min="0" max="100" step="0.5"
                className="w-full bg-[#f5f5f7] border border-[#e0e0e0] rounded-[11px] p-3 text-[15px] outline-none focus:ring-2 focus:ring-[#0066cc]"
                value={sgst}
                onChange={(e) => setSgst(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="block text-[13px] text-[#7a7a7a] mb-1 font-medium">IGST %</label>
              <input 
                type="number"
                min="0" max="100" step="0.5"
                className="w-full bg-[#f5f5f7] border border-[#e0e0e0] rounded-[11px] p-3 text-[15px] outline-none focus:ring-2 focus:ring-[#0066cc]"
                value={igst}
                onChange={(e) => setIgst(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          <p className="text-[12px] text-[#999] mt-2">For same state: CGST + SGST. For interstate: use IGST only (set CGST & SGST to 0).</p>
        </section>

        {/* Product Search */}
        <section>
          <h2 className="text-[20px] font-semibold tracking-tight mb-4">Add Products</h2>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7a7a7a] w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search by name, SKU, or article number..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#f5f5f7] border border-[#e0e0e0] rounded-[11px] py-3 pl-12 pr-4 text-[15px] outline-none focus:ring-2 focus:ring-[#0066cc]"
            />
          </div>
          
          {searchResults.length > 0 && (
            <div className="mt-4 bg-white border border-[#e0e0e0] rounded-[11px] overflow-hidden max-h-[300px] overflow-y-auto">
              {searchResults.map(product => (
                <div key={product.id} className="flex items-center justify-between p-3 border-b border-[#f0f0f0] last:border-b-0 hover:bg-[#fafafc]">
                  <div>
                    <div className="font-semibold text-[15px] tracking-tight">{product.name}</div>
                    <div className="text-[13px] text-[#7a7a7a]">
                      {[
                        product.articleNumber ? `Art: ${product.articleNumber}` : null,
                        product.sku ? `SKU: ${product.sku}` : null,
                        formatCurrency(product.price)
                      ].filter(Boolean).join(' | ')}
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      addItem({ productId: product.id, name: product.name, price: product.price, quantity: 1, discount: 0, articleNumber: product.articleNumber });
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="bg-[#fafafc] border border-[#e0e0e0] rounded-[8px] p-2 hover:bg-[#f0f0f0] transition-colors"
                  >
                    <Plus className="w-5 h-5 text-[#0066cc]" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Right Column: Quote Summary */}
      <div className="w-full md:w-[400px] xl:w-[450px] shrink-0 bg-[#f5f5f7] border border-[#e0e0e0] rounded-[18px] p-6 flex flex-col h-fit sticky top-8">
        <h2 className="text-[24px] font-semibold tracking-tight mb-6">Quotation Summary</h2>
        
        <div className="flex-1 overflow-y-auto min-h-[200px]">
          {items.length === 0 ? (
            <div className="text-[#7a7a7a] text-center mt-10">No items added yet.</div>
          ) : (
            <div className="flex flex-col gap-4">
              {items.map(item => (
                <div key={item.productId} className="flex flex-col gap-2 bg-white p-3 rounded-[8px] border border-[#e0e0e0]">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-[14px]">{item.name}</div>
                      <div className="text-[12px] text-[#7a7a7a]">
                        {[
                          item.articleNumber ? `Art: ${item.articleNumber}` : null,
                          formatCurrency(item.price)
                        ].filter(Boolean).join(' | ')}
                      </div>
                    </div>
                    <button onClick={() => removeItem(item.productId)} className="text-[#7a7a7a] hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[13px] border-t border-[#f0f0f0] pt-2">
                    <div className="flex items-center gap-2">
                      <label className="text-[#7a7a7a]">Qty:</label>
                      <input 
                        type="number" 
                        min="1" 
                        value={item.quantity}
                        onChange={(e) => updateItemQuantity(item.productId, Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 bg-[#f5f5f7] border border-[#e0e0e0] rounded-[5px] p-1 text-center"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[#7a7a7a]">Disc %:</label>
                      <input 
                        type="number" 
                        min="0" max="100"
                        value={item.discount}
                        onChange={(e) => {
                          let val = parseFloat(e.target.value) || 0;
                          val = Math.max(0, Math.min(100, val));
                          updateItemDiscount(item.productId, val);
                        }}
                        className="w-16 bg-[#f5f5f7] border border-[#e0e0e0] rounded-[5px] p-1 text-center"
                      />
                    </div>
                    <div className="font-medium text-right">
                      {formatCurrency(item.price * item.quantity * (1 - (item.discount || 0) / 100))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 pt-4 border-t border-[#e0e0e0] flex flex-col gap-2">
          <div className="flex justify-between text-[14px]">
            <span className="text-[#7a7a7a]">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between items-center text-[14px]">
            <span className="text-[#7a7a7a]">Global Discount (%)</span>
            <input 
              type="number" 
              min="0" max="100"
              value={discount}
              onChange={(e) => {
                let val = parseFloat(e.target.value) || 0;
                val = Math.max(0, Math.min(100, val));
                setDiscount(val);
              }}
              className="w-20 bg-white border border-[#e0e0e0] rounded-[5px] p-1 text-right"
            />
          </div>
          <div className="flex justify-between text-[14px]">
            <span className="text-[#7a7a7a]">Taxable Amount</span>
            <span>{formatCurrency(taxableAmount)}</span>
          </div>
          {cgst > 0 && (
            <div className="flex justify-between text-[13px]">
              <span className="text-[#999]">CGST ({cgst}%)</span>
              <span className="text-[#999]">{formatCurrency(cgstAmount)}</span>
            </div>
          )}
          {sgst > 0 && (
            <div className="flex justify-between text-[13px]">
              <span className="text-[#999]">SGST ({sgst}%)</span>
              <span className="text-[#999]">{formatCurrency(sgstAmount)}</span>
            </div>
          )}
          {igst > 0 && (
            <div className="flex justify-between text-[13px]">
              <span className="text-[#999]">IGST ({igst}%)</span>
              <span className="text-[#999]">{formatCurrency(igstAmount)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-[21px] tracking-tight mt-2">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        <button 
          onClick={handleGenerate}
          disabled={!customerName.trim() || items.length === 0 || isGenerating}
          className="mt-6 w-full bg-[#0066cc] text-white rounded-full py-3 px-6 font-semibold text-[17px] hover:bg-[#0071e3] active:scale-95 transition-all disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2 shadow-[0_4px_14px_0_rgba(0,102,204,0.39)] hover:shadow-[0_6px_20px_rgba(0,102,204,0.23)]"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileText className="w-5 h-5" />
              Generate PDF
            </>
          )}
        </button>
      </div>
    </div>
  );
}
