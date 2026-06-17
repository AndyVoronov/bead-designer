import sharp from "sharp";

// Sizes we generate for every uploaded image
export const IMAGE_SIZES = {
  thumb: 400,
  medium: 800,
  large: 1600,
} as const;

export type ImageSize = keyof typeof IMAGE_SIZES;

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/opt/bead-designer/uploads/products";

/**
 * Process an uploaded image buffer:
 * - Convert to WebP (quality 80)
 * - Generate thumb (400px), medium (800px), large (1600px) variants
 * - Save original as WebP too
 * Returns the list of generated filenames (without directory prefix)
 */
export async function processUploadedImage(
  inputBuffer: Buffer,
  originalFilename: string
): Promise<{ original: string; variants: Record<ImageSize, string> }> {
  // Get image metadata to determine orientation
  const metadata = await sharp(inputBuffer).metadata();
  const width = metadata.width || 1600;

  // Determine output filenames: keep product prefix, change extension to .webp
  const baseName = originalFilename.replace(/\.[^.]+$/, "");
  const originalWebp = `${baseName}.webp`;

  // Generate all sizes in parallel
  const sizes: Array<{ key: ImageSize; maxW: number; suffix: string }> = [
    { key: "thumb", maxW: 400, suffix: "_thumb" },
    { key: "medium", maxW: 800, suffix: "_medium" },
    { key: "large", maxW: 1600, suffix: "_large" },
  ];

  // Save original as WebP (full quality, no resize unless > 1600px)
  const maxOriginalW = 1600;
  const shouldResize = width > maxOriginalW;

  const originalPipeline = sharp(inputBuffer).rotate(); // auto-rotate by EXIF
  if (shouldResize) {
    originalPipeline.resize(maxOriginalW, null, { withoutEnlargement: true });
  }
  originalPipeline.webp({ quality: 82, effort: 4 });

  const [originalResult, ...variantResults] = await Promise.all([
    originalPipeline.toFile(joinPath(originalWebp)),
    ...sizes.map(async ({ key, maxW, suffix }) => {
      const filename = `${baseName}${suffix}.webp`;
      await sharp(inputBuffer)
        .rotate()
        .resize(maxW, null, {
          withoutEnlargement: true,
          fit: "inside",
        })
        .webp({ quality: 80, effort: 4 })
        .toFile(joinPath(filename));
      return { key, filename };
    }),
  ]);

  const variants: Record<ImageSize, string> = {} as Record<ImageSize, string>;
  for (const { key, filename } of variantResults) {
    variants[key] = filename;
  }

  return {
    original: originalWebp,
    variants,
  };
}

/**
 * Serve a resized image on-the-fly from the original WebP.
 * Caches generated variants on disk so subsequent requests are instant.
 */
export async function serveResized(
  filename: string,
  width: number
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const filepath = joinPath(filename);
  // If request is for exact width and variant exists, serve it
  const sizeMap: Record<number, string> = {
    400: "_thumb",
    800: "_medium",
    1600: "_large",
  };

  const suffix = sizeMap[width];
  if (suffix) {
    const variantPath = joinPath(filename.replace(/\.webp$/, `${suffix}.webp`));
    try {
      const { readFile } = await import("fs/promises");
      const buffer = await readFile(variantPath);
      return { buffer, contentType: "image/webp" };
    } catch {
      // variant not found, fall through to on-the-fly
    }
  }

  // On-the-fly resize from original WebP
  const webpName = filename.replace(/\.[^.]+$/, ".webp");
  const originalPath = joinPath(webpName);
  try {
    const { readFile } = await import("fs/promises");
    const originalBuffer = await readFile(originalPath);
    const buffer = await sharp(originalBuffer)
      .resize(width, null, { withoutEnlargement: true, fit: "inside" })
      .webp({ quality: 80, effort: 4 })
      .toBuffer();
    return { buffer, contentType: "image/webp" };
  } catch {
    return null;
  }
}

function joinPath(filename: string): string {
  const { join } = require("path") as typeof import("path");
  return join(UPLOAD_DIR, filename);
}
