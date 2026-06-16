import React, { useState, useEffect } from 'react';
import type { Product } from '../../types/product';
import { isValidPrintTime, parsePrintTimeToHours } from '../../utils/printTimeParser';
import { X, Calculator, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (product: Omit<Product, 'id' | 'created_at'> & { id?: string }) => Promise<void>;
  product?: Product | null; // If passed, we are in edit mode
  isSubmitting: boolean;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  product,
  isSubmitting,
}) => {
  const [name, setName] = useState('');
  const [printTime, setPrintTime] = useState('');
  const [filamentWeight, setFilamentWeight] = useState('');
  const [costPerKg, setCostPerKg] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Pre-fill form if editing
  useEffect(() => {
    if (product) {
      setName(product.name);
      setPrintTime(product.print_time);
      setFilamentWeight(product.filament_weight.toString());
      setCostPerKg(product.cost_per_kg.toString());
      setSellingPrice(product.selling_price.toString());
      setImageUrl(product.image_url || '');
    } else {
      setName('');
      setPrintTime('');
      setFilamentWeight('');
      setCostPerKg('');
      setSellingPrice('');
      setImageUrl('');
    }
    setErrorMsg('');
  }, [product, isOpen]);

  if (!isOpen) return null;

  // Live calculations
  const rawWeight = parseFloat(filamentWeight) || 0;
  const rawCostPerKg = parseFloat(costPerKg) || 0;
  const rawSellingPrice = parseFloat(sellingPrice) || 0;
  const isTimeValid = isValidPrintTime(printTime);

  const decimalHours = isTimeValid ? parsePrintTimeToHours(printTime) : 0;
  const electricityCost = isTimeValid ? decimalHours * 0.08 * 7.1 : 0;
  const maxPiecesPerDay = decimalHours > 0 ? Math.floor(24 / decimalHours) : 0;

  const hasFilament = rawWeight > 0 && rawCostPerKg > 0;
  const filamentCost = hasFilament ? (rawWeight / 1000) * rawCostPerKg : 0;

  const hasTotalCost = isTimeValid && hasFilament;
  const totalCost = hasTotalCost ? filamentCost + electricityCost : 0;

  const hasProfit = hasTotalCost && rawSellingPrice > 0;
  const profit = hasProfit ? rawSellingPrice - totalCost : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Product name is required.');
      return;
    }
    if (!isTimeValid) {
      setErrorMsg('Invalid print time format. Use formats like: 12m, 1.7h, 3h 25m.');
      return;
    }
    if (rawWeight <= 0) {
      setErrorMsg('Filament weight must be greater than 0.');
      return;
    }
    if (rawCostPerKg <= 0) {
      setErrorMsg('Cost per Kg must be greater than 0.');
      return;
    }
    if (rawSellingPrice <= 0) {
      setErrorMsg('Selling price must be greater than 0.');
      return;
    }

    try {
      await onSubmit({
        ...(product?.id ? { id: product.id } : {}),
        name: name.trim(),
        print_time: printTime.trim(),
        filament_weight: rawWeight,
        cost_per_kg: rawCostPerKg,
        selling_price: rawSellingPrice,
        image_url: imageUrl || undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while saving the product.');
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMsg('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setImageUrl(publicUrlData.publicUrl);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setErrorMsg(err.message || 'Failed to upload product image.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearImage = () => {
    setImageUrl('');
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
            <Calculator className="h-5 w-5 text-purple-400" />
            {product ? 'Edit Product' : 'Add New Product'}
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
                <label className="block text-sm font-medium text-neutral-400">Product Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                  placeholder="e.g., Spool Holder"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-neutral-400">Print Time</label>
                  <span className="text-xs text-neutral-500 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    e.g., 3h 25m, 1.7h, 12m
                  </span>
                </div>
                <input
                  type="text"
                  value={printTime}
                  onChange={(e) => setPrintTime(e.target.value)}
                  className={`mt-1 block w-full rounded-lg border bg-neutral-900 px-3 py-2 text-neutral-100 shadow-sm focus:outline-none focus:ring-1 text-sm ${
                    printTime && !isTimeValid 
                      ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500' 
                      : 'border-neutral-800 focus:border-purple-500 focus:ring-purple-500'
                  }`}
                  placeholder="e.g., 3h 25m"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400">Filament Weight (g)</label>
                <input
                  type="number"
                  step="any"
                  value={filamentWeight}
                  onChange={(e) => setFilamentWeight(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                  placeholder="e.g., 120"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400">Cost per Kg (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={costPerKg}
                    onChange={(e) => setCostPerKg(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                    placeholder="e.g., 1500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400">Selling Price (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                    placeholder="e.g., 450"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400">Product Image (Optional)</label>
                {imageUrl ? (
                  <div className="mt-1.5 flex items-center gap-3">
                    <img 
                      src={imageUrl} 
                      alt="Preview" 
                      className="h-10 w-10 rounded-lg object-cover border border-neutral-800 bg-neutral-900"
                    />
                    <span className="text-xs text-neutral-500 truncate max-w-[140px]">{imageUrl.split('/').pop()}</span>
                    <button
                      type="button"
                      onClick={handleClearImage}
                      className="text-xs text-red-400 hover:text-red-300 font-semibold"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      disabled={isUploading}
                      className="block w-full text-xs text-neutral-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-neutral-800 file:bg-neutral-900 file:text-neutral-300 file:font-semibold hover:file:bg-neutral-800 file:cursor-pointer focus:outline-none"
                    />
                    {isUploading && <span className="text-xs text-neutral-400 animate-pulse shrink-0">Uploading...</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Real-time Calculations Preview */}
            <div className="flex flex-col justify-between rounded-xl border border-neutral-800 bg-neutral-900/20 p-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 border-b border-neutral-800 pb-2 mb-3">
                  Live Calculator
                </h3>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Decimal Hours:</span>
                    <span className="font-mono text-neutral-300">
                      {isTimeValid ? `${decimalHours.toFixed(2)}h` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Filament Cost:</span>
                    <span className="font-mono text-neutral-300">
                      {hasFilament ? `₹${filamentCost.toFixed(2)}` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Electricity Cost:</span>
                    <span className="font-mono text-neutral-300">
                      {isTimeValid ? `₹${electricityCost.toFixed(2)}` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-neutral-900 pt-2 font-medium">
                    <span className="text-neutral-400">Total Cost:</span>
                    <span className="font-mono text-neutral-200">
                      {hasTotalCost ? `₹${totalCost.toFixed(2)}` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-neutral-900 pt-2 font-bold text-purple-400">
                    <span>Estimated Profit:</span>
                    <span className="font-mono">
                      {hasProfit ? `₹${profit.toFixed(2)}` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-neutral-900 pt-2 font-bold text-amber-400">
                    <span>Max Pieces/Day:</span>
                    <span className="font-mono">
                      {isTimeValid && decimalHours > 0 ? `${maxPiecesPerDay} pcs` : '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-neutral-900 pt-3 text-[10px] text-neutral-500">
                Electricity calculated at ₹7.1/kWh rate for an 80W power consumption profile.
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
              disabled={isSubmitting || (printTime !== '' && !isTimeValid)}
              className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow hover:from-purple-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'Saving...' : product ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
