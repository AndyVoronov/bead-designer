"use client";

import { useEffect, useState } from "react";

/**
 * Fixed top navigation for the /books page.
 * Replicates momomoments.ru navbar: brand logo + 5 anchor links + mobile hamburger.
 * Transparent over the hero, gains a soft white backdrop after scrolling.
 */
export default function BooksNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const navLinks = [
    { href: "#what-you-get", label: "Состав заказа" },
    { href: "#stories", label: "Каталог историй" },
    { href: "#reviews", label: "Отзывы" },
    { href: "#faq", label: "Вопросы" },
    { href: "#what-you-get", label: "О книгах" },
  ];

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled || open
          ? "bg-bg/85 backdrop-blur-md shadow-[0_1px_0_rgba(0,0,0,0.04)]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Brand */}
          <a
            href="/books"
            className="relative shrink-0 flex items-center"
            aria-label="momo moments"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/books/momo-logo.svg"
              alt="momo moments"
              width={140}
              height={37}
              className="h-7 md:h-8 w-auto transition-all duration-300"
            />
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((l, i) => (
              <a
                key={i}
                href={l.href}
                className="group relative text-[14px] font-body font-medium transition-colors duration-300 tracking-wide py-1 text-ink-muted hover:text-ink"
              >
                {l.label}
                <svg
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-lavender-muted absolute -bottom-1 left-0 w-full h-1.5 pointer-events-none"
                  viewBox="0 0 100 6"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0,3 C10,1 20,5 30,3 C40,1 50,5 60,3 C70,1 80,5 90,3 C95,2 98,3 100,3"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              </a>
            ))}
          </nav>

          {/* CTA + mobile toggle */}
          <div className="flex items-center gap-3">
            <a
              href="#try"
              className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink text-white text-sm font-body font-medium hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 shadow-sm"
            >
              Попробовать демо
            </a>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label="Меню"
              aria-expanded={open}
              className="md:hidden p-2 transition-colors cursor-pointer text-ink"
            >
              {open ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 5h16" />
                  <path d="M4 12h16" />
                  <path d="M4 19h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <nav className="md:hidden bg-bg/95 backdrop-blur-md border-t border-ink/5">
          <div className="px-5 py-4 flex flex-col gap-1">
            {navLinks.map((l, i) => (
              <a
                key={i}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-3 px-2 text-ink-muted hover:text-ink font-body text-base transition-colors border-b border-ink/5 last:border-0"
              >
                {l.label}
              </a>
            ))}
            <a
              href="#try"
              onClick={() => setOpen(false)}
              className="mt-3 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-ink text-white text-sm font-body font-medium"
            >
              Попробовать демо
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
