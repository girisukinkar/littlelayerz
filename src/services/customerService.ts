import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { GstCustomer } from '../types/gst';

const LOCAL_STORAGE_KEY = 'd3d_gst_customers';

const INITIAL_CUSTOMERS: GstCustomer[] = [
  {
    id: 'cust-001',
    name: 'Rahul Sharma',
    phone: '+91 98234 11223',
    email: 'rahul.sharma@example.com',
    gstin: '27AABCU9603R1ZM',
    billing_address: 'Flat 402, Sunshine Heights, Baner Road',
    shipping_address: 'Flat 402, Sunshine Heights, Baner Road',
    city: 'Pune',
    state: 'Maharashtra',
    state_code: '27',
    pincode: '411045',
    notes: 'Regular client for custom 3D figurines and prototypes',
    total_orders: 4,
    total_spent: 4580.0,
    last_purchase_date: '2026-08-20',
  },
  {
    id: 'cust-002',
    name: 'Neha Verma',
    phone: '+91 99887 66554',
    email: 'neha.verma@techdesign.io',
    gstin: '29ABCDE1234F1Z5',
    billing_address: 'Plot 12, Indiranagar 100ft Road',
    shipping_address: 'Plot 12, Indiranagar 100ft Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    state_code: '29',
    pincode: '560038',
    notes: 'Architectural model commissions (Inter-State IGST)',
    total_orders: 2,
    total_spent: 8900.0,
    last_purchase_date: '2026-08-18',
  },
  {
    id: 'cust-003',
    name: 'Amit Patel',
    phone: '+91 91234 56789',
    email: 'amit.patel@gujaratmotors.com',
    gstin: '24AAACP1234P1Z1',
    billing_address: '45 Industrial Estate, GIDC',
    shipping_address: '45 Industrial Estate, GIDC',
    city: 'Ahmedabad',
    state: 'Gujarat',
    state_code: '24',
    pincode: '382445',
    notes: 'Bulk functional prototype parts',
    total_orders: 1,
    total_spent: 2400.0,
    last_purchase_date: '2026-08-21',
  },
];

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
        } else if (data && data.length > 0) {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
          return data as GstCustomer[];
        }
      } catch (err) {
        console.warn('Network error fetching customers:', err);
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

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_CUSTOMERS));
    return INITIAL_CUSTOMERS;
  },

  async getCustomerById(id: string): Promise<GstCustomer | null> {
    const customers = await this.getCustomers();
    return customers.find((c) => c.id === id) || null;
  },

  async saveCustomer(customer: Partial<GstCustomer>): Promise<GstCustomer> {
    const customers = await this.getCustomers();
    const isNew = !customer.id;
    const newId = customer.id || `cust-${Date.now()}`;

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
      updatedList = [newRecord, ...customers];
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
    const customers = await this.getCustomers();
    const filtered = customers.filter((c) => c.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));

    if (isSupabaseConfigured) {
      try {
        await supabase.from('gst_customers').delete().eq('id', id);
      } catch (err) {
        console.warn('Error deleting customer from Supabase:', err);
      }
    }
  },
};
