import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Filament } from '../types/filament';

export function useFilaments() {
  const queryClient = useQueryClient();

  // 1. Fetch Filaments
  const filamentsQuery = useQuery<Filament[]>({
    queryKey: ['filaments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('filaments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  // 2. Add Filament
  const addFilamentMutation = useMutation({
    mutationFn: async (newFilament: Omit<Filament, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('filaments')
        .insert([newFilament])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filaments'] });
    }
  });

  // 3. Update Filament
  const updateFilamentMutation = useMutation({
    mutationFn: async (updatedFilament: Filament) => {
      const { id, created_at, ...payload } = updatedFilament;
      const { data, error } = await supabase
        .from('filaments')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filaments'] });
    }
  });

  // 4. Delete Filament
  const deleteFilamentMutation = useMutation({
    mutationFn: async (filamentId: string) => {
      const { error } = await supabase
        .from('filaments')
        .delete()
        .eq('id', filamentId);

      if (error) throw error;
      return filamentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filaments'] });
    }
  });

  return {
    filaments: filamentsQuery.data || [],
    isLoading: filamentsQuery.isLoading,
    isError: filamentsQuery.isError,
    error: filamentsQuery.error,
    addFilament: addFilamentMutation.mutateAsync,
    isAdding: addFilamentMutation.isPending,
    updateFilament: updateFilamentMutation.mutateAsync,
    isUpdating: updateFilamentMutation.isPending,
    deleteFilament: deleteFilamentMutation.mutateAsync,
    isDeleting: deleteFilamentMutation.isPending,
    refetch: filamentsQuery.refetch
  };
}
