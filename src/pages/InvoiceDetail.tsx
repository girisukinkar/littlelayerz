import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { GstInvoiceRecord } from '../types/gst';
import { gstInvoiceService } from '../services/gstInvoiceService';
import { InvoicePreview } from '../components/invoices/InvoicePreview';
import { generateInvoicePDF } from '../utils/invoicePdfGenerator';
import { formatIndianCurrency, type PaymentMethod } from '../utils/gstCalculations';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  DollarSign,
  Copy,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  CheckCircle,
} from 'lucide-react';

export const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState<GstInvoiceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');

  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const triggerAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const loadInvoice = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await gstInvoiceService.getInvoiceById(id);
      if (data) {
        setInvoice(data);
        setPaymentAmount(data.balance_due);
      } else {
        triggerAlert('error', 'Invoice not found');
      }
    } catch (err) {
      console.error(err);
      triggerAlert('error', 'Failed to fetch invoice');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoice();
  }, [id]);

  const handleConvertToFinal = async () => {
    if (!invoice) return;
    try {
      const updated = await gstInvoiceService.saveInvoice({
        ...invoice,
        is_draft: false,
      });
      setInvoice(updated);
      triggerAlert('success', `Draft converted to Official Tax Invoice #${updated.invoice_number}!`);
    } catch (err) {
      console.error(err);
      triggerAlert('error', 'Failed to convert draft to final invoice.');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !invoice) return;

    if (paymentAmount <= 0) {
      triggerAlert('error', 'Payment amount must be greater than 0');
      return;
    }

    try {
      const updated = await gstInvoiceService.recordPayment(id, paymentAmount, paymentMethod);
      if (updated) {
        setInvoice(updated);
        setIsPaymentModalOpen(false);
        triggerAlert('success', `Payment of ${formatIndianCurrency(paymentAmount)} recorded successfully!`);
      }
    } catch (err) {
      console.error(err);
      triggerAlert('error', 'Failed to record payment');
    }
  };

  const handleDuplicate = async () => {
    if (!invoice) return;
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
      navigate(`/invoices/${saved.id}`);
    } catch (err) {
      console.error(err);
      triggerAlert('error', 'Failed to duplicate invoice');
    }
  };

  const handleDelete = async () => {
    if (!invoice) return;
    if (!window.confirm(`Are you sure you want to delete invoice ${invoice.invoice_number}?`)) return;

    try {
      await gstInvoiceService.deleteInvoice(invoice.id);
      triggerAlert('success', 'Invoice deleted');
      setTimeout(() => navigate('/invoices'), 1000);
    } catch (err) {
      console.error(err);
      triggerAlert('error', 'Failed to delete invoice');
    }
  };

  const handleDownloadPdf = async () => {
    if (invoice) {
      await generateInvoicePDF(invoice, 'download');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-neutral-950 p-8 text-center text-xs text-neutral-500">Loading invoice...</div>;
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-neutral-950 p-8 text-center text-xs text-neutral-400">
        <p>Invoice not found.</p>
        <button onClick={() => navigate('/invoices')} className="mt-4 text-purple-400 font-bold underline">
          Return to Invoice Ledger
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-8 md:px-8 text-neutral-100 selection:bg-purple-500/30 selection:text-purple-200">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Navigation & Actions Top Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-900 pb-5">
          <button
            onClick={() => navigate('/invoices')}
            className="flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-neutral-100 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Invoices</span>
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            {invoice.is_draft ? (
              <button
                type="button"
                onClick={handleConvertToFinal}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Make Official Tax Invoice</span>
              </button>
            ) : (
              invoice.balance_due > 0 && (
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition-all shadow"
                >
                  <DollarSign className="h-4 w-4" />
                  <span>Record Payment</span>
                </button>
              )
            )}

            <button
              type="button"
              onClick={handleDuplicate}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:bg-neutral-800 transition-all"
            >
              <Copy className="h-4 w-4" />
              <span>Duplicate</span>
            </button>

            <button
              type="button"
              onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:bg-neutral-800 transition-all"
            >
              <Edit2 className="h-4 w-4" />
              <span>Edit</span>
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-neutral-900 border border-neutral-800 text-red-400 hover:bg-red-950/40 hover:border-red-500/30 transition-all"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Draft Notice Banner if in Draft mode */}
        {invoice.is_draft && (
          <div className="flex items-center justify-between p-4 rounded-xl border border-purple-500/30 bg-purple-950/20 text-purple-300 text-xs">
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-purple-400 shrink-0" />
              <span>
                <b>Draft Invoice:</b> Send this to the buyer for review. Once approved or paid, click <b>Make Official Tax Invoice</b> to finalize.
              </span>
            </div>
            <button
              onClick={handleConvertToFinal}
              className="px-3 py-1 bg-purple-600 text-white rounded-lg font-bold text-[11px] hover:bg-purple-500 shrink-0 ml-3"
            >
              Convert to Final
            </button>
          </div>
        )}

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

        {/* Live A4 Invoice Container */}
        <div className="max-w-4xl mx-auto shadow-2xl rounded-2xl overflow-hidden border border-neutral-800">
          <InvoicePreview
            invoice={invoice}
            onDownloadPdf={handleDownloadPdf}
            onConvertToFinal={handleConvertToFinal}
          />
        </div>

        {/* Record Payment Modal */}
        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-950/60">
                <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                  Record Payment for {invoice.invoice_number}
                </h3>
                <button onClick={() => setIsPaymentModalOpen(false)} className="text-neutral-500 hover:text-neutral-300">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Outstanding Balance
                  </label>
                  <p className="font-mono font-bold text-base text-red-400">
                    {formatIndianCurrency(invoice.balance_due)}
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
                    max={invoice.balance_due}
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
                    <option value="card">Credit / Debit Card</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
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
