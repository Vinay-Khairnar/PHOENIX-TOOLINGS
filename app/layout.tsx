import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const viewport = {
  themeColor: '#0066cc',
};

export const metadata: Metadata = {
  title: 'QuoteMate',
  description: 'Fast, minimal quotation generator.',
  manifest: '/manifest.json',
};

import { Toaster } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

export default async function RootLayout({children}: {children: React.ReactNode}) {
  const { data: settings } = await supabase.from('Settings').select('companyName').maybeSingle();
  const titleText = settings?.companyName ? `${settings.companyName} quotation` : 'QuoteMate';

  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="bg-slate-50 text-slate-900 font-sans antialiased min-h-screen flex flex-col" suppressHydrationWarning>
        <Toaster position="bottom-right" toastOptions={{ className: 'text-sm font-medium' }} />
        {/* Premium Sticky Navigation */}
        <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/80 border-b border-slate-200/50 supports-[backdrop-filter]:bg-white/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row min-h-[64px] py-3 sm:py-0 items-center justify-between gap-3 sm:gap-0">
              <div className="flex items-center gap-2 font-bold text-[17px] sm:text-xl tracking-tight text-indigo-600 cursor-pointer text-center px-4">
                <Link href="/">{titleText}</Link>
              </div>
              <nav className="flex overflow-x-auto w-full sm:w-auto px-4 sm:px-0 hide-scrollbar justify-start sm:justify-center items-center gap-5 sm:gap-6 text-sm font-medium text-slate-600 pb-1 sm:pb-0">
                <Link href="/" className="hover:text-indigo-600 transition-colors whitespace-nowrap">Home</Link>
                <Link href="/products" className="hover:text-indigo-600 transition-colors whitespace-nowrap">Products</Link>
                <Link href="/quotes" className="hover:text-indigo-600 transition-colors whitespace-nowrap">Quotations</Link>
                <Link href="/settings" className="hover:text-indigo-600 transition-colors whitespace-nowrap">Settings</Link>
              </nav>
            </div>
          </div>
        </header>
        
        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
