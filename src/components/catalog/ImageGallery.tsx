"use client";

import { useState } from "react";
import Image from "next/image";

/* ── Types ────────────────────────────────────────────────────────────── */

interface ImageItem {
  url: string;
  isMain: boolean;
}

interface ImageGalleryProps {
  images: ImageItem[];
  productName?: string;
}

/* ── Placeholder ──────────────────────────────────────────────────────── */

function Placeholder() {
  return (
    <div className="w-full aspect-square rounded-2xl bg-gray-50 flex items-center justify-center border-2 border-dashed border-gray-200">
      <svg
        className="w-24 h-24 text-gray-200"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="100" height="100" rx="8" fill="currentColor" />
        <circle
          cx="50"
          cy="40"
          r="15"
          stroke="#d1d5db"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M25 75h50l-8-22h-34l-8 22z"
          stroke="#d1d5db"
          strokeWidth="1.5"
          fill="none"
        />
      </svg>
    </div>
  );
}

/* ── Component ────────────────────────────────────────────────────────── */

export function ImageGallery({ images, productName }: ImageGalleryProps) {
  const sorted = [...images].sort((a, b) =>
    a.isMain === b.isMain ? 0 : a.isMain ? -1 : 1
  );

  const [selectedIndex, setSelectedIndex] = useState(() => {
    const mainIdx = sorted.findIndex((img) => img.isMain);
    return mainIdx >= 0 ? mainIdx : 0;
  });

  const [imageLoaded, setImageLoaded] = useState(false);

  const current = sorted[selectedIndex];
  const hasImages = sorted.length > 0;

  const handleSelect = (index: number) => {
    if (index === selectedIndex) return;
    setSelectedIndex(index);
    setImageLoaded(false);
  };

  if (!hasImages) return <Placeholder />;

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100">
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-8 h-8 border-2 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
          </div>
        )}
        <Image
          key={selectedIndex}
          src={`/api${current.url}`}
          alt={productName || ""}
          fill
          className={`object-cover transition-opacity duration-300 ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}
          sizes="(max-width: 768px) 100vw, 50vw"
          onLoad={() => setImageLoaded(true)}
          priority={selectedIndex === 0}
        />
      </div>

      {/* Thumbnails */}
      {sorted.length > 1 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {sorted.map((img, idx) => (
            <button
              key={img.url}
              onClick={() => handleSelect(idx)}
              className={`shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer relative ${
                idx === selectedIndex
                  ? "border-rose-400 shadow-md scale-105"
                  : "border-transparent hover:border-gray-300 opacity-70 hover:opacity-100"
              }`}
            >
              <Image
                src={`/api${img.url}`}
                alt={productName || ""}
                fill
                className="object-cover"
                sizes="80px"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
