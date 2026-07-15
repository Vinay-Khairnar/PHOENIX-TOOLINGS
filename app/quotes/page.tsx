import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { FileText, ArrowRight, Plus } from 'lucide-react';
import { DeleteQuoteButton } from './DeleteQuoteButton';
import { formatCurrency } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function QuotesPage() {
  const { data } = await supabase
    .from('Quote')
    .select('*, Customer(*), items:QuoteItem(*)')
    .order('createdAt', { ascending: false });

  const quotesRaw = data || [];
  const quotes = quotesRaw.map(q => ({
    ...q,
    customerName: q.Customer?.name,
  }));

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Quotations</h1>
          <p className="text-sm text-slate-500 mt-1">Your quotation history</p>
        </div>
        
        <Link 
          href="/quotes/new"
          className="bg-indigo-600 text-white rounded-xl py-2 px-5 font-medium text-sm shadow-sm shadow-indigo-200 hover:bg-indigo-700 transition-colors flex items-center gap-2 active:scale-95 w-fit"
        >
          <Plus className="w-4 h-4" /> Create Quote
        </Link>
      </div>

      <div className="flex flex-col gap-3 relative">
        {quotes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center">
            <FileText className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No quotes yet</h3>
            <p className="text-slate-500 max-w-sm mb-6">You haven't created any quotations. Create your first quote to get started.</p>
            <Link 
              href="/quotes/new"
              className="bg-indigo-600 text-white rounded-xl py-2 px-5 font-medium shadow-sm shadow-indigo-200 hover:bg-indigo-700 transition-colors flex items-center gap-2 active:scale-95"
            >
              <Plus className="w-4 h-4" /> Create Quote
            </Link>
          </div>
        ) : (
          quotes.map((quote: any) => (
            <div key={quote.id} className="relative group">
              <Link 
                href={`/quotes/${quote.id}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white border border-slate-200 rounded-2xl hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-50 transition-all group cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-lg text-slate-900 tracking-tight">
                      Quote {quote.quoteNumber}
                    </h3>
                    <span className="bg-slate-100 text-slate-600 text-[11px] font-semibold px-2 py-0.5 rounded-md tracking-wide">
                      {new Date(quote.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 font-medium">{quote.customerName}</p>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end gap-8 mt-4 sm:mt-0 w-full sm:w-auto">
                  <div className="text-right">
                    <div className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold mb-0.5">Total</div>
                    <div className="text-lg font-bold text-slate-900">{formatCurrency(quote.total)}</div>
                  </div>
                  <div className="flex items-center gap-2 text-indigo-600 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 pr-2">
                    <span className="text-sm font-semibold">View</span>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </Link>
              
              {/* Delete Button floats outside the Link to prevent hydration/nesting errors, positioned absolutely */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 sm:right-auto sm:left-[calc(100%+16px)] sm:top-1/2 sm:-translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 hidden sm:block">
                <DeleteQuoteButton id={quote.id} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
