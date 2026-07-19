import React, { useState, useEffect, useMemo } from 'react';
import { useProducts } from '../hooks/useProducts';
import { calculateProductMetrics } from '../utils/productCalculations';
import { useSettingsStore } from '../store/useSettingsStore';
import { useProfitHistoryStore } from '../store/useProfitHistoryStore';
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  Coins,
  Percent,
  Truck,
  Package,
  AlertTriangle,
  Plus,
  Minus,
  HelpCircle,
  CheckCircle2,
  Shuffle,
  Sparkles,
  Save,
  History,
  X,
  Trash2,
  FolderOpen,
  Search,
  Pencil,
  RotateCcw,
  Table
} from 'lucide-react';

export const ProfitCalculator: React.FC = () => {
  const { products, isLoading: isProductsLoading } = useProducts();
  const settings = useSettingsStore();
  const { savedCalculations, saveCalculation, updateCalculation, deleteCalculation, clearHistory } = useProfitHistoryStore();

  // Mode: 'db' (database product selection) or 'manual' (manual input)
  const [calculationMode, setCalculationMode] = useState<'db' | 'manual'>('db');
  
  // Editing state
  const [editingCalculationId, setEditingCalculationId] = useState<string | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<'editor' | 'table'>('editor');

  // History & Save Modal State
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveNotes, setSaveNotes] = useState('');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const triggerAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  // Database selection state
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  // Manual input state
  const [manualName, setManualName] = useState<string>('Custom Print');
  const [manualCost, setManualCost] = useState<string>('50');
  const [manualSellingPrice, setManualSellingPrice] = useState<string>('150');

  // Common inputs
  const [quantity, setQuantity] = useState<number>(10);
  
  // Failed prints state
  const [includeFailedPrints, setIncludeFailedPrints] = useState<boolean>(true);
  const [failedPrintsRate, setFailedPrintsRate] = useState<string>('5');

  // Packaging options state
  const [includePackaging, setIncludePackaging] = useState<boolean>(true);
  const [packagingSource, setPackagingSource] = useState<'default' | 'custom'>('default');
  const [customPackagingCost, setCustomPackagingCost] = useState<string>('10');
  const [packagingCostType, setPackagingCostType] = useState<'per_unit' | 'flat'>('per_unit');

  // Shipping options state
  const [includeShipping, setIncludeShipping] = useState<boolean>(false);
  const [shippingSource, setShippingSource] = useState<'default' | 'custom'>('default');
  const [customShippingCost, setCustomShippingCost] = useState<string>('50');
  const [shippingCostType, setShippingCostType] = useState<'per_unit' | 'flat'>('flat');

  // Start a fresh new calculation
  const handleStartNewCalculation = () => {
    setEditingCalculationId(null);
    setCalculationMode('manual');
    setManualName('Custom Print');
    setManualCost('50');
    setManualSellingPrice('150');
    setQuantity(10);
    setIncludeFailedPrints(true);
    setFailedPrintsRate('5');
    setIncludePackaging(true);
    setPackagingSource('default');
    setCustomPackagingCost('10');
    setPackagingCostType('per_unit');
    setIncludeShipping(false);
    setShippingSource('default');
    setCustomShippingCost('50');
    setShippingCostType('flat');
    setSaveTitle('');
    setSaveNotes('');
    setActiveViewTab('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    triggerAlert('success', 'Form reset for a new calculation!');
  };

  // Edit an existing saved calculation
  const handleEditSavedCalculation = (item: any) => {
    setEditingCalculationId(item.id);
    setCalculationMode(item.calculationMode);
    if (item.selectedProductId) setSelectedProductId(item.selectedProductId);
    if (item.manualName) setManualName(item.manualName);
    if (item.manualCost) setManualCost(item.manualCost);
    if (item.manualSellingPrice) setManualSellingPrice(item.manualSellingPrice);
    setQuantity(item.quantity);
    setIncludeFailedPrints(item.includeFailedPrints);
    setFailedPrintsRate(item.failedPrintsRate);
    setIncludePackaging(item.includePackaging);
    setPackagingSource(item.packagingSource);
    setCustomPackagingCost(item.customPackagingCost);
    setPackagingCostType(item.packagingCostType);
    setIncludeShipping(item.includeShipping);
    setShippingSource(item.shippingSource);
    setCustomShippingCost(item.customShippingCost);
    setShippingCostType(item.shippingCostType);
    setSaveTitle(item.title);
    setSaveNotes(item.notes || '');

    setActiveViewTab('editor');
    setIsHistoryDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    triggerAlert('success', `Editing saved calculation "${item.title}".`);
  };

  // Random Values Generator
  const handleRandomizeManualValues = () => {
    const randomCosts = [15, 25, 45, 60, 85, 120, 180, 250, 320];
    const randomCost = randomCosts[Math.floor(Math.random() * randomCosts.length)];
    const multiplier = Number((1.8 + Math.random() * 2.2).toFixed(2));
    const randomPrice = Math.round(randomCost * multiplier);
    const randomQty = [1, 5, 10, 15, 25, 50, 100, 200][Math.floor(Math.random() * 8)];
    const randomFailRate = [3, 5, 8, 10, 12][Math.floor(Math.random() * 5)];
    const randomPackCost = [5, 10, 15, 20, 25][Math.floor(Math.random() * 5)];
    const randomShipCost = [30, 40, 50, 70, 100][Math.floor(Math.random() * 5)];
    const sampleNames = ['Custom Figurine', 'Lithophane Frame', 'Fidget Spinner', 'Desk Organizer', 'Cable Clip', 'Phone Stand', 'Planter Pot', 'Enclosure Box'];
    const randomName = sampleNames[Math.floor(Math.random() * sampleNames.length)];

    setCalculationMode('manual');
    setManualName(randomName);
    setManualCost(randomCost.toString());
    setManualSellingPrice(randomPrice.toString());
    setQuantity(randomQty);
    setFailedPrintsRate(randomFailRate.toString());
    setCustomPackagingCost(randomPackCost.toString());
    setCustomShippingCost(randomShipCost.toString());
    setPackagingSource('custom');
    setShippingSource('custom');
    setIncludePackaging(true);
    setIncludeShipping(Math.random() > 0.4);
  };

  // Preset Scenario Handlers
  const applyPreset = (preset: 'small' | 'medium' | 'bulk') => {
    setCalculationMode('manual');
    setIncludePackaging(true);
    setPackagingSource('custom');
    setShippingSource('custom');
    
    if (preset === 'small') {
      setManualName('Keychains Batch');
      setManualCost('12');
      setManualSellingPrice('55');
      setQuantity(100);
      setFailedPrintsRate('5');
      setCustomPackagingCost('5');
      setCustomShippingCost('60');
      setShippingCostType('flat');
    } else if (preset === 'medium') {
      setManualName('Desk Lamp Shade');
      setManualCost('110');
      setManualSellingPrice('390');
      setQuantity(10);
      setFailedPrintsRate('5');
      setCustomPackagingCost('20');
      setCustomShippingCost('120');
      setShippingCostType('flat');
    } else if (preset === 'bulk') {
      setManualName('Wholesale Enclosures');
      setManualCost('65');
      setManualSellingPrice('180');
      setQuantity(250);
      setFailedPrintsRate('4');
      setCustomPackagingCost('12');
      setCustomShippingCost('350');
      setShippingCostType('flat');
    }
  };

  // Sync selected product or default settings if database list is loaded
  useEffect(() => {
    if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id || '');
    }
  }, [products, selectedProductId]);

  // Retrieve details of selected product
  const selectedProduct = useMemo(() => {
    if (calculationMode !== 'db' || !selectedProductId) return null;
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return null;
    return calculateProductMetrics(prod);
  }, [products, selectedProductId, calculationMode]);

  // Derived values for Calculations
  const calculations = useMemo(() => {
    // 1. Determine Unit Base Cost (Print cost: filament + electricity)
    let unitBaseCost = 0;
    let sellingPrice = 0;
    let productName = 'Custom Print';

    if (calculationMode === 'db' && selectedProduct) {
      productName = selectedProduct.name;
      // Base product cost is filament + electricity
      unitBaseCost = selectedProduct.filamentCost + selectedProduct.electricityCost;
      sellingPrice = selectedProduct.selling_price;
    } else {
      productName = manualName || 'Custom Print';
      unitBaseCost = Math.max(0, parseFloat(manualCost) || 0);
      sellingPrice = Math.max(0, parseFloat(manualSellingPrice) || 0);
    }

    // 2. Failed Prints Cost (Calculated on Unit Base Cost)
    let failRatePercent = 0;
    if (includeFailedPrints) {
      failRatePercent = Math.max(0, parseFloat(failedPrintsRate) || 0);
    }
    const unitFailedCost = unitBaseCost * (failRatePercent / 100);
    const totalFailedCost = unitFailedCost * quantity;

    // 3. Packaging Cost
    let unitPackagingCost = 0;
    let totalPackagingCost = 0;
    if (includePackaging) {
      const basePackCost = packagingSource === 'default' 
        ? settings.defaultPackagingCost 
        : (parseFloat(customPackagingCost) || 0);

      if (packagingCostType === 'per_unit') {
        unitPackagingCost = basePackCost;
        totalPackagingCost = basePackCost * quantity;
      } else {
        totalPackagingCost = basePackCost;
        unitPackagingCost = quantity > 0 ? basePackCost / quantity : 0;
      }
    }

    // 4. Shipping Cost
    let unitShippingCost = 0;
    let totalShippingCost = 0;
    if (includeShipping) {
      const baseShipCost = shippingSource === 'default' 
        ? settings.defaultDeliveryCost 
        : (parseFloat(customShippingCost) || 0);

      if (shippingCostType === 'per_unit') {
        unitShippingCost = baseShipCost;
        totalShippingCost = baseShipCost * quantity;
      } else {
        totalShippingCost = baseShipCost;
        unitShippingCost = quantity > 0 ? baseShipCost / quantity : 0;
      }
    }

    // 5. Aggregate metrics
    const totalBaseCost = unitBaseCost * quantity;
    const totalRevenue = sellingPrice * quantity;
    const totalExpenses = totalBaseCost + totalFailedCost + totalPackagingCost + totalShippingCost;
    const netProfit = totalRevenue - totalExpenses;
    
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const unitExpenses = quantity > 0 ? totalExpenses / quantity : 0;
    const unitProfit = sellingPrice - unitExpenses;

    return {
      productName,
      unitBaseCost,
      sellingPrice,
      totalBaseCost,
      unitFailedCost,
      totalFailedCost,
      failRatePercent,
      unitPackagingCost,
      totalPackagingCost,
      unitShippingCost,
      totalShippingCost,
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      unitExpenses,
      unitProfit
    };
  }, [
    calculationMode,
    selectedProduct,
    manualName,
    manualCost,
    manualSellingPrice,
    quantity,
    includeFailedPrints,
    failedPrintsRate,
    includePackaging,
    packagingSource,
    customPackagingCost,
    packagingCostType,
    includeShipping,
    shippingSource,
    customShippingCost,
    shippingCostType,
    settings.defaultPackagingCost,
    settings.defaultDeliveryCost
  ]);

  const handleQuantityChange = (val: number) => {
    setQuantity(Math.max(1, val));
  };

  // Stacked chart calculation helper
  const chartPercentages = useMemo(() => {
    const { totalRevenue, totalBaseCost, totalFailedCost, totalPackagingCost, totalShippingCost, netProfit } = calculations;
    if (totalRevenue <= 0) return { base: 0, failed: 0, packaging: 0, shipping: 0, profit: 0, loss: 100 };

    const basePct = (totalBaseCost / totalRevenue) * 100;
    const failedPct = (totalFailedCost / totalRevenue) * 100;
    const packagingPct = (totalPackagingCost / totalRevenue) * 100;
    const shippingPct = (totalShippingCost / totalRevenue) * 100;
    const profitPct = netProfit > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const lossPct = netProfit < 0 ? (Math.abs(netProfit) / totalRevenue) * 100 : 0;

    return {
      base: Number(basePct.toFixed(1)),
      failed: Number(failedPct.toFixed(1)),
      packaging: Number(packagingPct.toFixed(1)),
      shipping: Number(shippingPct.toFixed(1)),
      profit: Number(profitPct.toFixed(1)),
      loss: Number(lossPct.toFixed(1))
    };
  }, [calculations]);

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-8 md:px-8 text-neutral-100 selection:bg-purple-500/30 selection:text-purple-200">
      <div className="mx-auto max-w-7xl">
        {/* Header Block */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-neutral-900 pb-6 mb-6 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-purple-900/30 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                <Calculator className="h-5 w-5" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-neutral-50 bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                Dexter3D Net Profit Calculator
              </h1>
            </div>
            <p className="text-sm text-neutral-500 mt-1 ml-11">
              Analyze product batch viability, failed print provisions, and shipping/packaging overheads.
            </p>
          </div>

          {/* Action Header Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleStartNewCalculation}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 px-3.5 py-2 text-xs font-semibold text-emerald-300 shadow-md hover:text-emerald-200 transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              New Calculation
            </button>
            <button
              onClick={() => {
                if (!saveTitle) {
                  setSaveTitle(`${calculations.productName} (${quantity}x)`);
                }
                setIsSaveModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 px-3.5 py-2 text-xs font-semibold text-neutral-200 shadow-md hover:text-white transition-all active:scale-95"
            >
              <Save className="h-4 w-4 text-purple-400" />
              {editingCalculationId ? 'Update / Save' : 'Save Run'}
            </button>
            <button
              onClick={() => setIsHistoryDrawerOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:from-purple-500 hover:to-indigo-500 transition-all active:scale-95"
            >
              <History className="h-4 w-4" />
              History
              {savedCalculations.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-extrabold text-white">
                  {savedCalculations.length}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Global Alert */}
        {alert && (
          <div
            className={`mb-6 flex items-center gap-3 rounded-xl border p-4 text-sm shadow-lg backdrop-blur-md transition-all duration-300 ${
              alert.type === 'success'
                ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
                : 'border-red-500/20 bg-red-500/5 text-red-400'
            }`}
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span className="font-medium">{alert.message}</span>
          </div>
        )}

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-neutral-900 pb-3">
          <button
            onClick={() => setActiveViewTab('editor')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              activeViewTab === 'editor'
                ? 'bg-purple-950/40 border-purple-500/40 text-purple-300 shadow-md'
                : 'bg-neutral-950 border-neutral-850 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Calculator className="h-4 w-4" />
            Calculator & Editor
          </button>
          <button
            onClick={() => setActiveViewTab('table')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              activeViewTab === 'table'
                ? 'bg-purple-950/40 border-purple-500/40 text-purple-300 shadow-md'
                : 'bg-neutral-950 border-neutral-850 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Table className="h-4 w-4" />
            Saved Calculations Table
            {savedCalculations.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-400 text-[10px]">
                {savedCalculations.length}
              </span>
            )}
          </button>
        </div>

        {activeViewTab === 'editor' && (
          <>
            {/* Active Editing Banner */}
            {editingCalculationId && (
              <div className="mb-6 flex items-center justify-between p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs shadow-md">
                <div className="flex items-center gap-2.5">
                  <Pencil className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>
                    Currently editing saved calculation: <strong>"{saveTitle || 'Saved Run'}"</strong>.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleStartNewCalculation}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-bold border border-amber-500/40 transition-all active:scale-95"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Cancel & Start New
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
          {/* Inputs Section */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-xl space-y-6">
              
              {/* Product Mode Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Product Input Mode</label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-neutral-900 border border-neutral-800">
                  <button
                    onClick={() => setCalculationMode('db')}
                    className={`py-1.5 rounded-md text-xs font-bold transition-all ${
                      calculationMode === 'db'
                        ? 'bg-neutral-800 text-purple-400 shadow-sm border border-neutral-700/50'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Select Product DB
                  </button>
                  <button
                    onClick={() => setCalculationMode('manual')}
                    className={`py-1.5 rounded-md text-xs font-bold transition-all ${
                      calculationMode === 'manual'
                        ? 'bg-neutral-800 text-purple-400 shadow-sm border border-neutral-700/50'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Manual Input
                  </button>
                </div>
              </div>

              {/* Product Cost & Pricing Block */}
              <div className="space-y-4">
                {calculationMode === 'db' ? (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">Select DB Product</label>
                    {isProductsLoading ? (
                      <div className="h-10 rounded-lg bg-neutral-900 border border-neutral-800 animate-pulse flex items-center px-3 text-neutral-500 text-xs">
                        Loading products...
                      </div>
                    ) : products.length === 0 ? (
                      <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-xs text-yellow-400">
                        No products found. Please add a product in Products page first or switch to Manual Input.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <select
                          value={selectedProductId}
                          onChange={(e) => setSelectedProductId(e.target.value)}
                          className="block w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm font-semibold"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        {selectedProduct && (
                          <div className="rounded-xl bg-neutral-900/60 border border-neutral-900 p-3 text-xs space-y-2 text-neutral-400">
                            <div className="flex justify-between">
                              <span>Production Cost:</span>
                              <span className="font-mono text-neutral-200">₹{(selectedProduct.filamentCost + selectedProduct.electricityCost).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Registered Selling Price:</span>
                              <span className="font-mono text-neutral-200">₹{selectedProduct.selling_price.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-[10px] text-neutral-500 pt-1 border-t border-neutral-900">
                              <span>(Filament: ₹{selectedProduct.filamentCost} | Power: ₹{selectedProduct.electricityCost})</span>
                              {selectedProduct.packaging_cost > 0 || selectedProduct.delivery_cost > 0 ? (
                                <span>Overrides below are available</span>
                              ) : null}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Randomize Action Bar */}
                    <div className="flex flex-col gap-2 p-3 rounded-xl bg-purple-950/20 border border-purple-500/20">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                          Arbitrary Numbers Generator
                        </span>
                        <button
                          type="button"
                          onClick={handleRandomizeManualValues}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold transition-all shadow-md active:scale-95"
                        >
                          <Shuffle className="h-3 w-3" />
                          Randomize Values
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1 border-t border-purple-500/10">
                        <span className="text-[10px] text-neutral-400">Presets:</span>
                        <button
                          type="button"
                          onClick={() => applyPreset('small')}
                          className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-neutral-300 hover:text-white font-medium"
                        >
                          Small (100x Keychains)
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('medium')}
                          className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-neutral-300 hover:text-white font-medium"
                        >
                          Medium (10x Lamp)
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('bulk')}
                          className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-neutral-300 hover:text-white font-medium"
                        >
                          Bulk (250x Box)
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">Product Name</label>
                      <input
                        type="text"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        className="block w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                        placeholder="e.g., Custom Toy"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">Unit Cost (₹)</label>
                        <input
                          type="number"
                          step="any"
                          value={manualCost}
                          onChange={(e) => setManualCost(e.target.value)}
                          className="block w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm font-mono"
                          placeholder="e.g. 50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">Unit Selling Price (₹)</label>
                        <input
                          type="number"
                          step="any"
                          value={manualSellingPrice}
                          onChange={(e) => setManualSellingPrice(e.target.value)}
                          className="block w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm font-mono"
                          placeholder="e.g. 150"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quantity Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">Batch Quantity</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(quantity - 1)}
                    className="p-2.5 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850 transition-all"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                    className="block w-full text-center rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm font-mono font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(quantity + 1)}
                    className="p-2.5 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-855 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Failed Prints Toggle & Input */}
              <div className="border-t border-neutral-900 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Failed Prints Buffer</span>
                    <div className="group relative">
                      <HelpCircle className="h-3.5 w-3.5 text-neutral-500 hover:text-neutral-400 cursor-pointer" />
                      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded bg-neutral-900 border border-neutral-800 p-2 text-[10px] text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl leading-relaxed">
                        Adds a safety buffer covering the base cost of failed prints. Default is 5% failure rate.
                      </div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeFailedPrints}
                      onChange={(e) => setIncludeFailedPrints(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-400 after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600 peer-checked:after:bg-neutral-50"></div>
                  </label>
                </div>

                {includeFailedPrints && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-neutral-400">Failure Rate:</span>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        value={failedPrintsRate}
                        onChange={(e) => setFailedPrintsRate(e.target.value)}
                        className="block w-full rounded-lg border border-neutral-800 bg-neutral-900 pl-3 pr-8 py-2 text-neutral-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm font-mono text-right"
                        placeholder="5"
                      />
                      <span className="absolute right-3 top-2 text-xs text-neutral-500">%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Packaging Options */}
              <div className="border-t border-neutral-900 pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-purple-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Packaging Option</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includePackaging}
                      onChange={(e) => setIncludePackaging(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-400 after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600 peer-checked:after:bg-neutral-50"></div>
                  </label>
                </div>

                {includePackaging && (
                  <div className="space-y-3 bg-neutral-900/30 p-3 rounded-xl border border-neutral-900/60">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-neutral-400">Cost Source</span>
                      <div className="flex rounded-md bg-neutral-900 p-0.5 border border-neutral-800">
                        <button
                          type="button"
                          onClick={() => setPackagingSource('default')}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                            packagingSource === 'default'
                              ? 'bg-neutral-800 text-purple-400'
                              : 'text-neutral-500 hover:text-neutral-300'
                          }`}
                        >
                          Default (₹{settings.defaultPackagingCost})
                        </button>
                        <button
                          type="button"
                          onClick={() => setPackagingSource('custom')}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                            packagingSource === 'custom'
                              ? 'bg-neutral-800 text-purple-400'
                              : 'text-neutral-500 hover:text-neutral-300'
                          }`}
                        >
                          Custom
                        </button>
                      </div>
                    </div>

                    {packagingSource === 'custom' && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-neutral-400 font-medium">Custom Packaging Cost (₹)</span>
                        <input
                          type="number"
                          step="any"
                          value={customPackagingCost}
                          onChange={(e) => setCustomPackagingCost(e.target.value)}
                          className="w-24 rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1 text-neutral-100 text-xs font-mono text-right focus:border-purple-500 focus:outline-none"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-neutral-400">Allocation Type</span>
                      <div className="flex rounded-md bg-neutral-900 p-0.5 border border-neutral-800">
                        <button
                          type="button"
                          onClick={() => setPackagingCostType('per_unit')}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                            packagingCostType === 'per_unit'
                              ? 'bg-neutral-800 text-purple-400'
                              : 'text-neutral-500 hover:text-neutral-300'
                          }`}
                        >
                          Per Unit
                        </button>
                        <button
                          type="button"
                          onClick={() => setPackagingCostType('flat')}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                            packagingCostType === 'flat'
                              ? 'bg-neutral-800 text-purple-400'
                              : 'text-neutral-500 hover:text-neutral-300'
                          }`}
                        >
                          Flat Rate
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Shipping Options */}
              <div className="border-t border-neutral-900 pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Truck className="h-4 w-4 text-purple-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Shipping Option</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeShipping}
                      onChange={(e) => setIncludeShipping(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-400 after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600 peer-checked:after:bg-neutral-50"></div>
                  </label>
                </div>

                {includeShipping && (
                  <div className="space-y-3 bg-neutral-900/30 p-3 rounded-xl border border-neutral-900/60">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-neutral-400">Cost Source</span>
                      <div className="flex rounded-md bg-neutral-900 p-0.5 border border-neutral-800">
                        <button
                          type="button"
                          onClick={() => setShippingSource('default')}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                            shippingSource === 'default'
                              ? 'bg-neutral-800 text-purple-400'
                              : 'text-neutral-500 hover:text-neutral-300'
                          }`}
                        >
                          Default (₹{settings.defaultDeliveryCost})
                        </button>
                        <button
                          type="button"
                          onClick={() => setShippingSource('custom')}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                            shippingSource === 'custom'
                              ? 'bg-neutral-800 text-purple-400'
                              : 'text-neutral-500 hover:text-neutral-300'
                          }`}
                        >
                          Custom
                        </button>
                      </div>
                    </div>

                    {shippingSource === 'custom' && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-neutral-400 font-medium">Custom Shipping Cost (₹)</span>
                        <input
                          type="number"
                          step="any"
                          value={customShippingCost}
                          onChange={(e) => setCustomShippingCost(e.target.value)}
                          className="w-24 rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1 text-neutral-100 text-xs font-mono text-right focus:border-purple-500 focus:outline-none"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-neutral-400">Allocation Type</span>
                      <div className="flex rounded-md bg-neutral-900 p-0.5 border border-neutral-800">
                        <button
                          type="button"
                          onClick={() => setShippingCostType('per_unit')}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                            shippingCostType === 'per_unit'
                              ? 'bg-neutral-800 text-purple-400'
                              : 'text-neutral-500 hover:text-neutral-300'
                          }`}
                        >
                          Per Unit
                        </button>
                        <button
                          type="button"
                          onClick={() => setShippingCostType('flat')}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                            shippingCostType === 'flat'
                              ? 'bg-neutral-800 text-purple-400'
                              : 'text-neutral-500 hover:text-neutral-300'
                          }`}
                        >
                          Flat Rate
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Top Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              {/* Total Revenue */}
              <div className="rounded-2xl border border-neutral-900 bg-neutral-950 p-4 shadow-md flex items-center gap-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 h-16 w-16 -mr-4 -mt-4 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all"></div>
                <div className="h-10 w-10 rounded-xl bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Total Revenue</span>
                  <div className="text-xl font-extrabold text-neutral-200 mt-0.5 font-mono">
                    ₹{calculations.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">
                    ₹{calculations.sellingPrice.toFixed(2)} / unit
                  </div>
                </div>
              </div>

              {/* Total Cost */}
              <div className="rounded-2xl border border-neutral-900 bg-neutral-950 p-4 shadow-md flex items-center gap-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 h-16 w-16 -mr-4 -mt-4 bg-rose-500/5 rounded-full blur-xl group-hover:bg-rose-500/10 transition-all"></div>
                <div className="h-10 w-10 rounded-xl bg-rose-950/40 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                  <TrendingDown className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Total Expenses</span>
                  <div className="text-xl font-extrabold text-neutral-200 mt-0.5 font-mono">
                    ₹{calculations.totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">
                    ₹{calculations.unitExpenses.toFixed(2)} / unit
                  </div>
                </div>
              </div>

              {/* Net Profit */}
              <div className={`rounded-2xl border p-4 shadow-md flex items-center gap-4 relative overflow-hidden group transition-all ${
                calculations.netProfit >= 0 
                  ? 'border-purple-900/50 bg-neutral-950/50 shadow-purple-500/5' 
                  : 'border-rose-900/50 bg-neutral-950/50 shadow-rose-500/5'
              }`}>
                <div className={`absolute top-0 right-0 h-16 w-16 -mr-4 -mt-4 rounded-full blur-xl transition-all ${
                  calculations.netProfit >= 0 ? 'bg-purple-500/5 group-hover:bg-purple-500/10' : 'bg-rose-500/5 group-hover:bg-rose-500/10'
                }`}></div>
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                  calculations.netProfit >= 0 
                    ? 'bg-purple-950/40 border border-purple-500/20 text-purple-400' 
                    : 'bg-rose-950/40 border border-rose-500/20 text-rose-400'
                }`}>
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Net Profit</span>
                  <div className={`text-xl font-extrabold mt-0.5 font-mono ${
                    calculations.netProfit >= 0 ? 'text-purple-400' : 'text-rose-400'
                  }`}>
                    ₹{calculations.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">
                    ₹{calculations.unitProfit.toFixed(2)} / unit
                  </div>
                </div>
              </div>

              {/* Profit Margin */}
              <div className="rounded-2xl border border-neutral-900 bg-neutral-950 p-4 shadow-md flex items-center gap-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 h-16 w-16 -mr-4 -mt-4 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-all"></div>
                <div className="h-10 w-10 rounded-xl bg-blue-950/40 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <Percent className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Profit Margin</span>
                  <div className={`text-xl font-extrabold mt-0.5 font-mono ${
                    calculations.profitMargin >= 30 
                      ? 'text-emerald-400' 
                      : calculations.profitMargin >= 10 
                      ? 'text-blue-400' 
                      : calculations.profitMargin >= 0 
                      ? 'text-amber-400' 
                      : 'text-rose-400'
                  }`}>
                    {calculations.profitMargin.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">
                    Return on Revenue
                  </div>
                </div>
              </div>
            </div>

            {/* Stacked Breakdown Chart */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Revenue Allocation Chart</h3>
                <span className="text-[10px] text-neutral-500">Based on total revenue of ₹{calculations.totalRevenue.toFixed(0)}</span>
              </div>

              {/* Progress bar container */}
              <div className="w-full h-7 rounded-lg bg-neutral-900 overflow-hidden flex border border-neutral-850">
                {calculations.totalRevenue <= 0 ? (
                  <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-xs text-neutral-600 font-medium">
                    No Revenue to Display
                  </div>
                ) : calculations.netProfit < 0 ? (
                  <>
                    <div style={{ width: `${Math.min(100, (calculations.totalBaseCost / calculations.totalExpenses) * 100)}%` }} className="bg-blue-600 h-full" title="Base Production Cost"></div>
                    {includeFailedPrints && (
                      <div style={{ width: `${(calculations.totalFailedCost / calculations.totalExpenses) * 100}%` }} className="bg-rose-500/70 h-full" title="Failed Prints Cost"></div>
                    )}
                    {includePackaging && (
                      <div style={{ width: `${(calculations.totalPackagingCost / calculations.totalExpenses) * 100}%` }} className="bg-amber-500 h-full" title="Packaging Cost"></div>
                    )}
                    {includeShipping && (
                      <div style={{ width: `${(calculations.totalShippingCost / calculations.totalExpenses) * 100}%` }} className="bg-cyan-500 h-full" title="Shipping Cost"></div>
                    )}
                  </>
                ) : (
                  <>
                    {chartPercentages.base > 0 && (
                      <div style={{ width: `${chartPercentages.base}%` }} className="bg-blue-600 h-full" title={`Base Cost: ${chartPercentages.base}%`}></div>
                    )}
                    {includeFailedPrints && chartPercentages.failed > 0 && (
                      <div style={{ width: `${chartPercentages.failed}%` }} className="bg-rose-500/70 h-full" title={`Failed Prints: ${chartPercentages.failed}%`}></div>
                    )}
                    {includePackaging && chartPercentages.packaging > 0 && (
                      <div style={{ width: `${chartPercentages.packaging}%` }} className="bg-amber-500 h-full" title={`Packaging: ${chartPercentages.packaging}%`}></div>
                    )}
                    {includeShipping && chartPercentages.shipping > 0 && (
                      <div style={{ width: `${chartPercentages.shipping}%` }} className="bg-cyan-500 h-full" title={`Shipping: ${chartPercentages.shipping}%`}></div>
                    )}
                    {chartPercentages.profit > 0 && (
                      <div style={{ width: `${chartPercentages.profit}%` }} className="bg-purple-500 h-full shadow-[inset_0_0_8px_rgba(168,85,247,0.5)]" title={`Net Profit: ${chartPercentages.profit}%`}></div>
                    )}
                  </>
                )}
              </div>

              {/* Chart Legend */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-[10px] text-neutral-400 pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                  <span>Base Cost: {calculations.totalRevenue > 0 ? `${chartPercentages.base}%` : '₹' + calculations.totalBaseCost.toFixed(0)}</span>
                </div>
                {includeFailedPrints && (
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500/70"></span>
                    <span>Failed Cost: {calculations.totalRevenue > 0 ? `${chartPercentages.failed}%` : '₹' + calculations.totalFailedCost.toFixed(0)}</span>
                  </div>
                )}
                {includePackaging && (
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                    <span>Packaging: {calculations.totalRevenue > 0 ? `${chartPercentages.packaging}%` : '₹' + calculations.totalPackagingCost.toFixed(0)}</span>
                  </div>
                )}
                {includeShipping && (
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-cyan-500"></span>
                    <span>Shipping: {calculations.totalRevenue > 0 ? `${chartPercentages.shipping}%` : '₹' + calculations.totalShippingCost.toFixed(0)}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 col-span-2 md:col-span-1">
                  {calculations.netProfit >= 0 ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                      <span className="font-bold text-purple-400">Net Profit: {calculations.totalRevenue > 0 ? `${chartPercentages.profit}%` : '₹' + calculations.netProfit.toFixed(0)}</span>
                    </>
                  ) : (
                    <>
                      <span className="h-2 w-2 rounded-full bg-rose-600 animate-pulse"></span>
                      <span className="font-bold text-rose-400">Net Loss: {calculations.totalRevenue > 0 ? `${chartPercentages.loss}%` : '₹' + Math.abs(calculations.netProfit).toFixed(0)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Detailed Table */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 overflow-hidden shadow-xl">
              <div className="p-4 border-b border-neutral-900 bg-neutral-900/30 flex justify-between items-center">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Financial Breakdown</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-neutral-800 bg-neutral-900 text-neutral-400">Quantity: {quantity}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-neutral-900 text-[10px] text-neutral-500 uppercase font-semibold">
                      <th className="p-3.5 pl-5">Line Item</th>
                      <th className="p-3.5 text-right font-mono">Unit (₹)</th>
                      <th className="p-3.5 text-right font-mono">Total (₹)</th>
                      <th className="p-3.5 text-right font-mono pr-5">% Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900 text-neutral-300">
                    {/* Base Cost */}
                    <tr>
                      <td className="p-3.5 pl-5 font-semibold text-neutral-400 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                        Base Print Production Cost
                      </td>
                      <td className="p-3.5 text-right font-mono">₹{calculations.unitBaseCost.toFixed(2)}</td>
                      <td className="p-3.5 text-right font-mono">₹{calculations.totalBaseCost.toFixed(2)}</td>
                      <td className="p-3.5 text-right font-mono pr-5 text-neutral-500">{chartPercentages.base}%</td>
                    </tr>
                    
                    {/* Failed Prints */}
                    {includeFailedPrints && (
                      <tr>
                        <td className="p-3.5 pl-5 font-semibold text-neutral-400 flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500/70"></span>
                          Failed Prints Allowance ({calculations.failRatePercent}%)
                        </td>
                        <td className="p-3.5 text-right font-mono text-rose-400/80">₹{calculations.unitFailedCost.toFixed(2)}</td>
                        <td className="p-3.5 text-right font-mono text-rose-400/80">₹{calculations.totalFailedCost.toFixed(2)}</td>
                        <td className="p-3.5 text-right font-mono pr-5 text-neutral-500">{chartPercentages.failed}%</td>
                      </tr>
                    )}

                    {/* Packaging */}
                    {includePackaging && (
                      <tr>
                        <td className="p-3.5 pl-5 font-semibold text-neutral-400 flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                          Packaging Cost {packagingCostType === 'flat' ? '(Flat Rate)' : '(Unit)'}
                        </td>
                        <td className="p-3.5 text-right font-mono">₹{calculations.unitPackagingCost.toFixed(2)}</td>
                        <td className="p-3.5 text-right font-mono">₹{calculations.totalPackagingCost.toFixed(2)}</td>
                        <td className="p-3.5 text-right font-mono pr-5 text-neutral-500">{chartPercentages.packaging}%</td>
                      </tr>
                    )}

                    {/* Shipping */}
                    {includeShipping && (
                      <tr>
                        <td className="p-3.5 pl-5 font-semibold text-neutral-400 flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-cyan-500"></span>
                          Shipping Cost {shippingCostType === 'flat' ? '(Flat Rate)' : '(Unit)'}
                        </td>
                        <td className="p-3.5 text-right font-mono">₹{calculations.unitShippingCost.toFixed(2)}</td>
                        <td className="p-3.5 text-right font-mono">₹{calculations.totalShippingCost.toFixed(2)}</td>
                        <td className="p-3.5 text-right font-mono pr-5 text-neutral-500">{chartPercentages.shipping}%</td>
                      </tr>
                    )}

                    {/* Total Expenses Summary Row */}
                    <tr className="bg-neutral-900/10 font-bold border-t border-neutral-900">
                      <td className="p-3.5 pl-5 text-neutral-400">Total Production Cost & Expenses</td>
                      <td className="p-3.5 text-right font-mono">₹{calculations.unitExpenses.toFixed(2)}</td>
                      <td className="p-3.5 text-right font-mono">₹{calculations.totalExpenses.toFixed(2)}</td>
                      <td className="p-3.5 text-right font-mono pr-5 text-neutral-500">
                        {calculations.totalRevenue > 0 
                          ? ((calculations.totalExpenses / calculations.totalRevenue) * 100).toFixed(1) 
                          : '0.0'}%
                      </td>
                    </tr>

                    {/* Selling Price Row */}
                    <tr className="border-t border-neutral-900 bg-neutral-900/20 font-bold text-neutral-200">
                      <td className="p-3.5 pl-5">Total Revenue (Selling Price)</td>
                      <td className="p-3.5 text-right font-mono">₹{calculations.sellingPrice.toFixed(2)}</td>
                      <td className="p-3.5 text-right font-mono">₹{calculations.totalRevenue.toFixed(2)}</td>
                      <td className="p-3.5 text-right pr-5 font-mono">100.0%</td>
                    </tr>

                    {/* Net Profit Summary Row */}
                    <tr className={`font-extrabold border-t-2 border-neutral-900 ${
                      calculations.netProfit >= 0 ? 'bg-purple-950/10 text-purple-400' : 'bg-rose-950/10 text-rose-400'
                    }`}>
                      <td className="p-3.5 pl-5 flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${calculations.netProfit >= 0 ? 'bg-purple-500' : 'bg-rose-600'}`}></span>
                        NET PROFIT
                      </td>
                      <td className="p-3.5 text-right font-mono">₹{calculations.unitProfit.toFixed(2)}</td>
                      <td className="p-3.5 text-right font-mono">₹{calculations.netProfit.toFixed(2)}</td>
                      <td className="p-3.5 text-right pr-5 font-mono">{calculations.profitMargin.toFixed(1)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Smart Insights Note */}
            <div className={`p-4 rounded-2xl border backdrop-blur-md ${
              calculations.netProfit >= 0
                ? 'border-purple-500/20 bg-purple-500/5 text-purple-200'
                : 'border-rose-500/20 bg-rose-500/5 text-rose-200'
            }`}>
              <div className="flex gap-3">
                {calculations.netProfit >= 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold text-sm block">
                    {calculations.netProfit >= 0 ? 'Profitable Batch Run' : 'Loss-making Batch Run'}
                  </span>
                  <p className="mt-1 text-xs text-neutral-400 leading-relaxed">
                    {calculations.netProfit >= 0 ? (
                      <>
                        For printing <strong>{quantity} units</strong> of <strong>{calculations.productName}</strong>, 
                        your net profit is estimated at <strong className="text-purple-400">₹{calculations.netProfit.toFixed(2)}</strong>.
                        Your profit margin is <strong className="text-purple-400">{calculations.profitMargin.toFixed(1)}%</strong>, which is 
                        {calculations.profitMargin >= 50 ? ' excellent! You are in a high-profit bracket.' : calculations.profitMargin >= 30 ? ' healthy and above industry average.' : ' modest. Consider optimizing filament settings or selling price to improve margin.'}
                      </>
                    ) : (
                      <>
                        You are projected to make a loss of <strong className="text-rose-400">₹{Math.abs(calculations.netProfit).toFixed(2)}</strong>.
                        Selling price (₹{calculations.sellingPrice.toFixed(2)}) is lower than your unit costs + overheads (₹{calculations.unitExpenses.toFixed(2)}). 
                        To reach break-even, you need to increase your unit selling price to at least <strong>₹{Math.ceil(calculations.unitExpenses)}</strong> or reduce packaging and delivery costs.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
        </>
        )}

        {/* Saved Calculations Table Section */}
        {(activeViewTab === 'table' || (activeViewTab === 'editor' && savedCalculations.length > 0)) && (
          <div className="mt-8 border-t border-neutral-900 pt-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
                  <Table className="h-5 w-5 text-purple-400" />
                  Saved Calculations History Table
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  View past calculations or click "Edit" on any row to start modifying its inputs in the calculator.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleStartNewCalculation}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-xs font-bold text-emerald-300 transition-all active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Calculation
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-850 bg-neutral-950 overflow-hidden shadow-xl">
              <div className="p-4 border-b border-neutral-900 bg-neutral-900/40 flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    placeholder="Search saved calculations by name or notes..."
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-xs text-neutral-200 outline-none focus:border-purple-500/50"
                  />
                  {historySearchQuery && (
                    <button onClick={() => setHistorySearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-300">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <span className="text-xs text-neutral-500 font-mono">
                  Total Saved: {savedCalculations.length}
                </span>
              </div>

              {savedCalculations.length === 0 ? (
                <div className="p-12 text-center text-neutral-500 space-y-3">
                  <FolderOpen className="h-10 w-10 mx-auto text-neutral-700" />
                  <p className="text-sm font-semibold">No saved calculations yet.</p>
                  <p className="text-xs text-neutral-600 max-w-sm mx-auto">
                    Configure your product costs above and click <strong>"Save Run"</strong> to bookmark your profit calculations in this table.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-neutral-900 text-[10px] text-neutral-500 uppercase font-semibold bg-neutral-900/20">
                        <th className="p-3.5 pl-5">Calculation Title</th>
                        <th className="p-3.5">Date</th>
                        <th className="p-3.5 text-center">Batch Size</th>
                        <th className="p-3.5 text-right font-mono">Revenue (₹)</th>
                        <th className="p-3.5 text-right font-mono">Expenses (₹)</th>
                        <th className="p-3.5 text-right font-mono">Net Profit (₹)</th>
                        <th className="p-3.5 text-right font-mono">Margin</th>
                        <th className="p-3.5 text-center pr-5">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900 text-neutral-300">
                      {savedCalculations
                        .filter((item) =>
                          item.title.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
                          (item.notes && item.notes.toLowerCase().includes(historySearchQuery.toLowerCase()))
                        )
                        .map((item) => (
                          <tr
                            key={item.id}
                            className={`hover:bg-neutral-900/50 transition-colors ${
                              editingCalculationId === item.id ? 'bg-purple-950/20 border-l-2 border-l-purple-500' : ''
                            }`}
                          >
                            <td className="p-3.5 pl-5">
                              <div className="font-bold text-neutral-100 flex items-center gap-1.5">
                                {item.title}
                                {editingCalculationId === item.id && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-mono font-bold">
                                    Editing
                                  </span>
                                )}
                              </div>
                              {item.notes && (
                                <p className="text-[10px] text-neutral-500 mt-0.5 line-clamp-1">{item.notes}</p>
                              )}
                            </td>
                            <td className="p-3.5 text-neutral-500 text-[11px]">
                              {new Date(item.date).toLocaleDateString()}
                            </td>
                            <td className="p-3.5 text-center font-mono font-bold text-neutral-300">
                              {item.quantity}x
                            </td>
                            <td className="p-3.5 text-right font-mono text-emerald-400">
                              ₹{item.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3.5 text-right font-mono text-rose-400/80">
                              ₹{item.totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className={`p-3.5 text-right font-mono font-bold ${
                              item.netProfit >= 0 ? 'text-purple-400' : 'text-rose-400'
                            }`}>
                              ₹{item.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3.5 text-right font-mono font-bold">
                              <span className={`px-2 py-0.5 rounded-full ${
                                item.profitMargin >= 30 ? 'bg-emerald-950/50 text-emerald-400' : item.profitMargin >= 0 ? 'bg-purple-950/50 text-purple-400' : 'bg-rose-950/50 text-rose-400'
                              }`}>
                                {item.profitMargin.toFixed(1)}%
                              </span>
                            </td>
                            <td className="p-3.5 pr-5 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleEditSavedCalculation(item)}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/30 text-purple-300 text-[11px] font-bold transition-all hover:scale-105 active:scale-95"
                                  title="Edit calculation values"
                                >
                                  <Pencil className="h-3 w-3" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Delete "${item.title}" from saved history?`)) {
                                      deleteCalculation(item.id);
                                      if (editingCalculationId === item.id) {
                                        setEditingCalculationId(null);
                                      }
                                      triggerAlert('success', 'Deleted calculation from history.');
                                    }
                                  }}
                                  className="p-1 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-950/30 transition-all"
                                  title="Delete calculation"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Save Run Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
              <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                <Save className="h-4 w-4 text-purple-400" />
                {editingCalculationId ? 'Update Profit Calculation' : 'Save Profit Calculation'}
              </h3>
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="text-neutral-500 hover:text-neutral-300 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!saveTitle.trim()) return;

                const payload = {
                  title: saveTitle.trim(),
                  notes: saveNotes.trim(),
                  calculationMode,
                  selectedProductId,
                  manualName,
                  manualCost,
                  manualSellingPrice,
                  quantity,
                  includeFailedPrints,
                  failedPrintsRate,
                  includePackaging,
                  packagingSource,
                  customPackagingCost,
                  packagingCostType,
                  includeShipping,
                  shippingSource,
                  customShippingCost,
                  shippingCostType,
                  totalRevenue: calculations.totalRevenue,
                  totalExpenses: calculations.totalExpenses,
                  netProfit: calculations.netProfit,
                  profitMargin: calculations.profitMargin,
                };

                if (editingCalculationId) {
                  updateCalculation(editingCalculationId, payload);
                  triggerAlert('success', `Updated calculation "${saveTitle.trim()}"!`);
                } else {
                  saveCalculation(payload);
                  triggerAlert('success', `Saved "${saveTitle.trim()}" to history!`);
                }

                setIsSaveModalOpen(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">Title / Label</label>
                <input
                  type="text"
                  required
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  placeholder="e.g. Lithophane Frame (100x)"
                  className="block w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">Notes / Client Info (Optional)</label>
                <textarea
                  value={saveNotes}
                  onChange={(e) => setSaveNotes(e.target.value)}
                  placeholder="e.g., Quote for Meesho order #1084"
                  rows={3}
                  className="block w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-100 focus:border-purple-500 focus:outline-none resize-none"
                />
              </div>

              <div className="rounded-xl bg-neutral-900/50 p-3 border border-neutral-900 text-xs space-y-1 font-mono text-neutral-400">
                <div className="flex justify-between">
                  <span>Batch Revenue:</span>
                  <span className="text-emerald-400">₹{calculations.totalRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Net Profit:</span>
                  <span className={calculations.netProfit >= 0 ? "text-purple-400 font-bold" : "text-rose-400 font-bold"}>
                    ₹{calculations.netProfit.toFixed(2)} ({calculations.profitMargin.toFixed(1)}%)
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-neutral-400 hover:text-neutral-200 border border-transparent hover:border-neutral-800"
                >
                  Cancel
                </button>

                {editingCalculationId ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (!saveTitle.trim()) return;
                        saveCalculation({
                          title: `${saveTitle.trim()} (Copy)`,
                          notes: saveNotes.trim(),
                          calculationMode,
                          selectedProductId,
                          manualName,
                          manualCost,
                          manualSellingPrice,
                          quantity,
                          includeFailedPrints,
                          failedPrintsRate,
                          includePackaging,
                          packagingSource,
                          customPackagingCost,
                          packagingCostType,
                          includeShipping,
                          shippingSource,
                          customShippingCost,
                          shippingCostType,
                          totalRevenue: calculations.totalRevenue,
                          totalExpenses: calculations.totalExpenses,
                          netProfit: calculations.netProfit,
                          profitMargin: calculations.profitMargin,
                        });
                        setIsSaveModalOpen(false);
                        triggerAlert('success', `Saved new copy "${saveTitle.trim()} (Copy)"!`);
                      }}
                      className="px-3.5 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs font-semibold text-neutral-200 hover:bg-neutral-800"
                    >
                      Save as New Copy
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-xs font-bold text-white shadow-md hover:from-purple-500 hover:to-indigo-500"
                    >
                      Update Existing
                    </button>
                  </>
                ) : (
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-xs font-bold text-white shadow-md hover:from-purple-500 hover:to-indigo-500"
                  >
                    Save Calculation
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Drawer */}
      {isHistoryDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-neutral-950 border-l border-neutral-850 h-full flex flex-col shadow-2xl">
            {/* Drawer Header */}
            <div className="p-4 border-b border-neutral-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-purple-400" />
                <h3 className="text-base font-bold text-neutral-100">Saved Calculation Runs</h3>
                <span className="px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-mono text-purple-400 font-bold">
                  {savedCalculations.length}
                </span>
              </div>
              <button
                onClick={() => setIsHistoryDrawerOpen(false)}
                className="text-neutral-500 hover:text-neutral-300 p-1 rounded-lg hover:bg-neutral-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search & Clear Bar */}
            <div className="p-4 border-b border-neutral-900 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="Search history by title or notes..."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-xs text-neutral-200 outline-none focus:border-purple-500/50"
                />
                {historySearchQuery && (
                  <button onClick={() => setHistorySearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-300">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {savedCalculations.length > 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to clear all saved calculation history?')) {
                        clearHistory();
                        triggerAlert('success', 'History cleared!');
                      }
                    }}
                    className="text-[11px] text-neutral-500 hover:text-rose-400 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear All History
                  </button>
                </div>
              )}
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {savedCalculations.length === 0 ? (
                <div className="text-center py-16 text-neutral-500 space-y-3">
                  <FolderOpen className="h-10 w-10 mx-auto text-neutral-700" />
                  <p className="text-xs">No saved calculations found.</p>
                  <p className="text-[10px] text-neutral-600">Click "Save Run" in the top bar to save a snapshot of your profit calculations.</p>
                </div>
              ) : (
                savedCalculations
                  .filter((item) =>
                    item.title.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
                    (item.notes && item.notes.toLowerCase().includes(historySearchQuery.toLowerCase()))
                  )
                  .map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-neutral-850 bg-neutral-900/40 p-4 space-y-3 hover:border-purple-500/30 transition-all group"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-bold text-neutral-100 group-hover:text-purple-300 transition-colors">{item.title}</h4>
                          <span className="text-[10px] text-neutral-500 block mt-0.5">
                            {new Date(item.date).toLocaleString()}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            deleteCalculation(item.id);
                            triggerAlert('success', 'Calculation removed from history.');
                          }}
                          className="text-neutral-600 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete from history"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {item.notes && (
                        <p className="text-xs text-neutral-400 bg-neutral-900/80 p-2 rounded-lg border border-neutral-900 leading-relaxed">
                          {item.notes}
                        </p>
                      )}

                      {/* Snapshot Metrics */}
                      <div className="grid grid-cols-3 gap-2 bg-neutral-950 p-2 rounded-lg border border-neutral-900 text-center font-mono text-[11px]">
                        <div>
                          <span className="text-[9px] uppercase text-neutral-500 block font-sans">Batch Size</span>
                          <span className="text-neutral-300 font-bold">{item.quantity}x</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-neutral-500 block font-sans">Revenue</span>
                          <span className="text-emerald-400">₹{item.totalRevenue.toFixed(0)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-neutral-500 block font-sans">Net Profit</span>
                          <span className={item.netProfit >= 0 ? "text-purple-400 font-bold" : "text-rose-400 font-bold"}>
                            ₹{item.netProfit.toFixed(0)}
                          </span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => handleEditSavedCalculation(item)}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-purple-950/40 border border-neutral-800 hover:border-purple-500/40 text-xs font-semibold text-neutral-300 hover:text-purple-300 transition-all"
                      >
                        <Pencil className="h-3.5 w-3.5 text-purple-400" />
                        Edit / Load into Form
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
