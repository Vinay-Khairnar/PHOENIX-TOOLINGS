'use client';

import { Trash2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';

export function DeleteAllQuotesButton({ hasQuotes }: { hasQuotes: boolean }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAll = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!confirm('Are you absolutely sure you want to delete ALL quotes? This action cannot be undone.')) {
      return;
    }
    
    setIsDeleting(true);
    try {
      const res = await fetch('/api/quotations/all', {
        method: 'DELETE',
      });
      
      if (res.ok) {
        toast.success('All quotes deleted successfully');
        router.refresh();
      } else {
        toast.error('Failed to delete quotes');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error deleting quotes');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!hasQuotes) return null;

  return (
    <button
      onClick={handleDeleteAll}
      disabled={isDeleting}
      className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:border-red-300 rounded-xl py-2 px-5 font-medium text-sm shadow-sm transition-colors flex items-center gap-2 active:scale-95 w-fit disabled:opacity-50 disabled:pointer-events-none"
      aria-label="Delete all quotes"
    >
      {isDeleting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Trash2 className="w-4 h-4" />
      )}
      Delete All
    </button>
  );
}
