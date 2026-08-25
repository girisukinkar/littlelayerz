import React, { useState } from 'react';
import { AlertTriangle, Trash2, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import { clearUniversalCache } from '../../utils/cacheUtils';

interface ClearCacheModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClearCacheModal: React.FC<ClearCacheModalProps> = ({ isOpen, onClose }) => {
  const [isClearing, setIsClearing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleConfirmClear = async () => {
    setIsClearing(true);
    try {
      await clearUniversalCache(false);
      setIsClearing(false);
      setIsSuccess(true);
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1200);
    } catch (err) {
      console.error(err);
      setIsClearing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm uppercase tracking-wider">
            <AlertTriangle className="h-4 w-4" />
            <span>Clear Local Storage & Cache</span>
          </div>
          <button
            onClick={onClose}
            disabled={isClearing}
            className="text-neutral-400 hover:text-neutral-200 p-1 rounded-lg hover:bg-neutral-800 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        {isSuccess ? (
          <div className="py-6 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-neutral-100">Storage & Cache Cleared!</h3>
            <p className="text-xs text-neutral-400">Reloading Dexter3D ERP application...</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 text-xs text-neutral-300">
              <p className="leading-relaxed">
                This action will reset your browser&apos;s local storage, clear temporary cached files, and refresh your application state.
              </p>
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1.5 font-mono text-[11px] text-neutral-400">
                <div className="flex items-center gap-2 text-emerald-400">
                  <span>✓</span> <span>Flushes localStorage & sessionStorage</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <span>✓</span> <span>Clears Service Worker & HTTP Cache</span>
                </div>
                <div className="flex items-center gap-2 text-amber-400">
                  <span>!</span> <span>Saved data on Supabase database remains untouched</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isClearing}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-neutral-200 transition-all"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmClear}
                disabled={isClearing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50"
              >
                {isClearing ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Clearing Cache...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear Cache & Reload</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
