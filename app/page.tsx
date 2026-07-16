import Link from 'next/link';
import { Plus, PackageSearch, FileText } from 'lucide-react';

import { supabase } from '@/lib/supabase';

export default async function Home() {
  const { data: settings } = await supabase.from('Settings').select('companyName').maybeSingle();
  const titleText = settings?.companyName ? `${settings.companyName} quotation` : 'QuoteMate';

  return (
    <div className="flex-1 w-full max-w-[1440px] mx-auto p-4 md:p-8 flex flex-col items-center justify-center min-h-[calc(100vh-44px)] pb-32">
      <div className="text-center mb-16 md:mb-24">
        <h1 className="text-[36px] md:text-[56px] font-semibold tracking-[-0.28px] leading-[1.1] mb-4 px-2">
          {titleText}
        </h1>
        <p className="text-[18px] md:text-[28px] font-normal tracking-[0.196px] text-[#7a7a7a]">
          Professional quotations in seconds.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-[1000px]">
        {/* New Quote */}
        <Link href="/quotes/new" className="bg-[#f5f5f7] border border-[#e0e0e0] rounded-[18px] p-8 flex flex-col items-center justify-center text-center hover:shadow-[0_5px_30px_rgba(0,0,0,0.05)] transition group">
          <div className="w-16 h-16 bg-[#0066cc] rounded-full flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
            <Plus className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-[21px] font-semibold tracking-[0.231px] mb-2 text-[#1d1d1f]">New Quote</h2>
          <p className="text-[14px] text-[#7a7a7a]">Create a new quotation</p>
        </Link>

        {/* Products */}
        <Link href="/products" className="bg-[#f5f5f7] border border-[#e0e0e0] rounded-[18px] p-8 flex flex-col items-center justify-center text-center hover:shadow-[0_5px_30px_rgba(0,0,0,0.05)] transition group">
          <div className="w-16 h-16 bg-white border border-[#e0e0e0] rounded-full flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
            <PackageSearch className="w-8 h-8 text-[#1d1d1f]" />
          </div>
          <h2 className="text-[21px] font-semibold tracking-[0.231px] mb-2 text-[#1d1d1f]">Products</h2>
          <p className="text-[14px] text-[#7a7a7a]">Manage price lists</p>
        </Link>

        {/* History */}
        <Link href="/quotes" className="bg-[#f5f5f7] border border-[#e0e0e0] rounded-[18px] p-8 flex flex-col items-center justify-center text-center hover:shadow-[0_5px_30px_rgba(0,0,0,0.05)] transition group">
          <div className="w-16 h-16 bg-white border border-[#e0e0e0] rounded-full flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
            <FileText className="w-8 h-8 text-[#1d1d1f]" />
          </div>
          <h2 className="text-[21px] font-semibold tracking-[0.231px] mb-2 text-[#1d1d1f]">History</h2>
          <p className="text-[14px] text-[#7a7a7a]">Past quotations</p>
        </Link>
      </div>
    </div>
  );
}
