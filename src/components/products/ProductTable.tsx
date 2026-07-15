import React from 'react';
import type { Product } from '../../types/product';
import { calculateProductMetrics } from '../../utils/productCalculations';
import { Edit2, Trash2, Image as ImageIcon } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  onEdit,
  onDelete,
  deletingId,
}) => {
  // Subscribe to settings store to trigger re-renders on settings updates
  useSettingsStore();

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900/30 p-12 text-center backdrop-blur-sm">
        <p className="text-lg font-semibold text-neutral-300">No products found</p>
        <p className="mt-1 text-sm text-neutral-500">
          Try adjusting your search query or add a new product to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-950 shadow-xl">
      <table className="w-full border-collapse text-left text-sm text-neutral-300">
        <thead>
          <tr className="border-b border-neutral-800 bg-neutral-900/50 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            <th className="px-4 py-3.5">Product Name</th>
            <th className="px-4 py-3.5 text-right">Print Time</th>
            <th className="px-4 py-3.5 text-right">Decimal Hrs</th>
            <th className="px-4 py-3.5 text-right">Weight (g)</th>
            <th className="px-4 py-3.5 text-right">Filament Cost</th>
            <th className="px-4 py-3.5 text-right">Power Cost</th>
            <th className="px-4 py-3.5 text-right">Pkg Cost</th>
            <th className="px-4 py-3.5 text-right">Del. Cost</th>
            <th className="px-4 py-3.5 text-right">Total Cost</th>
            <th className="px-4 py-3.5 text-right">Selling Price</th>
            <th className="px-4 py-3.5 text-right">Profit</th>
            <th className="px-4 py-3.5 text-center">Max Pcs/Day</th>
            <th className="px-4 py-3.5 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-900">
          {products.map((rawProduct) => {
            const product = calculateProductMetrics(rawProduct);
            const isDeleting = deletingId === product.id;

            return (
              <tr
                key={product.id}
                className="group hover:bg-neutral-900/40 transition-colors"
              >
                {/* Product Name */}
                <td className="px-4 py-3.5 font-medium text-neutral-200">
                  <div className="flex items-center gap-3">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name} 
                        className="h-8 w-8 rounded-lg object-cover border border-neutral-800 bg-neutral-900 shrink-0"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-lg border border-neutral-800 bg-neutral-900/50 flex items-center justify-center text-neutral-600 shrink-0">
                        <ImageIcon className="h-4 w-4" />
                      </div>
                    )}
                    <span>{product.name}</span>
                  </div>
                </td>
                
                {/* Print Time */}
                <td className="px-4 py-3.5 text-right text-neutral-300 font-mono">
                  {product.print_time}
                </td>
                
                {/* Decimal Hours */}
                <td className="px-4 py-3.5 text-right text-neutral-400 font-mono">
                  {product.decimalHours.toFixed(2)}h
                </td>
                
                {/* Weight */}
                <td className="px-4 py-3.5 text-right text-neutral-300 font-mono">
                  {product.filament_weight}g
                </td>
                
                {/* Filament Cost */}
                <td className="px-4 py-3.5 text-right text-neutral-400 font-mono">
                  ₹{product.filamentCost.toFixed(2)}
                </td>
                
                {/* Electricity Cost */}
                <td className="px-4 py-3.5 text-right text-neutral-400 font-mono">
                  ₹{product.electricityCost.toFixed(2)}
                </td>

                {/* Packaging Cost */}
                <td className="px-4 py-3.5 text-right text-neutral-400 font-mono">
                  ₹{(product.packaging_cost || 0).toFixed(2)}
                </td>

                {/* Delivery Cost */}
                <td className="px-4 py-3.5 text-right text-neutral-400 font-mono">
                  ₹{(product.delivery_cost || 0).toFixed(2)}
                </td>
                
                {/* Total Cost */}
                <td className="px-4 py-3.5 text-right text-neutral-300 font-mono">
                  ₹{product.totalCost.toFixed(2)}
                </td>
                
                {/* Selling Price */}
                <td className="px-4 py-3.5 text-right font-medium text-emerald-400 font-mono">
                  ₹{product.selling_price.toFixed(2)}
                </td>
                
                {/* Profit */}
                <td className="px-4 py-3.5 text-right font-semibold text-purple-400 font-mono">
                  ₹{product.profit.toFixed(2)}
                </td>
                
                {/* Max Pieces Per Day */}
                <td className="px-4 py-3.5 text-center text-amber-400 font-bold font-mono">
                  {product.maxPiecesPerDay}
                </td>
                
                {/* Actions */}
                <td className="px-4 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onEdit(rawProduct)}
                      disabled={isDeleting}
                      className="rounded p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-purple-400 disabled:opacity-50 transition-colors"
                      title="Edit Product"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => product.id && onDelete(product.id)}
                      disabled={isDeleting}
                      className="rounded p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-red-400 disabled:opacity-50 transition-colors"
                      title="Delete Product"
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
