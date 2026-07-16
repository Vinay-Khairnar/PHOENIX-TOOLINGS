'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(error.message);
      } else {
        router.push('/login');
        router.refresh(); // Force refresh to clear server component state
      }
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-red-600 transition-colors whitespace-nowrap ml-2"
      title="Sign out"
    >
      <LogOut className="w-4 h-4" />
      <span className="hidden sm:inline">Sign out</span>
    </button>
  );
}
