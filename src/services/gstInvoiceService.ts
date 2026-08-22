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

const INITIAL_INVOICES: GstInvoiceRecord[] = [
  {
    id: 'b1111111-1111-4111-a111-111111111111',
    invoice_number: 'INV-0001',
    invoice_date: '2026-08-20',
    due_date: '2026-08-27',
    place_of_supply: 'Maharashtra',
    place_of_supply_state_code: '27',
    is_inter_state: false,
    customer_id: '11111111-1111-4111-a111-111111111111',
    seller_snapshot: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Dexter3D Studio',
      address: 'Shop No. 4, Tech Park Commercial Hub',
      city: 'Pune',
      state: 'Maharashtra',
      state_code: '27',
      pincode: '411057',
      gstin: '27AAPFU0939F1ZV',
      phone: '+91 98765 43210',
      email: 'contact@dexter3d.in',
      website: 'https://dexter3d.in',
      invoice_prefix: 'INV',
      default_gst_rate: 18,
    },
    customer_snapshot: {
      id: '11111111-1111-4111-a111-111111111111',
      name: 'Rahul Sharma',
      phone: '+91 98234 11223',
      email: 'rahul.sharma@example.com',
      gstin: '27AABCU9603R1ZM',
      billing_address: 'Flat 402, Sunshine Heights, Baner Road, Pune',
      shipping_address: 'Flat 402, Sunshine Heights, Baner Road, Pune',
      city: 'Pune',
      state: 'Maharashtra',
      state_code: '27',
    },
    billing_address: 'Flat 402, Sunshine Heights, Baner Road, Pune',
    shipping_address: 'Flat 402, Sunshine Heights, Baner Road, Pune',
    subtotal: 1250.0,
    item_discount_total: 0.0,
    invoice_discount_type: 'fixed',
    invoice_discount_value: 0.0,
    invoice_discount_amount: 0.0,
    shipping_amount: 0.0,
    shipping_gst_rate: 0.0,
    shipping_gst_amount: 0.0,
    taxable_amount: 1250.0,
    cgst: 112.5,
    sgst: 112.5,
    igst: 0.0,
    total_gst: 225.0,
    rounding_adjustment: 0.0,
    grand_total: 1475.0,
    amount_in_words: 'One Thousand Four Hundred Seventy-Five Rupees Only',
    amount_paid: 1475.0,
    balance_due: 0.0,
    payment_status: 'paid',
    payment_method: 'upi',
    notes: 'Thank you for your order with Dexter3D Studio!',
    terms: 'Goods once sold will not be returned unless damaged.',
    items: [
      {
        id: 'c1111111-1111-4111-a111-111111111111',
        invoice_id: 'b1111111-1111-4111-a111-111111111111',
        product_id: 'a1111111-1111-4111-a111-111111111111',
        product_name_snapshot: 'Custom 3D Printed Lithophane Lamp',
        description_snapshot: 'Personalized night lamp with 3 curved photos and warm LED base.',
        hsn_sac_snapshot: '3926',
        quantity: 1,
        unit: 'PCS',
        unit_price: 1250.0,
        gross_amount: 1250.0,
        discount_type: 'fixed',
        discount_value: 0,
        discount_amount: 0,
        taxable_amount: 1250.0,
        gst_rate: 18.0,
        cgst_rate: 9.0,
        cgst_amount: 112.5,
        sgst_rate: 9.0,
        sgst_amount: 112.5,
        igst_rate: 0.0,
        igst_amount: 0.0,
        gst_amount: 225.0,
        line_total: 1475.0,
        sort_order: 0,
      },
    ],
    created_at: '2026-08-20T10:30:00Z',
    updated_at: '2026-08-20T10:30:00Z',
  },
];

export const gstInvoiceService = {
  async getInvoices(): Promise<GstInvoiceRecord[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('gst_invoices')
          .select('*, items:gst_invoice_items(*)')
          .order('invoice_date', { ascending: false });

        if (error) {
          console.warn('Supabase getInvoices error:', error.message);
        } else if (data && data.length > 0) {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
          return data as GstInvoiceRecord[];
        }
      } catch (err) {
        console.warn('Network error fetching invoices:', err);
      }
    }

    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // ignore
      }
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_INVOICES));
    return INITIAL_INVOICES;
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
      place_of_supply: invoice.place_of_supply || 'Maharashtra',
      place_of_supply_state_code: invoice.place_of_supply_state_code || '27',
      is_inter_state: invoice.is_inter_state || false,
      customer_id: validCustomerId,
      seller_snapshot: (invoice.seller_snapshot || {}) as GstInvoiceRecord['seller_snapshot'],
      customer_snapshot: invoice.customer_snapshot || {},
      billing_address: invoice.billing_address || null,
      shipping_address: invoice.shipping_address || null,
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
        const { items: _itemsToOmit, ...invoicePayload } = newRecord;
        void _itemsToOmit;
        const { error: invoiceError } = await supabase.from('gst_invoices').upsert(invoicePayload, { onConflict: 'id' });

        if (!invoiceError && items.length > 0) {
          await supabase.from('gst_invoice_items').delete().eq('invoice_id', newId);
          await supabase.from('gst_invoice_items').insert(items);
        }
      } catch (err) {
        console.warn('Error syncing invoice with Supabase:', err);
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
    const invoices = await this.getInvoices();
    const filtered = invoices.filter((inv) => inv.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));

    if (isSupabaseConfigured && isValidUuid(id)) {
      try {
        await supabase.from('gst_invoices').delete().eq('id', id);
      } catch (err) {
        console.warn('Error deleting invoice from Supabase:', err);
      }
    }
  },
};
