'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export function DownloadQuoteButton({ id, quoteNumber }: { id: string, quoteNumber: string }) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    const toastId = toast.loading('Generating PDF...');
    try {
      const response = await fetch(`/api/quotations/${id}/pdf`);
      if (!response.ok) throw new Error('Failed to generate PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${quoteNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('PDF downloaded successfully', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Error downloading PDF', { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <button 
      onClick={handleDownload}
      disabled={isDownloading}
      className="w-full sm:w-auto justify-center bg-[#0066cc] text-white rounded-full py-2.5 px-6 text-[14px] font-semibold hover:bg-[#0071e3] transition-all flex items-center gap-2 whitespace-nowrap shadow-[0_4px_14px_0_rgba(0,102,204,0.39)] hover:shadow-[0_6px_20px_rgba(0,102,204,0.23)] disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {isDownloading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Downloading...
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          Download PDF
        </>
      )}
    </button>
  );
}
