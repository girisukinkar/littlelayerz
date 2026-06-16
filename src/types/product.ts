export interface Product {
  id?: string; // Optional for new products before insertion
  name: string;
  print_time: string; // e.g., "12m", "1.7h", "3h 25m"
  filament_weight: number; // in grams
  cost_per_kg: number;
  selling_price: number;
  created_at?: string;
}

export interface CalculatedProduct extends Product {
  decimalHours: number;
  filamentCost: number;
  electricityCost: number;
  totalCost: number;
  profit: number;
  maxPiecesPerDay: number;
}
