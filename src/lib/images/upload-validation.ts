/**
 * Server-side checks for images that should already be client-optimized.
 * Originals are never stored — only the optimized upload is accepted.
 */

export const OPTIMIZED_UPLOAD_MAX_BYTES = 1024 * 1024; // 1 MB

export const OPTIMIZED_UPLOAD_MIME_TYPES = new Set([
  "image/webp",
  "image/jpeg",
  "image/png",
]);

export function validateOptimizedUpload(file: File): string | null {
  if (!OPTIMIZED_UPLOAD_MIME_TYPES.has(file.type)) {
    return "File must be an optimized WebP, JPEG, or PNG image";
  }
  if (file.size > OPTIMIZED_UPLOAD_MAX_BYTES) {
    return "Image is too large after optimization. Try a different photo.";
  }
  return null;
}

export function optimizedStorageExt(mime: string): string {
  if (mime === "image/webp") return "webp";
  if (mime === "image/png") return "png";
  return "jpg";
}
