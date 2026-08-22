import React from 'react';
import type { SalesSummaryMetrics } from '../../types/sale';
import { 
  IndianRupee, 
  TrendingUp, 
  ShoppingBag, 
  Smartphone, 
  Banknote, 
  CreditCard, 
  Receipt
} from 'lucide-react';


interface SaleStatsProps {
  metrics: SalesSummaryMetrics;
  periodLabel: string;
}

export const SaleStats: React.FC<SaleStatsProps> = ({ metrics, periodLabel }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Total Stall Revenue Card */}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-800/80 bg-gradient-to-b from-neutral-900/90 to-neutral-950/90 p-5 shadow-xl backdrop-blur-md transition-all hover:border-purple-500/40">
        <div className="absolute top-0 right-0 h-24 w-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Revenue ({periodLabel})
          </span>
          <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20 shadow-inner">
            <IndianRupee className="h-4 w-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black tracking-tight text-white">
            ₹{metrics.totalRevenue.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-neutral-400">
          <span>{metrics.totalTransactions} sale{metrics.totalTransactions !== 1 ? 's' : ''}</span>
          <span className="text-purple-400 font-medium">Avg: ₹{metrics.averageOrderValue}/bill</span>
        </div>
      </div>

      {/* 2. Total Net Profit Card */}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-800/80 bg-gradient-to-b from-neutral-900/90 to-neutral-950/90 p-5 shadow-xl backdrop-blur-md transition-all hover:border-emerald-500/40">
        <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Net Profit
          </span>
          <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-inner">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black tracking-tight text-emerald-400">
            ₹{metrics.totalProfit.toLocaleString('en-IN')}
          </span>
          {metrics.profitMarginPercent > 0 && (
            <span className="text-xs font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-800/50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
              {metrics.profitMarginPercent}% margin
            </span>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-neutral-400">
          <span>Making Cost: ₹{metrics.totalCost.toLocaleString('en-IN')}</span>
          <span className="text-emerald-400 font-medium">Gross Return</span>
        </div>
      </div>

      {/* 3. Items Sold Count Card */}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-800/80 bg-gradient-to-b from-neutral-900/90 to-neutral-950/90 p-5 shadow-xl backdrop-blur-md transition-all hover:border-blue-500/40">
        <div className="absolute top-0 right-0 h-24 w-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Items / Units Sold
          </span>
          <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-inner">
            <ShoppingBag className="h-4 w-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black tracking-tight text-blue-400">
            {metrics.totalUnitsSold}
          </span>
          <span className="text-xs text-neutral-400">units total</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-neutral-400">
          <span>{metrics.totalTransactions} distinct bills</span>
          <span className="text-blue-400 font-medium">
            {metrics.totalTransactions > 0 
              ? (metrics.totalUnitsSold / metrics.totalTransactions).toFixed(1) 
              : 0} items/order
          </span>
        </div>
      </div>

      {/* 4. Payment Modes Breakdown Card */}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-800/80 bg-gradient-to-b from-neutral-900/90 to-neutral-950/90 p-5 shadow-xl backdrop-blur-md transition-all hover:border-amber-500/40">
        <div className="absolute top-0 right-0 h-24 w-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Payment Split
          </span>
          <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-inner">
            <Receipt className="h-4 w-4" />
          </div>
        </div>
        
        <div className="space-y-1.5 mt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <Smartphone className="h-3.5 w-3.5" /> UPI / QR
            </span>
            <span className="font-bold text-neutral-200">
              ₹{metrics.upiRevenue.toLocaleString('en-IN')} <span className="text-neutral-500 font-normal">({metrics.upiCount})</span>
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-amber-400 font-medium">
              <Banknote className="h-3.5 w-3.5" /> Cash
            </span>
            <span className="font-bold text-neutral-200">
              ₹{metrics.cashRevenue.toLocaleString('en-IN')} <span className="text-neutral-500 font-normal">({metrics.cashCount})</span>
            </span>
          </div>
          {(metrics.cardRevenue > 0 || metrics.otherRevenue > 0) && (
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-indigo-400 font-medium">
                <CreditCard className="h-3.5 w-3.5" /> Card / Other
              </span>
              <span className="font-bold text-neutral-200">
                ₹{(metrics.cardRevenue + metrics.otherRevenue).toLocaleString('en-IN')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
