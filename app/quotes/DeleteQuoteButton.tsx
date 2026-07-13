'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function DeleteQuoteButton({ id, redirect = false }: { id: string; redirect?: boolean }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this quote?')) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/quotations/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (redirect) {
          router.push('/quotes');
        } else {
          router.refresh();
        }
      } else {
        alert('Failed to delete quote');
      }
    } catch (error) {
      console.error(error);
      alert('Error deleting quote');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50"
      aria-label="Delete quote"
    >
      <Trash2 className="w-5 h-5" />
    </button>
  );
}
