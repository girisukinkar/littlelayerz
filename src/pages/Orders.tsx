import React, { useState } from 'react';
import { useOrders } from '../hooks/useOrders';
import { useProducts } from '../hooks/useProducts';
import type { Order, OrderStatus } from '../types/order';
import { OrderStats } from '../components/orders/OrderStats';
import { OrderTable } from '../components/orders/OrderTable';
import { OrderModal } from '../components/orders/OrderModal';
import { Plus, Search, RefreshCw, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

const filterOptions: ('All' | OrderStatus)[] = ['All', 'Pending', 'Printing', 'Ready', 'Delivered', 'Cancelled'];

const filterButtonStyles: Record<string, string> = {
  All: 'hover:border-neutral-700 hover:text-neutral-200 text-neutral-400 border-neutral-800 bg-neutral-900/30',
  Pending: 'hover:border-amber-500/50 hover:text-amber-400 text-neutral-400 border-neutral-800 bg-neutral-900/30',
  Printing: 'hover:border-blue-500/50 hover:text-blue-400 text-neutral-400 border-neutral-800 bg-neutral-900/30',
  Ready: 'hover:border-indigo-500/50 hover:text-indigo-400 text-neutral-400 border-neutral-800 bg-neutral-900/30',
  Delivered: 'hover:border-emerald-500/50 hover:text-emerald-400 text-neutral-400 border-neutral-800 bg-neutral-900/30',
  Cancelled: 'hover:border-red-500/50 hover:text-red-400 text-neutral-400 border-neutral-800 bg-neutral-900/30',
};

const activeFilterStyles: Record<string, string> = {
  All: 'border-neutral-500 text-neutral-200 bg-neutral-800/50',
  Pending: 'border-amber-500/50 text-amber-400 bg-amber-500/10',
  Printing: 'border-blue-500/50 text-blue-400 bg-blue-500/10',
  Ready: 'border-indigo-500/50 text-indigo-400 bg-indigo-500/10',
  Delivered: 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10',
  Cancelled: 'border-red-500/50 text-red-400 bg-red-500/10',
};

export const Orders: React.FC = () => {
  const {
    orders,
    isLoading,
    isUsingLocal,
    addOrder,
    updateOrder,
    deleteOrder,
  } = useOrders();

  const { products } = useProducts();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState<'All' | OrderStatus>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Success / Error alerts state
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const triggerAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleAddClick = () => {
    setEditingOrder(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (order: Order) => {
    setEditingOrder(order);
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      setDeletingId(id);
      try {
        await deleteOrder(id);
        triggerAlert('success', 'Order deleted successfully!');
      } catch (err: any) {
        triggerAlert('error', err.message || 'Failed to delete order.');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleFormSubmit = async (formData: Omit<Order, 'id' | 'created_at' | 'products'> & { id?: string }) => {
    setIsSubmitting(true);
    try {
      if (formData.id) {
        // Edit mode
        await updateOrder(formData as Omit<Order, 'created_at' | 'products'> & { id: string });
        triggerAlert('success', 'Order updated successfully!');
      } else {
        // Add mode
        await addOrder(formData);
        triggerAlert('success', 'Order created successfully!');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      triggerAlert('error', err.message || 'Failed to save order.');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter orders by search query and status tab
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.phone && o.phone.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.products?.name && o.products.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = activeStatus === 'All' || o.status === activeStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-8 md:px-8 text-neutral-100 selection:bg-purple-500/30 selection:text-purple-200">
      <div className="mx-auto max-w-7xl">
        {/* Header Block */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-neutral-900 pb-6 mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-50 bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Dexter3D Orders
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Track customer orders, print status, details, and revenue
            </p>
          </div>

          <button
            onClick={handleAddClick}
            className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:from-purple-500 hover:to-indigo-500 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-5 w-5" />
            Add Order
          </button>
        </header>

        {/* Database Status Alert Banner */}
        {isUsingLocal && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-400 backdrop-blur-md">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Local Storage Demo Mode Active</span>
              <p className="mt-0.5 text-neutral-400 text-xs">
                Running locally. Configure your VITE_SUPABASE_ANON_KEY in your .env file to enable syncing with your Supabase database.
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
            <p className="text-neutral-500 text-sm">Loading orders list...</p>
          </div>
        ) : (
          <>
            {/* Stats Summary Cards */}
            <OrderStats orders={orders} />

            {/* Filters Bar & Search */}
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center mb-6">
              {/* Search Bar */}
              <div className="flex items-center gap-3 bg-neutral-900/30 border border-neutral-900 rounded-xl px-4 py-2.5 shadow-inner flex-1 max-w-lg">
                <Search className="h-4 w-4 text-neutral-500 shrink-0" />
                <input
                  type="text"
                  placeholder="Search by customer, phone, or product name..."
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

              {/* Status Filter Badges */}
              <div className="flex flex-wrap gap-2">
                {filterOptions.map((opt) => {
                  const isActive = activeStatus === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => setActiveStatus(opt)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        isActive ? activeFilterStyles[opt] : filterButtonStyles[opt]
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Orders Table */}
            <OrderTable
              orders={filteredOrders}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
              deletingId={deletingId}
            />
          </>
        )}

        {/* Order Modal Form */}
        <OrderModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleFormSubmit}
          order={editingOrder}
          products={products}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
};
