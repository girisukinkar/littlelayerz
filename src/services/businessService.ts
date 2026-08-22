import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { BusinessProfile } from '../types/gst';

const LOCAL_STORAGE_KEY = 'd3d_gst_business_profile';

const DEFAULT_BUSINESS_PROFILE: BusinessProfile = {
  id: 'biz-default-001',
  name: 'Dexter3D Studio',
  logo_url: '',
  address: 'Shop No. 4, Tech Park Commercial Hub',
  city: 'Pune',
  state: 'Maharashtra',
  state_code: '27',
  pincode: '411057',
  gstin: '27AAPFU0939F1ZV',
  phone: '+91 98765 43210',
  email: 'contact@dexter3d.in',
  website: 'https://dexter3d.in',
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
        return JSON.parse(saved) as BusinessProfile;
      } catch {
        // ignore parse error
      }
    }

    return DEFAULT_BUSINESS_PROFILE;
  },

  async updateProfile(profile: Partial<BusinessProfile>): Promise<BusinessProfile> {
    const current = await this.getProfile();
    const updated: BusinessProfile = {
      ...current,
      ...profile,
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
