import React, { useState, useMemo } from 'react';
import type { Sale, DateFilterRange, PaymentMethod } from '../../types/sale';
import { 
  Search, 
  Trash2, 
  Edit3, 
  Receipt, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  Smartphone, 
  Banknote, 
  CreditCard
} from 'lucide-react';


interface SaleTableProps {
  sales: Sale[];
  activeRange: DateFilterRange;
  onRangeChange: (range: DateFilterRange) => void;
  customStartDate?: string;
  customEndDate?: string;
  onCustomStartChange?: (date: string) => void;
  onCustomEndChange?: (date: string) => void;
  onViewReceipt: (sale: Sale) => void;
  onEditSale: (sale: Sale) => void;
  onDeleteSale: (id: string) => void;
  onClearAllSales?: () => void;
}

export const SaleTable: React.FC<SaleTableProps> = ({
  sales,
  activeRange,
  onRangeChange,
  customStartDate,
  customEndDate,
  onCustomStartChange,
  onCustomEndChange,
  onViewReceipt,
  onEditSale,
  onDeleteSale,
  onClearAllSales,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'All' | PaymentMethod>('All');
  const [expandedSaleIds, setExpandedSaleIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedSaleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filter sales
  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      // 1. Payment filter
      if (paymentFilter !== 'All' && sale.payment_method !== paymentFilter) {
        return false;
      }

      // 2. Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();

      const matchesRef = sale.receipt_no.toLowerCase().includes(q);
      const matchesCustomer = sale.customer_name?.toLowerCase().includes(q) || false;
      const matchesPhone = sale.customer_phone?.toLowerCase().includes(q) || false;
      const matchesItems = sale.items?.some((i) => i.product_name.toLowerCase().includes(q)) || false;

      return matchesRef || matchesCustomer || matchesPhone || matchesItems;
    });
  }, [sales, paymentFilter, searchQuery]);

  // Export to CSV
  const handleExportCSV = () => {
    if (sales.length === 0) {
      alert('No sales data to export.');
      return;
    }

    const headers = [
      'Receipt No',
      'Date & Time',
      'Customer Name',
      'Customer Phone',
      'Items Purchased',
      'Total Quantity',
      'Subtotal (INR)',
      'Discount (INR)',
      'Grand Total (INR)',
      'Making Cost (INR)',
      'Net Profit (INR)',
      'Payment Method',
      'Notes',
    ];

    const rows = sales.map((sale) => {
      const itemsStr = (sale.items || [])
        .map((i) => `${i.product_name} (x${i.quantity} @ Rs.${i.unit_price})`)
        .join('; ');
      const totalQty = (sale.items || []).reduce((sum, i) => sum + i.quantity, 0);
      const formattedDate = sale.created_at
        ? new Date(sale.created_at).toISOString()
        : new Date().toISOString();

      return [
        `"${sale.receipt_no}"`,
        `"${formattedDate}"`,
        `"${sale.customer_name || ''}"`,
        `"${sale.customer_phone || ''}"`,
        `"${itemsStr.replace(/"/g, '""')}"`,
        totalQty,
        sale.subtotal || sale.total_amount,
        sale.discount || 0,
        sale.total_amount,
        sale.total_cost || 0,
        sale.total_profit || 0,
        `"${sale.payment_method}"`,
        `"${(sale.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Dexter3D_Stall_Sales_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 shadow-2xl">
      {/* Top Filter Bar & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-900 pb-5 mb-5">
        {/* Date Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-neutral-400 mr-1 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> Date:
          </span>
          {(['today', 'yesterday', 'week', 'month', 'all', 'custom'] as DateFilterRange[]).map(
            (range) => (
              <button
                key={range}
                type="button"
                onClick={() => onRangeChange(range)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeRange === range
                    ? 'border border-purple-500/40 bg-purple-500/15 text-purple-300 shadow-sm shadow-purple-500/20'
                    : 'border border-neutral-850 bg-neutral-900/60 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                }`}
              >
                {range === 'today'
                  ? "Today's Stall"
                  : range === 'yesterday'
                  ? 'Yesterday'
                  : range === 'week'
                  ? 'Last 7 Days'
                  : range === 'month'
                  ? 'This Month'
                  : range === 'all'
                  ? 'All History'
                  : 'Custom Range'}
              </button>
            )
          )}
        </div>

        {/* Export & Clear Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-800 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-200 text-xs font-semibold transition-all hover:scale-[1.02]"
          >
            <Download className="h-3.5 w-3.5 text-purple-400" />
            Export CSV / Excel
          </button>
          {onClearAllSales && sales.length > 0 && (
            <button
              type="button"
              onClick={onClearAllSales}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-semibold transition-all"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-400" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Custom Date Pickers (if active) */}
      {activeRange === 'custom' && (
        <div className="mb-5 flex flex-wrap items-center gap-3 p-3 rounded-xl border border-neutral-850 bg-neutral-900/40 text-xs">
          <span className="text-neutral-400 font-semibold">From:</span>
          <input
            type="date"
            value={customStartDate || ''}
            onChange={(e) => onCustomStartChange?.(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-neutral-200 focus:outline-none focus:border-purple-500"
          />
          <span className="text-neutral-400 font-semibold">To:</span>
          <input
            type="date"
            value={customEndDate || ''}
            onChange={(e) => onCustomEndChange?.(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-neutral-200 focus:outline-none focus:border-purple-500"
          />
        </div>
      )}

      {/* Search & Payment Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-5">
        {/* Search Input */}
        <div className="relative w-full sm:max-w-sm flex items-center bg-neutral-900/60 border border-neutral-850 rounded-xl px-3 py-2">
          <Search className="h-4 w-4 text-neutral-500 shrink-0 mr-2" />
          <input
            type="text"
            placeholder="Search by product, customer, phone, receipt ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs text-neutral-500 hover:text-neutral-300 ml-1"
            >
              Clear
            </button>
          )}
        </div>

        {/* Payment Filter Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(['All', 'UPI', 'Cash', 'Card'] as const).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setPaymentFilter(method)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                paymentFilter === method
                  ? 'bg-neutral-800 text-white border border-neutral-700'
                  : 'text-neutral-400 hover:text-neutral-200 border border-transparent'
              }`}
            >
              {method}
            </button>
          ))}
        </div>
      </div>

      {/* Sales List Table */}
      {filteredSales.length === 0 ? (
        <div className="py-16 text-center text-neutral-500 space-y-2">
          <Receipt className="h-10 w-10 mx-auto text-neutral-600 mb-2" />
          <div className="text-sm font-semibold text-neutral-400">No stall sales recorded yet</div>
          <p className="text-xs max-w-sm mx-auto">
            Use the form above to record your market items sold, calculate instant profit, and generate rough receipts.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-900 text-neutral-400 uppercase font-semibold">
                <th className="py-3 px-3">Receipt / Time</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Items Sold</th>
                <th className="py-3 px-2 text-center">Payment</th>
                <th className="py-3 px-3 text-right">Amount (₹)</th>
                <th className="py-3 px-3 text-right">Profit (₹)</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900/60">
              {filteredSales.map((sale) => {
                const isExpanded = sale.id ? expandedSaleIds.has(sale.id) : false;
                const formattedDate = sale.created_at
                  ? new Date(sale.created_at).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : '';

                const totalItemsCount = (sale.items || []).reduce((sum, i) => sum + i.quantity, 0);

                return (
                  <React.Fragment key={sale.id || sale.receipt_no}>
                    <tr className="hover:bg-neutral-900/40 transition-colors group">
                      {/* Receipt & Timestamp */}
                      <td className="py-3.5 px-3">
                        <div className="font-mono font-bold text-neutral-200 group-hover:text-purple-300">
                          {sale.receipt_no}
                        </div>
                        <div className="text-[11px] text-neutral-500">{formattedDate}</div>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-3">
                        {sale.customer_name || sale.customer_phone ? (
                          <div>
                            <div className="font-medium text-neutral-200">{sale.customer_name || 'Walk-in'}</div>
                            {sale.customer_phone && (
                              <div className="text-[11px] text-neutral-500">{sale.customer_phone}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-500 italic">Walk-in Buyer</span>
                        )}
                      </td>

                      {/* Items Preview */}
                      <td className="py-3.5 px-3 max-w-xs">
                        <button
                          type="button"
                          onClick={() => sale.id && toggleExpand(sale.id)}
                          className="flex items-center gap-1.5 text-left text-neutral-200 hover:text-purple-300 font-medium"
                        >
                          <span className="truncate">
                            {(sale.items || []).map((i) => `${i.product_name} (x${i.quantity})`).join(', ') || 'Custom 3D Item'}
                          </span>
                          <span className="text-neutral-500 shrink-0">
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </span>
                        </button>
                        <div className="text-[11px] text-neutral-500 mt-0.5">
                          {totalItemsCount} total unit{totalItemsCount !== 1 ? 's' : ''}
                        </div>
                      </td>

                      {/* Payment Method */}
                      <td className="py-3.5 px-2 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            sale.payment_method === 'UPI'
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                              : sale.payment_method === 'Cash'
                              ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                              : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400'
                          }`}
                        >
                          {sale.payment_method === 'UPI' ? (
                            <Smartphone className="h-3 w-3" />
                          ) : sale.payment_method === 'Cash' ? (
                            <Banknote className="h-3 w-3" />
                          ) : (
                            <CreditCard className="h-3 w-3" />
                          )}
                          {sale.payment_method}
                        </span>
                      </td>

                      {/* Grand Total */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="font-mono font-bold text-sm text-white">
                          ₹{sale.total_amount}
                        </div>
                        {sale.discount > 0 && (
                          <div className="text-[10px] text-red-400">
                            disc -₹{sale.discount}
                          </div>
                        )}
                      </td>

                      {/* Profit */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="font-mono font-bold text-sm text-emerald-400">
                          ₹{sale.total_profit}
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          {sale.total_amount > 0 ? Math.round(((sale.total_profit || 0) / sale.total_amount) * 100) : 0}% margin
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onViewReceipt(sale)}
                            title="View Receipt / WhatsApp bill"
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-purple-300 hover:bg-purple-500/10 transition-all"
                          >
                            <Receipt className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditSale(sale)}
                            title="Edit Sale"
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-all"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (sale.id && window.confirm(`Delete receipt ${sale.receipt_no}?`)) {
                                onDeleteSale(sale.id);
                              }
                            }}
                            title="Delete"
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Items Breakdown */}
                    {isExpanded && (
                      <tr className="bg-neutral-900/30">
                        <td colSpan={7} className="py-3 px-6">
                          <div className="rounded-xl border border-neutral-850 bg-neutral-950/70 p-3.5 text-xs space-y-2">
                            <div className="font-semibold text-neutral-300 flex items-center justify-between">
                              <span>Items in Receipt {sale.receipt_no}:</span>
                              {sale.notes && (
                                <span className="text-neutral-400 font-normal">
                                  Notes: <em>{sale.notes}</em>
                                </span>
                              )}
                            </div>

                            <div className="divide-y divide-neutral-900">
                              {(sale.items || []).map((item, idx) => (
                                <div
                                  key={item.id || idx}
                                  className="py-1.5 flex items-center justify-between"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-neutral-500 font-mono">{idx + 1}.</span>
                                    <span className="font-medium text-neutral-200">
                                      {item.product_name}
                                    </span>
                                    <span className="text-neutral-400">
                                      ({item.quantity} pcs @ ₹{item.unit_price}/pc)
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4 text-right">
                                    {item.cost_price && (
                                      <span className="text-neutral-500">
                                        Cost: ₹{item.cost_price * item.quantity}
                                      </span>
                                    )}
                                    <span className="font-bold text-white">
                                      ₹{item.total_price}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
