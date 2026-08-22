import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { GstCustomer, GstInvoiceRecord } from '../types/gst';

const LOCAL_STORAGE_KEY = 'd3d_gst_customers';

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


export const customerService = {
  async getCustomers(): Promise<GstCustomer[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('gst_customers')
          .select('*')
          .order('name', { ascending: true });

        if (error) {
          console.warn('Supabase getCustomers error:', error.message);
          // Fall through to localStorage on network/query error
        } else {
          // Supabase responded — even empty is authoritative
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data || []));
          return (data || []) as GstCustomer[];
        }
      } catch (err) {
        console.warn('Network error fetching customers:', err);
      }
    }

    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // ignore
      }
    }

    // No data at all — return empty, don't seed fake data
    return [];
  },

  async getCustomerById(id: string): Promise<GstCustomer | null> {
    const customers = await this.getCustomers();
    return customers.find((c) => c.id === id) || null;
  },

  async saveCustomer(customer: Partial<GstCustomer>): Promise<GstCustomer> {
    const customers = await this.getCustomers();
    const isNew = !customer.id || !isValidUuid(customer.id);
    const newId = customer.id && isValidUuid(customer.id) ? customer.id : generateUuid();

    const newRecord: GstCustomer = {
      id: newId,
      name: customer.name || 'Unnamed Customer',
      phone: customer.phone || null,
      email: customer.email || null,
      gstin: customer.gstin ? customer.gstin.trim().toUpperCase() : null,
      billing_address: customer.billing_address || null,
      shipping_address: customer.shipping_address || customer.billing_address || null,
      city: customer.city || null,
      state: customer.state || 'Maharashtra',
      state_code: customer.state_code || '27',
      pincode: customer.pincode || null,
      notes: customer.notes || null,
      total_orders: customer.total_orders || 0,
      total_spent: customer.total_spent || 0,
      last_purchase_date: customer.last_purchase_date || null,
      created_at: customer.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let updatedList: GstCustomer[];
    if (isNew) {
      updatedList = [newRecord, ...customers.filter((c) => c.id !== newId)];
    } else {
      updatedList = customers.map((c) => (c.id === newId ? newRecord : c));
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('gst_customers')
          .upsert(newRecord, { onConflict: 'id' })
          .select()
          .single();

        if (!error && data) {
          return data as GstCustomer;
        }
      } catch (err) {
        console.warn('Error saving customer to Supabase:', err);
      }
    }

    return newRecord;
  },

  async deleteCustomer(id: string): Promise<void> {
    // Delete from Supabase first
    if (isSupabaseConfigured && isValidUuid(id)) {
      try {
        await supabase.from('gst_customers').delete().eq('id', id);
      } catch (err) {
        console.warn('Error deleting customer from Supabase:', err);
      }
    }

    // Patch localStorage cache directly
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as GstCustomer[];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed.filter((c) => c.id !== id)));
      } catch {
        // ignore
      }
    }
  },

  /**
   * Recalculates a customer's total_orders, total_spent, and last_purchase_date
   * from their actual invoices and persists the updated stats.
   * Call this after every invoice save.
   */
  async refreshCustomerStats(
    customerId: string,
    invoices: GstInvoiceRecord[]
  ): Promise<void> {
    if (!customerId || !isValidUuid(customerId)) return;

    const customerInvoices = invoices.filter((inv) => inv.customer_id === customerId);
    const totalOrders = customerInvoices.length;
    const totalSpent = customerInvoices.reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0);
    const lastDate = customerInvoices
      .map((inv) => inv.invoice_date)
      .filter(Boolean)
      .sort()
      .reverse()[0] || null;

    const customer = await this.getCustomerById(customerId);
    if (!customer) return;

    await this.saveCustomer({
      ...customer,
      total_orders: totalOrders,
      total_spent: totalSpent,
      last_purchase_date: lastDate,
    });
  },
};

