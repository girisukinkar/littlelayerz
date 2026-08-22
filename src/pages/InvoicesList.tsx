import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GstInvoiceRecord } from '../types/gst';
import { gstInvoiceService } from '../services/gstInvoiceService';
import { formatIndianCurrency, type PaymentMethod } from '../utils/gstCalculations';
import { generateInvoicePDF } from '../utils/invoicePdfGenerator';
import {
  FileText,
  Plus,
  Search,
  Download,
  Copy,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  Sparkles,
  CheckCircle,
} from 'lucide-react';

export const InvoicesList: React.FC = () => {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState<GstInvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'paid' | 'partial' | 'unpaid'>('all');
  const [sortField, setSortField] = useState<'date' | 'amount' | 'number'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Quick Payment Modal
  const [selectedInvoice, setSelectedInvoice] = useState<GstInvoiceRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');

  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const triggerAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const data = await gstInvoiceService.getInvoices();
      setInvoices(data);
    } catch (err) {
      console.error(err);
      triggerAlert('error', 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const handleConvertToFinal = async (invoice: GstInvoiceRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await gstInvoiceService.saveInvoice({
        ...invoice,
        is_draft: false,
      });
      triggerAlert('success', `Draft converted to Official Tax Invoice #${invoice.invoice_number}!`);
      loadInvoices();
    } catch (err) {
      console.error(err);
      triggerAlert('error', 'Failed to convert draft to final invoice.');
    }
  };

  const handleDuplicate = async (invoice: GstInvoiceRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const nextNum = await gstInvoiceService.getNextInvoiceNumber(invoice.seller_snapshot.invoice_prefix || 'INV');
      const duplicated: Partial<GstInvoiceRecord> = {
        ...invoice,
        id: undefined,
        invoice_number: nextNum,
        invoice_date: new Date().toISOString().slice(0, 10),
        due_date: null,
        amount_paid: 0,
        balance_due: invoice.grand_total,
        payment_status: 'unpaid',
        created_at: new Date().toISOString(),
      };
      const saved = await gstInvoiceService.saveInvoice(duplicated);
      triggerAlert('success', `Invoice duplicated as ${saved.invoice_number}`);
      loadInvoices();
    } catch (err) {
      console.error(err);
      triggerAlert('error', 'Failed to duplicate invoice');
    }
  };

  const handleDelete = async (id: string, number: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete invoice ${number}?`)) return;

    try {
      await gstInvoiceService.deleteInvoice(id);
      triggerAlert('success', `Invoice ${number} deleted`);
      loadInvoices();
    } catch (err) {
      console.error(err);
      triggerAlert('error', 'Failed to delete invoice');
    }
  };

  const handleDownloadPdf = async (invoice: GstInvoiceRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await generateInvoicePDF(invoice, 'download');
      triggerAlert('success', `PDF generated for ${invoice.invoice_number}`);
    } catch (err) {
      console.error(err);
      triggerAlert('error', 'Failed to generate PDF');
    }
  };

  const openPaymentModal = (invoice: GstInvoiceRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedInvoice(invoice);
    setPaymentAmount(invoice.balance_due);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    if (paymentAmount <= 0) {
      triggerAlert('error', 'Payment amount must be greater than 0');
      return;
    }

    try {
      const updated = await gstInvoiceService.recordPayment(selectedInvoice.id, paymentAmount, paymentMethod);
      if (updated) {
        setSelectedInvoice(null);
        triggerAlert('success', `Payment of ${formatIndianCurrency(paymentAmount)} recorded!`);
        loadInvoices();
      }
    } catch (err) {
      console.error(err);
      triggerAlert('error', 'Failed to record payment');
    }
  };

  const filteredInvoices = useMemo(() => {
    return invoices
      .filter((inv) => {
        // Status filter
        if (statusFilter === 'draft') {
          if (!inv.is_draft) return false;
        } else if (statusFilter !== 'all') {
          if (inv.is_draft || inv.payment_status !== statusFilter) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesNum = inv.invoice_number.toLowerCase().includes(q);
          const matchesCustomer = inv.customer_snapshot?.name?.toLowerCase().includes(q);
          const matchesPhone = inv.customer_snapshot?.phone?.includes(q);
          const matchesGstin = inv.customer_snapshot?.gstin?.toLowerCase().includes(q);
          return matchesNum || matchesCustomer || matchesPhone || matchesGstin;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortField === 'date') {
          const tA = new Date(a.invoice_date).getTime();
          const tB = new Date(b.invoice_date).getTime();
          return sortOrder === 'desc' ? tB - tA : tA - tB;
        }
        if (sortField === 'amount') {
          return sortOrder === 'desc' ? b.grand_total - a.grand_total : a.grand_total - b.grand_total;
        }
        if (sortField === 'number') {
          return sortOrder === 'desc'
            ? b.invoice_number.localeCompare(a.invoice_number)
            : a.invoice_number.localeCompare(b.invoice_number);
        }
        return 0;
      });
  }, [invoices, statusFilter, searchQuery, sortField, sortOrder]);

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-8 md:px-8 text-neutral-100 selection:bg-purple-500/30 selection:text-purple-200">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-900 pb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-900/30 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-neutral-50">Invoices Ledger</h1>
              <p className="text-xs text-neutral-500 mt-0.5">
                Browse, search, duplicate, convert draft estimates, record payments, and download GST tax invoices
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/invoices/new')}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/20 hover:from-purple-500 hover:to-indigo-500 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Create Invoice</span>
          </button>
        </header>

        {/* Alerts */}
        {alert && (
          <div
            className={`flex items-center gap-3 rounded-xl border p-4 text-xs font-medium backdrop-blur-md shadow-lg ${
              alert.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-red-500/30 bg-red-500/10 text-red-400'
            }`}
          >
            {alert.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span>{alert.message}</span>
          </div>
        )}

        {/* Search, Status & Sorting Filter Controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-neutral-900/50 p-3.5 rounded-2xl border border-neutral-800">
          {/* Search Box */}
          <div className="flex items-center gap-2.5 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 flex-1">
            <Search className="h-4 w-4 text-neutral-500 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by invoice number, customer, phone, GSTIN..."
              className="bg-transparent border-none text-xs text-neutral-100 focus:outline-none w-full placeholder:text-neutral-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-neutral-500 hover:text-neutral-300">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 overflow-x-auto">
            {(['all', 'draft', 'paid', 'partial', 'unpaid'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wider transition-all shrink-0 ${
                  statusFilter === st ? 'bg-purple-600 text-white shadow' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {st === 'draft' ? '⚡ Drafts' : st}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as 'date' | 'amount' | 'number')}
              className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-300 focus:outline-none"
            >
              <option value="date">Sort by Date</option>
              <option value="amount">Sort by Amount</option>
              <option value="number">Sort by Invoice #</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-400 hover:text-neutral-200 font-bold"
              title="Toggle Ascending / Descending"
            >
              {sortOrder.toUpperCase()}
            </button>
          </div>
        </div>

        {/* Invoices Table */}
        {loading ? (
          <div className="py-20 text-center text-neutral-500 text-xs">Loading invoice ledger...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-12 text-center">
            <FileText className="h-10 w-10 text-neutral-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-neutral-300">No invoices found</h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search terms or filters.'
                : 'Create your first GST invoice in seconds.'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <button
                type="button"
                onClick={() => navigate('/invoices/new')}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-500"
              >
                <Plus className="h-3.5 w-3.5" /> Create First Invoice
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-900 border-b border-neutral-800 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Place of Supply</th>
                    <th className="py-3 px-4 text-right">Taxable</th>
                    <th className="py-3 px-4 text-right">Total GST</th>
                    <th className="py-3 px-4 text-right">Grand Total</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {filteredInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                      className="hover:bg-neutral-800/50 transition-all cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-purple-400 group-hover:text-purple-300">
                        <div className="flex items-center gap-1.5">
                          {inv.is_draft && <Sparkles className="h-3 w-3 text-purple-400 shrink-0" />}
                          <span>{inv.invoice_number}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-neutral-400">{inv.invoice_date}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-neutral-200 block">
                          {inv.customer_snapshot?.name || 'Cash Customer'}
                        </span>
                        {inv.customer_snapshot?.gstin && (
                          <span className="text-[10px] font-mono text-neutral-500">{inv.customer_snapshot.gstin}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-300">
                        <span>{inv.place_of_supply}</span>
                        {inv.is_inter_state ? (
                          <span className="ml-1.5 text-[9px] bg-indigo-950/60 text-indigo-400 border border-indigo-500/20 px-1 py-0.2 rounded">
                            IGST
                          </span>
                        ) : (
                          <span className="ml-1.5 text-[9px] bg-neutral-800 text-neutral-400 px-1 py-0.2 rounded">
                            CGST+SGST
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-neutral-300">
                        {formatIndianCurrency(inv.taxable_amount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-cyan-400">
                        {formatIndianCurrency(inv.total_gst)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-neutral-100">
                        {formatIndianCurrency(inv.grand_total)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {inv.is_draft ? (
                          <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                            DRAFT REVIEW
                          </span>
                        ) : (
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              inv.payment_status === 'paid'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : inv.payment_status === 'partial'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}
                          >
                            {inv.payment_status.toUpperCase()}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {inv.is_draft && (
                            <button
                              onClick={(e) => handleConvertToFinal(inv, e)}
                              className="p-1.5 text-emerald-400 hover:bg-emerald-950/40 rounded-lg transition-all"
                              title="Make Official Tax Invoice"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {!inv.is_draft && inv.balance_due > 0 && (
                            <button
                              onClick={(e) => openPaymentModal(inv, e)}
                              className="p-1.5 text-emerald-400 hover:bg-emerald-950/40 rounded-lg transition-all"
                              title="Record Payment"
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDownloadPdf(inv, e)}
                            className="p-1.5 text-neutral-400 hover:text-purple-300 hover:bg-neutral-800 rounded-lg transition-all"
                            title="Download PDF"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDuplicate(inv, e)}
                            className="p-1.5 text-neutral-400 hover:text-purple-300 hover:bg-neutral-800 rounded-lg transition-all"
                            title="Duplicate"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(inv.id, inv.invoice_number, e)}
                            className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Quick Payment Modal */}
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-950/60">
                <h3 className="text-sm font-bold text-neutral-100">
                  Record Payment for {selectedInvoice.invoice_number}
                </h3>
                <button onClick={() => setSelectedInvoice(null)} className="text-neutral-500 hover:text-neutral-300">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Outstanding Balance
                  </label>
                  <p className="font-mono font-bold text-base text-red-400">
                    {formatIndianCurrency(selectedInvoice.balance_due)}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Payment Amount Received (₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    max={selectedInvoice.balance_due}
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 font-mono font-bold focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-purple-500"
                  >
                    <option value="upi">UPI (GPay / PhonePe / QR)</option>
                    <option value="bank_transfer">Bank Transfer / IMPS / NEFT</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setSelectedInvoice(null)}
                    className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-neutral-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg shadow hover:from-emerald-500 hover:to-teal-500 transition-all"
                  >
                    Confirm Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
