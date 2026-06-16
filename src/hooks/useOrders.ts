import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Order } from '../types/order';

export function useOrders() {
  const queryClient = useQueryClient();

  // 1. Fetch Orders
  const ordersQuery = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, products(name, selling_price)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  // 2. Add Order
  const addOrderMutation = useMutation({
    mutationFn: async (newOrder: Omit<Order, 'id' | 'created_at' | 'products'>) => {
      const { data, error } = await supabase
        .from('orders')
        .insert([newOrder])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  // 3. Edit Order
  const updateOrderMutation = useMutation({
    mutationFn: async (updatedOrder: Omit<Order, 'created_at' | 'products'> & { id: string }) => {
      const { id, ...payload } = updatedOrder;
      const { data, error } = await supabase
        .from('orders')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  // 4. Delete Order
  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;
      return orderId;
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
    addOrder: addOrderMutation.mutateAsync,
    isAdding: addOrderMutation.isPending,
    updateOrder: updateOrderMutation.mutateAsync,
    isUpdating: updateOrderMutation.isPending,
    deleteOrder: deleteOrderMutation.mutateAsync,
    isDeleting: deleteOrderMutation.isPending,
  };
}
