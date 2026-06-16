import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Product } from '../types/product';

const LOCAL_STORAGE_KEY = 'dexter3d_products_fallback';

// Get mock/local data
function getLocalProducts(): Product[] {
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!stored) {
    const initial: Product[] = [
      {
        id: '1',
        name: 'Bambu Spool Holder',
        print_time: '1h 45m',
        filament_weight: 120,
        cost_per_kg: 25,
        selling_price: 18,
        created_at: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: '2',
        name: 'Articulated Dragon',
        print_time: '3h 25m',
        filament_weight: 85,
        cost_per_kg: 30,
        selling_price: 22,
        created_at: new Date().toISOString()
      }
    ];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(stored);
}

function setLocalProducts(products: Product[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(products));
}

// Check if we should use local fallback (either because Supabase is not configured or fails)
let useLocalFallback = !isSupabaseConfigured;

export const setUseLocalFallback = (val: boolean) => {
  useLocalFallback = val;
};

export const getUsingLocalFallback = () => useLocalFallback;

export function useProducts() {
  const queryClient = useQueryClient();

  // 1. Fetch Products
  const productsQuery = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      if (useLocalFallback) {
        return getLocalProducts();
      }
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
      } catch (err) {
        console.error('Supabase query failed, falling back to LocalStorage:', err);
        useLocalFallback = true;
        return getLocalProducts();
      }
    }
  });

  // 2. Add Product
  const addProductMutation = useMutation({
    mutationFn: async (newProduct: Omit<Product, 'id' | 'created_at'>) => {
      if (useLocalFallback) {
        const local = getLocalProducts();
        const created: Product = {
          ...newProduct,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString()
        };
        setLocalProducts([created, ...local]);
        return created;
      }
      try {
        const { data, error } = await supabase
          .from('products')
          .insert([newProduct])
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (err) {
        console.error('Supabase insert failed, running locally:', err);
        useLocalFallback = true;
        const local = getLocalProducts();
        const created: Product = {
          ...newProduct,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString()
        };
        setLocalProducts([created, ...local]);
        return created;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });

  // 3. Update Product
  const updateProductMutation = useMutation({
    mutationFn: async (updatedProduct: Product) => {
      if (useLocalFallback) {
        const local = getLocalProducts();
        const next = local.map((p) => (p.id === updatedProduct.id ? updatedProduct : p));
        setLocalProducts(next);
        return updatedProduct;
      }
      try {
        const { data, error } = await supabase
          .from('products')
          .update(updatedProduct)
          .eq('id', updatedProduct.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (err) {
        console.error('Supabase update failed, running locally:', err);
        useLocalFallback = true;
        const local = getLocalProducts();
        const next = local.map((p) => (p.id === updatedProduct.id ? updatedProduct : p));
        setLocalProducts(next);
        return updatedProduct;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });

  // 4. Delete Product
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (useLocalFallback) {
        const local = getLocalProducts();
        const next = local.filter((p) => p.id !== productId);
        setLocalProducts(next);
        return productId;
      }
      try {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', productId);

        if (error) throw error;
        return productId;
      } catch (err) {
        console.error('Supabase delete failed, running locally:', err);
        useLocalFallback = true;
        const local = getLocalProducts();
        const next = local.filter((p) => p.id !== productId);
        setLocalProducts(next);
        return productId;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });

  return {
    products: productsQuery.data || [],
    isLoading: productsQuery.isLoading,
    isError: productsQuery.isError,
    error: productsQuery.error,
    isUsingLocal: useLocalFallback,
    addProduct: addProductMutation.mutateAsync,
    isAdding: addProductMutation.isPending,
    updateProduct: updateProductMutation.mutateAsync,
    isUpdating: updateProductMutation.isPending,
    deleteProduct: deleteProductMutation.mutateAsync,
    isDeleting: deleteProductMutation.isPending,
    refetch: productsQuery.refetch
  };
}
