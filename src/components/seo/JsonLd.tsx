import Script from "next/script";

/* ── Organization / WebSite JSON-LD for layout ── */

export function OrganizationJsonLd() {
  const ld = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "5 минут тишины",
    url: "https://5minutesofsilence.ru",
    logo: "https://5minutesofsilence.ru/api/uploads/og-logo.png",
    description:
      "Уникальные игрушки и аксессуары для малышей — держатели для пустышек, браслеты, подвески, вязаные игрушки.",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      url: "https://t.me/karinavoronova",
      availableLanguage: "Russian",
    },
    sameAs: ["https://t.me/karinavoronova"],
  };

  return (
    <Script
      id="jsonld-organization"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
    />
  );
}

export function WebSiteJsonLd() {
  const ld = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "5 минут тишины",
    url: "https://5minutesofsilence.ru",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://5minutesofsilence.ru/catalog?search={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <Script
      id="jsonld-website"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
    />
  );
}

/* ── Product JSON-LD for product detail pages ── */

interface ProductJsonLdProps {
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  category: string | null;
  reviewCount?: number;
  averageRating?: number;
  availability?: string;
  material?: string;
}

export function ProductJsonLd({ name, description, price, imageUrl, category, reviewCount, averageRating, availability, material }: ProductJsonLdProps) {
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: description || `${name} в магазине 5 минут тишины`,
    image: imageUrl ? `https://5minutesofsilence.ru${imageUrl}` : undefined,
    brand: {
      "@type": "Brand",
      name: "5 минут тишины",
    },
    material: material || "Натуральное дерево, пищевой силикон",
    offers: {
      "@type": "Offer",
      priceCurrency: "RUB",
      price: price.toString(),
      availability: availability || "https://schema.org/InStock",
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "RU",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 1,
            maxValue: 2,
          },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 2,
            maxValue: 7,
          },
        },
      },
      seller: {
        "@type": "Organization",
        name: "5 минут тишины",
      },
    },
  };

  if (reviewCount && reviewCount > 0 && averageRating) {
    ld.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: averageRating.toFixed(1),
      reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return (
    <Script
      id="jsonld-product"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
    />
  );
}

/* ── Breadcrumb JSON-LD ── */

interface BreadcrumbItem {
  name: string;
  href: string;
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const ld = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `https://5minutesofsilence.ru${item.href}`,
    })),
  };

  return (
    <Script
      id="jsonld-breadcrumb"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
    />
  );
}

/* ── FAQ JSON-LD for FAQ page ── */

export function FAQJsonLd({ faqs }: { faqs: { q: string; a: string }[] }) {
  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };

  return (
    <Script
      id="jsonld-faq"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
    />
  );
}
