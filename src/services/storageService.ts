import { supabase, isSupabaseConfigured } from '../lib/supabase';

async function compressImageToBase64(file: File, maxWidth = 300, maxHeight = 300): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) return resolve('');
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxWidth || h > maxHeight) {
          const ratio = Math.min(maxWidth / w, maxHeight / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.75));
        } else {
          resolve(src);
        }
      };
      img.onerror = () => resolve(src);
      img.src = src;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

export const storageService = {
  /**
   * Uploads a logo file to Supabase storage bucket 'business-assets',
   * or falls back to converting the image to an optimized compressed Base64 data URL.
   */
  async uploadLogo(file: File): Promise<string> {
    // 1. Convert to compressed lightweight Base64
    const base64 = await compressImageToBase64(file, 300, 300);

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
        console.warn('Supabase storage upload failed, using compressed Base64 data URL:', err);
      }
    }

    return base64;
  },
};
