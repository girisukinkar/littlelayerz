export type OrderStatus = 'Pending' | 'Printing' | 'Ready' | 'Delivered' | 'Cancelled';

export interface Order {
  id?: string;
  customer_name: string;
  phone?: string;
  address?: string;
  product_id: string;
  quantity: number;
  amount: number;
  status: OrderStatus;
  notes?: string;
  created_at?: string;
  // Joined relation fields from Supabase
  products?: {
    name: string;
    selling_price: number;
  } | null;
}
