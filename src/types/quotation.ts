export interface SavedQuotation {
  id: string;
  quote_ref: string;
  client_name: string;
  items: {
    id: string;
    productId: string;
    quantity: number;
    customPrice: number;
  }[];
  total_amount: number;
  created_at: string;
}
