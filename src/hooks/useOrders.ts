import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Order } from '../types/order';
import { getUsingLocalFallback } from './useProducts';

const LOCAL_STORAGE_KEY = 'dexter3d_orders_fallback';

function getLocalOrdersJoined(): Order[] {
  const storedOrders = localStorage.getItem(LOCAL_STORAGE_KEY);
  const storedProducts = localStorage.getItem('dexter3d_products_fallback');
  const orders: Order[] = storedOrders ? JSON.parse(storedOrders) : [];
  const products: any[] = storedProducts ? JSON.parse(storedProducts) : [];

  return orders.map((order) => {
    const matchedProduct = products.find((p) => p.id === order.product_id);
    return {
      ...order,
      products: matchedProduct
        ? {
            name: matchedProduct.name,
            selling_price: matchedProduct.selling_price,
          }
        : null,
    };
  });
}

function saveLocalOrderRaw(newOrder: Omit<Order, 'id' | 'created_at' | 'products'> & { id?: string }) {
  const storedOrders = localStorage.getItem(LOCAL_STORAGE_KEY);
  const orders: Order[] = storedOrders ? JSON.parse(storedOrders) : [];
  
  if (newOrder.id) {
    // Edit Mode
    const updated = orders.map((o) => (o.id === newOrder.id ? { ...o, ...newOrder } : o));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } else {
    // Add Mode
    const created: Order = {
      ...newOrder,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([created, ...orders]));
  }
}

function deleteLocalOrderRaw(orderId: string) {
  const storedOrders = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!storedOrders) return;
  const orders: Order[] = JSON.parse(storedOrders);
  const next = orders.filter((o) => o.id !== orderId);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
}

export function useOrders() {
  const queryClient = useQueryClient();
  const isUsingLocal = getUsingLocalFallback();

  // 1. Fetch Orders
  const ordersQuery = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      if (isUsingLocal) {
        return getLocalOrdersJoined();
      }
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, products(name, selling_price)')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return (data as any[]) || [];
      } catch (err) {
        console.error('Supabase orders fetch failed, using local storage:', err);
        return getLocalOrdersJoined();
      }
    },
  });

  // 2. Add Order
  const addOrderMutation = useMutation({
    mutationFn: async (newOrder: Omit<Order, 'id' | 'created_at' | 'products'>) => {
      if (isUsingLocal) {
        saveLocalOrderRaw(newOrder);
        return newOrder;
      }
      try {
        const { data, error } = await supabase
          .from('orders')
          .insert([newOrder])
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (err) {
        console.error('Supabase add order failed, saving locally:', err);
        saveLocalOrderRaw(newOrder);
        return newOrder;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  // 3. Edit Order
  const updateOrderMutation = useMutation({
    mutationFn: async (updatedOrder: Omit<Order, 'created_at' | 'products'> & { id: string }) => {
      if (isUsingLocal) {
        saveLocalOrderRaw(updatedOrder);
        return updatedOrder;
      }
      try {
        const { data, error } = await supabase
          .from('orders')
          .update(updatedOrder)
          .eq('id', updatedOrder.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (err) {
        console.error('Supabase update order failed, updating locally:', err);
        saveLocalOrderRaw(updatedOrder);
        return updatedOrder;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  // 4. Delete Order
  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      if (isUsingLocal) {
        deleteLocalOrderRaw(orderId);
        return orderId;
      }
      try {
        const { error } = await supabase
          .from('orders')
          .delete()
          .eq('id', orderId);

        if (error) throw error;
        return orderId;
      } catch (err) {
        console.error('Supabase delete order failed, removing locally:', err);
        deleteLocalOrderRaw(orderId);
        return orderId;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  return {
    orders: ordersQuery.data || [],
    isLoading: ordersQuery.isLoading,
    isError: ordersQuery.isError,
    error: ordersQuery.error,
    isUsingLocal,
    addOrder: addOrderMutation.mutateAsync,
    isAdding: addOrderMutation.isPending,
    updateOrder: updateOrderMutation.mutateAsync,
    isUpdating: updateOrderMutation.isPending,
    deleteOrder: deleteOrderMutation.mutateAsync,
    isDeleting: deleteOrderMutation.isPending,
  };
}
