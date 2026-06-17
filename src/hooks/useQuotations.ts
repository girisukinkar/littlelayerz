import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { SavedQuotation } from '../types/quotation';

export function useQuotations() {
  const queryClient = useQueryClient();

  // 1. Fetch Quotations
  const quotationsQuery = useQuery<SavedQuotation[]>({
    queryKey: ['quotations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as SavedQuotation[];
    }
  });

  // 2. Save (Add/Update) Quotation
  const saveQuotationMutation = useMutation({
    mutationFn: async (quote: Omit<SavedQuotation, 'id' | 'created_at'> & { id?: string }) => {
      if (quote.id) {
        // Edit mode (Update)
        const { id, ...payload } = quote;
        const { data, error } = await supabase
          .from('quotations')
          .update(payload)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return data as SavedQuotation;
      } else {
        // Add mode (Insert)
        const { data, error } = await supabase
          .from('quotations')
          .insert([quote])
          .select()
          .single();

        if (error) throw error;
        return data as SavedQuotation;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    }
  });

  // 3. Delete Quotation
  const deleteQuotationMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      const { error } = await supabase
        .from('quotations')
        .delete()
        .eq('id', quoteId);

      if (error) throw error;
      return quoteId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    }
  });

  return {
    quotations: quotationsQuery.data || [],
    isLoading: quotationsQuery.isLoading,
    isError: quotationsQuery.isError,
    error: quotationsQuery.error,
    saveQuotation: saveQuotationMutation.mutateAsync,
    isSaving: saveQuotationMutation.isPending,
    deleteQuotation: deleteQuotationMutation.mutateAsync,
    isDeleting: deleteQuotationMutation.isPending,
    refetch: quotationsQuery.refetch
  };
}
