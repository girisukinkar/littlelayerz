import React, { useState } from 'react';
import { useProducts } from '../hooks/useProducts';
import { parsePrintTimeToHours, formatHoursToPrintTime } from '../utils/printTimeParser';
import { Plus, Trash2, FileText, Printer, FileCheck, Image as ImageIcon } from 'lucide-react';

interface QuoteItem {
  id: string;
  productId: string;
  quantity: number;
  customPrice: number;
}

export const Quotations: React.FC = () => {
  const { products, isLoading } = useProducts();
  const [clientName, setClientName] = useState('');
  const [items, setItems] = useState<QuoteItem[]>([
    { id: crypto.randomUUID(), productId: '', quantity: 1, customPrice: 0 }
  ]);

  const handleAddItem = () => {
    setItems([...items, { id: crypto.randomUUID(), productId: '', quantity: 1, customPrice: 0 }]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: 'productId' | 'quantity' | 'customPrice', value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // Auto-populate default selling price when product changes
        if (field === 'productId') {
          const matchedProd = products.find(p => p.id === value);
          updated.customPrice = matchedProd ? matchedProd.selling_price : 0;
        }
        return updated;
      }
      return item;
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  // Calculations
  let totalWeight = 0;
  let totalHours = 0;
  let totalAmount = 0;

  const quoteLines = items.map(item => {
    const matchedProduct = products.find(p => p.id === item.productId);
    if (!matchedProduct) return null;

    const decimalHours = parsePrintTimeToHours(matchedProduct.print_time);
    const weight = matchedProduct.filament_weight * item.quantity;
    const hours = decimalHours * item.quantity;
    const lineTotal = item.customPrice * item.quantity;

    totalWeight += weight;
    totalHours += hours;
    totalAmount += lineTotal;

    return {
      product: matchedProduct,
      quantity: item.quantity,
      unitPrice: item.customPrice,
      weight,
      hours,
      lineTotal
    };
  }).filter(Boolean);

  const formattedPrintTime = formatHoursToPrintTime(totalHours);

  // Quote Ref
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const quoteRef = `Q-${todayStr}-${Math.floor(100 + Math.random() * 900)}`;

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-8 md:px-8 text-neutral-100 selection:bg-purple-500/30 selection:text-purple-200 print:bg-white print:text-black print:min-h-0 print:p-0">
      <div className="mx-auto max-w-7xl print:max-w-none">
        
        {/* Header Block */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-neutral-900 pb-6 mb-6 gap-4 print:hidden">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-50 bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Quotation Builder
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Generate custom quotations with optional pricing overrides and clean PDF export
            </p>
          </div>

          <button
            onClick={handlePrint}
            disabled={quoteLines.length === 0}
            className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:from-purple-500 hover:to-indigo-500 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100"
          >
            <Printer className="h-5 w-5" />
            Print / Save PDF
          </button>
        </header>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 print:hidden">
            <span className="h-8 w-8 animate-spin border-4 border-purple-500 border-t-transparent rounded-full"></span>
            <p className="text-neutral-500 text-sm">Loading products catalog...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start print:grid-cols-1">
            
            {/* Left Column: Form Builder */}
            <div className="space-y-6 bg-neutral-900/20 border border-neutral-900 rounded-2xl p-6 print:hidden">
              <h2 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-400" />
                Configure Quotation
              </h2>

              {/* Client Name Input */}
              <div>
                <label className="block text-sm font-medium text-neutral-400">Seller / Client Name</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                  placeholder="e.g., John Doe Retailers"
                />
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-3 text-xs font-semibold text-neutral-400">
                  <span className="col-span-6">Product</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-3 text-center">Unit Price (₹)</span>
                  <span className="col-span-1"></span>
                </div>
                
                {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-3 items-center">
                    {/* Product Selection */}
                    <div className="col-span-6">
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(item.id, 'productId', e.target.value)}
                        className="block w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-2 text-neutral-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs"
                      >
                        <option value="">Select a product...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (₹{p.selling_price})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity Input */}
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                        className="block w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-2 text-neutral-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs text-center font-mono"
                      />
                    </div>

                    {/* Custom Price Input */}
                    <div className="col-span-3">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.customPrice || ''}
                        placeholder="Price"
                        onChange={(e) => handleItemChange(item.id, 'customPrice', parseFloat(e.target.value) || 0)}
                        className="block w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-2 text-neutral-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs text-center font-mono"
                      />
                    </div>

                    {/* Delete Action */}
                    <div className="col-span-1 flex justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={items.length === 1}
                        className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-800 hover:text-red-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center justify-center gap-1.5 w-full rounded-lg border border-dashed border-neutral-800 py-2.5 text-xs font-semibold text-neutral-400 hover:border-neutral-700 hover:text-neutral-200 hover:bg-neutral-900/30 transition-all"
              >
                <Plus className="h-4 w-4" />
                Add Item Row
              </button>
            </div>

            {/* Right Column: Live Quotation Preview Sheet */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-8 shadow-2xl text-neutral-200 max-w-2xl mx-auto w-full print:border-0 print:shadow-none print:p-0 print:bg-white print:text-black">
              
              {/* Screen Only Header */}
              <div className="flex justify-between items-start border-b border-neutral-800 pb-6 mb-6 print:hidden">
                <div>
                  <h2 className="text-2xl font-extrabold text-neutral-100 bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent text-2xl">
                    Dexter3D Studio
                  </h2>
                  <p className="text-xs text-neutral-500 mt-1">
                    Bambu Lab A1 Mini Single-Printer Production
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block bg-purple-500/10 text-purple-400 text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full border border-purple-500/20">
                    Quotation
                  </span>
                  <p className="text-xs text-neutral-500 mt-2 font-mono">
                    Ref: {quoteRef}
                  </p>
                </div>
              </div>

              {/* Print Only Plain Header (No Branding) */}
              <div className="hidden print:block border-b border-neutral-300 pb-4 mb-6">
                <h1 className="text-2xl font-bold text-black uppercase tracking-wider">Quotation</h1>
                <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-neutral-500 font-semibold uppercase tracking-wider text-[9px]">Prepared For:</span>
                    <p className="font-semibold text-black mt-0.5 text-sm">{clientName.trim() || 'Valued Customer'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-neutral-500 font-semibold uppercase tracking-wider text-[9px]">Date Issued:</span>
                    <p className="font-semibold text-black mt-0.5 text-sm">
                      {new Date().toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </p>
                    <p className="text-[10px] text-neutral-500 mt-1 font-mono">Ref: {quoteRef}</p>
                  </div>
                </div>
              </div>

              {/* Quotation Metadata (Screen Only) */}
              <div className="grid grid-cols-2 gap-4 text-xs mb-8 print:hidden">
                <div>
                  <span className="text-neutral-500 uppercase tracking-wider font-semibold text-[10px]">Prepared For:</span>
                  <p className="font-semibold text-neutral-200 mt-1 text-sm">
                    {clientName.trim() || 'Valued Customer'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-neutral-500 uppercase tracking-wider font-semibold text-[10px]">Date Issued:</span>
                  <p className="font-semibold text-neutral-200 mt-1 text-sm">
                    {new Date().toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </p>
                </div>
              </div>

              {/* Line Items Table */}
              {quoteLines.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileCheck className="h-8 w-8 text-neutral-600 mb-2" />
                  <p className="text-sm text-neutral-500">Configure products to view preview</p>
                </div>
              ) : (
                <>
                  <table className="w-full text-left text-xs mb-8">
                    <thead>
                      <tr className="border-b border-neutral-800 print:border-neutral-300 text-neutral-400 print:text-neutral-600 font-semibold uppercase tracking-wider text-[10px]">
                        <th className="pb-3 w-10 text-center">No.</th>
                        <th className="pb-3 w-12 text-center">Image</th>
                        <th className="pb-3">Product Name</th>
                        <th className="pb-3 text-right">Qty</th>
                        <th className="pb-3 text-right">Unit Price</th>
                        <th className="pb-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900 print:divide-neutral-200">
                      {quoteLines.map((line, idx) => (
                        <tr key={idx} className="text-neutral-300 print:text-black">
                          <td className="py-3.5 text-center text-neutral-500 print:text-neutral-500">{idx + 1}</td>
                          <td className="py-3.5 flex justify-center">
                            {line?.product.image_url ? (
                              <img 
                                src={line.product.image_url} 
                                alt={line.product.name} 
                                className="h-8 w-8 rounded object-cover border border-neutral-800 bg-neutral-900 print:border-neutral-300 shrink-0"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded border border-neutral-800 bg-neutral-900/50 flex items-center justify-center text-neutral-600 print:border-neutral-300 print:bg-neutral-100 shrink-0">
                                <ImageIcon className="h-4 w-4" />
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 font-medium">{line?.product.name}</td>
                          <td className="py-3.5 text-right font-mono">{line?.quantity}</td>
                          <td className="py-3.5 text-right font-mono">₹{line?.unitPrice}</td>
                          <td className="py-3.5 text-right font-mono font-semibold">₹{line?.lineTotal}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Summary Totals */}
                  <div className="border-t border-neutral-800 print:border-neutral-300 pt-4 grid grid-cols-2 gap-4 text-xs">
                    {/* Weight & print details visible on screen but fully hidden in printed PDF */}
                    <div className="space-y-1.5 text-neutral-500 print:hidden">
                      <div className="flex gap-2">
                        <span>Total Weight:</span>
                        <span className="font-semibold text-neutral-400 font-mono">{totalWeight}g</span>
                      </div>
                      <div className="flex gap-2">
                        <span>Total Print Duration:</span>
                        <span className="font-semibold text-neutral-400 font-mono">{formattedPrintTime}</span>
                      </div>
                    </div>
                    {/* Empty block to preserve layout when printing */}
                    <div className="hidden print:block"></div>
                    <div className="text-right space-y-1.5">
                      <div className="flex justify-between font-bold text-neutral-100 print:text-black text-base">
                        <span>Grand Total:</span>
                        <span className="font-mono">₹{totalAmount}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Quotation Footer */}
              <div className="mt-12 border-t border-neutral-900 print:border-neutral-200 pt-4 text-[10px] text-neutral-500 text-center">
                This is a computer generated price estimate. Validity: 30 days.
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
