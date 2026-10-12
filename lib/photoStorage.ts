import { supabase } from './supabaseClient';

const BUCKET = 'report-photos';
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const JPEG_PREFIX = 'data:image/jpeg;base64,';
const PUBLIC_MARKER = `/storage/v1/object/public/${BUCKET}/`;

// Takes the photo as a data URL (what the report form sends), uploads it to
// Supabase Storage, and returns the public web address of the stored file.
export async function uploadReportPhoto(reportId: string, dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith(JPEG_PREFIX)) {
    throw new Error('Photo must be a JPEG image.');
  }

  const buffer = Buffer.from(dataUrl.slice(JPEG_PREFIX.length), 'base64');

  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    throw new Error('Photo is empty or too large.');
  }

  // Real JPEG files always start with these three bytes.
  if (!(buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)) {
    throw new Error('Photo is not a valid JPEG image.');
  }

  const path = `${reportId}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// Deletes a stored photo, given the address saved on the report.
// Old reports whose photo is not a storage address are ignored safely.
export async function deleteReportPhoto(photoUrl: string | null | undefined): Promise<void> {
  if (!photoUrl) return;
  const index = photoUrl.indexOf(PUBLIC_MARKER);
  if (index === -1) return;

  const path = decodeURIComponent(photoUrl.slice(index + PUBLIC_MARKER.length));
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) {
    console.error('Failed to delete photo from storage:', error.message);
  }
}