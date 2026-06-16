import React, { useState, useEffect } from 'react';
import type { Order, OrderStatus } from '../../types/order';
import type { Product } from '../../types/product';
import { X, ShoppingCart, Calculator } from 'lucide-react';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (order: Omit<Order, 'id' | 'created_at' | 'products'> & { id?: string }) => Promise<void>;
  order?: Order | null; // If passed, we are in edit mode
  products: Product[];
  isSubmitting: boolean;
}

const statusOptions: OrderStatus[] = ['Pending', 'Printing', 'Ready', 'Delivered', 'Cancelled'];

export const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  order,
  products,
  isSubmitting,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [status, setStatus] = useState<OrderStatus>('Pending');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Pre-fill form if editing
  useEffect(() => {
    if (order) {
      setCustomerName(order.customer_name);
      setPhone(order.phone || '');
      setAddress(order.address || '');
      setProductId(order.product_id);
      setQuantity(order.quantity.toString());
      setStatus(order.status);
      setNotes(order.notes || '');
    } else {
      setCustomerName('');
      setPhone('');
      setAddress('');
      setProductId('');
      setQuantity('1');
      setStatus('Pending');
      setNotes('');
    }
    setErrorMsg('');
  }, [order, isOpen]);

  if (!isOpen) return null;

  // Find the selected product to compute live amount
  const selectedProduct = products.find((p) => p.id === productId);
  const qtyNum = parseInt(quantity, 10) || 0;
  const calculatedAmount = selectedProduct ? selectedProduct.selling_price * qtyNum : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!customerName.trim()) {
      setErrorMsg('Customer name is required.');
      return;
    }
    if (!productId) {
      setErrorMsg('Please select a product.');
      return;
    }
    if (qtyNum <= 0) {
      setErrorMsg('Quantity must be greater than 0.');
      return;
    }

    try {
      await onSubmit({
        ...(order?.id ? { id: order.id } : {}),
        customer_name: customerName.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        product_id: productId,
        quantity: qtyNum,
        amount: calculatedAmount,
        status,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while saving the order.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-900 pb-4">
          <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-purple-400" />
            {order ? 'Edit Order' : 'Add New Order'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mt-4 rounded-lg bg-red-950/50 border border-red-500/30 p-3 text-sm text-red-400">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column - Form Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400">Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                  placeholder="e.g., John Doe"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                    placeholder="e.g., 9876543210"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-400">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400">Product</label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                  required
                >
                  <option value="">Select a Product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (₹{p.selling_price})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status input - only available in Edit mode or defaults to Pending */}
              {order ? (
                <div>
                  <label className="block text-sm font-medium text-neutral-400">Order Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as OrderStatus)}
                    className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            {/* Right Column - Calculations Preview and Address / Notes */}
            <div className="space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400">Shipping Address</label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                    placeholder="Customer address details..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-400">Notes / Instructions</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                    placeholder="Extra printing details..."
                  />
                </div>
              </div>

              {/* Live pricing block */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/20 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 border-b border-neutral-800 pb-2 mb-3">
                  Pricing Calculator
                </h3>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Unit Price:</span>
                    <span className="font-mono text-neutral-300">
                      {selectedProduct ? `₹${selectedProduct.selling_price.toFixed(2)}` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Quantity:</span>
                    <span className="font-mono text-neutral-300">{qtyNum}</span>
                  </div>
                  <div className="flex justify-between border-t border-neutral-900 pt-2 font-bold text-emerald-400">
                    <span>Total Amount:</span>
                    <span className="font-mono text-lg flex items-center gap-1">
                      <Calculator className="h-4 w-4" />
                      ₹{calculatedAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 border-t border-neutral-900 pt-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !productId}
              className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow hover:from-purple-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'Saving...' : order ? 'Save Changes' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
