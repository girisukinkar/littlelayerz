import React, { useState } from 'react';
import type { Filament } from '../../types/filament';
import { Edit2, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

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
  const [sortField, setSortField] = useState<keyof Filament | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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

  const handleSort = (field: keyof Filament) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedFilaments = [...filaments].sort((a, b) => {
    if (!sortField) return 0;

    const valA = a[sortField];
    const valB = b[sortField];

    if (valA === undefined || valA === null) return 1;
    if (valB === undefined || valB === null) return -1;

    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortOrder === 'asc'
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    }

    if (typeof valA === 'boolean' && typeof valB === 'boolean') {
      return sortOrder === 'asc'
        ? (valA === valB ? 0 : valA ? 1 : -1)
        : (valA === valB ? 0 : valA ? -1 : 1);
    }

    // Numbers
    return sortOrder === 'asc'
      ? (valA as number) - (valB as number)
      : (valB as number) - (valA as number);
  });

  const renderSortableHeader = (label: string, field: keyof Filament, alignClass = "") => {
    const isSorted = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className={`px-4 py-3.5 cursor-pointer hover:bg-neutral-900/60 transition-colors select-none group text-xs font-semibold uppercase tracking-wider text-neutral-400 ${alignClass}`}
      >
        <div className={`flex items-center gap-1 ${alignClass.includes('text-right') ? 'justify-end' : ''} ${alignClass.includes('text-center') ? 'justify-center' : ''}`}>
          <span>{label}</span>
          {isSorted ? (
            sortOrder === 'asc' ? (
              <ArrowUp className="h-3.5 w-3.5 text-purple-400 shrink-0" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5 text-purple-400 shrink-0" />
            )
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5 text-neutral-600 group-hover:text-neutral-400 transition-colors shrink-0" />
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-950 shadow-xl">
      <table className="w-full border-collapse text-left text-sm text-neutral-300">
        <thead>
          <tr className="border-b border-neutral-800 bg-neutral-900/50">
            {renderSortableHeader('Filament Name', 'name')}
            {renderSortableHeader('Color Info', 'color_name')}
            {renderSortableHeader('Type', 'type')}
            {renderSortableHeader('Spool Tag', 'has_spool')}
            {renderSortableHeader('Grams Left', 'grams_left', 'text-right')}
            {renderSortableHeader('Cost per Kg', 'cost_per_kg', 'text-right')}
            {renderSortableHeader('Cost per Gram', 'cost_per_kg', 'text-right')}
            {renderSortableHeader('Purchase Price', 'purchase_price', 'text-right')}
            <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-neutral-400">Remaining Spool %</th>
            <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-neutral-400">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-900">
          {sortedFilaments.map((filament) => {
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

                {/* Cost per Gram */}
                <td className="px-4 py-3.5 text-right text-neutral-400 font-mono">
                  ₹{(filament.cost_per_kg / 1000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
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
