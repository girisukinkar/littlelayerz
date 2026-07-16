import React from 'react';
import type { Filament } from '../../types/filament';
import { Edit2, Trash2 } from 'lucide-react';

interface FilamentTableProps {
  filaments: Filament[];
  onEdit: (filament: Filament) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}

export const FilamentTable: React.FC<FilamentTableProps> = ({
  filaments,
  onEdit,
  onDelete,
  deletingId,
}) => {
  if (filaments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900/30 p-12 text-center backdrop-blur-sm">
        <p className="text-lg font-semibold text-neutral-300">No filaments in inventory</p>
        <p className="mt-1 text-sm text-neutral-500">
          Click the "Add Filament" button to start cataloging your spools.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-950 shadow-xl">
      <table className="w-full border-collapse text-left text-sm text-neutral-300">
        <thead>
          <tr className="border-b border-neutral-800 bg-neutral-900/50 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            <th className="px-4 py-3.5">Filament Name</th>
            <th className="px-4 py-3.5">Color Info</th>
            <th className="px-4 py-3.5">Type</th>
            <th className="px-4 py-3.5">Spool Tag</th>
            <th className="px-4 py-3.5 text-right">Grams Left</th>
            <th className="px-4 py-3.5 text-right">Cost per Kg</th>
            <th className="px-4 py-3.5 text-right">Purchase Price</th>
            <th className="px-4 py-3.5 text-center">Remaining Spool %</th>
            <th className="px-4 py-3.5 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-900">
          {filaments.map((filament) => {
            const isDeleting = deletingId === filament.id;
            // Assume 1000g standard spool size
            const remainingPct = Math.min(100, Math.max(0, (filament.grams_left / 1000) * 100));

            // Select color coding for progress bar
            let progressColor = 'bg-indigo-500';
            if (remainingPct < 15) {
              progressColor = 'bg-red-500 animate-pulse';
            } else if (remainingPct < 35) {
              progressColor = 'bg-amber-500';
            } else if (remainingPct < 65) {
              progressColor = 'bg-emerald-500';
            }

            return (
              <tr
                key={filament.id}
                className="group hover:bg-neutral-900/40 transition-colors"
              >
                {/* Name */}
                <td className="px-4 py-3.5 font-medium text-neutral-200">
                  {filament.name}
                </td>

                {/* Color Badge + Name */}
                <td className="px-4 py-3.5 text-neutral-300">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-4 w-4 rounded-full border border-neutral-700 shadow-inner"
                      style={{ backgroundColor: filament.color_hex }}
                      title={filament.color_hex}
                    />
                    <span className="text-xs text-neutral-400 capitalize">{filament.color_name}</span>
                  </div>
                </td>

                {/* Material Type */}
                <td className="px-4 py-3.5 text-neutral-300 font-medium">
                  <span className="inline-flex items-center rounded-md bg-neutral-900 px-2 py-1 text-xs font-semibold text-neutral-300 ring-1 ring-inset ring-neutral-800">
                    {filament.type}
                  </span>
                </td>

                {/* Spool Tag */}
                <td className="px-4 py-3.5 text-neutral-300">
                  {filament.has_spool ? (
                    <span className="inline-flex items-center rounded-md bg-purple-500/10 px-2.5 py-1 text-xs font-medium text-purple-400 ring-1 ring-inset ring-purple-500/20">
                      With Spool
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-medium text-neutral-400 ring-1 ring-inset ring-neutral-800">
                      Without Spool
                    </span>
                  )}
                </td>

                {/* Grams Left */}
                <td className="px-4 py-3.5 text-right text-neutral-200 font-mono">
                  {filament.grams_left.toLocaleString()}g
                </td>

                {/* Cost per Kg */}
                <td className="px-4 py-3.5 text-right text-neutral-400 font-mono">
                  ₹{filament.cost_per_kg.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>

                {/* Purchase Price */}
                <td className="px-4 py-3.5 text-right text-emerald-400 font-semibold font-mono">
                  ₹{filament.purchase_price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>

                {/* Remaining Spool progress */}
                <td className="px-4 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-2 max-w-[140px] mx-auto">
                    <div className="w-full bg-neutral-900 rounded-full h-1.5 border border-neutral-800/80 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                        style={{ width: `${remainingPct}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono font-bold text-neutral-400 shrink-0 min-w-[32px]">
                      {remainingPct.toFixed(0)}%
                    </span>
                  </div>
                </td>

                {/* Actions */}
                <td className="px-4 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onEdit(filament)}
                      disabled={isDeleting}
                      className="rounded p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-purple-400 disabled:opacity-50 transition-colors"
                      title="Edit Filament"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => filament.id && onDelete(filament.id)}
                      disabled={isDeleting}
                      className="rounded p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-red-400 disabled:opacity-50 transition-colors"
                      title="Delete Filament"
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
