import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { GstInvoiceRecord, GstInvoiceItemRecord } from '../types/gst';

const LOCAL_STORAGE_KEY = 'd3d_gst_invoices';

const INITIAL_INVOICES: GstInvoiceRecord[] = [
  {
    id: 'inv-0001',
    invoice_number: 'INV-0001',
    invoice_date: '2026-08-20',
    due_date: '2026-08-27',
    place_of_supply: 'Maharashtra',
    place_of_supply_state_code: '27',
    is_inter_state: false,
    customer_id: 'cust-001',
    seller_snapshot: {
      id: 'biz-default-001',
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
      id: 'cust-001',
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
        id: 'item-001',
        invoice_id: 'inv-0001',
        product_id: 'prod-001',
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
  {
    id: 'inv-0002',
    invoice_number: 'INV-0002',
    invoice_date: '2026-08-21',
    due_date: '2026-08-28',
    place_of_supply: 'Karnataka',
    place_of_supply_state_code: '29',
    is_inter_state: true,
    customer_id: 'cust-002',
    seller_snapshot: {
      id: 'biz-default-001',
      name: 'Dexter3D Studio',
      address: 'Shop No. 4, Tech Park Commercial Hub',
      city: 'Pune',
      state: 'Maharashtra',
      state_code: '27',
      pincode: '411057',
      gstin: '27AAPFU0939F1ZV',
      phone: '+91 98765 43210',
      email: 'contact@dexter3d.in',
      invoice_prefix: 'INV',
      default_gst_rate: 18,
    },
    customer_snapshot: {
      id: 'cust-002',
      name: 'Neha Verma',
      phone: '+91 99887 66554',
      email: 'neha.verma@techdesign.io',
      gstin: '29ABCDE1234F1Z5',
      billing_address: 'Plot 12, Indiranagar 100ft Road, Bengaluru',
      shipping_address: 'Plot 12, Indiranagar 100ft Road, Bengaluru',
      city: 'Bengaluru',
      state: 'Karnataka',
      state_code: '29',
    },
    billing_address: 'Plot 12, Indiranagar 100ft Road, Bengaluru',
    shipping_address: 'Plot 12, Indiranagar 100ft Road, Bengaluru',
    subtotal: 1300.0,
    item_discount_total: 100.0,
    invoice_discount_type: 'fixed',
    invoice_discount_value: 0.0,
    invoice_discount_amount: 0.0,
    shipping_amount: 100.0,
    shipping_gst_rate: 18.0,
    shipping_gst_amount: 18.0,
    taxable_amount: 1200.0,
    cgst: 0.0,
    sgst: 0.0,
    igst: 234.0,
    total_gst: 234.0,
    rounding_adjustment: 0.0,
    grand_total: 1534.0,
    amount_in_words: 'One Thousand Five Hundred Thirty-Four Rupees Only',
    amount_paid: 1534.0,
    balance_due: 0.0,
    payment_status: 'paid',
    payment_method: 'bank_transfer',
    notes: 'Shipped via Express Air Courier with tracking.',
    terms: 'Goods once sold will not be returned.',
    items: [
      {
        id: 'item-002',
        invoice_id: 'inv-0002',
        product_id: 'prod-002',
        product_name_snapshot: 'Articulated Dragon Figurine (Silk PLA)',
        description_snapshot: 'Flexible multi-jointed fantasy dragon in dual-tone silk PLA.',
        hsn_sac_snapshot: '9503',
        quantity: 2,
        unit: 'PCS',
        unit_price: 650.0,
        gross_amount: 1300.0,
        discount_type: 'fixed',
        discount_value: 100,
        discount_amount: 100.0,
        taxable_amount: 1200.0,
        gst_rate: 18.0,
        cgst_rate: 0.0,
        cgst_amount: 0.0,
        sgst_rate: 0.0,
        sgst_amount: 0.0,
        igst_rate: 18.0,
        igst_amount: 216.0,
        gst_amount: 216.0,
        line_total: 1416.0,
        sort_order: 0,
      },
    ],
    created_at: '2026-08-21T14:15:00Z',
    updated_at: '2026-08-21T14:15:00Z',
  },
  {
    id: 'inv-0003',
    invoice_number: 'INV-0003',
    invoice_date: '2026-08-22',
    due_date: '2026-08-29',
    place_of_supply: 'Gujarat',
    place_of_supply_state_code: '24',
    is_inter_state: true,
    customer_id: 'cust-003',
    seller_snapshot: {
      id: 'biz-default-001',
      name: 'Dexter3D Studio',
      address: 'Shop No. 4, Tech Park Commercial Hub',
      city: 'Pune',
      state: 'Maharashtra',
      state_code: '27',
      pincode: '411057',
      gstin: '27AAPFU0939F1ZV',
      phone: '+91 98765 43210',
      email: 'contact@dexter3d.in',
      invoice_prefix: 'INV',
      default_gst_rate: 18,
    },
    customer_snapshot: {
      id: 'cust-003',
      name: 'Amit Patel',
      phone: '+91 91234 56789',
      email: 'amit.patel@gujaratmotors.com',
      gstin: '24AAACP1234P1Z1',
      billing_address: '45 Industrial Estate, GIDC, Ahmedabad',
      shipping_address: '45 Industrial Estate, GIDC, Ahmedabad',
      city: 'Ahmedabad',
      state: 'Gujarat',
      state_code: '24',
    },
    billing_address: '45 Industrial Estate, GIDC, Ahmedabad',
    shipping_address: '45 Industrial Estate, GIDC, Ahmedabad',
    subtotal: 2400.0,
    item_discount_total: 0.0,
    invoice_discount_type: 'fixed',
    invoice_discount_value: 0.0,
    invoice_discount_amount: 0.0,
    shipping_amount: 0.0,
    shipping_gst_rate: 0.0,
    shipping_gst_amount: 0.0,
    taxable_amount: 2400.0,
    cgst: 0.0,
    sgst: 0.0,
    igst: 432.0,
    total_gst: 432.0,
    rounding_adjustment: 0.0,
    grand_total: 2832.0,
    amount_in_words: 'Two Thousand Eight Hundred Thirty-Two Rupees Only',
    amount_paid: 1000.0,
    balance_due: 1832.0,
    payment_status: 'partial',
    payment_method: 'upi',
    notes: 'Advance payment of ₹1,000 received. Balance upon delivery.',
    terms: 'Goods once sold will not be returned.',
    items: [
      {
        id: 'item-003',
        invoice_id: 'inv-0003',
        product_id: 'prod-005',
        product_name_snapshot: '3D Prototyping & CAD Design Service',
        description_snapshot: 'Custom mechanical engineering CAD modeling.',
        hsn_sac_snapshot: '9983',
        quantity: 1.6,
        unit: 'HRS',
        unit_price: 1500.0,
        gross_amount: 2400.0,
        discount_type: 'fixed',
        discount_value: 0,
        discount_amount: 0.0,
        taxable_amount: 2400.0,
        gst_rate: 18.0,
        cgst_rate: 0.0,
        cgst_amount: 0.0,
        sgst_rate: 0.0,
        sgst_amount: 0.0,
        igst_rate: 18.0,
        igst_amount: 432.0,
        gst_amount: 432.0,
        line_total: 2832.0,
        sort_order: 0,
      },
    ],
    created_at: '2026-08-22T09:00:00Z',
    updated_at: '2026-08-22T09:00:00Z',
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
    const isNew = !invoice.id;
    const newId = invoice.id || `inv-${Date.now()}`;

    const items: GstInvoiceItemRecord[] = (invoice.items || []).map((it, idx) => ({
      ...it,
      id: it.id || `item-${Date.now()}-${idx}`,
      invoice_id: newId,
      sort_order: idx,
    }));

    const newRecord: GstInvoiceRecord = {
      id: newId,
      invoice_number: invoice.invoice_number || (await this.getNextInvoiceNumber()),
      invoice_date: invoice.invoice_date || new Date().toISOString().slice(0, 10),
      due_date: invoice.due_date || null,
      place_of_supply: invoice.place_of_supply || 'Maharashtra',
      place_of_supply_state_code: invoice.place_of_supply_state_code || '27',
      is_inter_state: invoice.is_inter_state || false,
      customer_id: invoice.customer_id || null,
      seller_snapshot: (invoice.seller_snapshot || {}) as GstInvoiceRecord['seller_snapshot'],
      customer_snapshot: invoice.customer_snapshot || {},
      billing_address: invoice.billing_address || null,
      shipping_address: invoice.shipping_address || null,
      subtotal: invoice.subtotal || 0,
      item_discount_total: invoice.item_discount_total || 0,
      invoice_discount_type: invoice.invoice_discount_type || 'fixed',
      invoice_discount_value: invoice.invoice_discount_value || 0,
      invoice_discount_amount: invoice.invoice_discount_amount || 0,
      shipping_amount: invoice.shipping_amount || 0,
      shipping_gst_rate: invoice.shipping_gst_rate || 0,
      shipping_gst_amount: invoice.shipping_gst_amount || 0,
      taxable_amount: invoice.taxable_amount || 0,
      cgst: invoice.cgst || 0,
      sgst: invoice.sgst || 0,
      igst: invoice.igst || 0,
      total_gst: invoice.total_gst || 0,
      rounding_adjustment: invoice.rounding_adjustment || 0,
      grand_total: invoice.grand_total || 0,
      amount_in_words: invoice.amount_in_words || '',
      amount_paid: invoice.amount_paid || 0,
      balance_due: invoice.balance_due || 0,
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
      updatedList = [newRecord, ...invoices];
    } else {
      updatedList = invoices.map((inv) => (inv.id === newId ? newRecord : inv));
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));

    if (isSupabaseConfigured) {
      try {
        const { items: _itemsToOmit, ...invoicePayload } = newRecord;
        void _itemsToOmit;
        await supabase.from('gst_invoices').upsert(invoicePayload, { onConflict: 'id' });

        if (items.length > 0) {
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

    if (isSupabaseConfigured) {
      try {
        await supabase.from('gst_invoices').delete().eq('id', id);
      } catch (err) {
        console.warn('Error deleting invoice from Supabase:', err);
      }
    }
  },
};
