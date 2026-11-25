'use client';

import { useState, useEffect, useRef, use, useMemo } from 'react';
import { Search, Plus, Trash2, FileText, Loader2, User, ArrowLeft, Check, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/format';
import { QuotePreviewModal } from '@/app/components/QuotePreviewModal';
import { downloadSavedQuotePdf } from '@/lib/download-quote-pdf';

interface Product {
  id: string;
  name: string;
  itemNumber: string | null;
  price: number;
  make?: string | null;
  drawingNumber?: string | null;
}

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  contactPerson: string | null;
}

interface QuoteItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  discount: number;
  itemNumber: string | null;
  make?: string | null;
  drgNumber?: string | null;
}

export default function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [savingAction, setSavingAction] = useState<'save' | 'download' | null>(null);
  const [termsAndConditions, setTermsAndConditions] = useState('');

  // Customer State
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');

  // Quote Header State
  const [quoteNumber, setQuoteNumber] = useState('');
  const [quoteDate, setQuoteDate] = useState('');
  const [refNumber, setRefNumber] = useState('');
  const [refDate, setRefDate] = useState('');

  // Tax & Discount State
  const [cgst, setCgst] = useState(9);
  const [sgst, setSgst] = useState(9);
  const [igst, setIgst] = useState(0);
  const [discount, setDiscount] = useState(0);

  // Items State
  const [items, setItems] = useState<QuoteItem[]>([]);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerInputRef = useRef<HTMLInputElement>(null);

  // Load existing quote data
  useEffect(() => {
    async function loadQuote() {
      try {
        const res = await fetch(`/api/quotations/${id}`);
        if (!res.ok) {
          throw new Error('Failed to load quotation');
        }
        const data = await res.json();

        setCustomerName(data.customerName || '');
        setCustomerEmail(data.customerEmail || '');
        setCustomerPhone(data.customerPhone || '');
        setCustomerAddress(data.customerAddress || '');
        setContactPerson(data.contactPerson || '');

        setQuoteNumber(data.quoteNumber || '');
        if (data.createdAt) {
          const d = new Date(data.createdAt);
          setQuoteDate(
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          );
        }
        setRefNumber(data.refNumber || '');
        if (data.refDate) {
          const d = new Date(data.refDate);
          setRefDate(
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          );
        }

        setCgst(data.cgst ?? 9);
        setSgst(data.sgst ?? 9);
        setIgst(data.igst ?? 0);
        setDiscount(data.discount || 0);
        setTermsAndConditions(data.termsAndConditions || '');

        if (Array.isArray(data.items)) {
          setItems(
            data.items.map((item: any) => ({
              productId: item.productId || item.id,
              name: item.name,
              price: Number(item.price) || 0,
              quantity: Number(item.quantity) || 1,
              discount: Number(item.discount) || 0,
              itemNumber: item.itemNumber || null,
              make: item.make || null,
              drgNumber: item.drgNumber || null,
            }))
          );
        }
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Failed to load quote details');
      } finally {
        setIsLoading(false);
      }
    }

    loadQuote();
  }, [id]);

  // Product Search Debounce
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/products?q=${encodeURIComponent(searchQuery)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.products) setSearchResults(data.products);
          else if (Array.isArray(data)) setSearchResults(data);
        })
        .catch(console.error);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Customer Search Debounce
  useEffect(() => {
    if (customerName.length < 2) {
      setCustomerSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/customers?q=${encodeURIComponent(customerName)}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setCustomerSearchResults(data);
        })
        .catch(console.error);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerName]);

  // Click outside customer dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerInputRef.current && !customerInputRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Item helpers
  const addItem = (item: QuoteItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === item.productId ? { ...i, quantity: i.quantity + item.quantity } : i
        );
      }
      return [...prev, item];
    });
  };

  const updateItemQuantity = (productId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))
    );
  };

  const updateItemDiscount = (productId: string, itemDiscount: number) => {
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, discount: itemDiscount } : i))
    );
  };

  const updateItemDrgNumber = (productId: string, drgNumber: string) => {
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, drgNumber } : i))
    );
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  // Financial Calculations
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity * (1 - (item.discount || 0) / 100),
    0
  );
  const discountAmount = subtotal * (discount / 100);
  const taxableAmount = subtotal - discountAmount;
  const cgstAmount = taxableAmount * (cgst / 100);
  const sgstAmount = taxableAmount * (sgst / 100);
  const igstAmount = taxableAmount * (igst / 100);
  const total = taxableAmount + cgstAmount + sgstAmount + igstAmount;

  const previewQuoteData = useMemo(
    () => ({
      quoteNumber: quoteNumber.trim(),
      quoteDate,
      refNumber: refNumber.trim() || null,
      refDate: refDate.trim() || null,
      customerName: customerName.trim(),
      customerAddress: customerAddress.trim() || null,
      contactPerson: contactPerson.trim() || null,
      discount,
      items,
    }),
    [quoteNumber, quoteDate, refNumber, refDate, customerName, customerAddress, contactPerson, discount, items]
  );

  const validateForm = () => {
    if (!customerName.trim()) {
      toast.error('Please enter customer name.');
      return false;
    }
    if (!quoteNumber.trim()) {
      toast.error('Please enter a quote number.');
      return false;
    }
    if (items.length === 0) {
      toast.error('Please add at least one item to the quote.');
      return false;
    }
    return true;
  };

  const handleOpenPreview = () => {
    if (!validateForm()) return;
    setIsPreviewOpen(true);
  };

  // Handle Save
  const persistChanges = async (termsText: string, shouldDownload: boolean, fromModal: boolean) => {
    if (!validateForm()) return;

    if (fromModal) {
      setSavingAction(shouldDownload ? 'download' : 'save');
    } else {
      setIsSaving(true);
    }
    const loadingToast = toast.loading(
      shouldDownload ? 'Saving & generating PDF...' : 'Saving changes...'
    );
    try {
      const res = await fetch(`/api/quotations/${id}`, {
        method: 'PUT',
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
          total,
          ...(termsText.trim() ? { termsAndConditions: termsText } : {}),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update quote');
      }

      const updatedQuote = await res.json();

      if (shouldDownload) {
        await downloadSavedQuotePdf(
          updatedQuote.id,
          updatedQuote.quoteNumber,
          { ...previewQuoteData, termsAndConditions: termsText },
          Boolean(updatedQuote.termsColumnMissing)
        );
      }

      setIsPreviewOpen(false);
      toast.success(
        shouldDownload ? 'Quotation updated and PDF downloaded!' : 'Quotation updated successfully!',
        { id: loadingToast }
      );
      router.push(`/quotes/${updatedQuote.id}`);
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error updating quote', { id: loadingToast });
    } finally {
      setIsSaving(false);
      setSavingAction(null);
    }
  };

  const handleSave = () => persistChanges(termsAndConditions, false, false);

  if (isLoading) {
    return (
      <div className="flex-1 w-full max-w-[1200px] mx-auto p-12 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#0066cc] animate-spin mb-3" />
        <p className="text-[#7a7a7a] text-sm font-medium">Loading quotation details...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-[1200px] mx-auto p-4 md:p-8 flex flex-col gap-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href={`/quotes/${id}`}
            className="inline-flex items-center text-[#0066cc] hover:underline text-[14px] font-medium mb-1"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Quote Details
          </Link>
          <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-slate-900">
            Edit Quote <span className="text-[#0066cc]">{quoteNumber}</span>
          </h1>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href={`/quotes/${id}`}
            className="border border-[#e0e0e0] bg-white text-[#555] rounded-xl py-2.5 px-4 font-medium text-[14px] hover:bg-[#fafafc] transition-colors"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleOpenPreview}
            disabled={!customerName.trim() || items.length === 0 || isSaving || savingAction !== null}
            className="border border-[#0066cc] bg-white text-[#0066cc] rounded-xl py-2.5 px-4 font-semibold text-[14px] hover:bg-[#f0f7ff] active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Generate PDF
          </button>
          <button
            onClick={handleSave}
            disabled={!customerName.trim() || items.length === 0 || isSaving || savingAction !== null}
            className="bg-[#0066cc] text-white rounded-xl py-2.5 px-5 font-semibold text-[14px] hover:bg-[#0071e3] active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center gap-2 shadow-sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Column: Form Fields */}
        <div className="flex-1 flex flex-col gap-8 min-w-0">
          {/* Customer Details */}
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
                    {customerSearchResults.map((customer) => (
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
                              {[
                                customer.email,
                                customer.phone,
                                customer.contactPerson ? `Attn: ${customer.contactPerson}` : null,
                              ]
                                .filter(Boolean)
                                .join(' • ')}
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
        </div>

        {/* Right Column: Sidebar */}
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
                placeholder="Search by description, item no, make, or drg no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#f5f5f7] border border-[#e0e0e0] rounded-[12px] py-3.5 pl-12 pr-4 text-[15px] outline-none focus:ring-4 focus:ring-[#0066cc]/10 focus:border-[#0066cc] focus:bg-white transition-all shadow-sm"
              />
            </div>

            {searchResults.length > 0 && (
              <div className="absolute top-[110px] left-0 right-0 mx-6 bg-white border border-[#e0e0e0] rounded-[12px] overflow-hidden max-h-[350px] overflow-y-auto shadow-[0_10px_40px_rgba(0,0,0,0.1)] divide-y divide-[#f0f0f0] z-50">
                {searchResults.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-4 hover:bg-[#fafafc] transition-colors group/item cursor-pointer"
                    onClick={() => {
                      addItem({
                        productId: product.id,
                        name: product.name,
                        price: product.price,
                        quantity: 1,
                        discount: 0,
                        itemNumber: product.itemNumber,
                        make: product.make,
                        drgNumber: product.drawingNumber || null,
                      });
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="font-semibold text-[14px] tracking-tight text-[#111] leading-tight">
                        {product.name}
                      </div>
                      <div className="text-[13px] text-[#7a7a7a] flex items-center gap-2 mt-1 flex-wrap">
                        {product.make && (
                          <span className="inline-flex items-center bg-indigo-50 border border-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold tracking-wider uppercase">
                            {product.make}
                          </span>
                        )}
                        {product.itemNumber && (
                          <span className="inline-flex items-center bg-[#f0f0f0] border border-[#e5e5e5] px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold tracking-wider text-[#555]">
                            {product.itemNumber}
                          </span>
                        )}
                        {product.drawingNumber && (
                          <span className="inline-flex items-center bg-blue-50 border border-blue-100 text-blue-700 px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold tracking-wider">
                            DRG: {product.drawingNumber}
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

          {/* 2. Quotation Summary & Item List */}
          <div className="bg-[#f5f5f7] border border-[#e0e0e0] rounded-[18px] p-6 flex flex-col">
            <h2 className="text-[24px] font-semibold tracking-tight mb-6">Quotation Summary</h2>

            <div className="flex-1 overflow-y-auto max-h-[40vh] min-h-[150px] pr-2 -mr-2">
              {items.length === 0 ? (
                <div className="text-[#7a7a7a] text-center mt-10">No items added yet.</div>
              ) : (
                <div className="flex flex-col gap-4">
                  {items.map((item) => (
                    <div
                      key={item.productId}
                      className="flex flex-col gap-2 bg-white p-3 rounded-[8px] border border-[#e0e0e0]"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-[14px]">{item.name}</div>
                          <div className="text-[12px] text-[#7a7a7a] mt-0.5">
                            {[
                              item.make ? `Make: ${item.make.toUpperCase()}` : null,
                              item.itemNumber ? `Item No: ${item.itemNumber}` : null,
                              formatCurrency(item.price),
                            ]
                              .filter(Boolean)
                              .join(' | ')}
                            {item.drgNumber && (
                              <span className="ml-2 inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide">
                                DRG: {item.drgNumber}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="text-[#7a7a7a] hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-[13px] border-t border-slate-100 pt-3 mt-1 items-end">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-slate-500 font-medium text-[11px] uppercase tracking-wider">
                            Quantity
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItemQuantity(item.productId, Math.max(1, parseInt(e.target.value) || 1))
                            }
                            onFocus={(e) => e.target.select()}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-center focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-slate-500 font-medium text-[11px] uppercase tracking-wider">
                            Discount %
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discount}
                            onChange={(e) => {
                              let val = parseFloat(e.target.value) || 0;
                              val = Math.max(0, Math.min(100, val));
                              updateItemDiscount(item.productId, val);
                            }}
                            onFocus={(e) => e.target.select()}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-center focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                          />
                        </div>
                        <div className="flex flex-col justify-end items-end pb-1.5 text-right">
                          <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider sm:hidden mb-1 text-left">
                            Total Price
                          </span>
                          <div className="font-bold text-slate-900 text-[15px]">
                            {formatCurrency(
                              item.price * item.quantity * (1 - (item.discount || 0) / 100)
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pricing Breakdown */}
            <div className="mt-8 pt-4 border-t border-[#e0e0e0] flex flex-col gap-2">
              <div className="flex justify-between text-[14px]">
                <span className="text-[#7a7a7a]">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-[14px]">
                <span className="text-[#7a7a7a]">Global Discount (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discount}
                  onChange={(e) => {
                    let val = parseFloat(e.target.value) || 0;
                    val = Math.max(0, Math.min(100, val));
                    setDiscount(val);
                  }}
                  onFocus={(e) => e.target.select()}
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

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleOpenPreview}
                disabled={!customerName.trim() || items.length === 0 || isSaving || savingAction !== null}
                className="w-full bg-[#0066cc] text-white rounded-full py-3 px-6 font-semibold text-[17px] hover:bg-[#0071e3] active:scale-95 transition-all disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2 shadow-[0_4px_14px_0_rgba(0,102,204,0.39)] hover:shadow-[0_6px_20px_rgba(0,102,204,0.23)]"
              >
                <FileText className="w-5 h-5" />
                Generate PDF
              </button>
              <button
                onClick={handleSave}
                disabled={!customerName.trim() || items.length === 0 || isSaving || savingAction !== null}
                className="w-full bg-white text-[#0066cc] border border-[#0066cc]/30 rounded-full py-2.5 px-6 font-semibold text-[15px] hover:bg-[#f0f7ff] active:scale-95 transition-all disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Update Quotation Only
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <QuotePreviewModal
        isOpen={isPreviewOpen}
        quoteData={previewQuoteData}
        initialTerms={termsAndConditions}
        onTermsChange={setTermsAndConditions}
        onClose={() => setIsPreviewOpen(false)}
        onSaveOnly={(termsText) => persistChanges(termsText, false, true)}
        onSaveAndDownload={(termsText) => persistChanges(termsText, true, true)}
        savingAction={savingAction}
      />
    </div>
  );
}
