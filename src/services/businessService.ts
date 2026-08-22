import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { BusinessProfile } from '../types/gst';

const LOCAL_STORAGE_KEY = 'd3d_gst_business_profile';

function isValidUuid(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

const DEFAULT_BUSINESS_PROFILE: BusinessProfile = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Little Layerz',
  logo_url: '',
  upi_qr_url: '',
  instagram_handle: 'littlelayerz',
  whatsapp_number: '+918796837718',
  website: 'https://littlelayerz.co.in',
  address: 'Sector 5',
  city: 'Ghaziabad',
  state: 'Uttar Pradesh',
  state_code: '09',
  pincode: '201010',
  gstin: '09AANPW1625N1ZY',
  phone: '+918796837718',
  email: 'littlelayerz@gmail.com',
  upi_id: 'JKBMERC00814817@jkb',
  bank_name: 'J&K Bank',
  bank_account_no: '0463010100000965',
  bank_ifsc: 'JAKA0MVIHAR',
  bank_branch: 'Hinjewadi Phase 1, Pune',
  invoice_prefix: 'INV',
  default_gst_rate: 18.0,
  default_notes: 'Thank you for choosing LittleLayerz We appreciate your business.',
  default_terms: '1. Goods once sold will not be returned unless damaged upon receipt.',
};

export const businessService = {
  async getProfile(): Promise<BusinessProfile> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (error) {
          console.warn('Supabase getProfile error, using local fallback:', error.message);
        } else if (data) {
          // If stored data has old hardcoded demo gstin, replace with DEFAULT_BUSINESS_PROFILE
          if (data.gstin === '27AAPFU0939F1ZV' || data.name === 'Dexter3D Studio') {
            data.gstin = DEFAULT_BUSINESS_PROFILE.gstin;
            data.name = DEFAULT_BUSINESS_PROFILE.name;
            data.state = DEFAULT_BUSINESS_PROFILE.state;
            data.state_code = DEFAULT_BUSINESS_PROFILE.state_code;
          }
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
          return data as BusinessProfile;
        }
      } catch (err) {
        console.warn('Network error fetching business profile, using fallback:', err);
      }
    }

    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as BusinessProfile;
        // Purge old demo gstin if present in localStorage
        if (parsed.gstin === '27AAPFU0939F1ZV' || parsed.name === 'Dexter3D Studio') {
          parsed.gstin = DEFAULT_BUSINESS_PROFILE.gstin;
          parsed.name = DEFAULT_BUSINESS_PROFILE.name;
          parsed.state = DEFAULT_BUSINESS_PROFILE.state;
          parsed.state_code = DEFAULT_BUSINESS_PROFILE.state_code;
          parsed.address = DEFAULT_BUSINESS_PROFILE.address;
          parsed.city = DEFAULT_BUSINESS_PROFILE.city;
          parsed.pincode = DEFAULT_BUSINESS_PROFILE.pincode;
          parsed.email = DEFAULT_BUSINESS_PROFILE.email;
          parsed.phone = DEFAULT_BUSINESS_PROFILE.phone;
          parsed.upi_id = DEFAULT_BUSINESS_PROFILE.upi_id;
          parsed.bank_name = DEFAULT_BUSINESS_PROFILE.bank_name;
          parsed.bank_account_no = DEFAULT_BUSINESS_PROFILE.bank_account_no;
          parsed.bank_ifsc = DEFAULT_BUSINESS_PROFILE.bank_ifsc;
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
        }
        if (!isValidUuid(parsed.id)) {
          parsed.id = DEFAULT_BUSINESS_PROFILE.id;
        }
        return parsed;
      } catch {
        // ignore parse error
      }
    }

    return DEFAULT_BUSINESS_PROFILE;
  },

  async updateProfile(profile: Partial<BusinessProfile>): Promise<BusinessProfile> {
    const current = await this.getProfile();
    const finalId = isValidUuid(profile.id || current.id)
      ? (profile.id || current.id)
      : DEFAULT_BUSINESS_PROFILE.id;

    const updated: BusinessProfile = {
      ...current,
      ...profile,
      id: finalId,
      updated_at: new Date().toISOString(),
    };

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .upsert(updated, { onConflict: 'id' })
          .select()
          .single();

        if (error) {
          console.warn('Supabase updateProfile error:', error.message);
        } else if (data) {
          return data as BusinessProfile;
        }
      } catch (err) {
        console.warn('Error saving profile to Supabase:', err);
      }
    }

    return updated;
  },
};
