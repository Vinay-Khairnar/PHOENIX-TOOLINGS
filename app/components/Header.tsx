'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SignOutButton from './SignOutButton';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

export default function Header({ titleText, isAdmin }: { titleText: string, isAdmin?: boolean }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Prevent scrolling when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMobileMenuOpen]);

  // Hide the header on the login and unauthorized pages
  if (pathname === '/login' || pathname === '/unauthorized') {
    return null;
  }

  const getLinkClass = (path: string) => {
    const isActive = path === '/' ? pathname === '/' : pathname.startsWith(path);
    return `transition-all whitespace-nowrap px-3 py-2 rounded-lg ${isActive ? 'text-indigo-600 font-semibold bg-indigo-50' : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'}`;
  };

  const MobileLink = ({ href, children }: { href: string, children: React.ReactNode }) => (
    <Link 
      href={href} 
      onClick={() => setIsMobileMenuOpen(false)}
      className={`block px-4 py-3.5 rounded-xl text-base font-medium transition-colors ${
        (href === '/' ? pathname === '/' : pathname.startsWith(href)) 
          ? 'bg-indigo-50 text-indigo-600' 
          : 'text-slate-700 hover:bg-slate-50'
      }`}
    >
      {children}
    </Link>
  );

  return (
    <>
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/80 border-b border-slate-200/50 supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center font-bold text-xl tracking-tight text-indigo-600 cursor-pointer truncate max-w-[70%]">
              <Link href="/">{titleText}</Link>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden sm:flex items-center gap-6 text-sm font-medium">
              <Link href="/" className={getLinkClass('/')}>Home</Link>
              <Link href="/quotes" className={getLinkClass('/quotes')}>Quotations</Link>
              <Link href="/customers" className={getLinkClass('/customers')}>Customers</Link>
              <Link href="/settings" className={getLinkClass('/settings')}>Settings</Link>
              {isAdmin && (
                <>
                  <Link href="/products" className={getLinkClass('/products')}>Products</Link>
                  <Link href="/users" className={getLinkClass('/users')}>Users</Link>
                </>
              )}
              <div className="w-px h-5 bg-slate-200 mx-1"></div>
              <SignOutButton />
            </nav>

            {/* Mobile Menu Button */}
            <div className="sm:hidden flex items-center gap-4">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 -mr-2 text-slate-600 hover:bg-slate-100 hover:text-indigo-600 rounded-lg transition-colors"
                aria-label="Toggle mobile menu"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="sm:hidden fixed inset-0 top-[64px] bg-white z-50 overflow-y-auto border-t border-slate-100">
          <nav className="px-4 py-6 flex flex-col gap-2 min-h-full">
            <MobileLink href="/">Home</MobileLink>
            <MobileLink href="/quotes">Quotations</MobileLink>
            <MobileLink href="/customers">Customers</MobileLink>
            <MobileLink href="/settings">Settings</MobileLink>
            {isAdmin && (
              <>
                <MobileLink href="/products">Products</MobileLink>
                <MobileLink href="/users">Users</MobileLink>
              </>
            )}
            <div className="h-px bg-slate-100 my-4 mx-4"></div>
            <div className="px-4 mt-auto pb-8">
               <SignOutButton />
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
