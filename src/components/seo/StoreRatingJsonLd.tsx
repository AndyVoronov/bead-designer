"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

export function StoreRatingJsonLd() {
  const [data, setData] = useState<{ count: number; avg: number } | null>(null);

  useEffect(() => {
    fetch("/api/reviews?limit=1&stats=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.avg && d.count) setData(d);
      })
      .catch(() => {});
  }, []);

  if (!data || data.count === 0) return null;

  const ld = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "5 минут тишины",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: data.avg.toFixed(1),
      reviewCount: data.count,
      bestRating: 5,
      worstRating: 1,
    },
  };

  return (
    <Script
      id="jsonld-store-rating"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
    />
  );
}
