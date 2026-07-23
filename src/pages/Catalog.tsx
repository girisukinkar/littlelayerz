import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  Radio,
  Upload,
  Plus,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Star,
  GripVertical,
  Edit,
  Scale,
  Clock,
  Box
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { generateFastCatalogPDF } from '../utils/pdfExporter';
import { importMakerWorldProduct } from '../services/makerworldScraper';

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
  dimensions?: string;
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
  
  // Image Uploading State per item ID
  const [uploadingItemIdMap, setUploadingItemIdMap] = useState<Record<string, boolean>>({});

  // Add Product Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductPrintTime, setNewProductPrintTime] = useState('');
  const [newProductWeight, setNewProductWeight] = useState('');
  const [newDimL, setNewDimL] = useState('');
  const [newDimB, setNewDimB] = useState('');
  const [newDimH, setNewDimH] = useState('');
  const [newDimUnit, setNewDimUnit] = useState<'mm' | 'cm'>('mm');
  const [newProductFiles, setNewProductFiles] = useState<FileList | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  // Import MakerWorld Link Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importPhotoUrl, setImportPhotoUrl] = useState('');
  const [importPrice, setImportPrice] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Drag and Drop Rearrange state
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

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
        let dimensions = '';

        if (row.image_url) {
          try {
            if (row.image_url.trim().startsWith('{')) {
              const meta = JSON.parse(row.image_url);
              images = meta.images || [];
              main_image = meta.main_image || (images[0] || '');
              makerworld_url = meta.makerworld_url || '';
              slug = meta.slug || '';
              dimensions = meta.dimensions || '';
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
          dimensions: dimensions || '',
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

  // Delete confirm state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Permanent Product Deletion (Directly in Supabase)
  const handleDeleteProduct = async (id: string, name: string) => {
    if (deleteConfirmId !== id) {
      setDeleteConfirmId(id);
      setTimeout(() => {
        setDeleteConfirmId((current) => (current === id ? null : current));
      }, 4000);
      return;
    }

    setDeleteConfirmId(null);

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
  };

  // Debounce timers map for price input network requests
  const priceDebounceTimers = React.useRef<Record<string, any>>({});

  // Price Input Change (Instant local state update + 600ms debounced Supabase API call)
  const handlePriceInputChange = (id: string, val: string) => {
    const updatedPrice = val.trim() === '' ? '' : val;
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, price: updatedPrice } : item))
    );

    // Clear previous pending debounce timer for this product
    if (priceDebounceTimers.current[id]) {
      clearTimeout(priceDebounceTimers.current[id]);
    }

    // Debounce Supabase API call by 600ms so typing 150 only sends 1 final request
    priceDebounceTimers.current[id] = setTimeout(async () => {
      delete priceDebounceTimers.current[id];
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
    }, 600);
  };

  // Immediate flush on input blur
  const handlePriceInputBlur = async (id: string, currentPriceVal: number | string) => {
    if (priceDebounceTimers.current[id]) {
      clearTimeout(priceDebounceTimers.current[id]);
      delete priceDebounceTimers.current[id];

      if (isSupabaseConfigured) {
        const priceStr = String(currentPriceVal).trim();
        const priceNum = priceStr === '' ? 0 : parseFloat(priceStr) || 0;
        const { error } = await supabase
          .from('products')
          .update({ selling_price: priceNum })
          .eq('id', id);

        if (error) {
          console.error('Supabase price update error on blur:', error);
        }
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

  // Helper to convert file to data URL as fallback
  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Upload single file to Supabase Storage with Data URL fallback
  const uploadFileToSupabaseStorage = async (file: File, prefix: string): Promise<string> => {
    if (isSupabaseConfigured) {
      try {
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from('product-images')
          .upload(fileName, file, { upsert: true });

        if (!uploadErr) {
          const { data: pubData } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName);
          if (pubData?.publicUrl) {
            return pubData.publicUrl;
          }
        } else {
          console.warn('Supabase storage upload failed, using data URL fallback:', uploadErr);
        }
      } catch (e) {
        console.warn('Supabase storage upload exception, using fallback:', e);
      }
    }
    return await readFileAsDataURL(file);
  };

  // Handle Image Upload for existing catalog item
  const handleUploadImagesToItem = async (itemId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const targetItem = items.find((i) => i.id === itemId);
    if (!targetItem) return;

    setUploadingItemIdMap((prev) => ({ ...prev, [itemId]: true }));
    showToast(`Uploading ${files.length} photo(s)...`);

    try {
      const newUploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = await uploadFileToSupabaseStorage(file, `catalog/${itemId}`);
        newUploadedUrls.push(url);
      }

      const existingImages = (targetItem.images || []).filter((img) => img !== '/placeholder.png');
      const updatedImages = [...existingImages, ...newUploadedUrls];
      const updatedMain = targetItem.main_image && targetItem.main_image !== '/placeholder.png'
        ? targetItem.main_image
        : updatedImages[0];

      // Optimistic state update
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;
          return {
            ...item,
            images: updatedImages,
            main_image: updatedMain,
          };
        })
      );

      // Set active thumbnail to newly uploaded image
      setActiveImageIndexMap((prev) => ({ ...prev, [itemId]: updatedImages.length - 1 }));

      // Save updated catalog item metadata to Supabase database
      if (isSupabaseConfigured) {
        const updatedMeta = JSON.stringify({
          main_image: updatedMain,
          images: updatedImages,
          makerworld_url: targetItem.makerworld_url,
          slug: targetItem.slug,
        });

        const { error } = await supabase
          .from('products')
          .update({ image_url: updatedMeta })
          .eq('id', itemId);

        if (error) {
          console.error('Supabase image update error:', error);
          showToast(`Image uploaded locally, but Supabase table update failed: ${error.message}`);
        } else {
          showToast(`Uploaded ${newUploadedUrls.length} photo(s) and saved in Supabase!`);
        }
      } else {
        showToast(`Uploaded ${newUploadedUrls.length} photo(s)`);
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
      showToast(`Upload failed: ${err.message || err}`);
    } finally {
      setUploadingItemIdMap((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  // Add new product with image upload directly to Supabase
  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) {
      showToast('Product name is required');
      return;
    }

    setIsAddingProduct(true);
    try {
      const uploadedUrls: string[] = [];
      if (newProductFiles && newProductFiles.length > 0) {
        showToast(`Uploading ${newProductFiles.length} photo(s) to Supabase...`);
        for (let i = 0; i < newProductFiles.length; i++) {
          const file = newProductFiles[i];
          const url = await uploadFileToSupabaseStorage(file, 'new_product');
          uploadedUrls.push(url);
        }
      }

      const mainImg = uploadedUrls[0] || '/placeholder.png';
      const imagesList = uploadedUrls.length > 0 ? uploadedUrls : ['/placeholder.png'];
      const priceNum = parseFloat(newProductPrice) || 0;
      const weightNum = parseFloat(newProductWeight) || 40;
      const printTimeStr = newProductPrintTime.trim() || '2h';
      const slugStr = newProductName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

      let dimensionsStr = '';
      if (newDimL.trim() || newDimB.trim() || newDimH.trim()) {
        dimensionsStr = `${newDimL.trim() || '0'} × ${newDimB.trim() || '0'} × ${newDimH.trim() || '0'} ${newDimUnit}`;
      }

      const imageUrlJSON = JSON.stringify({
        main_image: mainImg,
        images: imagesList,
        makerworld_url: `https://makerworld.com/en/search/models?keyword=${encodeURIComponent(newProductName)}`,
        slug: slugStr,
        dimensions: dimensionsStr,
      });

      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('products')
          .insert({
            name: newProductName.trim(),
            selling_price: priceNum,
            filament_weight: weightNum,
            print_time: printTimeStr,
            cost_per_kg: 1500,
            image_url: imageUrlJSON,
          });

        if (error) throw error;

        showToast(`Added "${newProductName}" with image to Supabase catalog!`);
        fetchProductsFromSupabase();
      } else {
        showToast('Supabase is not configured');
      }

      setIsAddModalOpen(false);
      setNewProductName('');
      setNewProductPrice('');
      setNewProductPrintTime('');
      setNewProductWeight('');
      setNewProductFiles(null);
    } catch (err: any) {
      console.error('Failed to add product:', err);
      showToast(`Error creating product: ${err.message || err}`);
    } finally {
      setIsAddingProduct(false);
    }
  };

  // Import MakerWorld Model Link Handler
  const handleImportMakerWorldSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importUrl.trim()) {
      showToast('MakerWorld URL is required');
      return;
    }

    setIsImporting(true);
    showToast('Importing product from MakerWorld...');

    try {
      const customPriceNum = parseFloat(importPrice) || 0;
      await importMakerWorldProduct(importUrl.trim(), importPhotoUrl.trim(), customPriceNum);
      showToast('Successfully imported MakerWorld model to catalog!');
      setImportUrl('');
      setImportPhotoUrl('');
      setImportPrice('');
      setIsImportModalOpen(false);
      fetchProductsFromSupabase();
    } catch (err: any) {
      console.error('Import error:', err);
      showToast(`Import failed: ${err.message || err}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Rearrange / Move Images inside a catalog item
  const handleMoveImage = async (itemId: string, fromIndex: number, direction: 'left' | 'right' | 'main') => {
    const targetItem = items.find((i) => i.id === itemId);
    if (!targetItem || !targetItem.images || targetItem.images.length < 2) return;

    const newImages = [...targetItem.images];
    let newActiveIdx = fromIndex;

    if (direction === 'main') {
      if (fromIndex === 0) return;
      const [moved] = newImages.splice(fromIndex, 1);
      newImages.unshift(moved);
      newActiveIdx = 0;
    } else if (direction === 'left' && fromIndex > 0) {
      const toIndex = fromIndex - 1;
      [newImages[fromIndex], newImages[toIndex]] = [newImages[toIndex], newImages[fromIndex]];
      newActiveIdx = toIndex;
    } else if (direction === 'right' && fromIndex < newImages.length - 1) {
      const toIndex = fromIndex + 1;
      [newImages[fromIndex], newImages[toIndex]] = [newImages[toIndex], newImages[fromIndex]];
      newActiveIdx = toIndex;
    }

    const newMain = newImages[0];

    // Optimistic UI state update
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
    setActiveImageIndexMap((prev) => ({ ...prev, [itemId]: newActiveIdx }));

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
        console.error('Supabase image reorder error:', error);
        showToast(`Image order updated locally, Supabase failed: ${error.message}`);
      } else {
        showToast('Rearranged photos & saved in Supabase!');
      }
    } else {
      showToast('Rearranged photo order');
    }
  };

  // Rearrange / Reorder Catalog items in grid
  const handleMoveProduct = (itemId: string, direction: 'left' | 'right') => {
    const currentIdx = items.findIndex((i) => i.id === itemId);
    if (currentIdx === -1) return;

    const targetIdx = direction === 'left' ? currentIdx - 1 : currentIdx + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;

    const newItems = [...items];
    [newItems[currentIdx], newItems[targetIdx]] = [newItems[targetIdx], newItems[currentIdx]];

    setItems(newItems);
    showToast(`Moved product ${direction === 'left' ? 'earlier' : 'later'} in catalog!`);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItemId || draggedItemId === targetId) return;

    const dragIdx = items.findIndex((i) => i.id === draggedItemId);
    const dropIdx = items.findIndex((i) => i.id === targetId);

    if (dragIdx === -1 || dropIdx === -1) return;

    const newItems = [...items];
    const [removed] = newItems.splice(dragIdx, 1);
    newItems.splice(dropIdx, 0, removed);

    setItems(newItems);
    setDraggedItemId(null);
    showToast('Reordered product catalog grid!');
  };

  const handleDownloadPDF = async () => {
    if (selectedIds.size === 0) {
      showToast('Please select at least 1 product to generate PDF catalog!');
      return;
    }

    const selectedItems = items.filter((i) => selectedIds.has(i.id));
    showToast(`Generating instant PDF catalog for ${selectedItems.length} selected product(s)...`);

    try {
      await generateFastCatalogPDF(selectedItems, (msg) => showToast(msg));
    } catch (e: any) {
      console.error('Fast PDF Export Error:', e);
      showToast('Fast PDF error, opening browser print...');
      window.print();
    }
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

  // Memoized search filtering & stats for performance
  const filteredItems = React.useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(q));
  }, [items, searchQuery]);

  const avgPrice = React.useMemo(() => {
    if (items.length === 0) return '0';
    const totalValue = items.reduce((acc, curr) => {
      const p = typeof curr.price === 'number' ? curr.price : parseFloat(curr.price as string);
      return acc + (isNaN(p) ? 0 : p);
    }, 0);
    return (totalValue / items.length).toFixed(0);
  }, [items]);

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
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 border border-emerald-500/30 px-3.5 py-2.5 text-xs font-bold text-white hover:from-emerald-500 hover:to-teal-500 transition-all shadow-md shadow-emerald-500/20"
              title="Paste MakerWorld URL to auto-scrape and add to catalog"
            >
              <ExternalLink className="h-4 w-4" />
              Import MakerWorld Link
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-purple-600 border border-purple-500/30 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-purple-500 transition-all shadow-md shadow-purple-500/20"
              title="Add new product to catalog with image upload"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </button>

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
            {filteredItems.map((item, idx) => {
              const isSelected = selectedIds.has(item.id);
              const activeImgIdx = activeImageIndexMap[item.id] || 0;
              const hasImages = item.images && item.images.length > 0;
              const currentImgSrc = hasImages
                ? item.images[activeImgIdx] || item.images[0]
                : item.main_image || '/placeholder.png';

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, item.id)}
                  className={`deferred-card group relative flex flex-col rounded-2xl border bg-neutral-900/30 overflow-hidden transition-all duration-300 ${
                    draggedItemId === item.id ? 'opacity-40 border-dashed border-purple-500 scale-95' : ''
                  } ${
                    isSelected
                      ? 'border-purple-500/50 shadow-xl shadow-purple-500/5'
                      : 'border-neutral-900 opacity-60 hover:opacity-100'
                  } ${!isSelected ? 'print:hidden' : 'print:bg-white print:border-2 print:border-slate-300 print:shadow-none print:break-inside-avoid print:rounded-2xl'}`}
                >
                  {/* Selection & Rearrange Header Bar (Screen Mode) */}
                  <div className="flex items-center justify-between px-3 py-2 bg-neutral-950/80 border-b border-neutral-900 print:hidden">
                    <div className="flex items-center gap-2">
                      <div className="cursor-grab active:cursor-grabbing text-neutral-600 hover:text-neutral-300" title="Drag to rearrange catalog card order">
                        <GripVertical className="h-4 w-4" />
                      </div>
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
                        <span>{isSelected ? 'Included' : 'Excluded'}</span>
                      </button>
                    </div>

                    {/* Product Grid Rearrange Buttons & Permanent Delete Button */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMoveProduct(item.id, 'left')}
                        disabled={idx === 0}
                        className="p-1 rounded bg-neutral-900 text-neutral-400 hover:text-white disabled:opacity-30 transition-colors"
                        title="Move product earlier in catalog grid"
                      >
                        <ArrowLeft className="h-3 w-3" />
                      </button>

                      <button
                        onClick={() => handleMoveProduct(item.id, 'right')}
                        disabled={idx === filteredItems.length - 1}
                        className="p-1 rounded bg-neutral-900 text-neutral-400 hover:text-white disabled:opacity-30 transition-colors"
                        title="Move product later in catalog grid"
                      >
                        <ArrowRight className="h-3 w-3" />
                      </button>

                      <Link
                        to={`/catalog/edit/${item.id}`}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-950/50 text-purple-300 border border-purple-800/60 hover:bg-purple-900 hover:text-white transition-all ml-1"
                        title="Open dedicated editor page for this product"
                      >
                        <Edit className="h-3 w-3" />
                        <span>Edit</span>
                      </Link>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProduct(item.id, item.name);
                        }}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ml-1 ${
                          deleteConfirmId === item.id
                            ? 'bg-red-600 text-white animate-pulse border border-red-500 scale-105 shadow-md shadow-red-500/30'
                            : 'bg-red-950/40 text-red-400 border border-red-900/50 hover:bg-red-900 hover:text-white'
                        }`}
                        title={deleteConfirmId === item.id ? 'Click again to confirm deletion' : 'Delete product from database'}
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>{deleteConfirmId === item.id ? 'Confirm?' : 'Delete'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Main Active Photo Banner (Screen) */}
                  <div className="relative aspect-square w-full bg-neutral-950 print:bg-slate-100 overflow-hidden flex items-center justify-center">
                    <img
                      src={currentImgSrc}
                      alt={item.name}
                      width="400"
                      height="400"
                      loading={idx < 4 ? 'eager' : 'lazy'}
                      decoding="async"
                      fetchPriority={idx < 4 ? 'high' : 'auto'}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLElement).setAttribute(
                          'src',
                          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80'
                        );
                      }}
                    />

                    {/* Delete & Upload Active Image Controls (Hidden in Print) */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10 print:hidden">
                      {hasImages && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteImage(item.id, activeImgIdx);
                          }}
                          className="flex items-center gap-1 rounded-full bg-red-950/80 px-2.5 py-1 text-[10px] font-semibold text-red-300 border border-red-500/30 backdrop-blur-md hover:bg-red-900 transition-colors"
                          title="Delete current photo from gallery"
                        >
                          <Trash2 className="h-3 w-3 text-red-400" />
                          <span>Remove</span>
                        </button>
                      )}

                      <label
                        className="flex items-center gap-1 rounded-full bg-emerald-950/80 px-2.5 py-1 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30 backdrop-blur-md hover:bg-emerald-900 transition-colors cursor-pointer"
                        title="Upload photo from computer to Supabase"
                      >
                        {uploadingItemIdMap[item.id] ? (
                          <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
                        ) : (
                          <Upload className="h-3 w-3 text-emerald-400" />
                        )}
                        <span>{uploadingItemIdMap[item.id] ? 'Uploading...' : 'Upload Photo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          disabled={uploadingItemIdMap[item.id]}
                          onChange={(e) => {
                            handleUploadImagesToItem(item.id, e.target.files);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>

                    {/* Photo Rearrange Controls Overlay (Hidden in Print) */}
                    {hasImages && item.images.length > 1 && (
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 z-10 print:hidden">
                        {activeImgIdx > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveImage(item.id, activeImgIdx, 'main');
                            }}
                            className="flex items-center gap-1 rounded-full bg-purple-950/90 px-2 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-500/40 backdrop-blur-md hover:bg-purple-900 transition-colors shadow-md"
                            title="Make this photo the main cover image"
                          >
                            <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                            <span>Set Main</span>
                          </button>
                        )}

                        {activeImgIdx > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveImage(item.id, activeImgIdx, 'left');
                            }}
                            className="p-1 rounded-full bg-neutral-950/80 text-neutral-300 hover:text-white border border-neutral-800 backdrop-blur-md transition-colors"
                            title="Move photo left"
                          >
                            <ArrowLeft className="h-3 w-3" />
                          </button>
                        )}

                        {activeImgIdx < item.images.length - 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveImage(item.id, activeImgIdx, 'right');
                            }}
                            className="p-1 rounded-full bg-neutral-950/80 text-neutral-300 hover:text-white border border-neutral-800 backdrop-blur-md transition-colors"
                            title="Move photo right"
                          >
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
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

                  {/* Thumbnail Strip with Individual Delete & Add Photo Controls (Screen Mode) */}
                  {hasImages && (
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

                      {/* + Add Photo Tile */}
                      <label
                        className="group/add relative h-9 px-2 shrink-0 rounded-lg border border-dashed border-neutral-700 bg-neutral-900/80 hover:bg-neutral-800 hover:border-emerald-500 text-neutral-400 hover:text-emerald-300 flex items-center justify-center gap-1 cursor-pointer transition-all text-[10px] font-semibold"
                        title="Upload image to this item"
                      >
                        {uploadingItemIdMap[item.id] ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                        ) : (
                          <Plus className="h-3.5 w-3.5 text-emerald-400" />
                        )}
                        <span>Add Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          disabled={uploadingItemIdMap[item.id]}
                          onChange={(e) => {
                            handleUploadImagesToItem(item.id, e.target.files);
                            e.target.value = '';
                          }}
                        />
                      </label>
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
                    <div className="space-y-1.5">
                      <h3 className="text-sm font-bold text-neutral-100 print:text-slate-900 line-clamp-2 leading-snug group-hover:text-purple-300 transition-colors">
                        {item.name}
                      </h3>

                      {/* Filament Weight in Grams, Dimensions & Print Time */}
                      <div className="flex items-center flex-wrap gap-1.5 text-xs font-medium">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-950 border border-neutral-800 text-purple-300 print:bg-slate-100 print:border-slate-300 font-bold text-[11px]" title="Product weight in grams">
                          <Scale className="h-3 w-3 text-purple-400 print:text-slate-700" />
                          <span>{item.filament_weight ? `${item.filament_weight}g` : '40g'}</span>
                        </span>

                        {item.dimensions && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-950 border border-neutral-800 text-blue-300 print:bg-slate-100 print:border-slate-300 font-bold text-[10px]" title="Dimensions (L x B x H)">
                            <Box className="h-3 w-3 text-blue-400 print:text-slate-700" />
                            <span>{item.dimensions}</span>
                          </span>
                        )}

                        {item.print_time && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-neutral-400 font-mono print:hidden" title="Print time (internal only)">
                            <Clock className="h-3 w-3 text-neutral-500" />
                            <span>{item.print_time}</span>
                          </span>
                        )}
                      </div>
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
                            onBlur={() => handlePriceInputBlur(item.id, item.price)}
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

      {/* ================= ADD NEW PRODUCT MODAL ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:hidden">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-neutral-100">Add Product to Catalog</h2>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddProductSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2 text-sm text-neutral-100 font-medium focus:outline-none focus:border-purple-500"
                  placeholder="e.g. Articulated Dragon"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    value={newProductPrice}
                    onChange={(e) => setNewProductPrice(e.target.value)}
                    className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2 text-sm text-neutral-100 font-bold focus:outline-none focus:border-purple-500"
                    placeholder="299"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Print Time</label>
                  <input
                    type="text"
                    value={newProductPrintTime}
                    onChange={(e) => setNewProductPrintTime(e.target.value)}
                    className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2 text-sm text-neutral-100 font-medium focus:outline-none focus:border-purple-500"
                    placeholder="e.g. 4h 30m"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Weight (g)</label>
                  <input
                    type="number"
                    value={newProductWeight}
                    onChange={(e) => setNewProductWeight(e.target.value)}
                    className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2 text-sm text-neutral-100 font-medium focus:outline-none focus:border-purple-500"
                    placeholder="e.g. 85"
                  />
                </div>
              </div>

              {/* Dimensions Section (L x B x H) */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Dimensions (LxBxH - Optional)</label>
                <div className="grid grid-cols-4 gap-2">
                  <input
                    type="number"
                    value={newDimL}
                    onChange={(e) => setNewDimL(e.target.value)}
                    className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-2.5 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-blue-500"
                    placeholder="L (120)"
                  />
                  <input
                    type="number"
                    value={newDimB}
                    onChange={(e) => setNewDimB(e.target.value)}
                    className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-2.5 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-blue-500"
                    placeholder="B (85)"
                  />
                  <input
                    type="number"
                    value={newDimH}
                    onChange={(e) => setNewDimH(e.target.value)}
                    className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-2.5 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-blue-500"
                    placeholder="H (45)"
                  />
                  <select
                    value={newDimUnit}
                    onChange={(e) => setNewDimUnit(e.target.value as 'mm' | 'cm')}
                    className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-2 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="mm">mm</option>
                    <option value="cm">cm</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Upload Product Image(s)</label>
                <div className="relative rounded-xl border border-dashed border-neutral-700 bg-neutral-950 p-4 text-center hover:border-purple-500 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setNewProductFiles(e.target.files)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-1.5 text-neutral-400">
                    <Upload className="h-6 w-6 text-purple-400" />
                    <span className="text-xs font-semibold text-neutral-200">
                      {newProductFiles && newProductFiles.length > 0
                        ? `${newProductFiles.length} file(s) selected`
                        : 'Click or Drag & Drop images to upload'}
                    </span>
                    <span className="text-[10px] text-neutral-500">Stored automatically in Supabase Storage & Database</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingProduct}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-xs font-bold text-white shadow-lg hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50"
                >
                  {isAddingProduct ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving to Supabase...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>Save Product</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= IMPORT MAKERWORLD LINK MODAL ================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 print:hidden">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-950 border border-emerald-500/30 text-emerald-400">
                  <ExternalLink className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-100">Import from MakerWorld</h3>
                  <p className="text-xs text-neutral-400">Paste MakerWorld model URL to scrape and auto-add</p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleImportMakerWorldSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  MakerWorld Model URL *
                </label>
                <input
                  type="url"
                  required
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-sm text-neutral-100 font-mono focus:outline-none focus:border-emerald-500"
                  placeholder="https://makerworld.com/en/models/2547928-pikachu-glasses-holder"
                />
                <p className="text-[10px] text-neutral-500 mt-1">
                  Accepts any MakerWorld 3D model link.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Cover Photo URL (Optional)
                </label>
                <input
                  type="url"
                  value={importPhotoUrl}
                  onChange={(e) => setImportPhotoUrl(e.target.value)}
                  className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3.5 py-2 text-sm text-neutral-100 font-mono focus:outline-none focus:border-emerald-500"
                  placeholder="https://... (Direct image URL if available)"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Selling Price (₹ - Optional)
                </label>
                <input
                  type="number"
                  value={importPrice}
                  onChange={(e) => setImportPrice(e.target.value)}
                  className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3.5 py-2 text-sm text-neutral-100 font-bold focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. 299"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isImporting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-xs font-bold text-white shadow-lg hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Scraping & Saving...</span>
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4" />
                      <span>Scrape & Add to Catalog</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
