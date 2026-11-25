'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Eye,
  X,
  Plus,
  Trash2,
  RotateCcw,
  Loader2,
  Download,
  Save,
  ArrowLeft,
  FileText,
  AlertCircle,
} from 'lucide-react';
import {
  TermItem,
  DEFAULT_TERMS_TEXT,
  createTermId,
  parseTermsText,
  serializeTerms,
} from '@/lib/terms';
import type { QuotationPdfInput } from '@/lib/quotation-pdf';

interface QuotePreviewModalProps {
  isOpen: boolean;
  quoteData: Omit<QuotationPdfInput, 'termsAndConditions'>;
  initialTerms?: string;
  onTermsChange: (termsText: string) => void;
  onClose: () => void;
  onSaveOnly: (termsText: string) => Promise<void>;
  onSaveAndDownload: (termsText: string) => Promise<void>;
  savingAction: 'save' | 'download' | null;
}

export function QuotePreviewModal(props: QuotePreviewModalProps) {
  if (!props.isOpen) return null;
  return <QuotePreviewModalContent {...props} />;
}

function QuotePreviewModalContent({
  quoteData,
  initialTerms,
  onTermsChange,
  onClose,
  onSaveOnly,
  onSaveAndDownload,
  savingAction,
}: QuotePreviewModalProps) {
  const [termsList, setTermsList] = useState<TermItem[]>([]);
  const [defaultTermsText, setDefaultTermsText] = useState<string>(DEFAULT_TERMS_TEXT);
  const [isInitializingTerms, setIsInitializingTerms] = useState(true);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'preview' | 'terms'>('preview');

  const previewUrlRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasLoadedOnceRef = useRef(false);
  const quoteDataRef = useRef(quoteData);
  const initialTermsRef = useRef(initialTerms);
  const onTermsChangeRef = useRef(onTermsChange);

  useEffect(() => {
    quoteDataRef.current = quoteData;
  }, [quoteData]);

  useEffect(() => {
    initialTermsRef.current = initialTerms;
  }, [initialTerms]);

  useEffect(() => {
    onTermsChangeRef.current = onTermsChange;
  }, [onTermsChange]);

  const revokePreviewUrl = useCallback(() => {
    if (previewUrlRef.current) {
      window.URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  // Initialize terms from Settings (or previously edited terms) on mount
  useEffect(() => {
    let cancelled = false;

    async function initTerms() {
      let settingsDefault = DEFAULT_TERMS_TEXT;
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data?.termsAndConditions && data.termsAndConditions.trim().length > 0) {
            settingsDefault = data.termsAndConditions;
          }
        }
      } catch {
        // Fall back to DEFAULT_TERMS_TEXT
      }

      if (cancelled) return;
      setDefaultTermsText(settingsDefault);

      const currentInitial = initialTermsRef.current;
      const seedText =
        currentInitial && currentInitial.trim().length > 0 ? currentInitial : settingsDefault;
      const parsed = parseTermsText(seedText);
      setTermsList(parsed);
      if (!currentInitial || !currentInitial.trim()) {
        onTermsChangeRef.current(serializeTerms(parsed));
      }
      setIsInitializingTerms(false);
    }

    initTerms();

    return () => {
      cancelled = true;
    };
  }, []);

  const fetchPreview = useCallback(
    async (termsText: string) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (!hasLoadedOnceRef.current) {
        setIsInitialLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setPreviewError(null);

      try {
        const res = await fetch('/api/quotations/preview-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            ...quoteDataRef.current,
            termsAndConditions: termsText,
          }),
        });

        if (!res.ok) {
          throw new Error('Failed to render PDF preview');
        }

        const blob = await res.blob();
        if (controller.signal.aborted) return;

        const nextUrl = window.URL.createObjectURL(blob);
        revokePreviewUrl();
        previewUrlRef.current = nextUrl;
        setPreviewUrl(nextUrl);
        hasLoadedOnceRef.current = true;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.error('Preview PDF error:', err);
        setPreviewError(err?.message || 'Could not generate preview');
      } finally {
        if (!controller.signal.aborted) {
          setIsInitialLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [revokePreviewUrl]
  );

  // Debounced auto-refresh whenever termsList changes
  useEffect(() => {
    if (isInitializingTerms || termsList.length === 0) return;

    const serialized = serializeTerms(termsList);
    onTermsChangeRef.current(serialized);

    const delay = hasLoadedOnceRef.current ? 450 : 0;
    const timer = setTimeout(() => {
      fetchPreview(serialized);
    }, delay);

    return () => clearTimeout(timer);
  }, [isInitializingTerms, termsList, fetchPreview]);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !savingAction) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [savingAction, onClose]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      revokePreviewUrl();
    };
  }, [revokePreviewUrl]);

  const updateTermField = (id: string, field: 'label' | 'value', nextVal: string) => {
    setTermsList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: nextVal } : item))
    );
  };

  const addTermRow = () => {
    setTermsList((prev) => [...prev, { id: createTermId(), label: '', value: '' }]);
  };

  const removeTermRow = (id: string) => {
    setTermsList((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((item) => item.id !== id);
    });
  };

  const resetTermsToDefault = () => {
    setTermsList(parseTermsText(defaultTermsText));
  };

  const currentSerializedTerms = serializeTerms(termsList);
  const isBusy = savingAction !== null;

  return (
    <div
      className="fixed inset-0 z-50 animate-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isBusy) onClose();
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-md"
        onClick={() => {
          if (!isBusy) onClose();
        }}
      />

      {/* Modal Container */}
      <div className="relative z-10 flex items-center justify-center w-full h-full p-2 sm:p-5 pointer-events-none">
        <div
          className="pointer-events-auto animate-modal-panel bg-white rounded-2xl shadow-[0_25px_60px_-12px_rgba(0,0,0,0.35)] w-full max-w-[1280px] flex flex-col overflow-hidden"
          style={{ height: 'min(94vh, 900px)' }}
        >
          {/* Top Accent Bar */}
          <div className="h-1 w-full bg-gradient-to-r from-[#0066cc] via-[#0091ff] to-[#0066cc] shrink-0" />

          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-[#e8e8ed] shrink-0 bg-white">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#0066cc]/10 flex items-center justify-center shrink-0">
                <Eye className="w-[18px] h-[18px] text-[#0066cc]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-[16px] font-semibold tracking-tight text-[#1d1d1f] leading-tight">
                    Live Quotation Preview
                  </h2>
                  {quoteData.quoteNumber && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#f5f5f7] text-[#1d1d1f] border border-[#e5e5ea]">
                      {quoteData.quoteNumber}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#86868b] leading-tight mt-0.5 truncate">
                  Review your PDF and edit Terms &amp; Conditions on the fly before saving · Press Esc to go back
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="w-8 h-8 rounded-full bg-[#f5f5f7] hover:bg-[#e8e8ed] flex items-center justify-center transition-colors group disabled:opacity-50 shrink-0"
              aria-label="Close preview"
            >
              <X className="w-4 h-4 text-[#86868b] group-hover:text-[#1d1d1f] transition-colors" />
            </button>
          </div>

          {/* Mobile Tab Switcher */}
          <div className="flex lg:hidden border-b border-[#e8e8ed] bg-[#fafafa] px-4 py-2 gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setMobileTab('preview')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-[13px] font-semibold transition-all ${
                mobileTab === 'preview'
                  ? 'bg-white text-[#0066cc] shadow-sm border border-[#e0e0e0]'
                  : 'text-[#6e6e73]'
              }`}
            >
              PDF Preview
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('terms')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-[13px] font-semibold transition-all ${
                mobileTab === 'terms'
                  ? 'bg-white text-[#0066cc] shadow-sm border border-[#e0e0e0]'
                  : 'text-[#6e6e73]'
              }`}
            >
              Terms &amp; Conditions ({termsList.length})
            </button>
          </div>

          {/* Main Split Body */}
          <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
            {/* Left Pane: Structured Terms & Conditions Editor */}
            <div
              className={`${
                mobileTab === 'terms' ? 'flex' : 'hidden'
              } lg:flex flex-col w-full lg:w-[400px] xl:w-[430px] shrink-0 border-r border-[#e8e8ed] bg-[#fafafa] min-h-0`}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#e8e8ed] bg-white shrink-0">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#0066cc]" />
                  <span className="text-[13px] font-semibold text-[#1d1d1f]">
                    Terms &amp; Conditions
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={resetTermsToDefault}
                    disabled={isBusy || isInitializingTerms}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#6e6e73] hover:text-[#1d1d1f] px-2 py-1 rounded-md hover:bg-[#f5f5f7] transition-colors disabled:opacity-50"
                    title="Reset to default Settings terms"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={addTermRow}
                    disabled={isBusy || isInitializingTerms}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0066cc] bg-[#0066cc]/10 hover:bg-[#0066cc]/15 px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Term
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
                {isInitializingTerms ? (
                  <div className="space-y-2.5">
                    {[1, 2, 3, 4].map((n) => (
                      <div key={n} className="bg-white border border-[#e5e5ea] rounded-xl p-3 space-y-2">
                        <div className="skeleton-shimmer h-3.5 w-1/3 rounded" />
                        <div className="skeleton-shimmer h-8 w-full rounded" />
                      </div>
                    ))}
                  </div>
                ) : (
                  termsList.map((term, idx) => (
                    <div
                      key={term.id}
                      className="bg-white border border-[#e5e5ea] rounded-xl p-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus-within:border-[#0066cc] focus-within:ring-2 focus-within:ring-[#0066cc]/10 transition-all"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[11px] font-bold text-[#0066cc] bg-[#0066cc]/10 px-1.5 py-0.5 rounded shrink-0">
                          {idx + 1})
                        </span>
                        <input
                          type="text"
                          value={term.label}
                          onChange={(e) => updateTermField(term.id, 'label', e.target.value)}
                          placeholder="Term label (e.g. Delivery)"
                          disabled={isBusy}
                          className="flex-1 min-w-0 text-[13px] font-semibold text-[#1d1d1f] bg-[#f5f5f7] border border-[#e5e5ea] rounded-lg px-2.5 py-1.5 outline-none focus:bg-white focus:border-[#0066cc] transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => removeTermRow(term.id)}
                          disabled={isBusy || termsList.length <= 1}
                          className="p-1.5 text-[#86868b] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none shrink-0"
                          title="Remove term"
                          aria-label={`Remove term ${idx + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={term.value}
                        onChange={(e) => updateTermField(term.id, 'value', e.target.value)}
                        placeholder="Term details..."
                        disabled={isBusy}
                        className="w-full text-[13px] text-[#333] bg-[#f5f5f7] border border-[#e5e5ea] rounded-lg px-2.5 py-1.5 outline-none focus:bg-white focus:border-[#0066cc] transition-colors resize-none leading-snug"
                      />
                    </div>
                  ))
                )}
              </div>

              <div className="px-4 py-2.5 border-t border-[#e8e8ed] bg-white text-[11px] text-[#86868b] flex items-center justify-between shrink-0">
                <span>Changes auto-update the PDF preview</span>
                {isRefreshing || isInitialLoading ? (
                  <span className="inline-flex items-center gap-1 text-[#0066cc] font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Syncing…
                  </span>
                ) : (
                  <span className="text-emerald-600 font-medium">Synced</span>
                )}
              </div>
            </div>

            {/* Right Pane: Live PDF Preview */}
            <div
              className={`${
                mobileTab === 'preview' ? 'flex' : 'hidden'
              } lg:flex flex-1 flex-col bg-[#f0f0f3] relative min-h-0 overflow-hidden`}
            >
              {isRefreshing && previewUrl && (
                <div className="absolute top-3 right-4 z-20 bg-white/95 backdrop-blur-sm border border-[#e0e0e0] shadow-md rounded-full px-3 py-1.5 flex items-center gap-2 text-[12px] font-medium text-[#1d1d1f]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0066cc]" />
                  Updating preview…
                </div>
              )}

              {isInitialLoading && !previewUrl ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
                  <div className="w-full max-w-[420px] bg-white rounded-xl shadow-md p-6 space-y-4">
                    <div className="skeleton-shimmer h-5 w-2/5 mx-auto rounded" />
                    <div className="space-y-2 mt-4">
                      <div className="skeleton-shimmer h-3 w-4/5 rounded" />
                      <div className="skeleton-shimmer h-3 w-3/5 rounded" />
                      <div className="skeleton-shimmer h-3 w-full rounded" />
                    </div>
                    <div className="border-t border-[#e8e8ed] pt-4 mt-4 space-y-2">
                      <div className="skeleton-shimmer h-3 w-full rounded" />
                      <div className="skeleton-shimmer h-3 w-full rounded" />
                      <div className="skeleton-shimmer h-3 w-4/5 rounded" />
                      <div className="skeleton-shimmer h-3 w-3/4 rounded" />
                    </div>
                    <div className="border-t border-[#e8e8ed] pt-4 mt-4 space-y-2">
                      <div className="skeleton-shimmer h-3 w-2/3 rounded" />
                      <div className="skeleton-shimmer h-3 w-1/2 rounded" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#0066cc]" />
                    <span className="text-[13px] text-[#86868b] font-medium">
                      Generating live PDF preview…
                    </span>
                  </div>
                </div>
              ) : previewError && !previewUrl ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  </div>
                  <p className="text-[14px] text-[#6e6e73] font-medium">{previewError}</p>
                  <button
                    type="button"
                    onClick={() => fetchPreview(currentSerializedTerms)}
                    className="text-[13px] text-[#0066cc] font-semibold hover:underline"
                  >
                    Try again
                  </button>
                </div>
              ) : previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-0"
                  title="Quotation Live PDF Preview"
                />
              ) : null}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 px-4 sm:px-6 py-3.5 border-t border-[#e8e8ed] bg-white shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-[#d2d2d7] bg-white text-[#1d1d1f] text-[14px] font-medium hover:bg-[#f5f5f7] transition-colors disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Cancel / Back to Edit
            </button>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <button
                type="button"
                onClick={() => onSaveOnly(currentSerializedTerms)}
                disabled={isBusy || isInitializingTerms}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border-2 border-[#0066cc] bg-white text-[#0066cc] text-[14px] font-semibold hover:bg-[#f0f7ff] active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
              >
                {savingAction === 'save' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Quote Only
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => onSaveAndDownload(currentSerializedTerms)}
                disabled={isBusy || isInitializingTerms}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-[#0066cc] text-white text-[14px] font-semibold hover:bg-[#0071e3] active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 shadow-[0_4px_14px_0_rgba(0,102,204,0.39)]"
              >
                {savingAction === 'download' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving &amp; Downloading…
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Save &amp; Download PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
