"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Script from "next/script";
import { useToast } from "@/components/ui/ToastProvider";
import { getEffectivePrice, formatPrice } from "@/lib/catalog-utils";

interface ProductBasic {
  id: number;
  name: string;
  slug: string;
  basePrice: number;
  discountPercent: number;
  images: { id: number; url: string }[];
}

interface BlogContentProps {
  content: string;
  products: Map<number, ProductBasic>;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Strip dangerous elements/attributes from HTML while preserving safe content
function sanitizeHtml(html: string): string {
  // Remove script tags and their content
  let clean = html.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    ""
  );
  // Remove event handler attributes (onclick, onload, onerror, etc.)
  clean = clean.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "");
  // Remove javascript: URLs
  clean = clean.replace(/href\s*=\s*["']?\s*javascript:/gi, 'href="#"');
  // Remove data: URLs in src attributes (potential XSS vectors)
  clean = clean.replace(/src\s*=\s*["']?\s*data:(?!image\/)/gi, 'src=""');
  // Remove <iframe>, <object>, <embed>, <form>, <input> tags
  clean = clean.replace(/<(iframe|object|embed|form|input|textarea|select|button|meta|link)\b[^>]*\/?>/gi, "");
  // Remove <base> tag
  clean = clean.replace(/<base\b[^>]*\/?>/gi, "");
  // Re-apply script removal on clean
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  return clean;
}

export function BlogContent({ content, products }: BlogContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Replace product placeholders
    const placeholders = container.querySelectorAll<HTMLDivElement>(
      'div[data-product-id]'
    );

    placeholders.forEach((placeholder) => {
      const productId = Number(placeholder.getAttribute("data-product-id"));
      const product = products.get(productId);
      if (!product) return;

      const price = getEffectivePrice(product.basePrice, product.discountPercent);
      const imageUrl = product.images.length > 0 ? `/api${product.images[0].url}` : null;

      const card = document.createElement("div");
      card.className =
        "my-6 mx-auto max-w-[400px] bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm";
      card.innerHTML = `
        <a href="/catalog/${escapeHtml(product.slug)}" class="block">
          <div class="relative aspect-video bg-gray-100">
            ${
              imageUrl
                ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.name)}" class="w-full h-full object-cover" loading="lazy" />`
                : `<div class="flex items-center justify-center h-full bg-gradient-to-br from-rose-50 to-pink-50 text-gray-300 text-3xl">📦</div>`
            }
          </div>
          <div class="p-3">
            <h4 class="font-semibold text-gray-900 text-sm line-clamp-2">${escapeHtml(product.name)}</h4>
            <p class="mt-1 text-sm font-bold text-rose-600">${formatPrice(price)}</p>
          </div>
        </a>
      `;

      const actionsDiv = document.createElement("div");
      actionsDiv.className = "px-3 pb-3";

      const cartBtn = document.createElement("button");
      cartBtn.className =
        "w-full flex items-center justify-center gap-2 py-2 text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors cursor-pointer";
      cartBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg> В корзину`;
      cartBtn.addEventListener("click", async () => {
        try {
          const res = await fetch("/api/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId: product.id, quantity: 1 }),
          });
          if (res.ok) {
            toast.success(`${product.name} добавлен в корзину`);
            window.dispatchEvent(new CustomEvent("cart-updated"));
          } else {
            toast.error("Не удалось добавить в корзину");
          }
        } catch {
          toast.error("Ошибка при добавлении в корзину");
        }
      });
      actionsDiv.appendChild(cartBtn);
      card.appendChild(actionsDiv);
      placeholder.replaceWith(card);
    });

    // Animate stat counters with IntersectionObserver
    const statNumbers = container.querySelectorAll<HTMLElement>('.blog-stat-number[data-target]');
    statNumbers.forEach((el) => {
      const target = parseInt(el.dataset.target || '0', 10);
      const suffix = el.dataset.suffix || '';
      const prefix = el.dataset.prefix !== undefined ? el.dataset.prefix : '';

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          observer.disconnect();
          const duration = 2000;
          const startTime = performance.now();
          const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(eased * target);
            el.textContent = prefix + current.toLocaleString('ru-RU') + suffix;
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        },
        { threshold: 0.3 }
      );
      observer.observe(el);
    });

    // Scroll reveal for .blog-reveal elements
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    container.querySelectorAll('.blog-reveal').forEach((el) => revealObserver.observe(el));

  }, [content, products, toast]);

  const safeContent = sanitizeHtml(content);

  return (
    <>
      <Script src="https://unpkg.com/gsap@3/dist/gsap.min.js" strategy="beforeInteractive" />
      <Script src="https://unpkg.com/gsap@3/dist/ScrollTrigger.min.js" strategy="beforeInteractive" />
      <Script src="https://cdn.jsdelivr.net/npm/chart.js" strategy="beforeInteractive" />

      <div
        ref={containerRef}
        className="prose prose-lg max-w-none
          prose-headings:text-gray-900 prose-headings:font-bold
          prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
          prose-p:text-gray-700 prose-p:leading-relaxed
          prose-a:text-rose-500 prose-a:no-underline hover:prose-a:underline
          prose-img:rounded-xl prose-img:shadow-md
          prose-blockquote:border-l-rose-400 prose-blockquote:bg-rose-50/50 prose-blockquote:rounded-r-lg prose-blockquote:py-2 prose-blockquote:px-4
          prose-ul:list-disc prose-ol:list-decimal
          prose-li:text-gray-700
          prose-strong:text-gray-900
          prose-hr:border-gray-200
          prose-code:text-rose-600 prose-code:bg-rose-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
          prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-xl
          [&_figure]:my-4 [&_figcaption]:text-center [&_figcaption]:text-sm [&_figcaption]:text-gray-400 [&_figcaption]:mt-2
          [&_div[data-product-id]]:min-h-[80px] [&_div[data-product-id]]:rounded-lg [&_div[data-product-id]]:bg-gray-50 [&_div[data-product-id]]:flex [&_div[data-product-id]]:items-center [&_div[data-product-id]]:justify-center
        "
        dangerouslySetInnerHTML={{ __html: safeContent }}
      />
    </>
  );
}
