import React, { useState, useEffect } from 'react';
import type { Filament } from '../../types/filament';
import { X, Calculator, Info } from 'lucide-react';

interface FilamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (filament: Omit<Filament, 'id' | 'created_at'> & { id?: string }) => Promise<void>;
  filament?: Filament | null; // If passed, we are in edit mode
  isSubmitting: boolean;
}

const FILAMENT_TYPES = ['PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'Nylon', 'Carbon Fiber', 'Wood', 'Other'];

export const FilamentModal: React.FC<FilamentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  filament,
  isSubmitting,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('PLA');
  const [colorHex, setColorHex] = useState('#a855f7'); // default purple
  const [colorName, setColorName] = useState('');
  const [costPerKg, setCostPerKg] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [gramsLeft, setGramsLeft] = useState('');
  const [hasSpool, setHasSpool] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Pre-fill form if editing
  useEffect(() => {
    if (filament) {
      setName(filament.name);
      setType(filament.type);
      setColorHex(filament.color_hex);
      setColorName(filament.color_name);
      setCostPerKg(filament.cost_per_kg.toString());
      setPurchasePrice(filament.purchase_price.toString());
      setGramsLeft(filament.grams_left.toString());
      setHasSpool(filament.has_spool);
    } else {
      setName('');
      setType('PLA');
      setColorHex('#a855f7');
      setColorName('');
      setCostPerKg('');
      setPurchasePrice('');
      setGramsLeft('1000'); // default to 1kg
      setHasSpool(true);
    }
    setErrorMsg('');
  }, [filament, isOpen]);

  if (!isOpen) return null;

  // Live calculations
  const rawCostPerKg = parseFloat(costPerKg) || 0;
  const rawPurchasePrice = parseFloat(purchasePrice) || 0;
  const rawGramsLeft = parseFloat(gramsLeft) || 0;

  // Calculate value of remaining filament based on Cost/Kg
  const remainingValue = (rawGramsLeft / 1000) * rawCostPerKg;
  // Calculate average cost per gram
  const costPerGram = rawCostPerKg / 1000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Spool name is required.');
      return;
    }
    if (!colorName.trim()) {
      setErrorMsg('Color name is required.');
      return;
    }
    if (rawCostPerKg <= 0) {
      setErrorMsg('Cost per Kg must be greater than 0.');
      return;
    }
    if (rawPurchasePrice <= 0) {
      setErrorMsg('Purchase price must be greater than 0.');
      return;
    }
    if (rawGramsLeft < 0) {
      setErrorMsg('Grams left cannot be negative.');
      return;
    }

    try {
      await onSubmit({
        ...(filament?.id ? { id: filament.id } : {}),
        name: name.trim(),
        type,
        color_hex: colorHex,
        color_name: colorName.trim(),
        cost_per_kg: rawCostPerKg,
        purchase_price: rawPurchasePrice,
        grams_left: rawGramsLeft,
        has_spool: hasSpool,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while saving the filament.');
    }
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
            {filament ? 'Edit Filament Spool' : 'Add New Filament Spool'}
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
                <label className="block text-sm font-medium text-neutral-400">Spool/Filament Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                  placeholder="e.g., Polymaker PLA Pro Jet Black"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400">Filament Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                  >
                    {FILAMENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-400">Grams Left</label>
                  <input
                    type="number"
                    step="any"
                    value={gramsLeft}
                    onChange={(e) => setGramsLeft(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm font-mono"
                    placeholder="e.g., 850"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400">Color Selection</label>
                <div className="mt-1 flex items-center gap-3">
                  <input
                    type="color"
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)}
                    className="h-9 w-9 rounded-lg border border-neutral-800 bg-neutral-900 cursor-pointer overflow-hidden p-0"
                  />
                  <input
                    type="text"
                    value={colorName}
                    onChange={(e) => setColorName(e.target.value)}
                    className="block w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                    placeholder="e.g., Jet Black, Lime Green"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400">Cost per Kg (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={costPerKg}
                    onChange={(e) => setCostPerKg(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm font-mono"
                    placeholder="e.g., 1500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400">Purchase Price (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm font-mono"
                    placeholder="e.g., 1350"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400">Spool Tag</label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setHasSpool(true)}
                    className={`rounded-lg py-2 text-xs font-semibold border transition-all ${
                      hasSpool
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    With Spool
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasSpool(false)}
                    className={`rounded-lg py-2 text-xs font-semibold border transition-all ${
                      !hasSpool
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Without Spool
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column - Spool Preview Calculator */}
            <div className="flex flex-col justify-between rounded-xl border border-neutral-800 bg-neutral-900/20 p-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 border-b border-neutral-800 pb-2 mb-3">
                  Spool Analytics
                </h3>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Material Type:</span>
                    <span className="font-semibold text-neutral-300">
                      {type}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Color Hex:</span>
                    <span className="font-mono text-neutral-300">
                      {colorHex}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Cost per Gram:</span>
                    <span className="font-mono text-neutral-300">
                      {rawCostPerKg > 0 ? `₹${costPerGram.toFixed(3)}` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-neutral-900 pt-2 font-medium">
                    <span className="text-neutral-400">Inventory Value Left:</span>
                    <span className="font-mono text-neutral-200">
                      {rawCostPerKg > 0 && rawGramsLeft > 0 ? `₹${remainingValue.toFixed(2)}` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-neutral-900 pt-2 font-bold text-purple-400">
                    <span>Original Cost:</span>
                    <span className="font-mono">
                      {rawPurchasePrice > 0 ? `₹${rawPurchasePrice.toFixed(2)}` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-neutral-900 pt-2 font-bold text-amber-400">
                    <span>Weight Remaining:</span>
                    <span className="font-mono">
                      {rawGramsLeft > 0 ? `${rawGramsLeft.toLocaleString()}g` : '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-neutral-900 pt-3 text-[10px] text-neutral-500 flex items-start gap-1">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  Inventory value is computed dynamically based on the current grams remaining and the cataloged cost per Kg.
                </span>
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
              disabled={isSubmitting}
              className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow hover:from-purple-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'Saving...' : filament ? 'Save Changes' : 'Add Spool'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
