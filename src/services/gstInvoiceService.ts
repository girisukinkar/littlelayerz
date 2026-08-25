import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { GstInvoiceRecord, GstInvoiceItemRecord } from '../types/gst';

const LOCAL_STORAGE_KEY = 'd3d_gst_invoices';

function isValidUuid(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// No hardcoded sample invoices — real data comes from Supabase or localStorage only.
// This prevents fake demo records from polluting the live ledger.

// Sentinel key to track if Supabase has been confirmed reachable
const SUPABASE_CONFIRMED_KEY = 'd3d_supabase_invoices_confirmed';



function sanitizeInvoiceSellerSnapshot(inv: GstInvoiceRecord): GstInvoiceRecord {
  if (inv && inv.seller_snapshot) {
    if (inv.seller_snapshot.gstin === '27AAPFU0939F1ZV' || inv.seller_snapshot.name === 'Dexter3D Studio') {
      inv.seller_snapshot.gstin = '09AANPW1625N1ZY';
      inv.seller_snapshot.name = 'Little Layerz';
      inv.seller_snapshot.state = 'Uttar Pradesh';
      inv.seller_snapshot.state_code = '09';
      inv.seller_snapshot.address = 'Sector 5, Ghaziabad';
      inv.seller_snapshot.city = 'Ghaziabad';
      inv.seller_snapshot.pincode = '201010';
      inv.seller_snapshot.email = 'littlelayerz@gmail.com';
      inv.seller_snapshot.phone = '+918796837718';
      inv.seller_snapshot.bank_branch = 'Indirapuram, Ghaziabad';
    } else if (inv.seller_snapshot.bank_branch === 'Hinjewadi Phase 1, Pune') {
      inv.seller_snapshot.bank_branch = 'Indirapuram, Ghaziabad';
    }
  }
  return inv;
}

export const gstInvoiceService = {
  async getInvoices(): Promise<GstInvoiceRecord[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('gst_invoices')
          .select('*, items:gst_invoice_items(*)')
          .order('invoice_date', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Supabase getInvoices error:', error.message);
          // Fall through to localStorage on error only
        } else {
          const sanitized = (data || []).map((inv) => sanitizeInvoiceSellerSnapshot(inv as GstInvoiceRecord));
          // Supabase responded successfully (even empty array is authoritative)
          // Mark that Supabase is confirmed reachable
          localStorage.setItem(SUPABASE_CONFIRMED_KEY, 'true');
          // Sync to localStorage cache
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sanitized));
          return sanitized;
        }
      } catch (err) {
        console.warn('Network error fetching invoices:', err);
      }
    }

    // Only use localStorage cache — never seed fake demo data
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((inv) => sanitizeInvoiceSellerSnapshot(inv as GstInvoiceRecord));
        }
      } catch {
        // ignore parse error
      }
    }

    // Return empty list — user has no invoices yet
    return [];
  },

  async getInvoiceById(id: string): Promise<GstInvoiceRecord | null> {
    const invoices = await this.getInvoices();
    return invoices.find((inv) => inv.id === id) || null;
  },

  async getNextInvoiceNumber(prefix = 'INV'): Promise<string> {
    const invoices = await this.getInvoices();
    const prefixRegex = new RegExp(`^${prefix}-(\\d+)$`, 'i');
    let maxNum = 0;

    invoices.forEach((inv) => {
      const match = inv.invoice_number.match(prefixRegex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });

    const next = maxNum + 1;
    return `${prefix}-${next.toString().padStart(4, '0')}`;
  },

  async saveInvoice(invoice: Partial<GstInvoiceRecord>): Promise<GstInvoiceRecord> {
    const invoices = await this.getInvoices();
    const isNew = !invoice.id || !isValidUuid(invoice.id);
    const newId = invoice.id && isValidUuid(invoice.id) ? invoice.id : generateUuid();
    const validCustomerId = invoice.customer_id && isValidUuid(invoice.customer_id) ? invoice.customer_id : null;

    const items: GstInvoiceItemRecord[] = (invoice.items || []).map((it, idx) => ({
      ...it,
      id: it.id && isValidUuid(it.id) ? it.id : generateUuid(),
      product_id: it.product_id && isValidUuid(it.product_id) ? it.product_id : null,
      invoice_id: newId,
      sort_order: idx,
    }));

    const newRecord: GstInvoiceRecord = {
      id: newId,
      invoice_number: invoice.invoice_number || (await this.getNextInvoiceNumber()),
      invoice_date: invoice.invoice_date || new Date().toISOString().slice(0, 10),
      due_date: invoice.due_date || null,
      is_draft: Boolean(invoice.is_draft),
      reverse_charge: Boolean(invoice.reverse_charge),
      place_of_supply: invoice.place_of_supply || 'Maharashtra',
      place_of_supply_state_code: invoice.place_of_supply_state_code || '27',
      is_inter_state: invoice.is_inter_state || false,
      customer_id: validCustomerId,
      seller_snapshot: (invoice.seller_snapshot || {}) as GstInvoiceRecord['seller_snapshot'],
      customer_snapshot: invoice.customer_snapshot || {},
      billing_address: invoice.billing_address || null,
      dispatch_location_name: invoice.dispatch_location_name || null,
      dispatch_address: invoice.dispatch_address || null,
      dispatch_city: invoice.dispatch_city || null,
      dispatch_state: invoice.dispatch_state || null,
      dispatch_state_code: invoice.dispatch_state_code || null,
      subtotal: Number(invoice.subtotal) || 0,
      item_discount_total: Number(invoice.item_discount_total) || 0,
      invoice_discount_type: invoice.invoice_discount_type || 'fixed',
      invoice_discount_value: Number(invoice.invoice_discount_value) || 0,
      invoice_discount_amount: Number(invoice.invoice_discount_amount) || 0,
      shipping_amount: Number(invoice.shipping_amount) || 0,
      shipping_gst_rate: Number(invoice.shipping_gst_rate) || 0,
      shipping_gst_amount: Number(invoice.shipping_gst_amount) || 0,
      taxable_amount: Number(invoice.taxable_amount) || 0,
      cgst: Number(invoice.cgst) || 0,
      sgst: Number(invoice.sgst) || 0,
      igst: Number(invoice.igst) || 0,
      total_gst: Number(invoice.total_gst) || 0,
      rounding_adjustment: Number(invoice.rounding_adjustment) || 0,
      grand_total: Number(invoice.grand_total) || 0,
      amount_in_words: invoice.amount_in_words || '',
      amount_paid: Number(invoice.amount_paid) || 0,
      balance_due: Number(invoice.balance_due) || 0,
      payment_status: invoice.payment_status || 'unpaid',
      payment_method: invoice.payment_method || null,
      notes: invoice.notes || null,
      terms: invoice.terms || null,
      pdf_url: invoice.pdf_url || null,
      items,
      created_at: invoice.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let updatedList: GstInvoiceRecord[];
    if (isNew) {
      updatedList = [newRecord, ...invoices.filter((inv) => inv.id !== newId)];
    } else {
      updatedList = invoices.map((inv) => (inv.id === newId ? newRecord : inv));
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));

    if (isSupabaseConfigured) {
      try {
        const {
          items: _itemsToOmit,
          reverse_charge: _rcToOmit,
          dispatch_location_name: _d1,
          dispatch_address: _d2,
          dispatch_city: _d3,
          dispatch_state: _d4,
          dispatch_state_code: _d5,
          ...invoicePayload
        } = newRecord;
        void _itemsToOmit;
        void _rcToOmit;
        void _d1; void _d2; void _d3; void _d4; void _d5;

        let { error: invoiceError } = await supabase.from('gst_invoices').upsert(invoicePayload, { onConflict: 'id' });

        if (invoiceError && invoiceError.message.includes('gst_invoices_customer_id_fkey')) {
          console.warn('Customer foreign key missing, retrying invoice with customer_id: null');
          const fallbackPayload = { ...invoicePayload, customer_id: null };
          const retryRes = await supabase.from('gst_invoices').upsert(fallbackPayload, { onConflict: 'id' });
          invoiceError = retryRes.error;
        }

        if (invoiceError) {
          console.warn('Supabase saveInvoice warning (saved locally):', invoiceError.message);
        } else if (items.length > 0) {
          await supabase.from('gst_invoice_items').delete().eq('invoice_id', newId);
          const { error: itemError } = await supabase.from('gst_invoice_items').insert(items);
          if (itemError) {
            console.warn('Supabase saveInvoice items warning:', itemError.message);
          }
        }
      } catch (err: any) {
        console.warn('Network error saving to Supabase (saved locally):', err);
      }
    }

    return newRecord;
  },

  async recordPayment(
    invoiceId: string,
    amount: number,
    method: 'upi' | 'bank_transfer' | 'cash' | 'card' | 'other'
  ): Promise<GstInvoiceRecord | null> {
    const invoice = await this.getInvoiceById(invoiceId);
    if (!invoice) return null;

    const newAmountPaid = Math.min(
      invoice.grand_total,
      Number((invoice.amount_paid + amount).toFixed(2))
    );
    const newBalance = Math.max(0, Number((invoice.grand_total - newAmountPaid).toFixed(2)));
    const newStatus = newBalance <= 0 ? 'paid' : newAmountPaid > 0 ? 'partial' : 'unpaid';

    return await this.saveInvoice({
      ...invoice,
      amount_paid: newAmountPaid,
      balance_due: newBalance,
      payment_status: newStatus,
      payment_method: method,
    });
  },

  async deleteInvoice(id: string): Promise<void> {
    // Delete from Supabase first (source of truth)
    if (isSupabaseConfigured && isValidUuid(id)) {
      try {
        await supabase.from('gst_invoices').delete().eq('id', id);
      } catch (err) {
        console.warn('Error deleting invoice from Supabase:', err);
      }
    }

    // Then sync localStorage cache
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as GstInvoiceRecord[];
        const filtered = parsed.filter((inv) => inv.id !== id);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
      } catch {
        // ignore
      }
    }
  },
};
