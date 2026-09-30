'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Save, Loader2, Building2, Landmark, FileText, Eye, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface SettingsData {
  companyName: string;
  address: string;
  email: string;
  phone: string;
  gstNumber: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  termsAndConditions: string;
  startingQuoteNumber: number;
}

const defaultSettings: SettingsData = {
  companyName: 'Phoenix Toolings',
  address: 'A-51, MIDC Waluj, Aurangabad-431 136. (Maharashtra), India.',
  email: 'gbs@phoenixtoolings.com',
  phone: '+91 9890448625',
  gstNumber: '27AFWPG3321F1ZH',
  bankName: 'ICICI BANK',
  accountNumber: '145405004957',
  ifscCode: 'ICIC0001454',
  termsAndConditions: '1) GST : 18%\n2) Delivery : Two Weeks from the date of receipt of purchase order\n3) Payment : 100% Against Proforma\n4) Validity : 1 Week\n5) P & F Extra : NA\n6) Insurance : At your end\n7) Note : 18% interest will be charged on the value of invoice, If not paid within 30 days from the date of invoice.',
  startingQuoteNumber: 1,
};

export default function SettingsPage() {
  const [formData, setFormData] = useState<SettingsData>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const modalPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        const dbTerms = data.termsAndConditions || '';
        const hasNewFormat = /^\d+\)/.test(dbTerms);
        setFormData({
          companyName: data.companyName || defaultSettings.companyName,
          address: data.address || defaultSettings.address,
          email: data.email || defaultSettings.email,
          phone: data.phone || defaultSettings.phone,
          gstNumber: data.gstNumber || defaultSettings.gstNumber,
          bankName: data.bankName || defaultSettings.bankName,
          accountNumber: data.accountNumber || defaultSettings.accountNumber,
          ifscCode: data.ifscCode || defaultSettings.ifscCode,
          termsAndConditions: hasNewFormat ? dbTerms : defaultSettings.termsAndConditions,
          startingQuoteNumber: data.startingQuoteNumber || defaultSettings.startingQuoteNumber,
        });
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  // Cleanup preview blob URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const closePreview = useCallback(() => {
    setIsPreviewOpen(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [previewUrl]);

  // Lock body scroll & handle ESC key when modal is open
  useEffect(() => {
    if (!isPreviewOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePreview();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPreviewOpen, closePreview]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Settings saved successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = async () => {
    setIsPreviewLoading(true);
    setIsPreviewOpen(true);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    try {
      const res = await fetch('/api/settings/preview-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to generate preview');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF preview');
      setIsPreviewOpen(false);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalPanelRef.current && !modalPanelRef.current.contains(e.target as Node)) {
      closePreview();
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0066cc]" />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-[800px] mx-auto p-4 md:p-8">
      <h1 className="text-[34px] font-semibold tracking-tight mb-2">Settings</h1>
      <p className="text-[#7a7a7a] mb-8">Configure company details for quotation letterhead</p>

      <form onSubmit={handleSave} className="flex flex-col gap-8">
        
        {/* Company Details */}
        <section className="bg-white border border-[#e0e0e0] rounded-[18px] p-6 shadow-sm">
          <h2 className="text-[20px] font-semibold tracking-tight mb-5 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#0066cc]" />
            Company Details
          </h2>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[13px] text-[#7a7a7a] mb-1 font-medium">Company Name *</label>
              <input
                required
                type="text"
                value={formData.companyName}
                onChange={e => setFormData({...formData, companyName: e.target.value})}
                className="w-full bg-[#f5f5f7] border border-[#e0e0e0] rounded-[11px] p-3 text-[15px] outline-none focus:ring-2 focus:ring-[#0066cc]"
              />
            </div>
            <div>
              <label className="block text-[13px] text-[#7a7a7a] mb-1 font-medium">Address</label>
              <textarea
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
                rows={2}
                className="w-full bg-[#f5f5f7] border border-[#e0e0e0] rounded-[11px] p-3 text-[15px] outline-none focus:ring-2 focus:ring-[#0066cc] resize-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] text-[#7a7a7a] mb-1 font-medium">Email</label>
                <input
                  type="text"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-[#f5f5f7] border border-[#e0e0e0] rounded-[11px] p-3 text-[15px] outline-none focus:ring-2 focus:ring-[#0066cc]"
                />
              </div>
              <div>
                <label className="block text-[13px] text-[#7a7a7a] mb-1 font-medium">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full bg-[#f5f5f7] border border-[#e0e0e0] rounded-[11px] p-3 text-[15px] outline-none focus:ring-2 focus:ring-[#0066cc]"
                />
              </div>
            </div>
            <div>
              <label className="block text-[13px] text-[#7a7a7a] mb-1 font-medium">GST Number</label>
              <input
                type="text"
                value={formData.gstNumber}
                onChange={e => setFormData({...formData, gstNumber: e.target.value})}
                className="w-full bg-[#f5f5f7] border border-[#e0e0e0] rounded-[11px] p-3 text-[15px] outline-none focus:ring-2 focus:ring-[#0066cc]"
              />
            </div>
            <div>
              <label className="block text-[13px] text-[#7a7a7a] mb-1 font-medium">Starting Quote Sequence Number</label>
              <input
                type="number"
                min="1"
                value={formData.startingQuoteNumber}
                onChange={e => setFormData({...formData, startingQuoteNumber: parseInt(e.target.value, 10) || 1})}
                onFocus={(e) => e.target.select()}
                className="w-full bg-[#f5f5f7] border border-[#e0e0e0] rounded-[11px] p-3 text-[15px] outline-none focus:ring-2 focus:ring-[#0066cc]"
              />
              <p className="text-[12px] text-[#999] mt-1">If the current highest quote is lower, the next generated quote will start from this number.</p>
            </div>
          </div>
        </section>

        {/* Bank Details */}
        <section className="bg-white border border-[#e0e0e0] rounded-[18px] p-6 shadow-sm">
          <h2 className="text-[20px] font-semibold tracking-tight mb-5 flex items-center gap-2">
            <Landmark className="w-5 h-5 text-[#0066cc]" />
            Bank Details
          </h2>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[13px] text-[#7a7a7a] mb-1 font-medium">Bank Name</label>
              <input
                type="text"
                value={formData.bankName}
                onChange={e => setFormData({...formData, bankName: e.target.value})}
                className="w-full bg-[#f5f5f7] border border-[#e0e0e0] rounded-[11px] p-3 text-[15px] outline-none focus:ring-2 focus:ring-[#0066cc]"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] text-[#7a7a7a] mb-1 font-medium">Account Number</label>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={e => setFormData({...formData, accountNumber: e.target.value})}
                  className="w-full bg-[#f5f5f7] border border-[#e0e0e0] rounded-[11px] p-3 text-[15px] outline-none focus:ring-2 focus:ring-[#0066cc]"
                />
              </div>
              <div>
                <label className="block text-[13px] text-[#7a7a7a] mb-1 font-medium">IFSC Code</label>
                <input
                  type="text"
                  value={formData.ifscCode}
                  onChange={e => setFormData({...formData, ifscCode: e.target.value})}
                  className="w-full bg-[#f5f5f7] border border-[#e0e0e0] rounded-[11px] p-3 text-[15px] outline-none focus:ring-2 focus:ring-[#0066cc]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Terms & Conditions */}
        <section className="bg-white border border-[#e0e0e0] rounded-[18px] p-6 shadow-sm">
          <h2 className="text-[20px] font-semibold tracking-tight mb-5 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#0066cc]" />
            Terms & Conditions
          </h2>
          <div>
            <label className="block text-[13px] text-[#7a7a7a] mb-1 font-medium">
              Default Terms (one per line, numbered)
            </label>
            <textarea
              value={formData.termsAndConditions}
              onChange={e => setFormData({...formData, termsAndConditions: e.target.value})}
              rows={8}
              className="w-full bg-[#f5f5f7] border border-[#e0e0e0] rounded-[11px] p-3 text-[15px] outline-none focus:ring-2 focus:ring-[#0066cc] resize-none font-mono text-[13px]"
            />
          </div>
        </section>

        <div className="flex gap-3">
          <button 
            type="submit" 
            disabled={isSaving}
            className="flex-1 bg-[#0066cc] text-white rounded-full py-3 px-6 font-semibold text-[17px] hover:bg-[#0071e3] active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-2 shadow-[0_4px_14px_0_rgba(0,102,204,0.39)]"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Settings
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handlePreview}
            disabled={isPreviewLoading}
            className="bg-white text-[#0066cc] border-2 border-[#0066cc] rounded-full py-3 px-6 font-semibold text-[17px] hover:bg-[#f0f7ff] active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {isPreviewLoading && !isPreviewOpen ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Eye className="w-5 h-5" />
                Preview PDF
              </>
            )}
          </button>
        </div>
      </form>

      {/* ──── PDF Preview Modal ──── */}
      {isPreviewOpen && (
        <div
          className="fixed inset-0 z-50 animate-modal-backdrop"
          onClick={handleBackdropClick}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />

          {/* Centered container */}
          <div className="relative z-10 flex items-center justify-center w-full h-full p-3 sm:p-6">
            <div
              ref={modalPanelRef}
              className="animate-modal-panel bg-white rounded-2xl shadow-[0_25px_60px_-12px_rgba(0,0,0,0.35)] w-full max-w-[960px] flex flex-col overflow-hidden"
              style={{ height: 'min(95vh, 900px)' }}
            >
              {/* Blue accent bar */}
              <div className="h-1 w-full bg-gradient-to-r from-[#0066cc] via-[#0091ff] to-[#0066cc]" />

              {/* Header */}
              <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-[#e8e8ed]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#0066cc]/10 flex items-center justify-center">
                    <Eye className="w-[18px] h-[18px] text-[#0066cc]" />
                  </div>
                  <div>
                    <h2 className="text-[16px] font-semibold tracking-tight text-[#1d1d1f] leading-tight">
                      PDF Preview
                    </h2>
                    <p className="text-[11px] text-[#86868b] leading-tight mt-0.5">
                      Using sample data · Press Esc to close
                    </p>
                  </div>
                </div>
                <button
                  onClick={closePreview}
                  className="w-8 h-8 rounded-full bg-[#f5f5f7] hover:bg-[#e8e8ed] flex items-center justify-center transition-colors group"
                  aria-label="Close preview"
                >
                  <X className="w-4 h-4 text-[#86868b] group-hover:text-[#1d1d1f] transition-colors" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 bg-[#f0f0f3] overflow-hidden relative">
                {isPreviewLoading ? (
                  /* Skeleton loading state */
                  <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
                    {/* Faux PDF skeleton */}
                    <div className="w-full max-w-[420px] bg-white rounded-xl shadow-md p-6 space-y-4">
                      <div className="skeleton-shimmer h-5 w-2/5 mx-auto rounded" />
                      <div className="space-y-2 mt-4">
                        <div className="skeleton-shimmer h-3 w-4/5 rounded" />
                        <div className="skeleton-shimmer h-3 w-3/5 rounded" />
                        <div className="skeleton-shimmer h-3 w-full rounded" />
                      </div>
                      <div className="border-t border-[#e8e8ed] pt-4 mt-4 space-y-2">
                        <div className="skeleton-shimmer h-3 w-full rounded" />
                        <div className="skeleton-shimmer h-3 w-full rounded" />
                        <div className="skeleton-shimmer h-3 w-4/5 rounded" />
                        <div className="skeleton-shimmer h-3 w-3/4 rounded" />
                      </div>
                      <div className="border-t border-[#e8e8ed] pt-4 mt-4 space-y-2">
                        <div className="skeleton-shimmer h-3 w-2/3 rounded" />
                        <div className="skeleton-shimmer h-3 w-1/2 rounded" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#0066cc]" />
                      <span className="text-[13px] text-[#86868b] font-medium">Generating PDF preview…</span>
                    </div>
                  </div>
                ) : previewUrl ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-full border-0"
                    title="PDF Preview"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                      <X className="w-5 h-5 text-red-400" />
                    </div>
                    <p className="text-[14px] text-[#86868b] font-medium">Failed to load preview</p>
                    <button
                      onClick={handlePreview}
                      className="text-[13px] text-[#0066cc] font-semibold hover:underline"
                    >
                      Try again
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
