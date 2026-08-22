import React, { useState, useEffect, useMemo } from 'react';
import type { GstInvoiceRecord } from '../types/gst';
import { gstInvoiceService } from '../services/gstInvoiceService';
import { exportToCSV } from '../utils/exportUtils';
import { formatIndianCurrency } from '../utils/gstCalculations';
import {
  FileSpreadsheet,
  Download,
} from 'lucide-react';

export const Reports: React.FC = () => {
  const [invoices, setInvoices] = useState<GstInvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [supplyTypeFilter, setSupplyTypeFilter] = useState<'all' | 'intra' | 'inter'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const data = await gstInvoiceService.getInvoices();
        setInvoices(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Date range
      if (startDate && inv.invoice_date < startDate) return false;
      if (endDate && inv.invoice_date > endDate) return false;

      // Supply Type
      if (supplyTypeFilter === 'intra' && inv.is_inter_state) return false;
      if (supplyTypeFilter === 'inter' && !inv.is_inter_state) return false;

      // Status
      if (statusFilter !== 'all' && inv.payment_status !== statusFilter) return false;

      return true;
    });
  }, [invoices, startDate, endDate, supplyTypeFilter, statusFilter]);

  const summary = useMemo(() => {
    let grossSubtotal = 0;
    let totalDiscount = 0;
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalGst = 0;
    let totalGrand = 0;
    let totalPaid = 0;
    let totalBalance = 0;

    filteredInvoices.forEach((inv) => {
      grossSubtotal += inv.subtotal;
      totalDiscount += inv.item_discount_total + inv.invoice_discount_amount;
      totalTaxable += inv.taxable_amount;
      totalCgst += inv.cgst;
      totalSgst += inv.sgst;
      totalIgst += inv.igst;
      totalGst += inv.total_gst;
      totalGrand += inv.grand_total;
      totalPaid += inv.amount_paid;
      totalBalance += inv.balance_due;
    });

    return {
      count: filteredInvoices.length,
      grossSubtotal,
      totalDiscount,
      totalTaxable,
      totalCgst,
      totalSgst,
      totalIgst,
      totalGst,
      totalGrand,
      totalPaid,
      totalBalance,
    };
  }, [filteredInvoices]);

  const handleExport = () => {
    const filename = `gst_sales_report_${startDate || 'start'}_to_${endDate || 'end'}.csv`;
    exportToCSV(filteredInvoices, filename);
  };

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-8 md:px-8 text-neutral-100 selection:bg-purple-500/30 selection:text-purple-200">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-900 pb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-900/30 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-neutral-50">Tax & Sales Reports</h1>
              <p className="text-xs text-neutral-500 mt-0.5">
                Detailed GST audit ledger, tax breakdowns, and one-click CSV / Excel exports
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={filteredInvoices.length === 0}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>Export to CSV</span>
          </button>
        </header>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-neutral-900/50 p-4 rounded-2xl border border-neutral-800">
          <div>
            <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 font-mono focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 font-mono focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">Supply Type</label>
            <select
              value={supplyTypeFilter}
              onChange={(e) => setSupplyTypeFilter(e.target.value as 'all' | 'intra' | 'inter')}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Supplies</option>
              <option value="intra">Intra-State (CGST + SGST)</option>
              <option value="inter">Inter-State (IGST)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">Payment Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'paid' | 'partial' | 'unpaid')}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
        </div>

        {/* Report Aggregates Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Total Taxable</span>
            <p className="text-base font-black font-mono text-neutral-100">
              {formatIndianCurrency(summary.totalTaxable)}
            </p>
            <span className="text-[10px] text-neutral-500">{summary.count} invoice(s)</span>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">CGST Total</span>
            <p className="text-base font-black font-mono text-cyan-400">
              {formatIndianCurrency(summary.totalCgst)}
            </p>
            <span className="text-[10px] text-neutral-500">Central Tax</span>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">SGST Total</span>
            <p className="text-base font-black font-mono text-cyan-400">
              {formatIndianCurrency(summary.totalSgst)}
            </p>
            <span className="text-[10px] text-neutral-500">State Tax</span>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">IGST Total</span>
            <p className="text-base font-black font-mono text-indigo-400">
              {formatIndianCurrency(summary.totalIgst)}
            </p>
            <span className="text-[10px] text-neutral-500">Integrated Tax</span>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Total GST</span>
            <p className="text-base font-black font-mono text-purple-300">
              {formatIndianCurrency(summary.totalGst)}
            </p>
            <span className="text-[10px] text-neutral-500">Total Tax Liability</span>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Grand Revenue</span>
            <p className="text-base font-black font-mono text-emerald-400">
              {formatIndianCurrency(summary.totalGrand)}
            </p>
            <span className="text-[10px] text-neutral-500">Gross Total</span>
          </div>
        </div>

        {/* Detailed Report Table */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-900 border-b border-neutral-800 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">GSTIN</th>
                  <th className="py-3 px-4">Supply</th>
                  <th className="py-3 px-4 text-right">Taxable</th>
                  <th className="py-3 px-4 text-right">CGST</th>
                  <th className="py-3 px-4 text-right">SGST</th>
                  <th className="py-3 px-4 text-right">IGST</th>
                  <th className="py-3 px-4 text-right">Total GST</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-neutral-500 font-sans">
                      Loading report data...
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-neutral-500 font-sans">
                      No invoices match the selected report criteria.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-neutral-800/50">
                      <td className="py-3 px-4 font-bold text-purple-400">{inv.invoice_number}</td>
                      <td className="py-3 px-4 text-neutral-400">{inv.invoice_date}</td>
                      <td className="py-3 px-4 font-sans font-medium text-neutral-200">
                        {inv.customer_snapshot?.name || 'Customer'}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-neutral-400">
                        {inv.customer_snapshot?.gstin || '-'}
                      </td>
                      <td className="py-3 px-4 font-sans text-neutral-300">
                        {inv.place_of_supply} {inv.is_inter_state ? '(IGST)' : '(CGST+SGST)'}
                      </td>
                      <td className="py-3 px-4 text-right text-neutral-200">
                        {formatIndianCurrency(inv.taxable_amount)}
                      </td>
                      <td className="py-3 px-4 text-right text-cyan-400">
                        {inv.cgst > 0 ? formatIndianCurrency(inv.cgst) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right text-cyan-400">
                        {inv.sgst > 0 ? formatIndianCurrency(inv.sgst) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right text-indigo-400">
                        {inv.igst > 0 ? formatIndianCurrency(inv.igst) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-purple-300">
                        {formatIndianCurrency(inv.total_gst)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-neutral-100 font-sans">
                        {formatIndianCurrency(inv.grand_total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredInvoices.length > 0 && (
                <tfoot>
                  <tr className="bg-neutral-900 border-t-2 border-neutral-700 font-bold font-mono text-xs">
                    <td colSpan={5} className="py-3 px-4 uppercase text-neutral-300 font-sans">
                      Ledger Summary ({filteredInvoices.length} Invoices)
                    </td>
                    <td className="py-3 px-4 text-right text-neutral-100 font-mono">
                      {formatIndianCurrency(summary.totalTaxable)}
                    </td>
                    <td className="py-3 px-4 text-right text-cyan-300 font-mono">
                      {formatIndianCurrency(summary.totalCgst)}
                    </td>
                    <td className="py-3 px-4 text-right text-cyan-300 font-mono">
                      {formatIndianCurrency(summary.totalSgst)}
                    </td>
                    <td className="py-3 px-4 text-right text-indigo-300 font-mono">
                      {formatIndianCurrency(summary.totalIgst)}
                    </td>
                    <td className="py-3 px-4 text-right text-purple-300 font-mono">
                      {formatIndianCurrency(summary.totalGst)}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-400 font-mono font-bold">
                      {formatIndianCurrency(summary.totalGrand)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
