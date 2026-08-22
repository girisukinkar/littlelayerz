import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { BusinessProfile } from '../types/gst';

const LOCAL_STORAGE_KEY = 'd3d_gst_business_profile';

function isValidUuid(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

const DEFAULT_BUSINESS_PROFILE: BusinessProfile = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Dexter3D Studio',
  logo_url: '',
  upi_qr_url: '',
  instagram_handle: 'dexter3d_official',
  whatsapp_number: '+91 98765 43210',
  website: 'https://dexter3d.in',
  address: 'Shop No. 4, Tech Park Commercial Hub',
  city: 'Pune',
  state: 'Maharashtra',
  state_code: '27',
  pincode: '411057',
  gstin: '27AAPFU0939F1ZV',
  phone: '+91 98765 43210',
  email: 'contact@dexter3d.in',
  upi_id: 'dexter3d@okhdfcbank',
  bank_name: 'HDFC Bank Ltd',
  bank_account_no: '50200012345678',
  bank_ifsc: 'HDFC0001234',
  bank_branch: 'Hinjewadi Phase 1, Pune',
  invoice_prefix: 'INV',
  default_gst_rate: 18.0,
  default_notes: 'Thank you for choosing Dexter3D Studio! We appreciate your business.',
  default_terms: '1. Goods once sold will not be returned unless damaged upon receipt.\n2. In case of manufacturing defects, please report within 48 hours with unboxing video.',
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
