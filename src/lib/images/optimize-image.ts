/**
 * Shared image optimization pipeline for client-side uploads.
 *
 * Callers pass size/format/crop options — nothing is hardcoded for a single
 * use case. Use presets (e.g. AVATAR_OPTIMIZE_OPTIONS) for common profiles.
 */

export type ImageOutputFormat = "webp" | "jpeg" | "png";

/**
 * Crop mode. `"square"` center-crops today; a custom rect keeps the door open
 * for interactive crop UIs later without changing the optimize API.
 */
export type ImageCropMode =
  | "none"
  | "square"
  | {
      /** Source crop origin X in pixels */
      x: number;
      /** Source crop origin Y in pixels */
      y: number;
      width: number;
      height: number;
    };

export interface OptimizeImageOptions {
  maxWidth: number;
  maxHeight: number;
  /** Output format. Defaults to `"webp"`. */
  format?: ImageOutputFormat;
  /** Encoding quality 0–1. Defaults to `0.82`. Ignored for PNG. */
  quality?: number;
  /** Crop before resize. Defaults to `"none"`. */
  crop?: ImageCropMode;
  /** Output file name (extension is set from format). */
  fileName?: string;
}

export class ImageOptimizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageOptimizeError";
  }
}

const DEFAULT_QUALITY = 0.82;
const DEFAULT_FORMAT: ImageOutputFormat = "webp";

/** MIME types we attempt to decode. HEIC works only when the browser can. */
export const OPTIMIZE_INPUT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

/** `accept` attribute for file inputs that feed this pipeline. */
export const OPTIMIZE_IMAGE_ACCEPT =
  "image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.heic,.heif";

const MIME_BY_FORMAT: Record<ImageOutputFormat, string> = {
  webp: "image/webp",
  jpeg: "image/jpeg",
  png: "image/png",
};

const EXT_BY_FORMAT: Record<ImageOutputFormat, string> = {
  webp: "webp",
  jpeg: "jpg",
  png: "png",
};

function normalizeMime(type: string): string {
  return type.toLowerCase().trim();
}

function isLikelyHeic(file: File): boolean {
  const mime = normalizeMime(file.type);
  if (mime === "image/heic" || mime === "image/heif") return true;
  const name = file.name.toLowerCase();
  return name.endsWith(".heic") || name.endsWith(".heif");
}

function isAcceptedInput(file: File): boolean {
  const mime = normalizeMime(file.type);
  if (OPTIMIZE_INPUT_MIME_TYPES.has(mime)) return true;
  // Some browsers leave HEIC type empty — allow by extension.
  if (!mime && isLikelyHeic(file)) return true;
  return false;
}

async function decodeImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      // `from-image` applies EXIF orientation; redrawing strips EXIF metadata.
      return await createImageBitmap(file, {
        imageOrientation: "from-image",
      } as ImageBitmapOptions);
    } catch {
      // Fall through — HEIC often fails here in unsupported browsers.
    }
  }

  return loadViaHtmlImage(file);
}

function loadViaHtmlImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode failed"));
    };
    img.src = url;
  });
}

function getSourceSize(source: ImageBitmap | HTMLImageElement): {
  width: number;
  height: number;
} {
  return { width: source.width, height: source.height };
}

function resolveCropRect(
  srcW: number,
  srcH: number,
  crop: ImageCropMode | undefined
): { sx: number; sy: number; sw: number; sh: number } {
  if (!crop || crop === "none") {
    return { sx: 0, sy: 0, sw: srcW, sh: srcH };
  }

  if (crop === "square") {
    const side = Math.min(srcW, srcH);
    return {
      sx: Math.round((srcW - side) / 2),
      sy: Math.round((srcH - side) / 2),
      sw: side,
      sh: side,
    };
  }

  const sx = Math.max(0, Math.min(srcW - 1, Math.round(crop.x)));
  const sy = Math.max(0, Math.min(srcH - 1, Math.round(crop.y)));
  const sw = Math.max(1, Math.min(srcW - sx, Math.round(crop.width)));
  const sh = Math.max(1, Math.min(srcH - sy, Math.round(crop.height)));
  return { sx, sy, sw, sh };
}

function fitWithinMax(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }

  const scale = Math.min(maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mime, quality);
  });
}

function buildFileName(
  originalName: string,
  format: ImageOutputFormat,
  override?: string
): string {
  const ext = EXT_BY_FORMAT[format];
  if (override) {
    const base = override.replace(/\.[^.]+$/, "");
    return `${base}.${ext}`;
  }
  const base = originalName.replace(/\.[^.]+$/, "") || "image";
  return `${base}.${ext}`;
}

/**
 * Decode, optionally crop, resize (never exceeding max bounds), and encode
 * an image for upload. Returns a File — never mutates or uploads the original.
 */
export async function optimizeImage(
  file: File,
  options: OptimizeImageOptions
): Promise<File> {
  if (!isAcceptedInput(file)) {
    throw new ImageOptimizeError(
      "Please choose a JPG, PNG, WebP, or HEIC image"
    );
  }

  if (
    !Number.isFinite(options.maxWidth) ||
    !Number.isFinite(options.maxHeight) ||
    options.maxWidth < 1 ||
    options.maxHeight < 1
  ) {
    throw new ImageOptimizeError("Invalid image size limits");
  }

  const format = options.format ?? DEFAULT_FORMAT;
  const quality = clampQuality(options.quality ?? DEFAULT_QUALITY);

  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await decodeImage(file);
  } catch {
    if (isLikelyHeic(file)) {
      throw new ImageOptimizeError(
        "This HEIC photo isn’t supported in your browser. Try JPG or PNG instead."
      );
    }
    throw new ImageOptimizeError(
      "We couldn’t read that image. Try another photo."
    );
  }

  try {
    const { width: srcW, height: srcH } = getSourceSize(source);
    if (srcW < 1 || srcH < 1) {
      throw new ImageOptimizeError("That image looks empty. Try another photo.");
    }

    const { sx, sy, sw, sh } = resolveCropRect(srcW, srcH, options.crop);
    const fitted = fitWithinMax(sw, sh, options.maxWidth, options.maxHeight);

    const canvas = document.createElement("canvas");
    canvas.width = fitted.width;
    canvas.height = fitted.height;

    const ctx = canvas.getContext("2d", { alpha: format === "png" });
    if (!ctx) {
      throw new ImageOptimizeError("Image processing isn’t available right now.");
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, fitted.width, fitted.height);

    const preferredMime = MIME_BY_FORMAT[format];
    let blob = await canvasToBlob(canvas, preferredMime, quality);
    let outputFormat = format;

    // Safari / older browsers may refuse WebP encode — fall back to JPEG.
    if (!blob && format === "webp") {
      blob = await canvasToBlob(canvas, MIME_BY_FORMAT.jpeg, quality);
      outputFormat = "jpeg";
    }

    if (!blob) {
      throw new ImageOptimizeError(
        "We couldn’t compress that image. Try another photo."
      );
    }

    const fileName = buildFileName(file.name, outputFormat, options.fileName);
    return new File([blob], fileName, {
      type: MIME_BY_FORMAT[outputFormat],
      lastModified: Date.now(),
    });
  } finally {
    if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) {
      source.close();
    }
  }
}

function clampQuality(quality: number): number {
  if (!Number.isFinite(quality)) return DEFAULT_QUALITY;
  return Math.min(1, Math.max(0, quality));
}
