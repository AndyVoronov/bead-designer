"use client";

import Link from "next/link";
import { CartBadge } from "@/components/catalog/CartBadge";

interface PageHeaderProps {
  /** Back link href (default: /catalog) */
  backHref?: string;
  /** Page title displayed in header */
  title?: string;
  /** Optional subtitle or contextual text */
  subtitle?: string;
  /** Cart count to show in badge */
  cartCount?: number;
  /** Right-side actions (replaces default cart badge) */
  children?: React.ReactNode;
  /** Max width class (default: max-w-7xl) */
  maxWidth?: string;
}

/**
 * Shared sticky header used across catalog, product detail, and cart pages.
 * Replaces 7+ copies of identical header markup.
 */
export function PageHeader({
  backHref = "/catalog",
  title,
  subtitle,
  cartCount = 0,
  children,
  maxWidth = "max-w-7xl",
}: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-100">
      <div className={`${maxWidth} mx-auto px-4 sm:px-6 h-14 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Назад"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          {title && (
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-800">{title}</h1>
              {subtitle && (
                <span className="hidden sm:inline text-xs text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-full">
                  {subtitle}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {children ?? <CartBadge count={cartCount} />}
        </div>
      </div>
    </header>
  );
}
