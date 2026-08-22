import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Sale, SaleItem, PaymentMethod } from '../../types/sale';
import type { Product } from '../../types/product';
import catalogPuzzlesData from '../../data/catalog_puzzles.json';
import { 
  Plus, 
  Trash2, 
  Search, 
  ShoppingBag, 
  IndianRupee, 
  Sparkles, 
  Smartphone, 
  Banknote, 
  CreditCard, 
  X, 
  Package, 
  Layers, 
  Clock, 
  Tag, 
  Flame, 
  User, 
  Phone, 
  FileText,
  Receipt
} from 'lucide-react';


interface CatalogEntry {
  id: string;
  name: string;
  price: number;
  cost_price?: number;
  image?: string;
  print_time?: string;
  weight?: number;
  source: 'uploaded' | 'product_db' | 'custom';
}

interface QuickSaleFormProps {
  products: Product[];
  onRecordSale: (sale: Omit<Sale, 'id' | 'created_at'>) => Promise<Sale | void>;
  isRecording?: boolean;
}

const COMMON_PRICE_PRESETS = [49, 99, 149, 199, 249, 299, 399, 499];

export const QuickSaleForm: React.FC<QuickSaleFormProps> = ({
  products,
  onRecordSale,
  isRecording = false,
}) => {
  // Mode: 'catalog' vs 'custom'
  const [entryMode, setEntryMode] = useState<'catalog' | 'custom'>('catalog');

  // Unified Catalog of available items (Supabase products + Uploaded catalog items)
  const catalogList = useMemo<CatalogEntry[]>(() => {
    const map = new Map<string, CatalogEntry>();

    // 1. Add Supabase products
    for (const p of products) {
      if (!p.name) continue;
      const key = p.name.trim().toLowerCase();
      map.set(key, {
        id: p.id || `prod-${key}`,
        name: p.name,
        price: Number(p.selling_price) || 299,
        cost_price: Math.round(((p.filament_weight || 40) / 1000) * (p.cost_per_kg || 800) + (p.packaging_cost || 0)),
        image: p.image_url || undefined,
        print_time: p.print_time,
        weight: p.filament_weight,
        source: 'product_db',
      });
    }

    // 2. Add Uploaded Catalog items (from catalog_puzzles.json)
    if (Array.isArray(catalogPuzzlesData)) {
      for (const item of catalogPuzzlesData as any[]) {
        if (!item.name) continue;
        const key = item.name.trim().toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            id: item.id || `cat-${key}`,
            name: item.name,
            price: Number(item.price) || 299,
            cost_price: Number(item.cost_price) || 50,
            image: item.main_image || (item.images && item.images[0]) || undefined,
            print_time: item.print_time,
            weight: item.filament_weight,
            source: 'uploaded',
          });
        }
      }
    }

    return Array.from(map.values());
  }, [products]);

  // Current Item in progress
  const [productSearch, setProductSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogEntry | null>(null);

  // Form input fields for active item
  const [customName, setCustomName] = useState('');
  const [sellingPrice, setSellingPrice] = useState<number | ''>(299);
  const [costPrice, setCostPrice] = useState<number | ''>(50);
  const [quantity, setQuantity] = useState<number>(1);

  // Overall Sale fields
  const [cartItems, setCartItems] = useState<SaleItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState<number | ''>(0);
  const [notes, setNotes] = useState('');
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter catalog items for autocomplete
  const filteredCatalog = useMemo(() => {
    if (!productSearch.trim()) return catalogList.slice(0, 15);
    const q = productSearch.toLowerCase();
    return catalogList.filter((item) => item.name.toLowerCase().includes(q)).slice(0, 15);
  }, [catalogList, productSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle selecting a catalog item
  const handleSelectCatalogItem = (item: CatalogEntry) => {
    setSelectedCatalogItem(item);
    setProductSearch(item.name);
    setSellingPrice(item.price);
    setCostPrice(item.cost_price !== undefined ? item.cost_price : '');
    setIsDropdownOpen(false);
  };

  // Switch to custom mode with current typed text
  const handleUseCustomName = (nameToUse?: string) => {
    const name = nameToUse || productSearch.trim() || 'Custom 3D Item';
    setEntryMode('custom');
    setCustomName(name);
    setSelectedCatalogItem(null);
    setIsDropdownOpen(false);
  };

  // Get active item name
  const activeItemName = entryMode === 'catalog' 
    ? (selectedCatalogItem?.name || productSearch.trim() || '3D Printed Model')
    : (customName.trim() || 'Custom 3D Item');

  // Profit calculation for the active item in progress
  const numSelling = Number(sellingPrice) || 0;
  const numCost = Number(costPrice) || 0;
  const unitProfit = numCost > 0 ? numSelling - numCost : 0;
  const unitMargin = numSelling > 0 && numCost > 0 ? Math.round((unitProfit / numSelling) * 100) : 0;

  // Build the active SaleItem object
  const buildCurrentSaleItem = (): SaleItem => {
    const total_price = numSelling * quantity;
    const total_cost = numCost > 0 ? numCost * quantity : 0;
    const profit = total_price - total_cost;

    return {
      id: crypto.randomUUID(),
      product_id: selectedCatalogItem?.id || null,
      product_name: activeItemName,
      is_custom: entryMode === 'custom' || !selectedCatalogItem,
      quantity,
      unit_price: numSelling,
      cost_price: numCost > 0 ? numCost : undefined,
      total_price,
      total_cost,
      profit,
      image_url: selectedCatalogItem?.image || null,
    };
  };

  // Add active item to cart
  const handleAddToCart = () => {
    if (numSelling <= 0) {
      alert('Please enter a valid selling price.');
      return;
    }
    const item = buildCurrentSaleItem();
    setCartItems((prev) => [...prev, item]);

    // Reset current item inputs for next item
    setProductSearch('');
    setSelectedCatalogItem(null);
    setCustomName('');
    setSellingPrice(299);
    setCostPrice(50);
    setQuantity(1);
    setEntryMode('catalog');
  };

  // Remove item from cart
  const handleRemoveFromCart = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculate totals
  const allItemsToSell = useMemo(() => {
    if (cartItems.length > 0) return cartItems;
    // If cart is empty, treat the current form input as the single item
    if (numSelling > 0 && activeItemName) {
      return [buildCurrentSaleItem()];
    }
    return [];
  }, [cartItems, numSelling, activeItemName, quantity, numCost, selectedCatalogItem, entryMode]);

  const subtotal = allItemsToSell.reduce((sum, i) => sum + i.total_price, 0);
  const numDiscount = Number(discount) || 0;
  const totalAmount = Math.max(0, subtotal - numDiscount);
  const totalCost = allItemsToSell.reduce((sum, i) => sum + (i.total_cost || 0), 0);
  const totalProfit = totalAmount - totalCost;

  // Generate Receipt Ref (e.g. RS-20260808-XXX)
  const generateReceiptRef = () => {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(100 + Math.random() * 900);
    return `RS-${todayStr}-${rand}`;
  };

  // Submit and record the sale
  const handleRecordSale = async () => {
    if (allItemsToSell.length === 0) {
      alert('Please enter a product name and price.');
      return;
    }

    const salePayload: Omit<Sale, 'id' | 'created_at'> = {
      receipt_no: generateReceiptRef(),
      items: allItemsToSell,
      subtotal,
      discount: numDiscount,
      total_amount: totalAmount,
      total_cost: totalCost,
      total_profit: totalProfit,
      payment_method: paymentMethod,
      customer_name: customerName.trim() || undefined,
      customer_phone: customerPhone.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    try {
      await onRecordSale(salePayload);

      // Reset entire form
      setCartItems([]);
      setProductSearch('');
      setSelectedCatalogItem(null);
      setCustomName('');
      setSellingPrice(299);
      setCostPrice(50);
      setQuantity(1);
      setDiscount(0);
      setCustomerName('');
      setCustomerPhone('');
      setNotes('');
      setEntryMode('catalog');
    } catch (err: any) {
      console.error('Record sale error:', err);
    }
  };

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-5 md:p-6 shadow-2xl backdrop-blur-xl mb-8">
      {/* Header with Mode Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/80 pb-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow shadow-purple-500/40">
              <Flame className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Quick Stall Sale & Rough Billing
            </h2>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Instant point-of-sale recorder for market customers with live profit calculation.
          </p>
        </div>

        {/* Catalog vs Custom Toggle */}
        <div className="flex items-center bg-neutral-950 p-1 rounded-xl border border-neutral-800 shrink-0">
          <button
            type="button"
            onClick={() => {
              setEntryMode('catalog');
              if (!productSearch && selectedCatalogItem) {
                setProductSearch(selectedCatalogItem.name);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              entryMode === 'catalog'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            Select from Catalog ({catalogList.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setEntryMode('custom');
              if (!customName && productSearch) {
                setCustomName(productSearch);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              entryMode === 'custom'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Tag className="h-3.5 w-3.5" />
            Custom Item Name
          </button>
        </div>
      </div>

      {/* Main Form Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* 1. Product Name (Catalog Autocomplete OR Custom Input) */}
        <div className="md:col-span-6 relative">
          <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
            {entryMode === 'catalog' ? 'Search Uploaded Catalog' : 'Custom Product / Item Name'} *
          </label>

          {entryMode === 'catalog' ? (
            <div className="relative">
              <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500/50 transition-all">
                <Search className="h-4 w-4 text-neutral-500 shrink-0 mr-2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Type to search (e.g., Minion, Dragon, Pencil Box)..."
                  value={productSearch}
                  onFocus={() => setIsDropdownOpen(true)}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setIsDropdownOpen(true);
                    if (selectedCatalogItem && e.target.value !== selectedCatalogItem.name) {
                      setSelectedCatalogItem(null);
                    }
                  }}
                  className="w-full bg-transparent text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none"
                />
                {productSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setProductSearch('');
                      setSelectedCatalogItem(null);
                    }}
                    className="text-neutral-500 hover:text-neutral-300 p-1"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown List */}
              {isDropdownOpen && (
                <div
                  ref={dropdownRef}
                  className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-72 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-950 p-1.5 shadow-2xl backdrop-blur-xl"
                >
                  {filteredCatalog.length > 0 ? (
                    <div className="space-y-1">
                      {filteredCatalog.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectCatalogItem(item)}
                          className="w-full flex items-center justify-between p-2 rounded-lg text-left hover:bg-neutral-900 transition-all group"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="h-9 w-9 rounded-md object-cover border border-neutral-800 shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="h-9 w-9 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                                <Package className="h-4 w-4" />
                              </div>
                            )}
                            <div className="truncate">
                              <div className="text-sm font-semibold text-neutral-200 group-hover:text-purple-300 truncate">
                                {item.name}
                              </div>
                              <div className="text-[11px] text-neutral-500 flex items-center gap-2">
                                {item.print_time && (
                                  <span className="flex items-center gap-0.5">
                                    <Clock className="h-3 w-3" /> {item.print_time}
                                  </span>
                                )}
                                {item.weight && (
                                  <span className="flex items-center gap-0.5">
                                    <Layers className="h-3 w-3" /> {item.weight}g
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0 ml-2">
                            <div className="text-sm font-bold text-emerald-400">
                              ₹{item.price}
                            </div>
                            {item.cost_price && (
                              <div className="text-[10px] text-neutral-500">
                                cost: ₹{item.cost_price}
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 text-center text-xs text-neutral-400">
                      No matching catalog items.
                    </div>
                  )}

                  {/* Option to create as custom name */}
                  {productSearch.trim() && (
                    <div className="border-t border-neutral-850 pt-1.5 mt-1.5">
                      <button
                        type="button"
                        onClick={() => handleUseCustomName(productSearch)}
                        className="w-full flex items-center gap-2 p-2 rounded-lg text-xs font-semibold text-purple-400 hover:bg-purple-500/10 transition-all"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Use &ldquo;{productSearch}&rdquo; as Custom Product Name
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                placeholder="Enter bespoke item (e.g. Personalized Keychain, Custom Toy)..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all"
              />
            </div>
          )}
        </div>

        {/* 2. Selling Price (₹) */}
        <div className="md:col-span-3">
          <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
            Selling Price (₹) *
          </label>
          <div className="relative flex items-center bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/50 transition-all">
            <IndianRupee className="h-4 w-4 text-emerald-400 shrink-0 mr-1.5" />
            <input
              type="number"
              min="0"
              step="1"
              placeholder="299"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full bg-transparent text-sm font-bold text-emerald-400 placeholder-neutral-600 focus:outline-none"
            />
          </div>
        </div>

        {/* 3. Optional Making / Cost Price (₹) */}
        <div className="md:col-span-3">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
              Making Cost (₹)
            </label>
            <span className="text-[10px] text-neutral-500">(Optional)</span>
          </div>
          <div className="relative flex items-center bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500/50 transition-all">
            <span className="text-neutral-500 text-xs mr-1.5">₹</span>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="50 (Filament+Power)"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full bg-transparent text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Quick Price Shortcuts & Quantity Row */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-850">
        {/* Preset Price Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-neutral-500 mr-1">Quick ₹:</span>
          {COMMON_PRICE_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setSellingPrice(p)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                sellingPrice === p
                  ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300 shadow-sm shadow-emerald-500/20'
                  : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
              }`}
            >
              ₹{p}
            </button>
          ))}
        </div>

        {/* Quantity Stepper */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-neutral-400">Qty:</span>
          <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="h-7 w-7 rounded flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all font-bold"
            >
              -
            </button>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-10 text-center bg-transparent text-xs font-bold text-white focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="h-7 w-7 rounded flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all font-bold"
            >
              +
            </button>
          </div>

          {/* Add to Basket button */}
          <button
            type="button"
            onClick={handleAddToCart}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/40 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 text-xs font-semibold transition-all ml-1"
          >
            <Plus className="h-3.5 w-3.5" />
            + Add to Basket
          </button>
        </div>
      </div>

      {/* Live Profit Preview for Current Item */}
      {numSelling > 0 && numCost > 0 && (
        <div className="mt-3 flex items-center justify-between bg-emerald-950/30 border border-emerald-800/40 rounded-xl px-3.5 py-2 text-xs text-emerald-400">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span>
              Item Profit: <strong className="text-emerald-300">₹{unitProfit * quantity}</strong>
            </span>
          </div>
          <span className="font-bold bg-emerald-900/60 border border-emerald-700/50 px-2 py-0.5 rounded-full text-[11px]">
            {unitMargin}% margin
          </span>
        </div>
      )}

      {/* Cart Multi-item Basket Preview (if items added to cart) */}
      {cartItems.length > 0 && (
        <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950/80 p-3.5">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
            <span className="flex items-center gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5 text-purple-400" />
              Basket Items ({cartItems.length})
            </span>
            <button
              type="button"
              onClick={() => setCartItems([])}
              className="text-[11px] text-red-400 hover:text-red-300"
            >
              Clear Basket
            </button>
          </div>

          <div className="divide-y divide-neutral-900">
            {cartItems.map((item, idx) => (
              <div key={item.id} className="py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500 font-mono">{idx + 1}.</span>
                  <span className="font-medium text-neutral-200">{item.product_name}</span>
                  <span className="text-neutral-400">
                    ({item.quantity} × ₹{item.unit_price})
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-emerald-400">₹{item.total_price}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFromCart(idx)}
                    className="text-neutral-500 hover:text-red-400 p-0.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Method & Customer Details */}
      <div className="mt-5 pt-4 border-t border-neutral-800/80 grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Payment Method Selector */}
        <div className="md:col-span-6">
          <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
            Payment Mode *
          </label>
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('UPI')}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                paymentMethod === 'UPI'
                  ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300 shadow-md shadow-emerald-500/20 font-bold'
                  : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
              }`}
            >
              <Smartphone className="h-4 w-4 mb-1" />
              <span className="text-xs">UPI / QR</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('Cash')}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                paymentMethod === 'Cash'
                  ? 'border-amber-500 bg-amber-500/15 text-amber-300 shadow-md shadow-amber-500/20 font-bold'
                  : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
              }`}
            >
              <Banknote className="h-4 w-4 mb-1" />
              <span className="text-xs">Cash</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('Card')}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                paymentMethod === 'Card'
                  ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300 shadow-md shadow-indigo-500/20 font-bold'
                  : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
              }`}
            >
              <CreditCard className="h-4 w-4 mb-1" />
              <span className="text-xs">Card</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('Other')}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                paymentMethod === 'Other'
                  ? 'border-purple-500 bg-purple-500/15 text-purple-300 shadow-md shadow-purple-500/20 font-bold'
                  : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
              }`}
            >
              <Tag className="h-4 w-4 mb-1" />
              <span className="text-xs">Other</span>
            </button>
          </div>
        </div>

        {/* Discount (Optional) */}
        <div className="md:col-span-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                Discount / Roundoff (₹)
              </label>
              <button
                type="button"
                onClick={() => setShowOptionalDetails(!showOptionalDetails)}
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
              >
                {showOptionalDetails ? 'Hide Customer Info' : '+ Add Customer / Phone (WhatsApp)'}
              </button>
            </div>
            <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2">
              <span className="text-neutral-500 text-xs mr-2">-₹</span>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-transparent text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Grand Total & Instant Record Button */}
          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] text-neutral-400 uppercase font-semibold">Total to Collect:</div>
              <div className="text-2xl font-black text-white">
                ₹{totalAmount.toLocaleString('en-IN')}
              </div>
            </div>

            <button
              type="button"
              disabled={isRecording || allItemsToSell.length === 0}
              onClick={handleRecordSale}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold px-5 py-3 shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              <Receipt className="h-5 w-5" />
              <span>{isRecording ? 'Recording Sale...' : '⚡ Record Sale & Receipt'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Optional Customer Name & Phone for instant WhatsApp receipt */}
      {showOptionalDetails && (
        <div className="mt-4 pt-4 border-t border-neutral-850 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-200">
          <div>
            <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
              Customer Name
            </label>
            <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2">
              <User className="h-3.5 w-3.5 text-neutral-500 mr-2" />
              <input
                type="text"
                placeholder="e.g. Rahul, Priya"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-transparent text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
              WhatsApp / Phone Number
            </label>
            <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2">
              <Phone className="h-3.5 w-3.5 text-neutral-500 mr-2" />
              <input
                type="tel"
                placeholder="9876543210"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full bg-transparent text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
              Notes / Color
            </label>
            <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2">
              <FileText className="h-3.5 w-3.5 text-neutral-500 mr-2" />
              <input
                type="text"
                placeholder="e.g. Blue Silk PLA, gift bag"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-transparent text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
