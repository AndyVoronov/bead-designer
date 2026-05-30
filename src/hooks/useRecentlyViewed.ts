"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "recently_viewed";
const MAX_ITEMS = 12;

export interface RecentlyViewedItem {
  id: number;
  name: string;
  slug: string;
  basePrice: number;
  discountPercent: number;
  mainImage: { id: number; url: string } | null;
  viewedAt: number; // timestamp
}

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  // Add product to recently viewed
  const addViewed = useCallback((product: Omit<RecentlyViewedItem, "viewedAt">) => {
    setItems((prev) => {
      // Remove if already exists (will re-add with new timestamp)
      const filtered = prev.filter((item) => item.id !== product.id);
      // Add to front with current timestamp
      const newItem: RecentlyViewedItem = { ...product, viewedAt: Date.now() };
      const updated = [newItem, ...filtered].slice(0, MAX_ITEMS);
      // Persist
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // quota exceeded — trim oldest
      }
      return updated;
    });
  }, []);

  return { items, addViewed };
}
