export interface Filament {
  id?: string;
  name: string;
  color_hex: string;
  color_name: string;
  type: string; // PLA, PETG, ABS, TPU, Wood, Carbon Fiber, Nylon, etc.
  cost_per_kg: number;
  purchase_price: number;
  grams_left: number;
  has_spool: boolean;
  created_at?: string;
}
