import { getSupabase } from './supabase';

export type BucketName = 'greenspot-media' | 'greenspot-docs';

export interface UploadResult {
  url: string;
  path: string;
  isSupabaseHosted: boolean;
}

/**
 * Sube un archivo a Supabase Storage (sin conexión, falla: nada se guarda en el navegador)
 */
export async function uploadFileToStorage(
  file: File,
  bucket: BucketName = 'greenspot-media',
  folder: string = 'uploads'
): Promise<UploadResult> {
  const supabase = getSupabase();
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${folder}/${Date.now()}_${cleanFileName}`;

  if (!supabase) throw new Error('Sin conexión a la base de datos: no se puede subir el archivo.');
  const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, { cacheControl: '3600', upsert: false });
  if (error) throw new Error(error.message);
  // Los buckets son privados: se guarda un enlace firmado.
  // shortcut: el enlace vence en 1 año; si se necesita para siempre, guardar el path y firmarlo al abrir.
  const { data: firmado, error: e2 } = await supabase.storage.from(bucket).createSignedUrl(data.path, 60 * 60 * 24 * 365);
  if (e2) throw new Error(e2.message);
  return { url: firmado.signedUrl, path: data.path, isSupabaseHosted: true };
}
