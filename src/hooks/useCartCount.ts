"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Shared hook for fetching cart item count.
 * Uses lightweight /api/cart?count=1 endpoint.
 * Used across catalog, product detail, and landing pages.
 */
export function useCartCount() {
  const [cartCount, setCartCount] = useState(0);

  const fetchCartCount = useCallback(async () => {
    try {
      const res = await fetch("/api/cart?count=1");
      if (res.ok) {
        const data = await res.json();
        setCartCount(data.count ?? 0);
      }
    } catch {
      /* ignore network errors */
    }
  }, []);

  useEffect(() => {
    fetchCartCount();
  }, [fetchCartCount]);

  // Listen for cart updates (merge on login, etc.)
  useEffect(() => {
    const handler = () => fetchCartCount();
    window.addEventListener("cart-updated", handler);
    return () => window.removeEventListener("cart-updated", handler);
  }, [fetchCartCount]);

  return { cartCount, refetch: fetchCartCount };
}
