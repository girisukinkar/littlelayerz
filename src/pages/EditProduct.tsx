import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Trash2,
  Upload,
  Star,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calculator,
  Database,
  Image as ImageIcon,
  DollarSign,
  Printer,
  Scale,
  Clock,
  Link as LinkIcon,
  Box
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useSettingsStore } from '../store/useSettingsStore';
import { isValidPrintTime, parsePrintTimeToHours } from '../utils/printTimeParser';

export interface ProductDetail {
  id: string;
  name: string;
  selling_price: number | string;
  print_time: string;
  filament_weight: number | string;
  cost_per_kg: number | string;
  packaging_cost: number | string;
  delivery_cost: number | string;
  electricity_rate: number | string;
  image_url?: string | null;
  created_at?: string;
  makerworld_url?: string;
  slug?: string;
  images: string[];
  main_image: string;
  category?: string;
}

export const EditProduct: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const settings = useSettingsStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Form Fields State
  const [name, setName] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [printTime, setPrintTime] = useState('');
  const [filamentWeight, setFilamentWeight] = useState('');
  const [costPerKg, setCostPerKg] = useState('');
  const [packagingCost, setPackagingCost] = useState('');
  const [deliveryCost, setDeliveryCost] = useState('');
  const [electricityRate, setElectricityRate] = useState('');
  const [makerworldUrl, setMakerworldUrl] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('3D Model');
  
  // Optional Dimensions State (L x B x H)
  const [dimLength, setDimLength] = useState('');
  const [dimBreadth, setDimBreadth] = useState('');
  const [dimHeight, setDimHeight] = useState('');
  const [dimUnit, setDimUnit] = useState<'mm' | 'cm'>('mm');
  
  // Gallery State
  const [images, setImages] = useState<string[]>([]);
  const [mainImage, setMainImage] = useState<string>('');
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [customImageUrl, setCustomImageUrl] = useState('');

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load Product Data from Supabase
  useEffect(() => {
    if (!id) return;
    fetchProductDetails();
  }, [id]);

  const fetchProductDetails = async () => {
    setIsLoading(true);
    if (!isSupabaseConfigured) {
      showToast('Supabase is not configured', 'error');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        console.error('Fetch error:', error);
        showToast(`Failed to load product: ${error?.message || 'Product not found'}`, 'error');
        setIsLoading(false);
        return;
      }

      setName(data.name || '');
      setSellingPrice(data.selling_price !== undefined && data.selling_price !== null ? data.selling_price.toString() : '');
      setPrintTime(data.print_time || '');
      setFilamentWeight(data.filament_weight !== undefined && data.filament_weight !== null ? data.filament_weight.toString() : '');
      setCostPerKg(data.cost_per_kg !== undefined && data.cost_per_kg !== null ? data.cost_per_kg.toString() : '');
      setPackagingCost(data.packaging_cost !== undefined && data.packaging_cost !== null ? data.packaging_cost.toString() : settings.defaultPackagingCost.toString());
      setDeliveryCost(data.delivery_cost !== undefined && data.delivery_cost !== null ? data.delivery_cost.toString() : settings.defaultDeliveryCost.toString());
      setElectricityRate(data.electricity_rate !== undefined && data.electricity_rate !== null ? data.electricity_rate.toString() : '');

      // Parse Image Gallery JSON or string & Dimensions
      let parsedImages: string[] = [];
      let parsedMain = '';
      let parsedMwUrl = '';
      let parsedSlug = '';
      let parsedDim = '';

      if (data.image_url) {
        try {
          if (data.image_url.trim().startsWith('{')) {
            const meta = JSON.parse(data.image_url);
            parsedImages = meta.images || [];
            parsedMain = meta.main_image || (parsedImages[0] || '');
            parsedMwUrl = meta.makerworld_url || '';
            parsedSlug = meta.slug || '';
            parsedDim = meta.dimensions || '';
          } else {
            parsedMain = data.image_url;
            parsedImages = [data.image_url];
          }
        } catch (e) {
          parsedMain = data.image_url;
          parsedImages = [data.image_url];
        }
      }

      setImages(parsedImages.length > 0 ? parsedImages : []);
      setMainImage(parsedMain || (parsedImages[0] || ''));
      setMakerworldUrl(
        parsedMwUrl ||
        `https://makerworld.com/en/search/models?keyword=${encodeURIComponent(data.name || '')}`
      );
      setSlug(parsedSlug || data.id);

      if (parsedDim) {
        const match = parsedDim.match(/([\d.]+)\s*[x×]\s*([\d.]+)\s*[x×]\s*([\d.]+)\s*(mm|cm)?/i);
        if (match) {
          setDimLength(match[1]);
          setDimBreadth(match[2]);
          setDimHeight(match[3]);
          if (match[4]) setDimUnit(match[4].toLowerCase() as 'mm' | 'cm');
        }
      }
    } catch (err: any) {
      console.error('Error fetching product:', err);
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
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

  // Upload file to Supabase Storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    showToast(`Uploading ${files.length} photo(s)...`);

    const newUrls: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (isSupabaseConfigured) {
          try {
            const fileExt = file.name.split('.').pop() || 'jpg';
            const fileName = `catalog/${id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
            const { error: uploadErr } = await supabase.storage
              .from('product-images')
              .upload(fileName, file, { upsert: true });

            if (!uploadErr) {
              const { data: pubData } = supabase.storage
                .from('product-images')
                .getPublicUrl(fileName);
              if (pubData?.publicUrl) {
                newUrls.push(pubData.publicUrl);
                continue;
              }
            }
          } catch (storageErr) {
            console.warn('Storage upload error, using fallback:', storageErr);
          }
        }
        // Fallback to data URL
        const dataUrl = await readFileAsDataURL(file);
        newUrls.push(dataUrl);
      }

      const updatedList = [...images.filter(img => img !== '/placeholder.png'), ...newUrls];
      const updatedMain = mainImage && mainImage !== '/placeholder.png' ? mainImage : updatedList[0];

      setImages(updatedList);
      setMainImage(updatedMain);
      setActiveImgIdx(updatedList.length - 1);
      showToast(`Uploaded ${newUrls.length} photo(s)!`);
    } catch (err: any) {
      console.error('File upload failed:', err);
      showToast(`Upload error: ${err.message || err}`, 'error');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Add Image via Direct URL
  const handleAddCustomUrl = () => {
    if (!customImageUrl.trim()) return;
    const url = customImageUrl.trim();
    const updated = [...images.filter((img) => img !== '/placeholder.png'), url];
    setImages(updated);
    if (!mainImage || mainImage === '/placeholder.png') {
      setMainImage(url);
    }
    setCustomImageUrl('');
    setActiveImgIdx(updated.length - 1);
    showToast('Image URL added to gallery!');
  };

  // Set Active Image as Cover / Main Photo
  const handleSetMainPhoto = (idx: number) => {
    if (idx < 0 || idx >= images.length) return;
    const targetUrl = images[idx];
    const reordered = [targetUrl, ...images.filter((_, i) => i !== idx)];
    setImages(reordered);
    setMainImage(targetUrl);
    setActiveImgIdx(0);
    showToast('Set photo as main cover photo!');
  };

  // Move Photo Left/Right
  const handleMovePhoto = (idx: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= images.length) return;

    const updated = [...images];
    [updated[idx], updated[targetIdx]] = [updated[targetIdx], updated[idx]];
    setImages(updated);
    setMainImage(updated[0]);
    setActiveImgIdx(targetIdx);
  };

  // Delete Photo from gallery
  const handleDeletePhoto = (idxToDelete: number) => {
    const updated = images.filter((_, i) => i !== idxToDelete);
    const updatedMain = updated[0] || '';
    setImages(updated);
    setMainImage(updatedMain);
    setActiveImgIdx(0);
    showToast('Photo removed from gallery');
  };

  // Financial Calculations
  const rawWeight = parseFloat(filamentWeight) || 0;
  const rawCostPerKg = parseFloat(costPerKg) || 0;
  const rawSellingPrice = parseFloat(sellingPrice) || 0;
  const rawPackagingCost = packagingCost.trim() === '' ? settings.defaultPackagingCost : (parseFloat(packagingCost) || 0);
  const rawDeliveryCost = deliveryCost.trim() === '' ? settings.defaultDeliveryCost : (parseFloat(deliveryCost) || 0);
  const isTimeValid = isValidPrintTime(printTime);
  const decimalHours = isTimeValid ? parsePrintTimeToHours(printTime) : 0;
  const rawElectricityRate = electricityRate.trim() === '' ? settings.electricityRate : (parseFloat(electricityRate) || settings.electricityRate);

  const electricityCost = isTimeValid ? decimalHours * settings.printerPower * rawElectricityRate : 0;
  const filamentCost = rawWeight > 0 && rawCostPerKg > 0 ? (rawWeight / 1000) * rawCostPerKg : 0;
  const totalCost = filamentCost + electricityCost + rawPackagingCost + rawDeliveryCost;
  const profit = rawSellingPrice > 0 ? rawSellingPrice - totalCost : 0;
  const profitMargin = rawSellingPrice > 0 ? (profit / rawSellingPrice) * 100 : 0;
  const maxPiecesPerDay = decimalHours > 0 ? Math.floor(24 / decimalHours) : 0;

  // Save Product to Supabase
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Product name is required', 'error');
      return;
    }

    setIsSaving(true);
    showToast('Saving changes to Supabase...');

    try {
      const finalImages = images.length > 0 ? images : [mainImage || '/placeholder.png'];
      const finalMain = mainImage || finalImages[0] || '/placeholder.png';

      let dimensionsStr = '';
      if (dimLength.trim() || dimBreadth.trim() || dimHeight.trim()) {
        const l = dimLength.trim() || '0';
        const b = dimBreadth.trim() || '0';
        const h = dimHeight.trim() || '0';
        dimensionsStr = `${l} × ${b} × ${h} ${dimUnit}`;
      }

      const imageUrlJSON = JSON.stringify({
        main_image: finalMain,
        images: finalImages,
        makerworld_url: makerworldUrl.trim() || `https://makerworld.com/en/search/models?keyword=${encodeURIComponent(name.trim())}`,
        slug: slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        dimensions: dimensionsStr,
      });

      if (isSupabaseConfigured && id) {
        const { error } = await supabase
          .from('products')
          .update({
            name: name.trim(),
            selling_price: rawSellingPrice,
            filament_weight: rawWeight,
            print_time: printTime.trim(),
            cost_per_kg: rawCostPerKg,
            packaging_cost: rawPackagingCost,
            delivery_cost: rawDeliveryCost,
            electricity_rate: electricityRate.trim() === '' ? null : parseFloat(electricityRate),
            image_url: imageUrlJSON,
          })
          .eq('id', id);

        if (error) throw error;

        showToast(`Saved "${name}" to Supabase database!`);
      } else {
        showToast('Supabase is not configured', 'error');
      }
    } catch (err: any) {
      console.error('Save error:', err);
      showToast(`Failed to save: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Permanent Delete Product
  const handleDeleteProduct = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(false), 4000);
      return;
    }

    setIsDeleting(true);
    try {
      if (isSupabaseConfigured && id) {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
      }
      showToast(`Permanently deleted product`);
      setTimeout(() => navigate('/catalog'), 800);
    } catch (err: any) {
      console.error('Delete error:', err);
      showToast(`Delete failed: ${err.message}`, 'error');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-neutral-400 p-8">
        <Loader2 className="h-10 w-10 text-purple-400 animate-spin mb-3" />
        <p className="text-sm font-semibold text-neutral-300">Loading product details from Supabase...</p>
      </div>
    );
  }

  const currentDisplayImage = images[activeImgIdx] || mainImage || '/placeholder.png';

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-8 md:px-8 text-neutral-100 selection:bg-purple-500/30 selection:text-purple-200">
      
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 ${
            toast.type === 'error'
              ? 'border-red-500/30 bg-neutral-900/95 text-red-400'
              : 'border-emerald-500/30 bg-neutral-900/95 text-emerald-400'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          )}
          <span className="font-semibold text-neutral-100">{toast.message}</span>
        </div>
      )}

      <div className="mx-auto max-w-7xl">
        
        {/* Header Bar */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-neutral-900 pb-6 mb-8 gap-4">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors mb-2 group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Catalog</span>
            </button>
            
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Product Editor
              </span>
              <span className="text-xs text-neutral-500 font-mono">ID: {id?.substring(0, 8)}...</span>
            </div>
            
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-50 bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent mt-1">
              Edit Product: {name || 'Untitled Product'}
            </h1>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap gap-3">
            {makerworldUrl && (
              <a
                href={makerworldUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl bg-neutral-900 border border-neutral-800 px-3.5 py-2.5 text-xs font-semibold text-purple-300 hover:text-white hover:bg-neutral-800 transition-all shadow-sm"
              >
                <span>MakerWorld</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}

            <button
              type="button"
              onClick={handleDeleteProduct}
              disabled={isDeleting}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                deleteConfirm
                  ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-600/30'
                  : 'bg-red-950/40 border border-red-900/50 text-red-400 hover:bg-red-900 hover:text-white'
              }`}
            >
              <Trash2 className="h-4 w-4" />
              <span>{deleteConfirm ? 'Click again to confirm deletion' : 'Delete Product'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveProduct}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-500/20 hover:from-purple-500 hover:to-indigo-500 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* ================= LEFT COLUMN: PRODUCT SPECS FORM ================= */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Basic Info Card */}
            <div className="rounded-2xl border border-neutral-900 bg-neutral-900/40 p-6 backdrop-blur-md space-y-4">
              <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2 border-b border-neutral-800 pb-3">
                <Database className="h-4 w-4 text-purple-400" />
                Basic Product Information
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-sm font-semibold text-neutral-100 focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="e.g. Articulated Dragon"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">Category</label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3.5 py-2 text-sm text-neutral-100 focus:outline-none focus:border-purple-500 transition-colors"
                      placeholder="e.g. 3D Model, Toy, Desk Organizer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">Slug / Unique Identifier</label>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3.5 py-2 text-sm text-neutral-100 focus:outline-none focus:border-purple-500 transition-colors font-mono text-xs"
                      placeholder="e.g. articulated-dragon"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1">
                    <LinkIcon className="h-3.5 w-3.5 text-purple-400" />
                    MakerWorld Source URL
                  </label>
                  <input
                    type="url"
                    value={makerworldUrl}
                    onChange={(e) => setMakerworldUrl(e.target.value)}
                    className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3.5 py-2 text-sm text-neutral-200 focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="https://makerworld.com/en/models/..."
                  />
                </div>
              </div>
            </div>

            {/* 3D Print Specs Card */}
            <div className="rounded-2xl border border-neutral-900 bg-neutral-900/40 p-6 backdrop-blur-md space-y-4">
              <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2 border-b border-neutral-800 pb-3">
                <Printer className="h-4 w-4 text-indigo-400" />
                3D Printing Specifications
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-neutral-400" />
                    Print Time *
                  </label>
                  <input
                    type="text"
                    required
                    value={printTime}
                    onChange={(e) => setPrintTime(e.target.value)}
                    className={`w-full rounded-xl bg-neutral-950 border px-3.5 py-2.5 text-sm font-semibold text-neutral-100 focus:outline-none transition-colors ${
                      printTime && !isTimeValid ? 'border-red-500' : 'border-neutral-800 focus:border-purple-500'
                    }`}
                    placeholder="e.g. 3h 25m"
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">Formats: 3h 25m, 1.5h, 45m</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1">
                    <Scale className="h-3.5 w-3.5 text-neutral-400" />
                    Filament Weight (g) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={filamentWeight}
                    onChange={(e) => setFilamentWeight(e.target.value)}
                    className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-sm font-semibold text-neutral-100 focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="e.g. 120"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Cost per Kg (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={costPerKg}
                    onChange={(e) => setCostPerKg(e.target.value)}
                    className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-sm font-semibold text-neutral-100 focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="e.g. 1500"
                  />
                </div>
              </div>
            </div>

            {/* Product Dimensions Card */}
            <div className="rounded-2xl border border-neutral-900 bg-neutral-900/40 p-6 backdrop-blur-md space-y-4">
              <h2 className="text-base font-bold text-neutral-100 flex items-center justify-between border-b border-neutral-800 pb-3">
                <span className="flex items-center gap-2">
                  <Box className="h-4 w-4 text-blue-400" />
                  Product Dimensions (Optional)
                </span>
                <span className="text-[10px] text-neutral-500">LxBxH for PDF Catalog</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Length (L)</label>
                  <input
                    type="number"
                    step="any"
                    value={dimLength}
                    onChange={(e) => setDimLength(e.target.value)}
                    className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-sm font-semibold text-neutral-100 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="e.g. 120"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Breadth (B)</label>
                  <input
                    type="number"
                    step="any"
                    value={dimBreadth}
                    onChange={(e) => setDimBreadth(e.target.value)}
                    className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-sm font-semibold text-neutral-100 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="e.g. 85"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Height (H)</label>
                  <input
                    type="number"
                    step="any"
                    value={dimHeight}
                    onChange={(e) => setDimHeight(e.target.value)}
                    className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-sm font-semibold text-neutral-100 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="e.g. 45"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Unit</label>
                  <select
                    value={dimUnit}
                    onChange={(e) => setDimUnit(e.target.value as 'mm' | 'cm')}
                    className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-sm font-semibold text-neutral-100 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="mm">mm</option>
                    <option value="cm">cm</option>
                  </select>
                </div>
              </div>

              {(dimLength || dimBreadth || dimHeight) && (
                <div className="rounded-xl bg-neutral-950 p-3 border border-neutral-800 flex items-center justify-between text-xs">
                  <span className="text-neutral-400">PDF Preview Format:</span>
                  <span className="font-mono font-bold text-blue-300">
                    {dimLength || '0'} × {dimBreadth || '0'} × {dimHeight || '0'} {dimUnit}
                  </span>
                </div>
              )}
            </div>

            {/* Operating Costs & Selling Price Card */}
            <div className="rounded-2xl border border-neutral-900 bg-neutral-900/40 p-6 backdrop-blur-md space-y-4">
              <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2 border-b border-neutral-800 pb-3">
                <DollarSign className="h-4 w-4 text-emerald-400" />
                Pricing & Overhead Costs
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Selling Price (₹) *</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      step="any"
                      required
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      className="w-full rounded-xl bg-neutral-950 border border-neutral-800 pl-8 pr-3.5 py-2.5 text-sm font-extrabold text-emerald-400 focus:outline-none focus:border-emerald-500 transition-colors"
                      placeholder="e.g. 450"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Electricity Rate (₹/kWh)</label>
                  <input
                    type="number"
                    step="any"
                    value={electricityRate}
                    onChange={(e) => setElectricityRate(e.target.value)}
                    className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-sm font-semibold text-neutral-100 focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder={`Default: ₹${settings.electricityRate}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Packaging Cost (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={packagingCost}
                    onChange={(e) => setPackagingCost(e.target.value)}
                    className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3.5 py-2 text-sm text-neutral-100 focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder={`Default: ₹${settings.defaultPackagingCost}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Delivery / Shipping Cost (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={deliveryCost}
                    onChange={(e) => setDeliveryCost(e.target.value)}
                    className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3.5 py-2 text-sm text-neutral-100 focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder={`Default: ₹${settings.defaultDeliveryCost}`}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* ================= RIGHT COLUMN: PHOTO GALLERY & ANALYTICS ================= */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Live Profitability Analytics Card */}
            <div className="rounded-2xl border border-neutral-900 bg-neutral-900/40 p-6 backdrop-blur-md space-y-4">
              <h2 className="text-base font-bold text-neutral-100 flex items-center justify-between border-b border-neutral-800 pb-3">
                <span className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-purple-400" />
                  Live Unit Financial Breakdown
                </span>
                <span className="text-[10px] font-semibold text-neutral-500">Auto Computed</span>
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-neutral-950 p-3 border border-neutral-800">
                  <div className="text-[10px] text-neutral-400 font-medium">Filament Cost</div>
                  <div className="text-sm font-extrabold text-neutral-200 mt-1">₹{filamentCost.toFixed(2)}</div>
                </div>

                <div className="rounded-xl bg-neutral-950 p-3 border border-neutral-800">
                  <div className="text-[10px] text-neutral-400 font-medium">Electricity Cost</div>
                  <div className="text-sm font-extrabold text-neutral-200 mt-1">₹{electricityCost.toFixed(2)}</div>
                </div>

                <div className="rounded-xl bg-neutral-950 p-3 border border-neutral-800">
                  <div className="text-[10px] text-neutral-400 font-medium">Total Cost / Unit</div>
                  <div className="text-sm font-extrabold text-pink-400 mt-1">₹{totalCost.toFixed(2)}</div>
                </div>

                <div className="rounded-xl bg-neutral-950 p-3 border border-neutral-800">
                  <div className="text-[10px] text-neutral-400 font-medium">Max Daily Yield</div>
                  <div className="text-sm font-extrabold text-purple-400 mt-1">{maxPiecesPerDay} pcs / 24h</div>
                </div>
              </div>

              <div className="rounded-xl bg-gradient-to-r from-neutral-950 to-neutral-900 p-4 border border-neutral-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-neutral-400">Net Profit per Unit</div>
                  <div className={`text-2xl font-black mt-0.5 ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ₹{profit.toFixed(2)}
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                  profitMargin > 40
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : profitMargin > 15
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-red-500/10 text-red-400 border-red-500/30'
                }`}>
                  {profitMargin.toFixed(1)}% Margin
                </div>
              </div>
            </div>

            {/* Photo Gallery Manager Card */}
            <div className="rounded-2xl border border-neutral-900 bg-neutral-900/40 p-6 backdrop-blur-md space-y-4">
              <h2 className="text-base font-bold text-neutral-100 flex items-center justify-between border-b border-neutral-800 pb-3">
                <span className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-purple-400" />
                  Product Gallery & Photos
                </span>
                <span className="text-xs text-purple-400 font-bold">{images.length} photos</span>
              </h2>

              {/* Main Photo Display */}
              <div className="relative aspect-square w-full rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden flex items-center justify-center group">
                <img
                  src={currentDisplayImage}
                  alt={name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLElement).setAttribute(
                      'src',
                      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80'
                    );
                  }}
                />

                {/* Badge if current image is cover */}
                {currentDisplayImage === images[0] && images.length > 0 && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-purple-950/90 px-2.5 py-1 text-[10px] font-bold text-amber-300 border border-purple-500/40 backdrop-blur-md shadow-md">
                    <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                    <span>Main Cover Photo</span>
                  </div>
                )}

                {/* Main Photo Actions Overlay */}
                {images.length > 0 && (
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-1 z-10">
                    <div className="flex items-center gap-1">
                      {activeImgIdx > 0 && (
                        <button
                          type="button"
                          onClick={() => handleSetMainPhoto(activeImgIdx)}
                          className="flex items-center gap-1 rounded-full bg-purple-950/90 px-2.5 py-1 text-[10px] font-bold text-purple-200 border border-purple-500/40 backdrop-blur-md hover:bg-purple-900 transition-colors shadow-md"
                          title="Set current photo as cover photo"
                        >
                          <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                          <span>Set Cover</span>
                        </button>
                      )}

                      {activeImgIdx > 0 && (
                        <button
                          type="button"
                          onClick={() => handleMovePhoto(activeImgIdx, 'left')}
                          className="p-1 rounded-full bg-neutral-950/80 text-neutral-300 hover:text-white border border-neutral-800 backdrop-blur-md transition-colors"
                          title="Move photo left"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                      )}

                      {activeImgIdx < images.length - 1 && (
                        <button
                          type="button"
                          onClick={() => handleMovePhoto(activeImgIdx, 'right')}
                          className="p-1 rounded-full bg-neutral-950/80 text-neutral-300 hover:text-white border border-neutral-800 backdrop-blur-md transition-colors"
                          title="Move photo right"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(activeImgIdx)}
                      className="flex items-center gap-1 rounded-full bg-red-950/90 px-2.5 py-1 text-[10px] font-semibold text-red-300 border border-red-500/40 backdrop-blur-md hover:bg-red-900 transition-colors"
                      title="Remove this photo"
                    >
                      <Trash2 className="h-3 w-3 text-red-400" />
                      <span>Remove</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Upload Drop Zone */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Upload New Photo(s)</label>
                <div className="relative rounded-xl border border-dashed border-neutral-700 bg-neutral-950 p-4 text-center hover:border-purple-500 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={isUploading}
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <div className="flex flex-col items-center gap-1 text-neutral-400">
                    {isUploading ? (
                      <Loader2 className="h-5 w-5 text-purple-400 animate-spin" />
                    ) : (
                      <Upload className="h-5 w-5 text-purple-400" />
                    )}
                    <span className="text-xs font-semibold text-neutral-200">
                      {isUploading ? 'Uploading to Supabase...' : 'Click or Drag images to upload'}
                    </span>
                    <span className="text-[10px] text-neutral-500">Files stored in Supabase Storage</span>
                  </div>
                </div>
              </div>

              {/* Direct Image URL Input */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Or Add Image by URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customImageUrl}
                    onChange={(e) => setCustomImageUrl(e.target.value)}
                    className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-purple-500"
                    placeholder="https://images.unsplash.com/..."
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomUrl}
                    className="px-3 py-1.5 rounded-xl bg-neutral-800 text-xs font-semibold text-neutral-200 hover:bg-purple-600 hover:text-white shrink-0 transition-colors"
                  >
                    Add URL
                  </button>
                </div>
              </div>

              {/* Thumbnail Gallery Strip */}
              {images.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-neutral-400 mb-1.5">Gallery Thumbnails:</div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {images.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        onClick={() => setActiveImgIdx(idx)}
                        className={`group/thumb relative h-12 w-12 shrink-0 rounded-lg overflow-hidden border cursor-pointer transition-all ${
                          idx === activeImgIdx
                            ? 'border-purple-500 ring-2 ring-purple-500/40 scale-105'
                            : 'border-neutral-800 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={imgUrl} alt="" className="h-full w-full object-cover" />
                        {idx === 0 && (
                          <div className="absolute top-0.5 right-0.5 bg-amber-500 rounded-full p-0.5 shadow">
                            <Star className="h-2.5 w-2.5 text-neutral-950 fill-neutral-950" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
