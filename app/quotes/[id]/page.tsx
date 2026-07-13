import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { ArrowLeft, Download, Printer, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/format';
import { DeleteQuoteButton } from '../DeleteQuoteButton';

export default async function QuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { customer: true, items: true },
  });

  if (!quote) return notFound();

  const subtotal = quote.items.reduce((sum, item) => {
    return sum + (item.price * item.quantity * (1 - (item.discount || 0) / 100));
  }, 0);
  
  const discountAmount = subtotal * (quote.discount / 100);

  return (
    <div className="flex-1 w-full max-w-[800px] mx-auto p-4 md:p-8 flex flex-col gap-8">
      <Link href="/quotes/new" className="inline-flex items-center text-[#0066cc] hover:underline w-fit">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Builder
      </Link>
      
      <div className="bg-white border border-[#e0e0e0] rounded-[18px] p-8 shadow-[0_5px_30px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-start mb-10">
            <div>
              <h1 className="text-[34px] font-semibold tracking-tight">Quote {quote.quoteNumber}</h1>
              <p className="text-[#7a7a7a]">{new Date(quote.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
            <div className="flex items-center gap-2">
              <DeleteQuoteButton id={quote.id} redirect={true} />
              <button 
                className="bg-white border border-[#e0e0e0] text-slate-700 rounded-full py-2 px-4 text-[14px] font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <a 
                href={`/api/quotations/${quote.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="bg-[#0066cc] text-white rounded-full py-2 px-4 text-[14px] font-semibold hover:bg-[#0071e3] transition-all flex items-center gap-2 shadow-[0_4px_14px_0_rgba(0,102,204,0.39)] hover:shadow-[0_6px_20px_rgba(0,102,204,0.23)]"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </a>
            </div>
          </div>
          
          <div className="flex justify-between items-end mb-10">
            <div>
              <p className="text-[14px] text-[#7a7a7a] mb-1">Total Amount</p>
              <h2 className="text-[32px] font-bold tracking-tight text-[#0066cc] leading-none">
                {formatCurrency(quote.total)}
              </h2>
            </div>
          </div>

        <div className="mb-10">
          <h3 className="font-semibold text-[#7a7a7a] text-[14px] uppercase mb-2">Customer</h3>
          <p className="font-semibold text-[17px]">{quote.customer.name}</p>
          {quote.customer.email && <p className="text-[#7a7a7a] text-[14px]">{quote.customer.email}</p>}
        </div>

        <table className="w-full text-left mb-8">
          <thead>
            <tr className="border-b border-[#e0e0e0] text-[#7a7a7a] text-[14px]">
              <th className="py-2 font-medium">Item</th>
              <th className="py-2 font-medium text-right">Price</th>
              <th className="py-2 font-medium text-center">Qty</th>
              <th className="py-2 font-medium text-center">Discount</th>
              <th className="py-2 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map(item => (
              <tr key={item.id} className="border-b border-[#f0f0f0]">
                <td className="py-4 text-[14px]">
                  <div className="font-medium text-slate-900">{item.name}</div>
                  {item.articleNumber && <div className="text-[12px] text-slate-500">Art: {item.articleNumber}</div>}
                </td>
                <td className="py-4 px-6 text-[14px] text-right font-medium">{formatCurrency(item.price)}</td>
                <td className="py-4 px-6 text-[14px] text-center">{item.quantity}</td>
                <td className="py-4 px-6 text-[14px] text-center text-green-600 font-medium">{item.discount > 0 ? `${item.discount}%` : '-'}</td>
                <td className="py-4 px-6 text-[14px] text-right font-semibold">
                  {formatCurrency(item.price * item.quantity * (1 - (item.discount || 0) / 100))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex flex-col items-end gap-2 text-[14px]">
            <div className="flex justify-between items-center text-[15px]">
              <span className="text-[#7a7a7a]">Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            
            {quote.discount > 0 && (
              <div className="flex justify-between items-center text-[15px] text-green-600 font-medium mt-3">
                <span>Global Discount ({quote.discount}%)</span>
                <span>-{formatCurrency(subtotal * (quote.discount / 100))}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center text-[20px] font-bold tracking-tight mt-4 pt-4 border-t border-[#e0e0e0]">
              <span>Total</span>
              <span className="text-[#0066cc]">{formatCurrency(quote.total)}</span>
            </div>
        </div>
      </div>
    </div>
  );
}
