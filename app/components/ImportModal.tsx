import React, { useState, useRef } from 'react';
import { Upload, X, ChevronDown, Loader2, FileText, CheckCircle2, Download, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MAKE_OPTIONS = [
  'PHOENIX',
  'ISCAR',
  'CTC PRECISION',
  'HNTI OIL',
  'REGO-FIX',
  'ADDISON'
];

// Files larger than 4MB go through Supabase Storage to bypass Vercel's 4.5MB limit
const DIRECT_UPLOAD_LIMIT = 4 * 1024 * 1024; // 4 MB

const PDF_PAGE_BATCH_SIZE = 75; // ~75 pages (~10,000 products) per chunk for fast, reliable ingestion

export default function ImportModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [progressPercent, setProgressPercent] = useState<number | null>(null);
  const [batchStats, setBatchStats] = useState<{ currentBatch: number; totalBatches: number; importedCount: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleChooseFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
    // reset the input so the same file can be selected again if needed
    e.target.value = '';
  };

  const cleanupTempStorage = async (path: string) => {
    try {
      const cleanForm = new FormData();
      cleanForm.append('action', 'cleanup');
      cleanForm.append('storagePath', path);
      cleanForm.append('make', 'CLEANUP');
      await fetch('/api/products/import', { method: 'POST', body: cleanForm });
    } catch (e) {}
  };

  const handleSubmit = async () => {
    if (!selectedMake) {
      toast.error('Please select a Make before submitting.');
      return;
    }
    if (!selectedFile) {
      toast.error('Please select a file to import.');
      return;
    }

    setIsUploading(true);
    setProgressPercent(null);
    setBatchStats(null);
    const loadingToast = toast.loading('Preparing import...');

    try {
      const isPdf = selectedFile.name.toLowerCase().endsWith('.pdf');

      if (selectedFile.size > DIRECT_UPLOAD_LIMIT || isPdf) {
        // Large file or PDF: upload to Supabase Storage first, then process in batches
        setUploadProgress('Uploading file to storage...');
        setProgressPercent(10);
        toast.loading('Uploading file to storage...', { id: loadingToast });
        
        const supabase = createClient();
        const timestamp = Date.now();
        const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `temp/${timestamp}_${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from('imports')
          .upload(storagePath, selectedFile, {
            cacheControl: '60',
            upsert: true,
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw new Error(`Failed to upload file: ${uploadError.message}`);
        }

        if (isPdf) {
          // Multi-step Page-Range Batching: processes in fast, reliable chunks (e.g. 75 pages / ~10k items per request)
          let pageStart = 1;
          let totalImported = 0;
          let totalPages = 0;
          let isDone = false;
          let currentBatch = 1;

          while (!isDone) {
            const pageEnd = pageStart + PDF_PAGE_BATCH_SIZE - 1;

            if (totalPages > 0) {
              const totalBatches = Math.ceil(totalPages / PDF_PAGE_BATCH_SIZE);
              const percent = Math.min(99, Math.round(((pageStart - 1) / totalPages) * 100));
              setProgressPercent(percent);
              setBatchStats({ currentBatch, totalBatches, importedCount: totalImported });
              setUploadProgress(`Importing pages ${pageStart}–${Math.min(pageEnd, totalPages)} of ${totalPages}...`);
              toast.loading(`Importing pages ${pageStart}–${Math.min(pageEnd, totalPages)} of ${totalPages}...`, { id: loadingToast });
            } else {
              setUploadProgress(`Reading pages ${pageStart}–${pageEnd}...`);
              setProgressPercent(20);
            }

            const chunkFormData = new FormData();
            chunkFormData.append('storagePath', storagePath);
            chunkFormData.append('fileName', selectedFile.name);
            chunkFormData.append('make', selectedMake.toUpperCase());
            chunkFormData.append('pageStart', String(pageStart));
            chunkFormData.append('pageEnd', String(pageEnd));

            const res = await fetch('/api/products/import', {
              method: 'POST',
              body: chunkFormData,
            });

            if (!res.ok) {
              const errorData = await res.json().catch(() => ({}));
              await cleanupTempStorage(storagePath);
              throw new Error(errorData?.error || errorData?.details || 'Batch import failed');
            }

            const batchData = await res.json();
            totalImported += batchData.batchImported || 0;
            totalPages = batchData.totalPages || totalPages;
            isDone = Boolean(batchData.done);

            if (!isDone) {
              pageStart = batchData.nextPageStart || (pageEnd + 1);
              currentBatch++;
            }
          }

          setProgressPercent(100);
          setBatchStats(prev => prev ? { ...prev, importedCount: totalImported } : null);
          toast.success(`Successfully imported ${totalImported.toLocaleString()} products!`, { id: loadingToast });
        } else {
          // Large Excel or CSV file
          setUploadProgress('Processing spreadsheet products...');
          setProgressPercent(50);
          toast.loading('Processing products...', { id: loadingToast });

          const formData = new FormData();
          formData.append('storagePath', storagePath);
          formData.append('fileName', selectedFile.name);
          formData.append('make', selectedMake.toUpperCase());

          const res = await fetch('/api/products/import', {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            await cleanupTempStorage(storagePath);
            throw new Error(errorData?.error || errorData?.details || 'Import failed');
          }

          const successData = await res.json().catch(() => ({}));
          setProgressPercent(100);
          toast.success(successData?.message || 'Products imported successfully!', { id: loadingToast });
        }
      } else {
        // Small non-PDF file: direct upload
        setUploadProgress('Uploading file...');
        setProgressPercent(50);
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('make', selectedMake.toUpperCase());

        const res = await fetch('/api/products/import', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData?.error || errorData?.details || 'Upload failed');
        }

        const successData = await res.json().catch(() => ({}));
        setProgressPercent(100);
        toast.success(successData?.message || 'Products imported successfully!', { id: loadingToast });
      }

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Error importing products.', { id: loadingToast });
    } finally {
      setIsUploading(false);
      setUploadProgress('');
      setProgressPercent(null);
      setBatchStats(null);
    }
  };

  const handleClose = () => {
    if (isUploading) return;
    setSelectedMake('');
    setSelectedFile(null);
    setProgressPercent(null);
    setBatchStats(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 relative">
        <button 
          onClick={handleClose}
          disabled={isUploading}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 transition-colors disabled:opacity-50"
        >
          <X className="w-6 h-6" />
        </button>
        
        <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Import Data</h2>
        
        <div className="space-y-6">

          {/* Sample Template Download Card */}
          <div className="flex items-center justify-between p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white text-indigo-600 flex items-center justify-center shrink-0 shadow-sm border border-indigo-100">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-800">Sample Excel Template</p>
                <p className="text-[11px] text-gray-500">Download formatted Excel file for product import</p>
              </div>
            </div>
            <a
              href="/sample-product-template.xlsx"
              download="sample-product-template.xlsx"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-white hover:bg-indigo-50/80 border border-indigo-200 px-3 py-1.5 rounded-lg shadow-sm transition-all shrink-0 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
          </div>

          
          {/* Select Make Dropdown */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">1. Select Make</label>
            <div className="relative">
              <select 
                value={selectedMake}
                onChange={(e) => setSelectedMake(e.target.value)}
                disabled={isUploading}
                className="appearance-none w-full bg-gray-50 border border-gray-200 text-gray-700 py-3 px-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer text-base disabled:opacity-50 transition-all"
              >
                <option value="" disabled>Select Make</option>
                {MAKE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                <ChevronDown className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* File Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">2. Choose File</label>
            
            {!selectedFile ? (
              <button 
                onClick={handleChooseFileClick}
                disabled={isUploading}
                className="w-full flex flex-col items-center justify-center gap-3 border-2 border-dashed border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 rounded-xl p-8 transition-colors disabled:opacity-50 group"
              >
                <div className="bg-white p-3 rounded-full shadow-sm group-hover:scale-105 transition-transform">
                  <Upload className="w-6 h-6 text-indigo-500" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-indigo-900">Click to upload Excel, CSV, or PDF</p>
                  <p className="text-xs text-indigo-500 mt-1">.xlsx, .xls, .csv, .pdf allowed</p>
                </div>
              </button>
            ) : (
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileText className="w-6 h-6 text-green-600 shrink-0" />
                  <div className="truncate">
                    <p className="text-sm font-medium text-green-900 truncate">{selectedFile.name}</p>
                    <p className="text-xs text-green-600">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedFile(null)}
                  disabled={isUploading}
                  className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors shrink-0 disabled:opacity-50"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Hidden File Input */}
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv,.xlsx,.xls,.pdf"
              className="hidden"
              disabled={isUploading}
            />
          </div>

          {/* Live Progress Card */}
          {isUploading && (
            <div className="bg-gradient-to-br from-indigo-50/90 via-indigo-50/50 to-purple-50/60 border border-indigo-100 rounded-xl p-4 space-y-2.5 animate-in fade-in duration-300">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-indigo-900 flex items-center gap-2 truncate">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
                  <span className="truncate">{uploadProgress || 'Importing products...'}</span>
                </span>
                {progressPercent !== null && (
                  <span className="text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200/80 shadow-xs font-mono shrink-0 ml-2">
                    {progressPercent}%
                  </span>
                )}
              </div>

              {/* Progress Bar Track */}
              <div className="w-full bg-indigo-100/80 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent !== null ? Math.max(5, progressPercent) : 100}%` }}
                />
              </div>

              {batchStats && (
                <div className="flex items-center justify-between text-[11px] text-gray-500 pt-0.5 font-medium">
                  <span>Batch {batchStats.currentBatch} of {batchStats.totalBatches || '?'}</span>
                  <span className="text-indigo-700 font-semibold">{batchStats.importedCount.toLocaleString()} products imported</span>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-4 border-t border-gray-100 mt-2">
            <button 
              onClick={handleSubmit}
              disabled={isUploading || !selectedFile || !selectedMake}
              className={`w-full flex items-center justify-center gap-2 bg-[#5B4AEB] hover:bg-[#4d3ddf] text-white py-3.5 px-6 rounded-xl transition-all font-semibold shadow-md active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:pointer-events-none`}
            >
              {isUploading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> {uploadProgress || 'Importing Data...'}</>
              ) : (
                <><CheckCircle2 className="w-5 h-5" /> Submit & Import</>
              )}
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}
