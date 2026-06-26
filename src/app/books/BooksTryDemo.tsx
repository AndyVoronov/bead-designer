"use client";

import { useState } from "react";

/**
 * "Загляните в сказку" — try-demo before/after carousel. Cycles through
 * several character pairs (girl/boy/woman/man). Arrow controls switch pairs.
 * Wrapped in the dark #481515 backdrop with wavy top/bottom edges.
 */

const FALLBACK_PAIRS = [
  { photo: "/books/transform/girl.webp", character: "/books/transform/girl-character.webp" },
  { photo: "/books/transform/boy.webp", character: "/books/transform/boy-character.webp" },
];

export interface DemoPairItem { photoUrl: string; characterUrl: string; }

export default function BooksTryDemo({ pairs }: { pairs?: DemoPairItem[] }) {
  const list = pairs && pairs.length > 0
    ? pairs.map((p) => ({ photo: p.photoUrl, character: p.characterUrl }))
    : FALLBACK_PAIRS;
  const [idx, setIdx] = useState(0);
  const pair = list[idx];
  const goTo = (i: number) => setIdx(((i % list.length) + list.length) % list.length);

  return (
    <div className="relative z-10 bg-[#481515]">
      {/* glow + wavy top edge */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)",
        }}
      >
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-200 rounded-full"
          style={{ background: "radial-gradient(circle, var(--color-lavender) 0%, transparent 70%)", opacity: 0.1 }}
        />
        <div
          className="absolute top-0 right-0 w-150 h-150 rounded-full"
          style={{ background: "radial-gradient(circle, var(--color-sky-dark) 0%, transparent 70%)", opacity: 0.2 }}
        />
      </div>
      <div className="absolute -top-4.75 md:-top-5.75 left-0 right-0 z-20 pointer-events-none">
        <svg viewBox="0 0 1200 24" preserveAspectRatio="none" className="w-full h-5 md:h-6 block">
          <path d="M0,24 C60,8 120,0 180,12 C240,24 300,8 360,0 C420,12 480,24 540,8 C600,0 660,12 720,24 C780,8 840,0 900,12 C960,24 1020,8 1080,0 C1140,12 1200,24 1200,24 L1200,24 L0,24 Z" fill="#481515" />
        </svg>
      </div>

      <section id="try" className="pt-16 pb-32 relative flex items-center justify-center">
        {/* decorative sparkles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <svg viewBox="0 0 24 24" fill="none" className="absolute top-[10%] left-[6%] w-12 h-12 text-white/20 animate-twinkle"><path d="M12 2 L14 9 L21 9 L15.5 13.5 L17.5 21 L12 16.5 L6.5 21 L8.5 13.5 L3 9 L10 9 Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" /></svg>
          <svg viewBox="0 0 24 24" fill="none" className="absolute top-[40%] right-[4%] w-11 h-11 text-white/15 animate-twinkle [animation-delay:2.5s]"><path d="M12 2 L14 9 L21 9 L15.5 13.5 L17.5 21 L12 16.5 L6.5 21 L8.5 13.5 L3 9 L10 9 Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" /></svg>
          <svg viewBox="0 0 24 24" fill="none" className="absolute top-[20%] right-[18%] w-9 h-9 text-lavender/30 animate-twinkle [animation-delay:0.8s]"><path d="M12 1 C12.5 8 16 12 23 12 C16 12.5 12.5 16 12 23 C11.5 16 8 12.5 1 12 C8 11.5 11.5 8 12 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="currentColor" /></svg>
          <svg viewBox="0 0 24 24" fill="none" className="absolute bottom-[25%] left-[12%] w-8 h-8 text-sky/25 animate-twinkle [animation-delay:2s]"><path d="M12 1 C12.5 8 16 12 23 12 C16 12.5 12.5 16 12 23 C11.5 16 8 12.5 1 12 C8 11.5 11.5 8 12 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="currentColor" /></svg>
          <svg viewBox="0 0 60 32" fill="none" className="absolute bottom-[10%] right-[22%] w-24 text-white/12 rotate-6"><path d="M12 28 C4 28, 2 22, 6 18 C4 14, 8 8, 16 10 C18 4, 28 2, 32 8 C36 2, 46 4, 46 10 C54 8, 58 14, 54 20 C58 24, 54 28, 48 28 Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
          <svg viewBox="0 0 24 24" fill="none" className="absolute top-[60%] left-[4%] w-10 h-10 text-lavender/20 rotate-12 animate-float-gentle [animation-delay:2s]"><path d="M12 21 C8 17, 2 13, 2 8 C2 4, 5 2, 8 3 C10 3.5, 11.5 5, 12 6 C12.5 5, 14 3.5, 16 3 C19 2, 22 4, 22 8 C22 13, 16 17, 12 21 Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" /></svg>
          <svg viewBox="0 0 80 40" fill="none" className="absolute bottom-[35%] right-[12%] w-28 text-white/12 -rotate-12"><path d="M5 20 C15 5, 25 35, 40 20 S65 5, 75 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" /></svg>
        </div>

        <div className="container mx-auto px-5 relative z-10 max-w-6xl">
          <div className="text-center mb-14">
            <span className="inline-block py-1 px-3 rounded-full bg-white/10 border border-white/15 text-[10px] tracking-widest uppercase text-white/50 mb-4">Демо-иллюстрация</span>
            <h2 className="font-display text-4xl md:text-6xl text-white leading-[0.95] mb-4">Загляните в <span className="italic text-[#efdee2]">сказку</span></h2>
            <p className="font-body text-white/50 text-lg leading-relaxed max-w-lg mx-auto">Посмотрите, как это работает — создайте первую иллюстрацию и решите, хотите ли целую сказку.</p>
          </div>

          <div className="relative pt-4">
            {/* before → after pair */}
            <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-0 justify-center mb-8" style={{ opacity: 1, transform: "none" }}>
              {/* before photo */}
              <div key={`before-${idx}`} className="relative w-56 md:w-64 shrink-0 group will-change-transform animate-try-in">
                <div className="absolute -inset-1 bg-white/5 rounded-4xl blur-md"></div>
                <div className="relative bg-white rounded-4xl p-2.5 shadow-2xl shadow-black/20">
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-sky/40 backdrop-blur-sm rounded-sm -rotate-2 z-20 shadow-sm"></div>
                  <div className="relative aspect-4/5 rounded-3xl overflow-hidden bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt="Фото" loading="lazy" className="w-full h-full object-cover" src={pair.photo} />
                  </div>
                  <p className="text-center font-hand text-3xl text-ink-muted mt-2 pb-1">Обычное фото</p>
                </div>
              </div>

              {/* arrow */}
              <div className="flex items-center justify-center lg:mx-6 z-20">
                <div className="relative flex flex-col items-center gap-2">
                  <div className="absolute -inset-8 bg-lavender/10 rounded-full blur-xl animate-pulse"></div>
                  <svg className="w-14 h-14 text-sky relative" viewBox="0 0 56 56" fill="none">
                    <circle cx="28" cy="28" r="26" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" opacity="0.5" />
                    <path d="M22 28H36M36 28L30 22M36 28L30 34" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="font-body text-white/40 text-xs">Щепотка магии</span>
                </div>
              </div>

              {/* after character */}
              <div key={`after-${idx}`} className="relative shrink-0 group will-change-transform animate-try-in" style={{ animationDelay: "120ms" }}>
                <div className="absolute -inset-1 bg-lavender/10 rounded-4xl blur-md"></div>
                <div className="relative bg-white rounded-4xl p-2.5 shadow-2xl shadow-black/20">
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-lavender/40 backdrop-blur-sm rounded-sm rotate-2 z-20 shadow-sm"></div>
                  <div className="md:hidden relative aspect-video w-64 rounded-3xl overflow-hidden bg-crayon-yellow/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt="Персонаж" loading="lazy" className="w-full h-full object-cover" src={pair.character} />
                  </div>
                  <div className="hidden md:block relative h-73.75 w-auto rounded-3xl overflow-hidden bg-crayon-yellow/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt="Персонаж" loading="lazy" className="w-full h-full object-cover" width="600" height="400" src={pair.character} />
                  </div>
                  <p className="text-center font-hand text-3xl text-ink-muted mt-2 pb-1">Персонаж</p>
                </div>
              </div>
            </div>

            {/* working arrow controls */}
            <button
              onClick={() => goTo(idx - 1)}
              aria-label="Предыдущий пример"
              className="absolute left-0 md:-left-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 shadow-lg flex items-center justify-center text-white hover:bg-white/25 hover:scale-110 transition-all cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <button
              onClick={() => goTo(idx + 1)}
              aria-label="Следующий пример"
              className="absolute right-0 md:-right-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 shadow-lg flex items-center justify-center text-white hover:bg-white/25 hover:scale-110 transition-all cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
            </button>

            {/* dots */}
            <div className="flex items-center justify-center gap-2 mt-6">
              {list.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Пример ${i + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${i === idx ? "w-8 bg-white" : "w-2 bg-white/25 hover:bg-white/50"}`}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <a href="#try">
              <div className="relative inline-flex group cursor-pointer active:scale-95 transition-transform duration-100 ease-out rounded-full">
                <div className="absolute inset-0 bg-ink/10 rounded-full translate-y-1 translate-x-0 group-hover:translate-y-2 transition-transform duration-300"></div>
                <div className="relative z-10 flex items-center justify-center gap-2.5 px-8 py-4 font-display font-normal text-lg tracking-wide border-2 rounded-full transition-all duration-300 ease-out shadow-sm group-hover:-translate-y-1 group-hover:shadow-lg bg-white text-ink border-ink/10">
                  <span>Попробовать демо</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                </div>
              </div>
            </a>
            <p className="text-2xl font-hand text-white/30">Займёт всего 2 минуты</p>
          </div>
        </div>
      </section>

      {/* wavy bottom edge back into light bg */}
      <div className="absolute -bottom-5 md:-bottom-6 left-0 right-0 z-20 pointer-events-none">
        <svg viewBox="0 0 1200 24" preserveAspectRatio="none" className="w-full h-5 md:h-6 block">
          <path d="M0,0 C60,16 120,24 180,12 C240,0 300,16 360,24 C420,12 480,0 540,16 C600,24 660,12 720,0 C780,16 840,24 900,12 C960,0 1020,16 1080,24 C1140,12 1200,0 1200,0 L1200,0 L0,0 Z" fill="#481515" />
        </svg>
      </div>
    </div>
  );
}
