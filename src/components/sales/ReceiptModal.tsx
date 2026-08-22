import React, { useState } from 'react';
import type { Sale } from '../../types/sale';
import { exportSaleReceiptPDF, formatSaleReceiptText } from '../../utils/receiptPdfExporter';
import { 
  X, 
  Printer, 
  Download, 
  Share2, 
  Copy, 
  Check, 
  Eye,
  EyeOff
} from 'lucide-react';


interface ReceiptModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [showInternalMargin, setShowInternalMargin] = useState(false);

  if (!isOpen || !sale) return null;

  const handleCopyText = async () => {
    try {
      const text = formatSaleReceiptText(sale);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Copy failed:', e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    exportSaleReceiptPDF(sale);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(formatSaleReceiptText(sale));
    const phone = sale.customer_phone ? sale.customer_phone.replace(/[^0-9]/g, '') : '';
    const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  const formattedDate = sale.created_at
    ? new Date(sale.created_at).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : new Date().toLocaleString('en-IN');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950 p-6 md:p-8 shadow-2xl text-neutral-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Actions & Close */}
        <div className="flex items-center justify-between border-b border-neutral-850 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-1 rounded-lg">
              {sale.receipt_no}
            </span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
              sale.payment_method === 'UPI'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : sale.payment_method === 'Cash'
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400'
            }`}>
              {sale.payment_method} Paid
            </span>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Printable Receipt Body */}
        <div className="overflow-y-auto pr-1 flex-1 space-y-4 print:p-0">
          {/* Brand Header */}
          <div className="text-center pb-2 border-b border-dashed border-neutral-800">
            <h3 className="text-2xl font-black tracking-tight text-white">
              LITTLE LAYERZ
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Market Stall & 3D Creations Studio
            </p>
            <p className="text-[11px] text-neutral-500">
              High-Precision FDM Prints • Custom Toys • Keychains • Decor
            </p>
          </div>

          {/* Transaction Metadata */}
          <div className="grid grid-cols-2 text-xs gap-2 py-1 text-neutral-400">
            <div>
              <span className="text-neutral-500">Date & Time:</span>
              <div className="font-medium text-neutral-200">{formattedDate}</div>
            </div>
            <div className="text-right">
              <span className="text-neutral-500">Payment Mode:</span>
              <div className="font-medium text-emerald-400">{sale.payment_method} Received</div>
            </div>
            {sale.customer_name && (
              <div>
                <span className="text-neutral-500">Customer:</span>
                <div className="font-medium text-neutral-200">{sale.customer_name}</div>
              </div>
            )}
            {sale.customer_phone && (
              <div className="text-right">
                <span className="text-neutral-500">WhatsApp:</span>
                <div className="font-medium text-neutral-200">{sale.customer_phone}</div>
              </div>
            )}
          </div>

          {/* Itemized Table */}
          <div className="rounded-2xl border border-neutral-850 overflow-hidden bg-neutral-900/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-900 border-b border-neutral-800 text-neutral-400 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Item</th>
                  <th className="py-2.5 px-2 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Price</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900 text-neutral-200">
                {(sale.items || []).map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-neutral-900/50">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-neutral-100">{item.product_name}</div>
                      {showInternalMargin && item.cost_price && (
                        <div className="text-[10px] text-emerald-400">
                          Cost: ₹{item.cost_price} | Profit: ₹{(item.unit_price - item.cost_price) * item.quantity}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-center text-neutral-400">{item.quantity}</td>
                    <td className="py-2.5 px-3 text-right font-mono">₹{item.unit_price}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-white">₹{item.total_price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Calculation Summary */}
          <div className="space-y-1.5 pt-2 text-xs border-t border-dashed border-neutral-800">
            <div className="flex justify-between text-neutral-400">
              <span>Subtotal:</span>
              <span className="font-mono">₹{sale.subtotal || sale.total_amount}</span>
            </div>

            {sale.discount > 0 && (
              <div className="flex justify-between text-red-400">
                <span>Discount / Roundoff:</span>
                <span className="font-mono">-₹{sale.discount}</span>
              </div>
            )}

            <div className="flex justify-between items-baseline pt-2 border-t border-neutral-800 text-base">
              <span className="font-extrabold text-white">Grand Total:</span>
              <span className="font-mono font-black text-2xl text-emerald-400">
                ₹{sale.total_amount}
              </span>
            </div>
          </div>

          {/* Internal Owner Margin Panel (Optional Toggle) */}
          <div className="rounded-xl border border-neutral-850 bg-neutral-900/60 p-3 text-xs">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowInternalMargin(!showInternalMargin)}
                className="flex items-center gap-1.5 text-neutral-400 hover:text-purple-300 transition-all font-medium"
              >
                {showInternalMargin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                <span>{showInternalMargin ? 'Hide Internal Profit' : 'View Stall Profit & Costs'}</span>
              </button>
              {showInternalMargin && (
                <span className="text-emerald-400 font-bold">
                  ₹{sale.total_profit} Profit
                </span>
              )}
            </div>

            {showInternalMargin && (
              <div className="mt-2 pt-2 border-t border-neutral-800 grid grid-cols-2 gap-2 text-[11px] text-neutral-400 animate-in fade-in">
                <div>
                  Making Cost: <strong className="text-neutral-200">₹{sale.total_cost || 0}</strong>
                </div>
                <div className="text-right">
                  Gross Margin: <strong className="text-emerald-400">
                    {sale.total_amount > 0 ? Math.round(((sale.total_profit || 0) / sale.total_amount) * 100) : 0}%
                  </strong>
                </div>
              </div>
            )}
          </div>

          {/* Notes if present */}
          {sale.notes && (
            <div className="rounded-xl border border-neutral-850 bg-neutral-900/30 p-2.5 text-xs text-neutral-400">
              <strong className="text-neutral-300">Notes:</strong> {sale.notes}
            </div>
          )}

          {/* Thank You Note */}
          <div className="text-center pt-2 text-[11px] text-neutral-500">
            <p>Thank you for visiting the Dexter3D stall!</p>
            <p className="mt-0.5">Tag us on Instagram & WhatsApp for your custom 3D prints.</p>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="mt-6 pt-4 border-t border-neutral-850 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* WhatsApp Share */}
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2.5 text-xs font-bold shadow-lg shadow-emerald-950 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>WhatsApp</span>
          </button>

          {/* Download PDF */}
          <button
            type="button"
            onClick={handleDownloadPDF}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-3 py-2.5 text-xs font-bold shadow-lg shadow-purple-950 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download className="h-3.5 w-3.5" />
            <span>PDF Slip</span>
          </button>

          {/* Print Slip */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-3 py-2.5 text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print</span>
          </button>

          {/* Copy Text */}
          <button
            type="button"
            onClick={handleCopyText}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 px-3 py-2.5 text-xs font-bold transition-all"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
