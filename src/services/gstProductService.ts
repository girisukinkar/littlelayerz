import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { GstProduct } from '../types/gst';

const LOCAL_STORAGE_KEY = 'd3d_gst_products';

const INITIAL_PRODUCTS: GstProduct[] = [
  {
    id: 'prod-001',
    name: 'Custom 3D Printed Lithophane Lamp',
    sku: 'LITH-001',
    hsn_sac: '3926',
    default_price: 1250.0,
    default_gst_rate: 18.0,
    description: 'Personalized cylindrical night lamp with 3 curved photos and warm LED base.',
    category: 'Home Decor',
    unit: 'PCS',
    is_active: true,
    total_sold: 28,
    revenue_generated: 35000.0,
  },
  {
    id: 'prod-002',
    name: 'Articulated Dragon Figurine (Silk PLA)',
    sku: 'DRAG-002',
    hsn_sac: '9503',
    default_price: 650.0,
    default_gst_rate: 18.0,
    description: '45cm flexible multi-jointed fantasy dragon printed in dual-tone silk PLA.',
    category: 'Toys & Collectibles',
    unit: 'PCS',
    is_active: true,
    total_sold: 64,
    revenue_generated: 41600.0,
  },
  {
    id: 'prod-003',
    name: 'Modular Hexagonal Desk Organizer',
    sku: 'DESK-003',
    hsn_sac: '3926',
    default_price: 450.0,
    default_gst_rate: 18.0,
    description: 'Magnetic interlocking pencil, pen and gadget stand with matte finish.',
    category: 'Office & Stationery',
    unit: 'PCS',
    is_active: true,
    total_sold: 42,
    revenue_generated: 18900.0,
  },
  {
    id: 'prod-004',
    name: 'Custom Spotify Code Keychain',
    sku: 'KEY-004',
    hsn_sac: '3926',
    default_price: 150.0,
    default_gst_rate: 18.0,
    description: 'Acrylic + 3D embossed scannable music track code with steel ring.',
    category: 'Accessories',
    unit: 'PCS',
    is_active: true,
    total_sold: 145,
    revenue_generated: 21750.0,
  },
  {
    id: 'prod-005',
    name: '3D Prototyping & CAD Design Service',
    sku: 'SRV-005',
    hsn_sac: '9983',
    default_price: 1500.0,
    default_gst_rate: 18.0,
    description: 'Custom mechanical engineering CAD modeling and slicing consultation.',
    category: 'Services',
    unit: 'HRS',
    is_active: true,
    total_sold: 12,
    revenue_generated: 18000.0,
  },
];

export const gstProductService = {
  async getProducts(): Promise<GstProduct[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('gst_products')
          .select('*')
          .order('name', { ascending: true });

        if (error) {
          console.warn('Supabase getProducts error:', error.message);
        } else if (data && data.length > 0) {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
          return data as GstProduct[];
        }
      } catch (err) {
        console.warn('Network error fetching products:', err);
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

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_PRODUCTS));
    return INITIAL_PRODUCTS;
  },

  async getProductById(id: string): Promise<GstProduct | null> {
    const products = await this.getProducts();
    return products.find((p) => p.id === id) || null;
  },

  async saveProduct(product: Partial<GstProduct>): Promise<GstProduct> {
    const products = await this.getProducts();
    const isNew = !product.id;
    const newId = product.id || `prod-${Date.now()}`;

    const newRecord: GstProduct = {
      id: newId,
      name: product.name || 'Unnamed Product',
      sku: product.sku || null,
      hsn_sac: product.hsn_sac ? product.hsn_sac.trim() : '3926',
      default_price: Number(product.default_price) || 0.0,
      default_gst_rate: product.default_gst_rate !== undefined ? Number(product.default_gst_rate) : 18.0,
      description: product.description || null,
      category: product.category || 'General',
      unit: product.unit || 'PCS',
      is_active: product.is_active !== undefined ? product.is_active : true,
      total_sold: product.total_sold || 0,
      revenue_generated: product.revenue_generated || 0,
      created_at: product.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let updatedList: GstProduct[];
    if (isNew) {
      updatedList = [newRecord, ...products];
    } else {
      updatedList = products.map((p) => (p.id === newId ? newRecord : p));
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('gst_products')
          .upsert(newRecord, { onConflict: 'id' })
          .select()
          .single();

        if (!error && data) {
          return data as GstProduct;
        }
      } catch (err) {
        console.warn('Error saving product to Supabase:', err);
      }
    }

    return newRecord;
  },

  async deleteProduct(id: string): Promise<void> {
    const products = await this.getProducts();
    const filtered = products.filter((p) => p.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));

    if (isSupabaseConfigured) {
      try {
        await supabase.from('gst_products').delete().eq('id', id);
      } catch (err) {
        console.warn('Error deleting product from Supabase:', err);
      }
    }
  },
};
