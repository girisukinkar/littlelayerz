import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GstInvoiceRecord } from '../types/gst';
import { gstInvoiceService } from '../services/gstInvoiceService';
import { formatIndianCurrency } from '../utils/gstCalculations';
import {
  TrendingUp,
  DollarSign,
  Receipt,
  Clock,
  FileText,
  Calendar,
  Plus,
  Users,
  Package,
  ChevronRight,
} from 'lucide-react';

type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'all';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<GstInvoiceRecord[]>([]);
  const [dateRange, setDateRange] = useState<DateRangePreset>('this_month');

  useEffect(() => {
    async function loadData() {
      try {
        const data = await gstInvoiceService.getInvoices();
        setInvoices(data);
      } catch (err) {
        console.error(err);
      }
    }
    loadData();
  }, []);

  // Filter invoices based on date range preset
  const filteredInvoices = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return invoices.filter((inv) => {
      const invDate = new Date(inv.invoice_date);

      if (dateRange === 'today') {
        return inv.invoice_date === todayStr;
      }

      if (dateRange === 'yesterday') {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        return inv.invoice_date === yesterday.toISOString().slice(0, 10);
      }

      if (dateRange === 'this_week') {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        return invDate >= weekStart;
      }

      if (dateRange === 'this_month') {
        return (
          invDate.getFullYear() === now.getFullYear() &&
          invDate.getMonth() === now.getMonth()
        );
      }

      if (dateRange === 'last_month') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return (
          invDate.getFullYear() === lastMonth.getFullYear() &&
          invDate.getMonth() === lastMonth.getMonth()
        );
      }

      if (dateRange === 'this_year') {
        return invDate.getFullYear() === now.getFullYear();
      }

      return true; // 'all'
    });
  }, [invoices, dateRange]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();

    let todaysSales = 0;
    let thisMonthSales = 0;
    let totalSales = 0;
    let totalGst = 0;
    let totalDiscounts = 0;
    let pendingPayments = 0;

    invoices.forEach((inv) => {
      const invDate = new Date(inv.invoice_date);
      if (inv.invoice_date === todayStr) {
        todaysSales += inv.grand_total;
      }
      if (invDate.getFullYear() === thisYear && invDate.getMonth() === thisMonth) {
        thisMonthSales += inv.grand_total;
      }
      totalSales += inv.grand_total;
      totalGst += inv.total_gst;
      totalDiscounts += inv.item_discount_total + inv.invoice_discount_amount;
      pendingPayments += inv.balance_due;
    });

    const filteredTotalSales = filteredInvoices.reduce((sum, inv) => sum + inv.grand_total, 0);
    const filteredTotalGst = filteredInvoices.reduce((sum, inv) => sum + inv.total_gst, 0);
    const filteredPending = filteredInvoices.reduce((sum, inv) => sum + inv.balance_due, 0);

    return {
      todaysSales,
      thisMonthSales,
      totalSales,
      totalGst,
      totalDiscounts,
      pendingPayments,
      totalInvoices: invoices.length,
      filteredTotalSales,
      filteredTotalGst,
      filteredPending,
      filteredCount: filteredInvoices.length,
    };
  }, [invoices, filteredInvoices]);

  // Top Products Analytics
  const topProducts = useMemo(() => {
    const productMap = new Map<string, { name: string; units: number; revenue: number }>();

    filteredInvoices.forEach((inv) => {
      (inv.items || []).forEach((it) => {
        const name = it.product_name_snapshot || 'Custom Item';
        const current = productMap.get(name) || { name, units: 0, revenue: 0 };
        current.units += it.quantity;
        current.revenue += it.line_total;
        productMap.set(name, current);
      });
    });

    return Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredInvoices]);

  // Top Customers Analytics
  const topCustomers = useMemo(() => {
    const custMap = new Map<string, { name: string; orders: number; totalSpent: number }>();

    filteredInvoices.forEach((inv) => {
      const name = inv.customer_snapshot?.name || 'Cash Customer';
      const current = custMap.get(name) || { name, orders: 0, totalSpent: 0 };
      current.orders += 1;
      current.totalSpent += inv.grand_total;
      custMap.set(name, current);
    });

    return Array.from(custMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);
  }, [filteredInvoices]);

  // Recent 5 Invoices
  const recentInvoices = useMemo(() => {
    return [...invoices]
      .sort((a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime())
      .slice(0, 5);
  }, [invoices]);

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-8 md:px-8 text-neutral-100 selection:bg-purple-500/30 selection:text-purple-200">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Dashboard Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-900 pb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-neutral-50 bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Sales & Tax Dashboard
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Real-time revenue metrics, GST tax collections, and business growth overview
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/invoices/new')}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/20 hover:from-purple-500 hover:to-indigo-500 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>New Invoice</span>
            </button>
          </div>
        </header>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Today</span>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-3">
              <p className="text-lg font-black font-mono text-neutral-100">
                {formatIndianCurrency(metrics.todaysSales)}
              </p>
              <span className="text-[10px] text-neutral-500">Day revenue</span>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">This Month</span>
              <Calendar className="h-4 w-4 text-purple-400" />
            </div>
            <div className="mt-3">
              <p className="text-lg font-black font-mono text-purple-300">
                {formatIndianCurrency(metrics.thisMonthSales)}
              </p>
              <span className="text-[10px] text-neutral-500">Current month</span>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Total Sales</span>
              <DollarSign className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="mt-3">
              <p className="text-lg font-black font-mono text-neutral-100">
                {formatIndianCurrency(metrics.totalSales)}
              </p>
              <span className="text-[10px] text-neutral-500">Lifetime revenue</span>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Total GST</span>
              <Receipt className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="mt-3">
              <p className="text-lg font-black font-mono text-cyan-300">
                {formatIndianCurrency(metrics.totalGst)}
              </p>
              <span className="text-[10px] text-neutral-500">Tax collected</span>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Pending</span>
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mt-3">
              <p className="text-lg font-black font-mono text-amber-400">
                {formatIndianCurrency(metrics.pendingPayments)}
              </p>
              <span className="text-[10px] text-neutral-500">Balance due</span>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Invoices</span>
              <FileText className="h-4 w-4 text-neutral-400" />
            </div>
            <div className="mt-3">
              <p className="text-lg font-black font-mono text-neutral-100">{metrics.totalInvoices}</p>
              <span className="text-[10px] text-neutral-500">Total records</span>
            </div>
          </div>
        </div>

        {/* Date Filter & Overview Section */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
            <div>
              <h2 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-400" />
                Sales Performance Filter
              </h2>
              <p className="text-xs text-neutral-500">
                Filtered Revenue: <b className="text-purple-300 font-mono">{formatIndianCurrency(metrics.filteredTotalSales)}</b> across <b className="text-neutral-300 font-mono">{metrics.filteredCount}</b> invoices
              </p>
            </div>

            {/* Date Range Selector */}
            <div className="flex items-center gap-1.5 bg-neutral-950 p-1 rounded-xl border border-neutral-800 overflow-x-auto max-w-full">
              {[
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'this_week', label: 'This Week' },
                { id: 'this_month', label: 'This Month' },
                { id: 'last_month', label: 'Last Month' },
                { id: 'this_year', label: 'This Year' },
                { id: 'all', label: 'All Time' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setDateRange(p.id as DateRangePreset)}
                  className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all shrink-0 ${
                    dateRange === p.id
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Metric Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-neutral-800/80 bg-neutral-950 p-4 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Taxable Sales</span>
              <p className="text-base font-black font-mono text-neutral-200">
                {formatIndianCurrency(filteredInvoices.reduce((s, i) => s + i.taxable_amount, 0))}
              </p>
              <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full w-full rounded-full" />
              </div>
            </div>

            <div className="rounded-xl border border-neutral-800/80 bg-neutral-950 p-4 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">GST Collected</span>
              <p className="text-base font-black font-mono text-cyan-400">
                {formatIndianCurrency(metrics.filteredTotalGst)}
              </p>
              <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-cyan-500 h-full w-3/4 rounded-full" />
              </div>
            </div>

            <div className="rounded-xl border border-neutral-800/80 bg-neutral-950 p-4 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Outstanding Balance</span>
              <p className="text-base font-black font-mono text-amber-400">
                {formatIndianCurrency(metrics.filteredPending)}
              </p>
              <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full w-1/3 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Analytics: Top Products & Top Customers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Products */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Best-Selling Products
              </h3>
              <button onClick={() => navigate('/products')} className="text-[11px] text-neutral-400 hover:text-purple-300">
                View All
              </button>
            </div>

            {topProducts.length === 0 ? (
              <p className="text-xs text-neutral-500 text-center py-6 italic">No product sales in selected period.</p>
            ) : (
              <div className="divide-y divide-neutral-800/60">
                {topProducts.map((p, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-neutral-100">{p.name}</p>
                      <p className="text-[10px] text-neutral-500 font-mono">{p.units} units sold</p>
                    </div>
                    <span className="font-mono font-bold text-purple-300">
                      {formatIndianCurrency(p.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Customers */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Top High-Value Buyers
              </h3>
              <button onClick={() => navigate('/customers')} className="text-[11px] text-neutral-400 hover:text-purple-300">
                View All
              </button>
            </div>

            {topCustomers.length === 0 ? (
              <p className="text-xs text-neutral-500 text-center py-6 italic">No customer orders in selected period.</p>
            ) : (
              <div className="divide-y divide-neutral-800/60">
                {topCustomers.map((c, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-neutral-100">{c.name}</p>
                      <p className="text-[10px] text-neutral-500 font-mono">{c.orders} invoice(s)</p>
                    </div>
                    <span className="font-mono font-bold text-neutral-100">
                      {formatIndianCurrency(c.totalSpent)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Invoices Widget */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Recent Invoices
            </h3>
            <button onClick={() => navigate('/invoices')} className="text-[11px] text-purple-400 hover:underline flex items-center gap-1">
              <span>View All Invoices</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="text-[10px] font-bold text-neutral-500 uppercase border-b border-neutral-800">
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {recentInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                    className="hover:bg-neutral-900/70 transition-all cursor-pointer"
                  >
                    <td className="py-3 px-3 font-mono font-bold text-purple-400">{inv.invoice_number}</td>
                    <td className="py-3 px-3 font-mono text-neutral-400">{inv.invoice_date}</td>
                    <td className="py-3 px-3 font-medium text-neutral-200">
                      {inv.customer_snapshot?.name || 'Customer'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-neutral-100">
                      {formatIndianCurrency(inv.grand_total)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.payment_status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : inv.payment_status === 'partial'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {inv.payment_status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-purple-400 font-bold hover:underline">
                      View
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
