import type { DiscountType, PaymentStatus, PaymentMethod } from '../utils/gstCalculations';

export interface DispatchWarehouse {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  state_code: string;
  is_default?: boolean;
}

export interface BusinessProfile {
  id: string;
  user_id?: string | null;
  name: string;
  logo_url?: string | null;
  upi_qr_url?: string | null;
  instagram_handle?: string | null;
  whatsapp_number?: string | null;
  facebook_handle?: string | null;
  twitter_handle?: string | null;
  address?: string | null;
  city?: string | null;
  state: string;
  state_code: string;
  pincode?: string | null;
  gstin?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  upi_id?: string | null;
  bank_name?: string | null;
  bank_account_no?: string | null;
  bank_ifsc?: string | null;
  bank_branch?: string | null;
  invoice_prefix: string;
  default_gst_rate: number;
  default_notes?: string | null;
  default_terms?: string | null;
  dispatch_warehouses?: DispatchWarehouse[];
  created_at?: string;
  updated_at?: string;
}

export interface GstCustomer {
  id: string;
  business_id?: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  billing_address?: string | null;
  shipping_address?: string | null;
  city?: string | null;
  state: string;
  state_code: string;
  pincode?: string | null;
  notes?: string | null;
  total_orders?: number;
  total_spent?: number;
  last_purchase_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface GstProduct {
  id: string;
  business_id?: string;
  name: string;
  sku?: string | null;
  hsn_sac?: string | null;
  default_price: number;
  default_gst_rate: number;
  description?: string | null;
  category?: string | null;
  unit: string;
  is_active: boolean;
  total_sold?: number;
  revenue_generated?: number;
  created_at?: string;
  updated_at?: string;
}

export interface GstInvoiceItemRecord {
  id: string;
  invoice_id?: string;
  product_id?: string | null;
  product_name_snapshot: string;
  description_snapshot?: string | null;
  hsn_sac_snapshot?: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  gross_amount: number;
  discount_type: DiscountType;
  discount_value: number;
  discount_amount: number;
  taxable_amount: number;
  gst_rate: number;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  igst_rate: number;
  igst_amount: number;
  gst_amount: number;
  line_total: number;
  sort_order: number;
  created_at?: string;
}

export interface GstInvoiceRecord {
  id: string;
  business_id?: string;
  customer_id?: string | null;
  invoice_number: string;
  invoice_date: string;
  due_date?: string | null;
  is_draft?: boolean;
  reverse_charge?: boolean;
  place_of_supply: string;
  place_of_supply_state_code: string;
  is_inter_state: boolean;
  
  // Historical Snapshots & Origin
  seller_snapshot: BusinessProfile;
  customer_snapshot: Partial<GstCustomer>;
  billing_address?: string | null;
  shipping_address?: string | null;
  dispatch_location_name?: string | null;
  dispatch_address?: string | null;
  dispatch_city?: string | null;
  dispatch_state?: string | null;
  dispatch_state_code?: string | null;
  
  // Computations
  subtotal: number;
  item_discount_total: number;
  invoice_discount_type: DiscountType;
  invoice_discount_value: number;
  invoice_discount_amount: number;
  shipping_amount: number;
  shipping_gst_rate: number;
  shipping_gst_amount: number;
  taxable_amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total_gst: number;
  rounding_adjustment: number;
  grand_total: number;
  amount_in_words: string;
  
  // Payment
  amount_paid: number;
  balance_due: number;
  payment_status: PaymentStatus;
  payment_method?: PaymentMethod | null;
  
  // Items & Metadata
  items?: GstInvoiceItemRecord[];
  notes?: string | null;
  terms?: string | null;
  pdf_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface GstPaymentRecord {
  id: string;
  invoice_id: string;
  business_id?: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  reference_number?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface DashboardMetrics {
  todaysSales: number;
  thisMonthSales: number;
  totalSales: number;
  totalGst: number;
  totalDiscounts: number;
  pendingPayments: number;
  totalInvoices: number;
}
