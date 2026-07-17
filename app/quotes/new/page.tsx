'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuoteBuilder } from '@/store/quote-builder';
import { Search, Plus, Trash2, FileText, Loader2, User, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/format';

interface Product { id: string; name: string; articleNumber: string | null; price: number; }
interface Customer { id: string; name: string; email: string | null; phone: string | null; address: string | null; contactPerson: string | null; }

export default function Home() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerInputRef = useRef<HTMLInputElement>(null);
  
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
    reset 
  } = useQuoteBuilder();


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

  useEffect(() => {
    if (customerName.length < 2) {
      setCustomerSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/customers?q=${encodeURIComponent(customerName)}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setCustomerSearchResults(data);
        })
        .catch(console.error);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerName]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerInputRef.current && !customerInputRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-generate quote number on mount if empty
  useEffect(() => {
    if (!quoteNumber) {
      fetch('/api/quotations/next-number')
        .then(res => res.json())
        .then(data => {
          if (data.quoteNumber) {
            setQuoteNumber(data.quoteNumber);
          }
        })
        .catch(console.error);
    }
  }, []);

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity * (1 - (item.discount || 0) / 100)), 0);
  const discountAmount = subtotal * (discount / 100);
  const taxableAmount = subtotal - discountAmount;
  const cgstAmount = taxableAmount * (cgst / 100);
  const sgstAmount = taxableAmount * (sgst / 100);
  const igstAmount = taxableAmount * (igst / 100);
  const total = taxableAmount + cgstAmount + sgstAmount + igstAmount;


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
      
      // Fetch and download PDF programmatically to avoid blank new tabs
      try {
        const pdfRes = await fetch(`/api/quotations/${quote.id}/pdf`);
        if (pdfRes.ok) {
          const blob = await pdfRes.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${quote.quoteNumber}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      } catch (pdfError) {
        console.error('Failed to download PDF:', pdfError);
      }
      
      toast.success('Quotation generated successfully!', { id: loadingToast });
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
            <div className="relative" ref={customerInputRef}>
              <label className="block text-[13px] text-[#7a7a7a] mb-1 font-medium">Customer Name *</label>
              <input 
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
              
              {showCustomerDropdown && customerSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e0e0e0] rounded-[12px] overflow-hidden max-h-[250px] overflow-y-auto shadow-[0_10px_40px_rgba(0,0,0,0.1)] divide-y divide-[#f0f0f0] z-50">
                  {customerSearchResults.map(customer => (
                    <div 
                      key={customer.id} 
                      className="flex items-center justify-between p-3 hover:bg-[#fafafc] transition-colors cursor-pointer"
                      onClick={() => {
                        setCustomerName(customer.name);
                        setCustomerEmail(customer.email || '');
                        setCustomerPhone(customer.phone || '');
                        setCustomerAddress(customer.address || '');
                        if (customer.contactPerson) setContactPerson(customer.contactPerson);
                        setShowCustomerDropdown(false);
                      }}
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="font-semibold text-[14px] text-[#111]">{customer.name}</div>
                        {(customer.email || customer.phone || customer.contactPerson) && (
                          <div className="text-[12px] text-[#7a7a7a]">
                            {[customer.email, customer.phone, customer.contactPerson ? `Attn: ${customer.contactPerson}` : null].filter(Boolean).join(' • ')}
                          </div>
                        )}
                      </div>
                      <Plus className="w-4 h-4 text-[#0066cc]" />
                    </div>
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

      </div>

      {/* Right Column: Sticky Sidebar */}
      <div className="w-full md:w-[400px] xl:w-[450px] shrink-0 flex flex-col gap-6 h-fit relative md:sticky top-8">
        
        {/* 1. Product Search */}
        <section className="bg-white border border-[#e0e0e0] rounded-[18px] p-6 shadow-sm flex flex-col gap-5 relative z-10">
          <div className="flex flex-col gap-1">
            <h2 className="text-[20px] font-semibold tracking-tight">Add Products</h2>
          </div>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7a7a7a] w-5 h-5 group-focus-within:text-[#0066cc] transition-colors" />
            <input 
              type="text" 
              placeholder="Search by description or part no..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#f5f5f7] border border-[#e0e0e0] rounded-[12px] py-3.5 pl-12 pr-4 text-[15px] outline-none focus:ring-4 focus:ring-[#0066cc]/10 focus:border-[#0066cc] focus:bg-white transition-all shadow-sm"
            />
          </div>
          
          {searchResults.length > 0 && (
            <div className="absolute top-[110px] left-0 right-0 mx-6 bg-white border border-[#e0e0e0] rounded-[12px] overflow-hidden max-h-[350px] overflow-y-auto shadow-[0_10px_40px_rgba(0,0,0,0.1)] divide-y divide-[#f0f0f0] z-50">
              {searchResults.map(product => (
                <div key={product.id} className="flex items-center justify-between p-4 hover:bg-[#fafafc] transition-colors group/item cursor-pointer" onClick={() => {
                  addItem({ productId: product.id, name: product.name, price: product.price, quantity: 1, discount: 0, articleNumber: product.articleNumber });
                  setSearchQuery('');
                  setSearchResults([]);
                }}>
                  <div className="flex flex-col gap-1">
                    <div className="font-semibold text-[14px] tracking-tight text-[#111] leading-tight">{product.name}</div>
                    <div className="text-[13px] text-[#7a7a7a] flex items-center gap-2 mt-1">
                      {product.articleNumber && (
                        <span className="inline-flex items-center bg-[#f0f0f0] border border-[#e5e5e5] px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold tracking-wider text-[#555]">
                          {product.articleNumber}
                        </span>
                      )}
                      <span className="font-semibold text-[#333]">{formatCurrency(product.price)}</span>
                    </div>
                  </div>
                  <button 
                    className="flex items-center justify-center shrink-0 w-8 h-8 bg-white border border-[#e0e0e0] rounded-full text-[#0066cc] hover:bg-[#0066cc] hover:text-white hover:border-[#0066cc] transition-all shadow-sm group-hover/item:scale-110 active:scale-95"
                    title="Add to Quote"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 2. Quote Summary */}
        <div className="bg-[#f5f5f7] border border-[#e0e0e0] rounded-[18px] p-6 flex flex-col">
          <h2 className="text-[24px] font-semibold tracking-tight mb-6">Quotation Summary</h2>
          
          <div className="flex-1 overflow-y-auto max-h-[40vh] min-h-[150px] pr-2 -mr-2">
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
                          item.articleNumber ? `Part No: ${item.articleNumber}` : null,
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
    </div>
  );
}
