import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const storageService = {
  /**
   * Uploads a logo file to Supabase storage bucket 'business-assets',
   * or falls back to converting the image to an optimized Base64 data URL.
   */
  async uploadLogo(file: File): Promise<string> {
    // 1. Convert to optimized Base64
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    if (isSupabaseConfigured) {
      try {
        const fileExt = file.name.split('.').pop() || 'png';
        const fileName = `logo-${Date.now()}.${fileExt}`;
        const filePath = `logos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('business-assets')
          .upload(filePath, file, { upsert: true });

        if (!uploadError) {
          const { data } = supabase.storage
            .from('business-assets')
            .getPublicUrl(filePath);

          if (data?.publicUrl) {
            return data.publicUrl;
          }
        }
      } catch (err) {
        console.warn('Supabase storage upload failed, using Base64 data URL:', err);
      }
    }

    return base64;
  },
};
