"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { livePhotos as FALLBACK_PHOTOS } from "./live-photos";

/**
 * "Живые эмоции" — carousel of real customer photos with a beige watercolor
 * backdrop, arrow controls, and dot pagination (matches momomoments.ru).
 */
export default function BooksLiveCarousel({ photos }: { photos?: string[] }) {
  const livePhotos = photos && photos.length > 0 ? photos : FALLBACK_PHOTOS;
  const [index, setIndex] = useState(0);
  const [perView, setPerView] = useState(3);
  const trackRef = useRef<HTMLDivElement>(null);

  const total = livePhotos.length;

  const goTo = (i: number) => setIndex(((i % total) + total) % total);
  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  // Responsive cards-per-view (matches original breakpoints). Runs after mount.
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setPerView(w < 640 ? 1 : w < 768 ? 2 : 3);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <section className="relative -mt-9 overflow-visible pt-12 pb-24 md:-mt-20 md:pt-20 md:pb-32">
      {/* Mobile backdrop with wavy top edge */}
      <div aria-hidden className="absolute inset-x-0 -top-9 bottom-0 pointer-events-none md:hidden">
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            maskImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 900' preserveAspectRatio='none'%3E%3Cpath fill='black' d='M0 88C124 64 250 62 372 72C502 82 624 104 746 108C874 112 992 98 1112 84C1234 70 1344 72 1440 80V900H0Z'/%3E%3C/svg%3E\")",
            maskRepeat: "no-repeat",
            maskSize: "100% 100%",
            maskPosition: "center top",
            WebkitMaskImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 900' preserveAspectRatio='none'%3E%3Cpath fill='black' d='M0 88C124 64 250 62 372 72C502 82 624 104 746 108C874 112 992 98 1112 84C1234 70 1344 72 1440 80V900H0Z'/%3E%3C/svg%3E\")",
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskSize: "100% 100%",
            WebkitMaskPosition: "center top",
          }}
        >
          <div className="absolute inset-0 bg-[#f5e6cf]" />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "url(/books/watercolors/pattern-air-balloon.webp)",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center 24px",
              backgroundSize: "cover",
            }}
          />
          <div className="absolute inset-0 bg-[#f6eee3]/8" />
          <div
            className="absolute inset-x-0 top-0 h-56"
            style={{
              background:
                "linear-gradient(rgba(243,224,188,0.98) 0%, rgba(243,224,188,0.8) 40%, rgba(243,224,188,0.26) 74%, rgba(243,224,188,0) 100%)",
            }}
          />
        </div>
        <svg viewBox="0 0 1440 900" preserveAspectRatio="none" className="h-full w-full">
          <defs>
            <linearGradient id="live-edge-mobile" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f7e8c9" stopOpacity="1" />
              <stop offset="100%" stopColor="#f1d8a7" stopOpacity="0.94" />
            </linearGradient>
          </defs>
          <path
            d="M0 88C124 64 250 62 372 72C502 82 624 104 746 108C874 112 992 98 1112 84C1234 70 1344 72 1440 80"
            fill="none"
            stroke="url(#live-edge-mobile)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="16"
            opacity="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      {/* Desktop backdrop with wavy top edge */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 pointer-events-none hidden md:block md:-top-20">
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            maskImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 900' preserveAspectRatio='none'%3E%3Cpath fill='black' d='M0 126C108 82 232 74 360 92C494 110 594 158 726 162C860 166 976 120 1096 94C1220 68 1330 70 1440 84V900H0Z'/%3E%3C/svg%3E\")",
            maskRepeat: "no-repeat",
            maskSize: "100% 100%",
            maskPosition: "center top",
            WebkitMaskImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 900' preserveAspectRatio='none'%3E%3Cpath fill='black' d='M0 126C108 82 232 74 360 92C494 110 594 158 726 162C860 166 976 120 1096 94C1220 68 1330 70 1440 84V900H0Z'/%3E%3C/svg%3E\")",
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskSize: "100% 100%",
            WebkitMaskPosition: "center top",
          }}
        >
          <div className="absolute inset-0 bg-[#f5e6cf]" />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "url(/books/watercolors/pattern-air-balloon.webp)",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center 40px",
              backgroundSize: "cover",
            }}
          />
          <div className="absolute inset-0 bg-[#f6eee3]/8" />
          <div
            className="absolute inset-x-0 top-0 h-80"
            style={{
              background:
                "linear-gradient(rgba(243,224,188,0.98) 0%, rgba(243,224,188,0.78) 42%, rgba(243,224,188,0.22) 76%, rgba(243,224,188,0) 100%)",
            }}
          />
        </div>
        <svg viewBox="0 0 1440 900" preserveAspectRatio="none" className="h-full w-full">
          <defs>
            <linearGradient id="live-edge-desktop" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f7e8c9" stopOpacity="1" />
              <stop offset="100%" stopColor="#f1d8a7" stopOpacity="0.94" />
            </linearGradient>
          </defs>
          <path
            d="M0 126C108 82 232 74 360 92C494 110 594 158 726 162C860 166 976 120 1096 94C1220 68 1330 70 1440 84"
            fill="none"
            stroke="url(#live-edge-desktop)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="20"
            opacity="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      {/* Fade into next section */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 z-10 h-24 pointer-events-none md:h-32"
        style={{
          background:
            "linear-gradient(180deg, rgba(245,230,207,0) 0%, rgba(245,230,207,0.42) 58%, var(--color-bg) 100%)",
        }}
      />

      <div className="relative z-20 max-w-6xl mx-auto px-5">
        <div className="text-center mb-8 md:mb-10">
          <span className="inline-block py-1 px-3 rounded-full bg-white/80 border border-ink/10 text-[10px] tracking-widest uppercase text-ink-muted mb-4 shadow-sm backdrop-blur-sm">
            Реальные фото
          </span>
          <h2 className="font-display text-5xl md:text-7xl text-ink leading-tight">Живые эмоции</h2>
        </div>

        <div className="relative">
          <button
            onClick={prev}
            className="absolute left-0 md:-left-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-white/85 backdrop-blur-sm border border-ink/10 shadow-lg flex items-center justify-center text-ink hover:bg-white hover:scale-110 transition-all cursor-pointer"
            aria-label="Предыдущее фото"
          >
            <Chevron dir="left" />
          </button>
          <button
            onClick={next}
            className="absolute right-0 md:-right-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-white/85 backdrop-blur-sm border border-ink/10 shadow-lg flex items-center justify-center text-ink hover:bg-white hover:scale-110 transition-all cursor-pointer"
            aria-label="Следующее фото"
          >
            <Chevron dir="right" />
          </button>

          <div
            className="overflow-hidden px-8 md:px-16"
            style={{
              maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
              WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
            }}
          >
            <div
              ref={trackRef}
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translate3d(calc(${index} * (100% / ${perView} * -1)), 0, 0)` }}
            >
              {livePhotos.map((src, i) => (
                <div
                  key={i}
                  className="mx-4 pt-6 pb-4 min-w-0"
                  style={{ flex: `0 0 ${100 / perView}%`, marginLeft: 0, marginRight: 0 }}
                >
                  <div className="bg-white/60 rounded-[28px] p-2 shadow-[0_16px_40px_rgba(36,36,36,0.08)] backdrop-blur-sm">
                    <div className="relative bg-stone-200 rounded-3xl aspect-3/4 overflow-hidden">
                      <Image
                        src={src}
                        alt="Фото с книгой"
                        fill
                        sizes="(max-width: 640px) 75vw, (max-width: 768px) 45vw, 30vw"
                        className="object-cover"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {livePhotos.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Перейти к фото ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                i === index ? "w-8 bg-ink" : "w-2 bg-ink/20 hover:bg-ink/40"
              }`}
            />
          ))}
        </div>

        <div className="mt-10 flex items-center justify-center gap-5">
          <div className="h-px flex-1 max-w-24 bg-linear-to-r from-transparent to-ink/10" />
          <div className="flex items-center gap-4 text-sm text-ink-muted">
            <div className="flex -space-x-2.5">
              <Avatar letter="Е" />
              <Avatar letter="Д" />
              <Avatar letter="А" />
              <Avatar letter="О" />
            </div>
            <p className="font-body">
              Уже <span className="font-bold text-ink">500+</span> историй
            </p>
          </div>
          <div className="h-px flex-1 max-w-24 bg-linear-to-l from-transparent to-ink/10" />
        </div>
      </div>
    </section>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
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
      {dir === "left" ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
    </svg>
  );
}

function Avatar({ letter }: { letter: string }) {
  return (
    <div className="w-7 h-7 rounded-full border-2 border-white bg-white flex items-center justify-center text-[10px] font-display font-semibold text-ink-muted shadow-sm">
      {letter}
    </div>
  );
}
