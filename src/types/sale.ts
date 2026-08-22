export type PaymentMethod = 'UPI' | 'Cash' | 'Card' | 'Other';

export interface SaleItem {
  id: string;
  product_id?: string | null; // null if custom item
  product_name: string;
  is_custom: boolean;
  quantity: number;
  unit_price: number; // selling price in ₹
  cost_price?: number; // optional making price in ₹
  total_price: number; // unit_price * quantity
  total_cost?: number; // (cost_price || 0) * quantity
  profit?: number; // total_price - (total_cost || 0)
  image_url?: string | null;
}

export interface Sale {
  id?: string;
  receipt_no: string; // e.g. RS-20260808-001
  items: SaleItem[];
  total_amount: number; // Grand total (₹)
  subtotal: number;
  discount: number; // Discount in ₹
  total_cost: number; // Total making / cost price (₹)
  total_profit: number; // total_amount - total_cost
  payment_method: PaymentMethod;
  customer_name?: string;
  customer_phone?: string;
  notes?: string;
  created_at?: string;
}

export type DateFilterRange = 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom';

export interface SalesSummaryMetrics {
  totalRevenue: number;
  totalProfit: number;
  totalCost: number;
  totalUnitsSold: number;
  totalTransactions: number;
  averageOrderValue: number;
  profitMarginPercent: number;
  cashRevenue: number;
  cashCount: number;
  upiRevenue: number;
  upiCount: number;
  cardRevenue: number;
  cardCount: number;
  otherRevenue: number;
  otherCount: number;
}
