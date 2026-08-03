import React, { useState, useRef } from 'react';
import { Upload, X, ChevronDown, Loader2, FileText, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MAKE_OPTIONS = [
  'phoenix',
  'Isacr',
  'Ctc precision',
  'HNTI OIL',
  'Rego fix',
  'addision'
];

export default function ImportModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
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
    const loadingToast = toast.loading('Importing products...');
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('make', selectedMake);

    try {
      const res = await fetch('/api/products/import', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      toast.success('Products imported successfully!', { id: loadingToast });
      onSuccess();
      handleClose(); // Close modal on success
    } catch (error) {
      console.error(error);
      toast.error('Error importing products.', { id: loadingToast });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedMake('');
    setSelectedFile(null);
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
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
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

          {/* Submit Button */}
          <div className="pt-4 border-t border-gray-100 mt-2">
            <button 
              onClick={handleSubmit}
              disabled={isUploading || !selectedFile || !selectedMake}
              className={`w-full flex items-center justify-center gap-2 bg-[#5B4AEB] hover:bg-[#4d3ddf] text-white py-3.5 px-6 rounded-xl transition-all font-semibold shadow-md active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:pointer-events-none`}
            >
              {isUploading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Importing Data...</>
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
