import React from 'react';
import type { Filament } from '../../types/filament';
import { Database, Scale, DollarSign, Coins } from 'lucide-react';

interface FilamentStatsProps {
  filaments: Filament[];
}

export const FilamentStats: React.FC<FilamentStatsProps> = ({ filaments }) => {
  const totalSpools = filaments.length;
  
  const totalWeightKg = filaments.reduce((sum, f) => sum + f.grams_left, 0) / 1000;
  
  const totalInvestment = filaments.reduce((sum, f) => sum + f.purchase_price, 0);
  
  const avgCostPerKg = totalSpools > 0
    ? filaments.reduce((sum, f) => sum + f.cost_per_kg, 0) / totalSpools
    : 0;

  const stats = [
    {
      label: 'Total Spools',
      value: totalSpools,
      icon: Database,
      color: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-400',
    },
    {
      label: 'Total Weight Left',
      value: `${totalWeightKg.toFixed(2)} kg`,
      icon: Scale,
      color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400',
    },
    {
      label: 'Total Investment',
      value: `₹${totalInvestment.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400',
    },
    {
      label: 'Avg Cost per Kg',
      value: `₹${avgCostPerKg.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
      icon: Coins,
      color: 'from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-400',
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
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  {stat.label}
                </p>
                <p className="mt-2 text-2xl font-bold text-neutral-100 font-mono">
                  {stat.value}
                </p>
              </div>
              <div className="rounded-lg bg-neutral-900/50 p-2.5 border border-neutral-800">
                <IconComponent className="h-6 w-6" />
              </div>
            </div>
            {/* Glow effect */}
            <div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-current opacity-10 blur-xl"></div>
          </div>
        );
      })}
    </div>
  );
};
