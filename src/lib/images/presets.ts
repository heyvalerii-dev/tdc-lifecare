import type { OptimizeImageOptions } from "@/lib/images/optimize-image";
import { optimizeImage } from "@/lib/images/optimize-image";

/**
 * Default settings for client, psychologist, and user profile photos.
 * ~400×400 WebP @ 0.82 typically lands well under 100 KB and stays crisp on Retina.
 */
export const AVATAR_OPTIMIZE_OPTIONS: OptimizeImageOptions = {
  maxWidth: 400,
  maxHeight: 400,
  crop: "square",
  format: "webp",
  quality: 0.82,
  fileName: "avatar",
};

/** Convenience wrapper — same pipeline, avatar defaults. */
export function optimizeAvatarImage(file: File): Promise<File> {
  return optimizeImage(file, AVATAR_OPTIMIZE_OPTIONS);
}
