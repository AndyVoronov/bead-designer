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
  /** Show cart icon (default: true) */
  showCart?: boolean;
  /** Show profile icon (default: false for backward compat) */
  showProfile?: boolean;
  /** Show catalog link (default: false) */
  showCatalog?: boolean;
}

function ProfileButton() {
  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent("auth-required"))}
      className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm shadow-sm border border-gray-100 hover:bg-rose-50 hover:border-rose-200 transition-all duration-200 group"
      aria-label="Профиль"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-gray-600 group-hover:text-rose-500 transition-colors"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </button>
  );
}

function CatalogButton() {
  return (
    <Link
      href="/catalog"
      className="inline-flex items-center gap-1.5 px-3 h-10 rounded-full bg-white/80 backdrop-blur-sm shadow-sm border border-gray-100 hover:bg-rose-50 hover:border-rose-200 transition-all duration-200 group text-sm font-medium text-gray-600 group-hover:text-rose-500"
      aria-label="Каталог"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-colors"
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
      <span className="hidden sm:inline">Каталог</span>
    </Link>
  );
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
  showCart = true,
  showProfile = false,
  showCatalog = false,
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

        <div className="flex items-center gap-2 sm:gap-3">
          {children}
          {!children && showCatalog && <CatalogButton />}
          {!children && showCart && <CartBadge count={cartCount} />}
          {showProfile && <ProfileButton />}
        </div>
      </div>
    </header>
  );
}
