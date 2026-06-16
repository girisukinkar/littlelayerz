import React from 'react';
import type { Order, OrderStatus } from '../../types/order';
import { Edit2, Trash2 } from 'lucide-react';

interface OrderTableProps {
  orders: Order[];
  onEdit: (order: Order) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}

const statusBadges: Record<OrderStatus, string> = {
  Pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Printing: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Ready: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  Delivered: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  Cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
};

export const OrderTable: React.FC<OrderTableProps> = ({
  orders,
  onEdit,
  onDelete,
  deletingId,
}) => {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900/30 p-12 text-center backdrop-blur-sm">
        <p className="text-lg font-semibold text-neutral-300">No orders found</p>
        <p className="mt-1 text-sm text-neutral-500">
          Try adjusting your search queries or add a new customer order.
        </p>
      </div>
    );
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-950 shadow-xl">
      <table className="w-full border-collapse text-left text-sm text-neutral-300">
        <thead>
          <tr className="border-b border-neutral-800 bg-neutral-900/50 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            <th className="px-4 py-3.5">Order ID</th>
            <th className="px-4 py-3.5">Date</th>
            <th className="px-4 py-3.5">Customer</th>
            <th className="px-4 py-3.5">Product</th>
            <th className="px-4 py-3.5 text-right">Qty</th>
            <th className="px-4 py-3.5 text-right">Amount</th>
            <th className="px-4 py-3.5 text-center">Status</th>
            <th className="px-4 py-3.5 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-900">
          {orders.map((order) => {
            const isDeleting = deletingId === order.id;
            const productName = order.products?.name || 'Unknown Product';
            const shortId = order.id ? `#${order.id.slice(0, 8).toUpperCase()}` : '—';

            return (
              <tr
                key={order.id}
                className="group hover:bg-neutral-900/40 transition-colors"
              >
                {/* Order ID */}
                <td 
                  className="px-4 py-3.5 font-mono text-xs text-neutral-400 cursor-help"
                  title={order.id}
                >
                  {shortId}
                </td>

                {/* Date */}
                <td className="px-4 py-3.5 text-neutral-300">
                  {formatDate(order.created_at)}
                </td>

                {/* Customer Details */}
                <td className="px-4 py-3.5">
                  <div className="font-medium text-neutral-200">{order.customer_name}</div>
                  {order.phone && (
                    <div className="text-xs text-neutral-500 font-mono mt-0.5">{order.phone}</div>
                  )}
                </td>

                {/* Product Name */}
                <td className="px-4 py-3.5 text-neutral-300 font-medium">
                  {productName}
                </td>

                {/* Quantity */}
                <td className="px-4 py-3.5 text-right text-neutral-300 font-mono">
                  {order.quantity}
                </td>

                {/* Amount */}
                <td className="px-4 py-3.5 text-right font-semibold text-emerald-400 font-mono">
                  ₹{Number(order.amount).toFixed(2)}
                </td>

                {/* Status Badge */}
                <td className="px-4 py-3.5 text-center">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
                      statusBadges[order.status]
                    }`}
                  >
                    {order.status}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-4 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onEdit(order)}
                      disabled={isDeleting}
                      className="rounded p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-purple-400 disabled:opacity-50 transition-colors"
                      title="Edit Order"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => order.id && onDelete(order.id)}
                      disabled={isDeleting}
                      className="rounded p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-red-400 disabled:opacity-50 transition-colors"
                      title="Delete Order"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
