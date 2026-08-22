import React, { useState, useEffect } from 'react';
import type { Sale, PaymentMethod } from '../../types/sale';
import { X, Trash2 } from 'lucide-react';


interface EditSaleModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedSale: Sale) => Promise<void>;
}

export const EditSaleModal: React.FC<EditSaleModalProps> = ({
  sale,
  isOpen,
  onClose,
  onSave,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [discount, setDiscount] = useState<number | ''>(0);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Sale['items']>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (sale) {
      setCustomerName(sale.customer_name || '');
      setCustomerPhone(sale.customer_phone || '');
      setPaymentMethod(sale.payment_method || 'UPI');
      setDiscount(sale.discount || 0);
      setNotes(sale.notes || '');
      setItems(sale.items ? JSON.parse(JSON.stringify(sale.items)) : []);
    }
  }, [sale]);

  if (!isOpen || !sale) return null;

  const handleItemChange = (index: number, field: string, val: any) => {
    setItems((prev) => {
      const copy = [...prev];
      const target = { ...copy[index], [field]: val };

      if (field === 'quantity' || field === 'unit_price' || field === 'cost_price') {
        const qty = Number(target.quantity) || 1;
        const unitPrice = Number(target.unit_price) || 0;
        const unitCost = Number(target.cost_price) || 0;
        target.total_price = qty * unitPrice;
        target.total_cost = unitCost > 0 ? qty * unitCost : 0;
        target.profit = target.total_price - (target.total_cost || 0);
      }

      copy[index] = target;
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, i) => sum + (Number(i.total_price) || 0), 0);
  const numDiscount = Number(discount) || 0;
  const totalAmount = Math.max(0, subtotal - numDiscount);
  const totalCost = items.reduce((sum, i) => sum + (Number(i.total_cost) || 0), 0);
  const totalProfit = totalAmount - totalCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('A sale must have at least one item.');
      return;
    }

    setIsSaving(true);
    try {
      const updated: Sale = {
        ...sale,
        items,
        subtotal,
        discount: numDiscount,
        total_amount: totalAmount,
        total_cost: totalCost,
        total_profit: totalProfit,
        payment_method: paymentMethod,
        customer_name: customerName.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      await onSave(updated);
      onClose();
    } catch (err: any) {
      console.error('Update sale error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950 p-6 md:p-8 shadow-2xl text-neutral-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-850 pb-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Edit Stall Sale {sale.receipt_no}
            </h3>
            <p className="text-xs text-neutral-400">Modify items, prices, or payment details</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto pr-1 flex-1 space-y-4">
          {/* Items Editor */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
              Sale Items
            </label>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-neutral-850 bg-neutral-900/60"
                >
                  <input
                    type="text"
                    value={item.product_name}
                    onChange={(e) => handleItemChange(idx, 'product_name', e.target.value)}
                    placeholder="Product name"
                    className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-purple-500"
                  />
                  <div className="w-16">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                      placeholder="Qty"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-center text-neutral-200 focus:outline-none"
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      min="0"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(idx, 'unit_price', Number(e.target.value))}
                      placeholder="Price"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-right font-bold text-emerald-400 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="text-neutral-500 hover:text-red-400 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
              Payment Method
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['UPI', 'Cash', 'Card', 'Other'] as PaymentMethod[]).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    paymentMethod === method
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-sm'
                      : 'border-neutral-800 bg-neutral-900 text-neutral-400'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Customer info & Discount */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                Customer Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                Discount (₹)
              </label>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none"
              />
            </div>
          </div>

          {/* Totals Summary Preview */}
          <div className="p-3.5 rounded-2xl border border-neutral-800 bg-neutral-900/60 flex items-center justify-between text-xs">
            <div>
              <span className="text-neutral-400">Total Profit: </span>
              <strong className="text-emerald-400 font-bold">₹{totalProfit}</strong>
            </div>
            <div>
              <span className="text-neutral-400">Total Amount: </span>
              <strong className="text-xl font-black text-white font-mono">₹{totalAmount}</strong>
            </div>
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-3 border-t border-neutral-850 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:bg-neutral-800 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-950 transition-all disabled:opacity-50"
            >
              {isSaving ? 'Saving Changes...' : 'Save Sale Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
