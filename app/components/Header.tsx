'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SignOutButton from './SignOutButton';

export default function Header({ titleText }: { titleText: string }) {
  const pathname = usePathname();

  // Hide the header on the login page
  if (pathname === '/login') {
    return null;
  }

  return (
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
            <Link href="/customers" className="hover:text-indigo-600 transition-colors whitespace-nowrap">Customers</Link>
            <Link href="/settings" className="hover:text-indigo-600 transition-colors whitespace-nowrap">Settings</Link>
            <div className="w-px h-5 bg-slate-200 hidden sm:block mx-1"></div>
            <SignOutButton />
          </nav>
        </div>
      </div>
    </header>
  );
}
