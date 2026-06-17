/**
 * One-time script: convert all existing product images to WebP with variants.
 * Usage: npx tsx scripts/convert-images.ts
 * 
 * - Converts PNG/JPG to WebP
 * - Generates thumb (400px), medium (800px), large (1600px) variants
 * - Updates ProductImage URLs in DB
 * - Does NOT delete originals (keeps as backup)
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const UPLOAD_DIR = "/opt/bead-designer/uploads/products";
const SIZES = [
  { key: "thumb", maxW: 400, suffix: "_thumb" },
  { key: "medium", maxW: 800, suffix: "_medium" },
  { key: "large", maxW: 1600, suffix: "_large" },
];

async function processFile(filename: string) {
  const filepath = path.join(UPLOAD_DIR, filename);
  const ext = path.extname(filename).toLowerCase();
  
  // Skip already processed WebP and tiny files
  if (ext === ".webp" || filename.includes("_thumb") || filename.includes("_medium") || filename.includes("_large")) {
    return null;
  }

  const baseName = path.basename(filename, ext);
  const webpName = `${baseName}.webp`;
  const webpPath = path.join(UPLOAD_DIR, webpName);

  // Skip if already converted
  if (fs.existsSync(webpPath)) {
    console.log(`  SKIP (already has webp): ${filename}`);
    return { original: filename, webp: webpName };
  }

  const stat = fs.statSync(filepath);
  const originalSizeMB = (stat.size / 1024 / 1024).toFixed(2);
  console.log(`  Processing: ${filename} (${originalSizeMB} MB)`);

  try {
    const inputBuffer = fs.readFileSync(filepath);
    const metadata = await sharp(inputBuffer).metadata();
    const width = metadata.width || 1600;

    // Generate original WebP (cap at 1600px)
    let originalPipeline = sharp(inputBuffer).rotate();
    if (width > 1600) {
      originalPipeline = originalPipeline.resize(1600, null, { withoutEnlargement: true });
    }
    await originalPipeline.webp({ quality: 82, effort: 4 }).toFile(webpPath);

    // Generate size variants
    for (const size of SIZES) {
      const variantName = `${baseName}${size.suffix}.webp`;
      const variantPath = path.join(UPLOAD_DIR, variantName);
      await sharp(inputBuffer)
        .rotate()
        .resize(size.maxW, null, { withoutEnlargement: true, fit: "inside" })
        .webp({ quality: 80, effort: 4 })
        .toFile(variantPath);
    }

    const webpStat = fs.statSync(webpPath);
    const webpSizeMB = (webpStat.size / 1024 / 1024).toFixed(2);
    const ratio = ((1 - webpStat.size / stat.size) * 100).toFixed(1);
    console.log(`    -> ${webpName} (${webpSizeMB} MB, -${ratio}%)`);

    return { original: filename, webp: webpName };
  } catch (err) {
    console.error(`  ERROR processing ${filename}:`, err);
    return null;
  }
}

async function main() {
  console.log("=== Image Conversion Script ===\n");
  console.log(`Upload dir: ${UPLOAD_DIR}\n`);

  const files = fs.readdirSync(UPLOAD_DIR).filter((f: string) => {
    const ext = path.extname(f).toLowerCase();
    return [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)
      && !f.includes("_thumb") && !f.includes("_medium") && !f.includes("_large");
  });

  console.log(`Found ${files.length} images to process\n`);

  const results: Array<{ original: string; webp: string } | null> = [];
  for (let i = 0; i < files.length; i++) {
    console.log(`[${i + 1}/${files.length}]`);
    const result = await processFile(files[i]);
    results.push(result);
  }

  // Summary
  const converted = results.filter(Boolean);
  console.log(`\n=== Done! Converted ${converted.length} / ${files.length} images ===`);

  // Print DB update SQL
  console.log("\n=== SQL to update ProductImage URLs ===");
  console.log("Run this SQL in psql:\n");
  for (const r of converted) {
    if (r) {
      const oldUrl = `/uploads/products/${r.original}`;
      const newUrl = `/uploads/products/${r.webp}`;
      console.log(`UPDATE "ProductImage" SET url =  WHERE url = ;`);
    }
  }
}

main().catch(console.error);
