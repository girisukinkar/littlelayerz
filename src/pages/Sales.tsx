import React, { useState, useMemo } from 'react';
import { useSales, filterSalesByDate, calculateSalesMetrics } from '../hooks/useSales';
import { useProducts } from '../hooks/useProducts';
import type { Sale, DateFilterRange } from '../types/sale';
import { SaleStats } from '../components/sales/SaleStats';
import { QuickSaleForm } from '../components/sales/QuickSaleForm';
import { SaleTable } from '../components/sales/SaleTable';
import { ReceiptModal } from '../components/sales/ReceiptModal';
import { EditSaleModal } from '../components/sales/EditSaleModal';
import { 
  CheckCircle2, 
  ShieldAlert, 
  Plus
} from 'lucide-react';

export const Sales: React.FC = () => {
  const {
    sales,
    isError,
    error,
    addSale,
    isAdding,
    updateSale,
    deleteSale,
    clearAllSales,
  } = useSales();

  const { products } = useProducts();


  // Date range filter for dashboard
  const [activeRange, setActiveRange] = useState<DateFilterRange>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Active Receipt Modal state
  const [activeReceiptSale, setActiveReceiptSale] = useState<Sale | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Edit Sale Modal state
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Toast alert
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4500);
  };

  // Filtered sales for the selected date range
  const filteredRangeSales = useMemo(() => {
    return filterSalesByDate(sales, activeRange, customStartDate, customEndDate);
  }, [sales, activeRange, customStartDate, customEndDate]);

  // Aggregate metrics for the filtered range
  const metrics = useMemo(() => {
    return calculateSalesMetrics(filteredRangeSales);
  }, [filteredRangeSales]);

  // Period label for dashboard
  const periodLabel = useMemo(() => {
    if (activeRange === 'today') return 'Today';
    if (activeRange === 'yesterday') return 'Yesterday';
    if (activeRange === 'week') return 'Last 7 Days';
    if (activeRange === 'month') return 'This Month';
    if (activeRange === 'all') return 'All Time';
    return 'Custom Range';
  }, [activeRange]);

  // Handle recording a sale
  const handleRecordSale = async (newSale: Omit<Sale, 'id' | 'created_at'>) => {
    try {
      const created = await addSale(newSale);
      showToast('success', `Sale ${newSale.receipt_no} recorded successfully! (₹${newSale.total_amount})`);

      // Open receipt modal immediately so the stall owner can show/share/print the invoice
      if (created) {
        setActiveReceiptSale(created);
        setIsReceiptModalOpen(true);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to record sale.');
      throw err;
    }
  };

  // Handle saving an edited sale
  const handleSaveEditedSale = async (updated: Sale) => {
    try {
      await updateSale(updated);
      showToast('success', `Sale ${updated.receipt_no} updated successfully!`);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update sale.');
      throw err;
    }
  };

  // Handle deleting a sale
  const handleDeleteSale = async (saleId: string) => {
    try {
      await deleteSale(saleId);
      showToast('success', 'Sale deleted successfully!');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete sale.');
    }
  };

  // Handle clear all sales
  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear all sales records? This cannot be undone.')) {
      try {
        await clearAllSales();
        showToast('success', 'All sales records cleared.');
      } catch (err: any) {
        showToast('error', err.message || 'Failed to clear sales.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-8 md:px-8 text-neutral-100 selection:bg-purple-500/30 selection:text-purple-200">
      <div className="mx-auto max-w-7xl">
        {/* Header Block */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-neutral-900 pb-6 mb-6 gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Stall POS & Billing
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                {new Date().toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-50 bg-gradient-to-r from-purple-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent mt-1.5">
              Market Stall Sales & Rough Invoices (RS)
            </h1>
            <p className="text-xs md:text-sm text-neutral-400 mt-1">
              Live items sold tracker • Instant profit calculation • WhatsApp & Thermal receipt slip generator
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const formEl = document.getElementById('quick-sale-section');
                formEl?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-900/30 hover:from-purple-500 hover:to-indigo-500 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              New Stall Sale
            </button>
          </div>
        </header>

        {/* Database Warning / Error if any */}
        {isError && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400 backdrop-blur-md">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Notice: Offline Local Mode Active</span>
              <p className="mt-0.5 text-neutral-400 text-xs">
                {(error as any)?.message || 'Sales are being saved locally in high-speed storage.'}
              </p>
            </div>
          </div>
        )}

        {/* Toast Alerts */}
        {alert && (
          <div
            className={`mb-6 flex items-center gap-3 rounded-2xl border p-4 text-sm shadow-2xl backdrop-blur-md transition-all duration-300 ${
              alert.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-red-500/30 bg-red-500/10 text-red-300'
            }`}
          >
            {alert.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            ) : (
              <ShieldAlert className="h-5 w-5 shrink-0 text-red-400" />
            )}
            <span className="font-semibold">{alert.message}</span>
          </div>
        )}

        {/* 1. Top Stall Analytics / Metrics Cards */}
        <SaleStats metrics={metrics} periodLabel={periodLabel} />

        {/* 2. Fast POS Quick Sale Entry Form */}
        <div id="quick-sale-section">
          <QuickSaleForm
            products={products}
            onRecordSale={handleRecordSale}
            isRecording={isAdding}
          />
        </div>

        {/* 3. Filterable Stall Sales History Table */}
        <SaleTable
          sales={filteredRangeSales}
          activeRange={activeRange}
          onRangeChange={setActiveRange}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
          onCustomStartChange={setCustomStartDate}
          onCustomEndChange={setCustomEndDate}
          onViewReceipt={(sale) => {
            setActiveReceiptSale(sale);
            setIsReceiptModalOpen(true);
          }}
          onEditSale={(sale) => {
            setEditingSale(sale);
            setIsEditModalOpen(true);
          }}
          onDeleteSale={handleDeleteSale}
          onClearAllSales={handleClearAll}
        />

        {/* 4. Receipt / Invoice Preview Modal */}
        <ReceiptModal
          sale={activeReceiptSale}
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
        />

        {/* 5. Edit Sale Modal */}
        <EditSaleModal
          sale={editingSale}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveEditedSale}
        />
      </div>
    </div>
  );
};
