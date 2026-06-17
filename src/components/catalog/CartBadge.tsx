"use client";

import Link from "next/link";

interface CartBadgeProps {
  count: number;
}

export function CartBadge({ count }: CartBadgeProps) {
  return (
    <Link
      href="/cart"
      className="relative inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm shadow-sm border border-gray-100 hover:bg-rose-50 hover:border-rose-200 transition-all duration-200 group"
      aria-label={`Корзина, ${count} ${count === 1 ? "товар" : count < 5 ? "товара" : "товаров"}`}
    >
      {/* Shopping bag icon */}
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
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>

      {/* Count badge */}
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 bg-rose-500 text-white text-[11px] font-bold rounded-full shadow-sm animate-[badge-pop_0.3s_ease-out]">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
