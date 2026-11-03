import { getSupabase } from './supabase';

export type BucketName = 'greenspot-media' | 'greenspot-docs';

export interface UploadResult {
  url: string;
  path: string;
  isSupabaseHosted: boolean;
}

/**
 * Sube un archivo a Supabase Storage (o fallback a DataURL en modo local)
 */
export async function uploadFileToStorage(
  file: File,
  bucket: BucketName = 'greenspot-media',
  folder: string = 'uploads'
): Promise<UploadResult> {
  const supabase = getSupabase();
  const fileExt = file.name.split('.').pop() || 'dat';
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${folder}/${Date.now()}_${cleanFileName}`;

  if (supabase) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.warn('Error subiendo a Supabase Storage, aplicando fallback:', error.message);
      } else if (data) {
        const { data: publicUrlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(data.path);

        return {
          url: publicUrlData.publicUrl,
          path: data.path,
          isSupabaseHosted: true
        };
      }
    } catch (err) {
      console.warn('Fallo en Supabase Storage:', err);
    }
  }

  // Fallback: Convierte a base64 Data URL para previsualización inmediata y persistencia local
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        url: reader.result as string,
        path: filePath,
        isSupabaseHosted: false
      });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
