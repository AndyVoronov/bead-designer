/**
 * Pexels API utility — search & download photos for blog hero images.
 */

import { mkdir, writeFile } from "fs/promises";
import { dirname } from "path";

const PEXELS_API_KEY = "HkWKAJZqS0P2svpbI2Umxe7DpntdOHn0JpyvHJv4n7e0b48PuMEEpeOb";
const PEXELS_BASE = "https://api.pexels.com/v1";

export interface PexelsPhoto {
  id: number;
  src: {
    original: string;
    large2x: string;
    medium: string;
  };
  alt: string;
  photographer: string;
  photographer_url: string;
  avg_color: string;
  width: number;
  height: number;
}

/**
 * Search Pexels for photos matching the given query.
 * Returns up to `count` results, preferring landscape (horizontal) images.
 */
export async function searchPexels(
  query: string,
  count: number = 5
): Promise<PexelsPhoto[]> {
  try {
    const url = new URL(`${PEXELS_BASE}/search`);
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", String(count));
    url.searchParams.set("orientation", "landscape");
    url.searchParams.set("size", "large");
    url.searchParams.set("locale", "ru-RU");

    const res = await fetch(url.toString(), {
      headers: { Authorization: PEXELS_API_KEY },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      console.error(`[pexels] API error ${res.status}: ${await res.text().catch(() => "")}`);
      return [];
    }

    const data = await res.json();
    const photos: PexelsPhoto[] = (data.photos || []).map((p: any) => ({
      id: p.id,
      src: {
        original: p.src?.original || "",
        large2x: p.src?.large2x || "",
        medium: p.src?.medium || "",
      },
      alt: p.alt || p.photographer || "",
      photographer: p.photographer || "",
      photographer_url: p.photographer_url || "",
      avg_color: p.avg_color || "",
      width: p.width || 0,
      height: p.height || 0,
    }));

    // Prefer images that are wider than tall (landscape) and at least 1200px wide
    photos.sort((a, b) => {
      const scoreA = (a.width >= 1200 ? 100 : 0) + (a.width > a.height ? 50 : 0);
      const scoreB = (b.width >= 1200 ? 100 : 0) + (b.width > b.height ? 50 : 0);
      return scoreB - scoreA;
    });

    return photos;
  } catch (err) {
    console.error("[pexels] searchPexels failed:", err);
    return [];
  }
}

/**
 * Download a Pexels image to disk. Returns the file path on success.
 * Ensures the directory exists before writing.
 */
export async function downloadPexelsImage(
  imageUrl: string,
  savePath: string
): Promise<string> {
  // Ensure directory exists
  await mkdir(dirname(savePath), { recursive: true });

  return new Promise<string>((resolve, reject) => {
    const res = fetch(imageUrl, {
      headers: { Authorization: PEXELS_API_KEY },
      signal: AbortSignal.timeout(30_000),
    });

    res
      .then((response) => {
        if (!response.ok) {
          reject(new Error(`Download failed: ${response.status}`));
          return;
        }

        // Clone so we can also pipe to file
        const reader = response.body?.getReader();
        if (!reader) {
          reject(new Error("No response body"));
          return;
        }

        const chunks: Uint8Array[] = [];
        const pump = (): void => {
          reader
            .read()
            .then(({ done, value }) => {
              if (done) {
                // All chunks collected — write to file
                const buffer = Buffer.concat(chunks);
                writeFile(savePath, buffer)
                  .then(() => resolve(savePath))
                  .catch(reject);
                return;
              }
              chunks.push(value);
              pump();
            })
            .catch(reject);
        };
        pump();
      })
      .catch(reject);
  });
}

/**
 * Build an English search query from a Russian slug.
 * Takes 2-3 meaningful words from the slug (drops short/common words).
 */
export function slugToSearchQuery(slug: string): string {
  const STOP_WORDS = new Set([
    "the", "a", "an", "is", "are", "was", "were", "in", "on", "at",
    "to", "for", "of", "and", "or", "but", "not", "with", "by", "as",
  ]);

  const words = slug.split("-").filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  return words.slice(0, 3).join(" ") || slug.split("-").slice(0, 2).join(" ");
}
