import React, { useState } from 'react';
import { useProducts } from '../hooks/useProducts';
import type { Product } from '../types/product';
import { ProductStats } from '../components/products/ProductStats';
import { ProductTable } from '../components/products/ProductTable';
import { ProductModal } from '../components/products/ProductModal';
import { Plus, Search, RefreshCw, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

export const Products: React.FC = () => {
  const {
    products,
    isLoading,
    isUsingLocal,
    addProduct,
    updateProduct,
    deleteProduct,
  } = useProducts();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Success / Error alerts state
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const triggerAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleAddClick = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      setDeletingId(id);
      try {
        await deleteProduct(id);
        triggerAlert('success', 'Product deleted successfully!');
      } catch (err: any) {
        triggerAlert('error', err.message || 'Failed to delete product.');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleFormSubmit = async (formData: Omit<Product, 'id' | 'created_at'> & { id?: string }) => {
    setIsSubmitting(true);
    try {
      if (formData.id) {
        // Edit mode
        await updateProduct(formData as Product);
        triggerAlert('success', 'Product updated successfully!');
      } else {
        // Add mode
        await addProduct(formData);
        triggerAlert('success', 'Product added successfully!');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      triggerAlert('error', err.message || 'Failed to save product.');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter products by search query
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-8 md:px-8 text-neutral-100 selection:bg-purple-500/30 selection:text-purple-200">
      <div className="mx-auto max-w-7xl">
        {/* Header Block */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-neutral-900 pb-6 mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-50 bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Dexter3D ERP
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Bambu Lab A1 Mini Single-Printer Production & Financial Dashboard
            </p>
          </div>
          
          <button
            onClick={handleAddClick}
            className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:from-purple-500 hover:to-indigo-500 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-5 w-5" />
            Add Product
          </button>
        </header>

        {/* Database Status Alert Banner */}
        {isUsingLocal && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-400 backdrop-blur-md">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Local Storage Demo Mode Active</span>
              <p className="mt-0.5 text-neutral-400 text-xs">
                We couldn't connect to your Supabase project (either because the Anon Key is not set or there's a connection issue). 
                Any additions, updates, or deletions are being saved to your local browser storage. Configure your actual <code className="bg-neutral-900 px-1 py-0.5 rounded border border-neutral-800 text-[10px] text-amber-300">VITE_SUPABASE_ANON_KEY</code> in the <code className="bg-neutral-900 px-1 py-0.5 rounded border border-neutral-800 text-[10px] text-amber-300">.env</code> file to enable database sync.
              </p>
            </div>
          </div>
        )}

        {/* Success/Error Alerts */}
        {alert && (
          <div
            className={`mb-6 flex items-center gap-3 rounded-xl border p-4 text-sm shadow-lg backdrop-blur-md transition-all duration-300 ${
              alert.type === 'success'
                ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
                : 'border-red-500/20 bg-red-500/5 text-red-400'
            }`}
          >
            {alert.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <ShieldAlert className="h-5 w-5 shrink-0" />
            )}
            <span className="font-medium">{alert.message}</span>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <RefreshCw className="h-8 w-8 animate-spin text-purple-500" />
            <p className="text-neutral-500 text-sm">Loading products catalog...</p>
          </div>
        ) : (
          <>
            {/* Stats Summary Cards */}
            <ProductStats products={products} />

            {/* Actions Bar (Search) */}
            <div className="flex items-center gap-3 bg-neutral-900/30 border border-neutral-900 rounded-xl px-4 py-3 mb-6 shadow-inner">
              <Search className="h-5 w-5 text-neutral-500 shrink-0" />
              <input
                type="text"
                placeholder="Search products by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-0 focus:outline-none focus:ring-0 text-sm text-neutral-200 placeholder-neutral-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs font-semibold text-neutral-500 hover:text-neutral-300 px-2"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Products Table */}
            <ProductTable
              products={filteredProducts}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
              deletingId={deletingId}
            />
          </>
        )}

        {/* Product Modal form */}
        <ProductModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleFormSubmit}
          product={editingProduct}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
};
