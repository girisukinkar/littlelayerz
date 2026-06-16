import React from 'react';
import type { Product } from '../../types/product';
import { calculateProductMetrics } from '../../utils/productCalculations';
import { formatHoursToPrintTime } from '../../utils/printTimeParser';
import { Package, DollarSign, TrendingUp, Clock } from 'lucide-react';

interface ProductStatsProps {
  products: Product[];
}

export const ProductStats: React.FC<ProductStatsProps> = ({ products }) => {
  const calculatedProducts = products.map(calculateProductMetrics);
  const totalProducts = products.length;

  const totalRevenue = calculatedProducts.reduce((sum, p) => sum + p.selling_price, 0);
  
  const avgProfit = totalProducts > 0 
    ? calculatedProducts.reduce((sum, p) => sum + p.profit, 0) / totalProducts 
    : 0;

  const avgHours = totalProducts > 0 
    ? calculatedProducts.reduce((sum, p) => sum + p.decimalHours, 0) / totalProducts 
    : 0;

  const stats = [
    {
      label: 'Total Products',
      value: totalProducts,
      icon: Package,
      color: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-400',
    },
    {
      label: 'Total Revenue Potential',
      value: `₹${totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400',
    },
    {
      label: 'Average Profit',
      value: `₹${avgProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: 'from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-400',
    },
    {
      label: 'Average Print Time',
      value: formatHoursToPrintTime(avgHours),
      icon: Clock,
      color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, idx) => {
        const IconComponent = stat.icon;
        return (
          <div
            key={idx}
            className={`relative overflow-hidden rounded-xl border bg-gradient-to-br p-5 shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-[1.02] ${stat.color}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-400 uppercase tracking-wider">
                  {stat.label}
                </p>
                <p className="mt-2 text-2xl font-bold text-neutral-100">
                  {stat.value}
                </p>
              </div>
              <div className="rounded-lg bg-neutral-900/50 p-2.5 border border-neutral-800">
                <IconComponent className="h-6 w-6" />
              </div>
            </div>
            {/* Ambient background glow */}
            <div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-current opacity-10 blur-xl"></div>
          </div>
        );
      })}
    </div>
  );
};
