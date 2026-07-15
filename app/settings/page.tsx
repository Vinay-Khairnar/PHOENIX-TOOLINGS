'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, Building2, Landmark, FileText } from 'lucide-react';
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
  termsAndConditions: '1. Order To Be Release on PHOENIX TOOLINGS.\n2. Prices are net ex.works Ch. Sambhaji Nagar, packing & forwarding extra.\n3. Payment terms- 20% Advance along with Purchase order Balance Against PI.\n4. Delivery terms- 8 Week From The Date Of Order.\n5. Validity Of Quotation- 30 Days',
  startingQuoteNumber: 1,
};

export default function SettingsPage() {
  const [formData, setFormData] = useState<SettingsData>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setFormData({
          companyName: data.companyName || defaultSettings.companyName,
          address: data.address || defaultSettings.address,
          email: data.email || defaultSettings.email,
          phone: data.phone || defaultSettings.phone,
          gstNumber: data.gstNumber || defaultSettings.gstNumber,
          bankName: data.bankName || defaultSettings.bankName,
          accountNumber: data.accountNumber || defaultSettings.accountNumber,
          ifscCode: data.ifscCode || defaultSettings.ifscCode,
          termsAndConditions: data.termsAndConditions || defaultSettings.termsAndConditions,
          startingQuoteNumber: data.startingQuoteNumber || defaultSettings.startingQuoteNumber,
        });
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

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
                  type="email"
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

        <button 
          type="submit" 
          disabled={isSaving}
          className="w-full bg-[#0066cc] text-white rounded-full py-3 px-6 font-semibold text-[17px] hover:bg-[#0071e3] active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-2 shadow-[0_4px_14px_0_rgba(0,102,204,0.39)]"
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
      </form>
    </div>
  );
}
