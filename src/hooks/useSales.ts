import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Sale, SalesSummaryMetrics, DateFilterRange } from '../types/sale';

const LOCAL_STORAGE_KEY = 'dexter3d_market_sales_cache';

// Helper to read local cache
const getLocalSales = (): Sale[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse local sales cache:', e);
    return [];
  }
};

// Helper to write local cache
const saveLocalSales = (sales: Sale[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sales));
  } catch (e) {
    console.warn('Failed to save local sales cache:', e);
  }
};

export function useSales() {
  const queryClient = useQueryClient();

  // 1. Fetch Sales
  const salesQuery = useQuery<Sale[]>({
    queryKey: ['market_sales'],
    queryFn: async () => {
      // If Supabase is configured, try fetching from Supabase
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('market_sales')
            .select('*')
            .order('created_at', { ascending: false });

          if (!error && data) {
            // Save to local cache for instant offline fallback
            saveLocalSales(data as Sale[]);
            return data as Sale[];
          }
          console.warn('Supabase query error, falling back to localStorage cache:', error?.message);
        } catch (err) {
          console.warn('Supabase request failed, using localStorage:', err);
        }
      }

      // Fallback to local storage
      return getLocalSales();
    },
    initialData: getLocalSales,
  });

  // 2. Add Sale Mutation
  const addSaleMutation = useMutation({
    mutationFn: async (newSale: Omit<Sale, 'id' | 'created_at'> & { id?: string; created_at?: string }) => {
      const saleWithMeta: Sale = {
        ...newSale,
        id: newSale.id || crypto.randomUUID(),
        created_at: newSale.created_at || new Date().toISOString(),
      };

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('market_sales')
            .insert([saleWithMeta])
            .select()
            .single();

          if (!error && data) {
            // Update local cache
            const current = getLocalSales();
            saveLocalSales([data as Sale, ...current.filter(s => s.id !== data.id)]);
            return data as Sale;
          }
          console.warn('Supabase insert failed, saving locally:', error?.message);
        } catch (err) {
          console.warn('Supabase insert error, saving locally:', err);
        }
      }

      // Offline / Local save
      const current = getLocalSales();
      const updated = [saleWithMeta, ...current.filter(s => s.id !== saleWithMeta.id)];
      saveLocalSales(updated);
      return saleWithMeta;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market_sales'] });
    },
  });

  // 3. Update Sale Mutation
  const updateSaleMutation = useMutation({
    mutationFn: async (updatedSale: Sale) => {
      if (!updatedSale.id) throw new Error('Sale ID required for update');

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('market_sales')
            .update(updatedSale)
            .eq('id', updatedSale.id)
            .select()
            .single();

          if (!error && data) {
            const current = getLocalSales();
            saveLocalSales(current.map(s => (s.id === data.id ? (data as Sale) : s)));
            return data as Sale;
          }
          console.warn('Supabase update failed, updating locally:', error?.message);
        } catch (err) {
          console.warn('Supabase update error, updating locally:', err);
        }
      }

      // Local update
      const current = getLocalSales();
      const updated = current.map(s => (s.id === updatedSale.id ? updatedSale : s));
      saveLocalSales(updated);
      return updatedSale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market_sales'] });
    },
  });

  // 4. Delete Sale Mutation
  const deleteSaleMutation = useMutation({
    mutationFn: async (saleId: string) => {
      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase
            .from('market_sales')
            .delete()
            .eq('id', saleId);

          if (error) {
            console.warn('Supabase delete error:', error.message);
          }
        } catch (err) {
          console.warn('Supabase delete exception:', err);
        }
      }

      // Update local storage
      const current = getLocalSales();
      const updated = current.filter(s => s.id !== saleId);
      saveLocalSales(updated);
      return saleId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market_sales'] });
    },
  });

  // 5. Clear All Sales
  const clearAllSalesMutation = useMutation({
    mutationFn: async () => {
      if (isSupabaseConfigured) {
        try {
          await supabase.from('market_sales').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        } catch (err) {
          console.warn('Failed to clear supabase table:', err);
        }
      }
      saveLocalSales([]);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market_sales'] });
    },
  });

  return {
    sales: salesQuery.data || [],
    isLoading: salesQuery.isLoading,
    isError: salesQuery.isError,
    error: salesQuery.error,
    addSale: addSaleMutation.mutateAsync,
    isAdding: addSaleMutation.isPending,
    updateSale: updateSaleMutation.mutateAsync,
    isUpdating: updateSaleMutation.isPending,
    deleteSale: deleteSaleMutation.mutateAsync,
    isDeleting: deleteSaleMutation.isPending,
    clearAllSales: clearAllSalesMutation.mutateAsync,
    refetch: salesQuery.refetch,
  };
}

/**
 * Filter sales according to preset or custom date ranges.
 */
export function filterSalesByDate(
  sales: Sale[],
  range: DateFilterRange,
  customStart?: string,
  customEnd?: string
): Sale[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfToday = startOfToday + 24 * 60 * 60 * 1000 - 1;

  return sales.filter((sale) => {
    const saleTime = sale.created_at ? new Date(sale.created_at).getTime() : now.getTime();

    if (range === 'today') {
      return saleTime >= startOfToday && saleTime <= endOfToday;
    }
    if (range === 'yesterday') {
      const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
      const endOfYesterday = startOfToday - 1;
      return saleTime >= startOfYesterday && saleTime <= endOfYesterday;
    }
    if (range === 'week') {
      const sevenDaysAgo = startOfToday - 6 * 24 * 60 * 60 * 1000;
      return saleTime >= sevenDaysAgo;
    }
    if (range === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      return saleTime >= startOfMonth;
    }
    if (range === 'custom') {
      if (!customStart) return true;
      const startTime = new Date(customStart).getTime();
      const endTime = customEnd ? new Date(customEnd).getTime() + 24 * 60 * 60 * 1000 - 1 : Infinity;
      return saleTime >= startTime && saleTime <= endTime;
    }
    return true; // 'all'
  });
}

/**
 * Compute aggregate financial and volume statistics for the selected sales.
 */
export function calculateSalesMetrics(sales: Sale[]): SalesSummaryMetrics {
  let totalRevenue = 0;
  let totalProfit = 0;
  let totalCost = 0;
  let totalUnitsSold = 0;
  let cashRevenue = 0;
  let cashCount = 0;
  let upiRevenue = 0;
  let upiCount = 0;
  let cardRevenue = 0;
  let cardCount = 0;
  let otherRevenue = 0;
  let otherCount = 0;

  for (const sale of sales) {
    const amount = Number(sale.total_amount) || 0;
    const cost = Number(sale.total_cost) || 0;
    const profit = Number(sale.total_profit) || amount - cost;

    totalRevenue += amount;
    totalCost += cost;
    totalProfit += profit;

    // Sum item quantities
    const itemsCount = sale.items?.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0) || 1;
    totalUnitsSold += itemsCount;

    // Payment methods
    if (sale.payment_method === 'Cash') {
      cashRevenue += amount;
      cashCount += 1;
    } else if (sale.payment_method === 'UPI') {
      upiRevenue += amount;
      upiCount += 1;
    } else if (sale.payment_method === 'Card') {
      cardRevenue += amount;
      cardCount += 1;
    } else {
      otherRevenue += amount;
      otherCount += 1;
    }
  }

  const totalTransactions = sales.length;
  const averageOrderValue = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;
  const profitMarginPercent = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;

  return {
    totalRevenue,
    totalProfit,
    totalCost,
    totalUnitsSold,
    totalTransactions,
    averageOrderValue,
    profitMarginPercent,
    cashRevenue,
    cashCount,
    upiRevenue,
    upiCount,
    cardRevenue,
    cardCount,
    otherRevenue,
    otherCount,
  };
}
