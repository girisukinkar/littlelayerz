import React, { useState, useEffect } from 'react';
import {
  Search,
  X,
  ExternalLink,
  Tag,
  ChevronLeft,
  ChevronRight,
  Download,
  CheckCircle2,
  PackageCheck,
  Printer,
  Sliders,
  DollarSign,
  Trash2,
  CheckSquare,
  Square,
  Database,
  Radio
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface CatalogItem {
  id: string;
  slug: string;
  name: string;
  author?: string;
  description?: string;
  makerworld_url: string;
  price: number | string;
  cost_price?: number;
  print_time?: string;
  filament_weight?: number;
  images: string[];
  main_image: string;
  category: string;
  created_at: string;
}

export const Catalog: React.FC = () => {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Selected items for PDF export
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Bulk Price Modal state
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkPriceInput, setBulkPriceInput] = useState<string>('299');

  // Image slider active index map
  const [activeImageIndexMap, setActiveImageIndexMap] = useState<Record<string, number>>({});
  
  // Toast alert message
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch all products directly from Supabase (Zero LocalStorage)
  const fetchProductsFromSupabase = async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase fetch error:', error);
        showToast(`Failed to load from Supabase: ${error.message}`);
        setIsLoading(false);
        return;
      }

      const parsedItems: CatalogItem[] = (data || []).map((row) => {
        let images: string[] = [];
        let main_image = '';
        let makerworld_url = '';
        let slug = '';

        if (row.image_url) {
          try {
            if (row.image_url.trim().startsWith('{')) {
              const meta = JSON.parse(row.image_url);
              images = meta.images || [];
              main_image = meta.main_image || (images[0] || '');
              makerworld_url = meta.makerworld_url || '';
              slug = meta.slug || '';
            } else {
              main_image = row.image_url;
              images = [row.image_url];
            }
          } catch (e) {
            main_image = row.image_url;
            images = [row.image_url];
          }
        }

        return {
          id: row.id,
          slug: slug || row.id,
          name: row.name,
          price: row.selling_price ?? '',
          print_time: row.print_time || '2h',
          filament_weight: row.filament_weight || 40,
          makerworld_url:
            makerworld_url ||
            `https://makerworld.com/en/search/models?keyword=${encodeURIComponent(row.name)}`,
          images: images.length > 0 ? images : [main_image || '/placeholder.png'],
          main_image: main_image || (images[0] || '/placeholder.png'),
          category: '3D Model',
          created_at: row.created_at || new Date().toISOString(),
        };
      });

      setItems(parsedItems);
      setSelectedIds((prev) => {
        // Retain or select all if new
        if (prev.size === 0) {
          return new Set(parsedItems.map((i) => i.id));
        }
        const updatedSet = new Set<string>();
        parsedItems.forEach((i) => {
          if (prev.has(i.id)) updatedSet.add(i.id);
        });
        return updatedSet.size > 0 ? updatedSet : new Set(parsedItems.map((i) => i.id));
      });
    } catch (err: any) {
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Realtime Supabase Subscription & Initial Load
  useEffect(() => {
    fetchProductsFromSupabase();

    if (isSupabaseConfigured) {
      const channel = supabase
        .channel('products_realtime_catalog')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'products' },
          (payload) => {
            console.log('Realtime change received from Supabase:', payload);
            fetchProductsFromSupabase();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, []);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(items.map((i) => i.id)));
    showToast('All items selected for PDF catalog');
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
    showToast('Deselected all items');
  };

  // Permanent Product Deletion (Directly in Supabase)
  const handleDeleteProduct = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently delete "${name}" from your catalog?`)) {
      // Optimistic UI update
      setItems((prev) => prev.filter((item) => item.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      if (isSupabaseConfigured) {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) {
          console.error('Supabase delete error:', error);
          showToast(`Delete failed on Supabase: ${error.message}`);
          fetchProductsFromSupabase();
          return;
        }
      }

      showToast(`Permanently deleted "${name}" from Supabase`);
    }
  };

  // Price Input Change (Directly saved to Supabase in real-time)
  const handlePriceInputChange = async (id: string, val: string) => {
    const updatedPrice = val.trim() === '' ? '' : val;
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, price: updatedPrice } : item))
    );

    if (isSupabaseConfigured) {
      const priceNum = val.trim() === '' ? 0 : parseFloat(val) || 0;
      const { error } = await supabase
        .from('products')
        .update({ selling_price: priceNum })
        .eq('id', id);

      if (error) {
        console.error('Supabase price update error:', error);
      }
    }
  };

  // Batch Set Price (Directly updated in Supabase)
  const handleApplyBulkPrice = async () => {
    const newPrice = parseFloat(bulkPriceInput);
    if (isNaN(newPrice) || newPrice < 0) {
      showToast('Please enter a valid bulk price');
      return;
    }

    setItems((prev) => prev.map((item) => ({ ...item, price: newPrice })));
    setIsBulkModalOpen(false);

    if (isSupabaseConfigured) {
      showToast(`Updating prices in Supabase...`);
      const { error } = await supabase
        .from('products')
        .update({ selling_price: newPrice })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) {
        console.error('Supabase bulk price error:', error);
        showToast(`Failed bulk price update: ${error.message}`);
      } else {
        showToast(`Updated all catalog items to ₹${newPrice} in Supabase!`);
      }
    }
  };

  // Delete Image from Gallery (Directly saved to Supabase)
  const handleDeleteImage = async (itemId: string, imgIdxToDelete: number) => {
    const targetItem = items.find((i) => i.id === itemId);
    if (!targetItem) return;

    const newImages = targetItem.images.filter((_, idx) => idx !== imgIdxToDelete);
    const newMain = newImages[0] || '';

    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          images: newImages,
          main_image: newMain,
        };
      })
    );
    setActiveImageIndexMap((prev) => ({ ...prev, [itemId]: 0 }));

    if (isSupabaseConfigured) {
      const updatedMeta = JSON.stringify({
        main_image: newMain,
        images: newImages,
        makerworld_url: targetItem.makerworld_url,
        slug: targetItem.slug,
      });

      const { error } = await supabase
        .from('products')
        .update({ image_url: updatedMeta })
        .eq('id', itemId);

      if (error) {
        console.error('Supabase image update error:', error);
      } else {
        showToast('Image deleted and saved in Supabase');
      }
    }
  };

  const handleDownloadPDF = () => {
    if (selectedIds.size === 0) {
      showToast('Please select at least 1 product to generate PDF catalog!');
      return;
    }

    showToast(`Opening PDF Print Preview for ${selectedIds.size} selected items... Select "Save as PDF"`);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleExportJSON = () => {
    const selectedItems = items.filter((i) => selectedIds.has(i.id));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedItems, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "makerworld_catalog_items.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(`Exported ${selectedItems.length} catalog items to JSON`);
  };

  const handleNextImage = (itemId: string, maxImages: number) => {
    setActiveImageIndexMap((prev) => ({
      ...prev,
      [itemId]: ((prev[itemId] || 0) + 1) % maxImages,
    }));
  };

  const handlePrevImage = (itemId: string, maxImages: number) => {
    setActiveImageIndexMap((prev) => ({
      ...prev,
      [itemId]: ((prev[itemId] || 0) - 1 + maxImages) % maxImages,
    }));
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    return item.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const totalValue = items.reduce((acc, curr) => {
    const p = typeof curr.price === 'number' ? curr.price : parseFloat(curr.price as string);
    return acc + (isNaN(p) ? 0 : p);
  }, 0);
  const avgPrice = items.length > 0 ? (totalValue / items.length).toFixed(0) : '0';

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-8 md:px-8 text-neutral-100 selection:bg-purple-500/30 selection:text-purple-200 print:bg-white print:text-black print:p-0">
      
      {/* ================= PRINT-ONLY PDF HEADER ================= */}
      <div className="hidden print:block mb-8 pb-4 border-b-2 border-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">DEXTER3D ERP - PRODUCT CATALOG</h1>
            <p className="text-sm font-semibold text-slate-600">3D Printed Product & Toy Collection</p>
          </div>
          <div className="text-right text-xs text-slate-500 font-mono">
            <div>Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div>Selected Items in PDF: {selectedIds.size} / {items.length}</div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl">
        {/* Screen Header Block (Hidden in Print) */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-neutral-900 pb-6 mb-6 gap-4 print:hidden">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <Radio className="h-3 w-3 animate-pulse" />
                Supabase Realtime Data
              </span>
              <span className="text-xs text-neutral-500">• {items.length} Models Active</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-50 bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent mt-1">
              All 3D Catalog
            </h1>
            <p className="text-sm text-neutral-400 mt-1">
              Live Supabase database. Real-time prices, photo controls, item selection, and PDF export.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap gap-2.5">
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-neutral-900 border border-neutral-800 px-3.5 py-2.5 text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 transition-all shadow-sm"
              title="Set same price across all products"
            >
              <Sliders className="h-4 w-4 text-purple-400" />
              Batch Set Price
            </button>

            <button
              onClick={handleExportJSON}
              className="flex items-center gap-2 rounded-xl bg-neutral-900 border border-neutral-800 px-3.5 py-2.5 text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 transition-all shadow-sm"
              title="Export selected items as JSON"
            >
              <Download className="h-4 w-4 text-neutral-400" />
              JSON
            </button>

            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-500/20 hover:from-purple-500 hover:to-indigo-500 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Printer className="h-4 w-4" />
              Download PDF Catalog ({selectedIds.size})
            </button>
          </div>
        </header>

        {/* Toast Alert Notification */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-neutral-900/95 text-emerald-400 px-4 py-3 text-sm shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 print:hidden">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <span className="font-semibold text-neutral-100">{toast}</span>
          </div>
        )}

        {/* Analytics Stats Grid (Hidden in Print) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 print:hidden">
          <div className="rounded-2xl border border-neutral-900 bg-neutral-900/40 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
              <span>Supabase Database Items</span>
              <Database className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-neutral-100 mt-2">
              {items.length} <span className="text-xs text-neutral-500 font-normal">items</span>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-900 bg-neutral-900/40 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
              <span>Selected for PDF</span>
              <CheckSquare className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-2">
              {selectedIds.size} <span className="text-xs text-neutral-500 font-normal">/ {items.length} selected</span>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-900 bg-neutral-900/40 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
              <span>Average Selling Price</span>
              <Tag className="h-4 w-4 text-pink-400" />
            </div>
            <div className="text-2xl font-bold text-neutral-100 mt-2">
              ₹{avgPrice} <span className="text-xs text-neutral-500 font-normal">/ unit</span>
            </div>
          </div>
        </div>

        {/* PDF Selection Toolbar & Search Bar (Hidden in Print) */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-neutral-900/40 border border-neutral-900 rounded-2xl p-4 mb-8 print:hidden">
          {/* Search Input */}
          <div className="flex items-center gap-2 w-full md:w-80">
            <Search className="h-4 w-4 text-neutral-500 shrink-0" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-0 focus:outline-none text-sm text-neutral-200 placeholder-neutral-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-neutral-400 hover:text-neutral-200"
              >
                Clear
              </button>
            )}
          </div>

          {/* Selection Controls */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end border-t md:border-t-0 border-neutral-900 pt-3 md:pt-0">
            <span className="text-xs text-neutral-400 font-medium">
              <span className="text-purple-300 font-bold">{selectedIds.size}</span> of {items.length} selected for PDF catalog
            </span>

            <button
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <CheckSquare className="h-3.5 w-3.5 text-emerald-400" />
              Select All
            </button>

            <button
              onClick={handleDeselectAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs font-semibold text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
            >
              <Square className="h-3.5 w-3.5 text-neutral-500" />
              Deselect All
            </button>
          </div>
        </div>

        {/* ================= CATALOG GRID ================= */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-neutral-900 text-neutral-500 print:hidden">
            <Database className="h-10 w-10 text-purple-400 animate-pulse mb-2" />
            <p className="text-sm font-semibold text-neutral-300">Loading catalog from Supabase realtime database...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-neutral-900 text-neutral-500 print:hidden">
            <PackageCheck className="h-10 w-10 text-neutral-600 mb-2" />
            <p className="text-sm">No items found matching "{searchQuery}".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 print:grid-cols-2 print:gap-6">
            {filteredItems.map((item) => {
              const isSelected = selectedIds.has(item.id);
              const activeImgIdx = activeImageIndexMap[item.id] || 0;
              const hasImages = item.images && item.images.length > 0;
              const currentImgSrc = hasImages
                ? item.images[activeImgIdx] || item.images[0]
                : item.main_image || '/placeholder.png';

              return (
                <div
                  key={item.id}
                  className={`group relative flex flex-col rounded-2xl border bg-neutral-900/30 overflow-hidden transition-all duration-300 ${
                    isSelected
                      ? 'border-purple-500/50 shadow-xl shadow-purple-500/5'
                      : 'border-neutral-900 opacity-60 hover:opacity-100'
                  } ${!isSelected ? 'print:hidden' : 'print:bg-white print:border-2 print:border-slate-300 print:shadow-none print:break-inside-avoid print:rounded-2xl'}`}
                >
                  {/* Selection & Action Header Bar (Screen Mode) */}
                  <div className="flex items-center justify-between px-3 py-2 bg-neutral-950/80 border-b border-neutral-900 print:hidden">
                    <button
                      onClick={() => handleToggleSelect(item.id)}
                      className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                        isSelected ? 'text-emerald-400' : 'text-neutral-500 hover:text-neutral-300'
                      }`}
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 text-neutral-600 shrink-0" />
                      )}
                      <span>{isSelected ? 'Included in PDF' : 'Excluded'}</span>
                    </button>

                    {/* Permanent Delete Product Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProduct(item.id, item.name);
                      }}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-950/40 text-red-400 border border-red-900/50 text-[10px] font-semibold hover:bg-red-900 hover:text-white transition-colors"
                      title="Permanently delete product from Supabase database"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete Product</span>
                    </button>
                  </div>

                  {/* Main Active Photo Banner (Screen) */}
                  <div className="relative aspect-square w-full bg-neutral-950 print:bg-slate-100 overflow-hidden flex items-center justify-center">
                    <img
                      src={currentImgSrc}
                      alt={item.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLElement).setAttribute(
                          'src',
                          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80'
                        );
                      }}
                    />

                    {/* Delete Active Image Button (Hidden in Print) */}
                    {hasImages && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteImage(item.id, activeImgIdx);
                        }}
                        className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-red-950/80 px-2.5 py-1 text-[10px] font-semibold text-red-300 border border-red-500/30 backdrop-blur-md hover:bg-red-900 transition-colors print:hidden"
                        title="Delete current photo from gallery"
                      >
                        <Trash2 className="h-3 w-3 text-red-400" />
                        <span>Remove Photo</span>
                      </button>
                    )}

                    {/* Navigation Buttons (Hidden in Print) */}
                    {hasImages && item.images.length > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrevImage(item.id, item.images.length);
                          }}
                          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-neutral-950/70 p-1.5 text-neutral-300 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm print:hidden"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNextImage(item.id, item.images.length);
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-neutral-950/70 p-1.5 text-neutral-300 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm print:hidden"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>

                        <div className="absolute bottom-2 right-2 rounded-full bg-neutral-950/80 px-2 py-0.5 text-[10px] font-medium text-neutral-300 backdrop-blur-sm border border-neutral-800 print:hidden">
                          {activeImgIdx + 1} / {item.images.length}
                        </div>
                      </>
                    )}

                    {/* MakerWorld Original Link Badge (Hidden in Print) */}
                    {item.makerworld_url && (
                      <a
                        href={item.makerworld_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-neutral-950/80 px-2.5 py-1 text-[10px] font-semibold text-purple-300 border border-purple-500/30 backdrop-blur-md hover:bg-purple-900/50 transition-colors print:hidden"
                        title="View product details"
                      >
                        <span>MakerWorld</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  {/* Thumbnail Strip with Individual Delete Controls (Screen Mode) */}
                  {hasImages && item.images.length > 1 && (
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-neutral-950/60 overflow-x-auto border-b border-neutral-900 scrollbar-none print:hidden">
                      {item.images.map((imgUrl, idx) => (
                        <div
                          key={idx}
                          className={`group/thumb relative h-9 w-9 shrink-0 rounded-lg overflow-hidden border cursor-pointer transition-all ${
                            idx === activeImgIdx
                              ? 'border-purple-500 ring-2 ring-purple-500/40 scale-105'
                              : 'border-neutral-800 opacity-70 hover:opacity-100'
                          }`}
                          onClick={() => setActiveImageIndexMap((prev) => ({ ...prev, [item.id]: idx }))}
                        >
                          <img src={imgUrl} alt="" className="h-full w-full object-cover" />
                          
                          {/* Hover Delete Button for each thumbnail */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteImage(item.id, idx);
                            }}
                            className="absolute inset-0 bg-red-950/90 text-red-300 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                            title="Delete this thumbnail"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ================= PRINT-ONLY PRODUCT SHOWCASE GALLERY ================= */}
                  {hasImages && item.images.length > 1 && (
                    <div className="hidden print:block p-2 bg-slate-50 border-b border-slate-200">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Product Showcase Angles:</div>
                      <div className="grid grid-cols-4 gap-1">
                        {item.images.slice(0, 4).map((imgUrl, idx) => (
                          <div key={idx} className="aspect-square rounded border border-slate-300 overflow-hidden bg-white">
                            <img src={imgUrl} alt="" className="h-full w-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Item Title & Price Container */}
                  <div className="flex flex-col flex-grow p-4 space-y-3 print:p-3 print:space-y-2">
                    <div>
                      <h3 className="text-sm font-bold text-neutral-100 print:text-slate-900 line-clamp-2 leading-snug group-hover:text-purple-300 transition-colors">
                        {item.name}
                      </h3>
                    </div>

                    {/* Price Input & Tag Section */}
                    <div className="mt-auto pt-3 border-t border-neutral-900 print:border-slate-300 flex items-center justify-between">
                      <div className="flex flex-col w-full">
                        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-neutral-500 print:text-slate-600 font-semibold mb-1">
                          <span>Selling Price</span>
                          <span className="print:hidden text-[9px] text-emerald-400 font-semibold">Saved in Supabase</span>
                        </div>

                        {/* Direct Editable Price Input */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-base font-extrabold text-purple-400 print:text-slate-900">₹</span>
                          
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.price ?? ''}
                            onChange={(e) => handlePriceInputChange(item.id, e.target.value)}
                            className="w-24 rounded-lg bg-neutral-950 border border-neutral-800 px-2 py-1 text-sm font-bold text-emerald-400 print:bg-transparent print:border-none print:text-slate-900 print:p-0 print:text-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                            placeholder="0"
                          />

                          {item.price !== '' && item.price !== undefined && (
                            <button
                              onClick={() => handlePriceInputChange(item.id, '')}
                              className="text-neutral-500 hover:text-red-400 p-1 transition-colors print:hidden"
                              title="Clear price"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= BATCH SET PRICE MODAL ================= */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:hidden">
          <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-purple-400" />
                <h2 className="text-lg font-bold text-neutral-100">Batch Set Catalog Price</h2>
              </div>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-400">
              Enter a default price to apply across all <span className="text-purple-300 font-bold">{items.length}</span> catalog items in Supabase. You can still customize individual prices afterwards.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">Price in INR (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-neutral-400 text-sm">₹</span>
                <input
                  type="number"
                  value={bulkPriceInput}
                  onChange={(e) => setBulkPriceInput(e.target.value)}
                  className="w-full rounded-xl bg-neutral-950 border border-neutral-800 pl-7 pr-4 py-2.5 text-sm text-neutral-100 font-bold focus:outline-none focus:border-purple-500"
                  placeholder="e.g. 299"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              {[199, 299, 399, 499, 699].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setBulkPriceInput(preset.toString())}
                  className="px-2.5 py-1 rounded-lg bg-neutral-800 text-xs font-semibold text-neutral-300 hover:bg-purple-600 hover:text-white transition-colors"
                >
                  ₹{preset}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyBulkPrice}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-xs font-bold text-white shadow-lg hover:from-purple-500 hover:to-indigo-500"
              >
                Apply to All Items
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
