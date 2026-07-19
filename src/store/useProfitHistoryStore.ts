import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SavedCalculation {
  id: string;
  title: string;
  notes?: string;
  date: string;
  // Form input snapshot
  calculationMode: 'db' | 'manual';
  selectedProductId: string;
  manualName: string;
  manualCost: string;
  manualSellingPrice: string;
  quantity: number;
  includeFailedPrints: boolean;
  failedPrintsRate: string;
  includePackaging: boolean;
  packagingSource: 'default' | 'custom';
  customPackagingCost: string;
  packagingCostType: 'per_unit' | 'flat';
  includeShipping: boolean;
  shippingSource: 'default' | 'custom';
  customShippingCost: string;
  shippingCostType: 'per_unit' | 'flat';
  // Calculated output snapshot
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
}

interface ProfitHistoryState {
  savedCalculations: SavedCalculation[];
  saveCalculation: (calc: Omit<SavedCalculation, 'id' | 'date'>) => void;
  updateCalculation: (id: string, updatedCalc: Partial<SavedCalculation>) => void;
  deleteCalculation: (id: string) => void;
  clearHistory: () => void;
}

export const useProfitHistoryStore = create<ProfitHistoryState>()(
  persist(
    (set) => ({
      savedCalculations: [],
      saveCalculation: (calc) =>
        set((state) => ({
          savedCalculations: [
            {
              ...calc,
              id: crypto.randomUUID(),
              date: new Date().toISOString(),
            },
            ...state.savedCalculations,
          ],
        })),
      updateCalculation: (id, updatedCalc) =>
        set((state) => ({
          savedCalculations: state.savedCalculations.map((item) =>
            item.id === id
              ? {
                  ...item,
                  ...updatedCalc,
                  date: new Date().toISOString(), // refresh timestamp on update
                }
              : item
          ),
        })),
      deleteCalculation: (id) =>
        set((state) => ({
          savedCalculations: state.savedCalculations.filter((item) => item.id !== id),
        })),
      clearHistory: () => set({ savedCalculations: [] }),
    }),
    {
      name: 'dexter3d-profit-history',
    }
  )
);
