"use client";

import { useState, useEffect } from "react";

/**
 * "Счастливые семьи" reviews carousel — fixed-width cards with arrow controls,
 * dot pagination, and auto-advance (matches momomoments.ru).
 */

const reviews = [
  {
    text: "Это просто чудо! Алиса не могла поверить, что она главная героиня. Читаем каждый вечер перед сном, и каждый раз находим новые детали на картинках. Даже бабушка прослезилась.",
    name: "Екатерина С.",
    role: "Мама Алисы, 5 лет",
    tape: { left: "20%", rot: -6, color: "bg-sky/50" },
    radius: "rounded-[2.5rem_3rem_2rem_3.5rem/3rem_2.5rem_3.5rem_2rem]",
    radiusBg: "rounded-[2.5rem_3rem_2rem_3.5rem/3rem_2.5rem_3.5rem_2rem]",
  },
  {
    text: "История не просто подставила имя — она реально учитывала внешность. Мы даже свитер такой же нашли для фотосессии! Ребёнок показывает книгу всем друзьям.",
    name: "Дмитрий В.",
    role: "Папа Миши, 4 года",
    tape: { left: "55%", rot: 4, color: "bg-lavender/45" },
    radius: "rounded-[3rem_2rem_3.5rem_2.5rem/2.5rem_3.5rem_2rem_3rem]",
    radiusBg: "rounded-[3rem_2rem_3.5rem_2.5rem/2.5rem_3.5rem_2rem_3rem]",
  },
  {
    text: "Картинки яркие, сюжет увлекательный. Бабушки оценили — заказали ещё одну для племянника. Целая библиотека сказок у нас теперь.",
    name: "Анастасия П.",
    role: "Мама Софии, 6 лет",
    tape: { left: "35%", rot: -3, color: "bg-sky/40" },
    radius: "rounded-[2rem_3.5rem_2.5rem_3rem/3.5rem_2rem_3rem_2.5rem]",
    radiusBg: "rounded-[2rem_3.5rem_2.5rem_3rem/3.5rem_2rem_3rem_2.5rem]",
  },
  {
    text: "Внук показывает книгу всем гостям. Трогательно получилось. Уже заказали серию про космос — ждём не дождёмся!",
    name: "Ольга М.",
    role: "Бабушка Артёма",
    tape: { left: "45%", rot: 7, color: "bg-lavender/50" },
    radius: "rounded-[3.5rem_2.5rem_3rem_2rem/2rem_3rem_2.5rem_3.5rem]",
    radiusBg: "rounded-[3.5rem_2.5rem_3rem_2rem/2rem_3rem_2.5rem_3.5rem]",
  },
  {
    text: "Дочка считает себя настоящей принцессой после этой книги. Качество иллюстраций поразило — как из настоящей детской книги из магазина!",
    name: "Марина К.",
    role: "Мама Даши, 3 года",
    tape: { left: "30%", rot: -5, color: "bg-sky/45" },
    radius: "rounded-[2.5rem_3rem_2rem_3.5rem/3rem_2.5rem_3.5rem_2rem]",
    radiusBg: "rounded-[2.5rem_3rem_2rem_3.5rem/3rem_2.5rem_3.5rem_2rem]",
  },
];

export default function BooksReviews() {
  // Duplicate the list so the track can scroll seamlessly (last → first).
  const loop = [...reviews, ...reviews];
  const total = reviews.length;
  const [index, setIndex] = useState(0);
  const [noAnim, setNoAnim] = useState(false);

  const goTo = (i: number) => {
    setNoAnim(false);
    setIndex(((i % total) + total) % total);
  };
  const next = () => {
    setNoAnim(false);
    setIndex((i) => i + 1); // allow going past total into the cloned set
  };

  // auto-advance every 5s
  useEffect(() => {
    const t = setInterval(() => {
      setNoAnim(false);
      setIndex((i) => i + 1);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  // When we've scrolled one full length into the cloned set, silently reset
  // (no transition) back to 0 so it looks infinite.
  useEffect(() => {
    if (index >= total) {
      const t = setTimeout(() => {
        setNoAnim(true);
        setIndex(0);
      }, 520); // after the 500ms slide finishes
      return () => clearTimeout(t);
    }
  }, [index, total]);

  return (
    <section id="reviews" className="relative py-24 md:py-36 bg-bg overflow-hidden">
      {/* decorative blobs + sparkles (simplified) */}
      <div className="absolute inset-0 hero-stripes pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[-5%] right-[-5%] w-125 h-125 rounded-[40%_60%_70%_30%/40%_50%_60%_50%]"
          style={{ background: "radial-gradient(ellipse, var(--color-lavender) 0%, var(--color-sky) 50%, transparent 70%)", opacity: 0.25 }}
        />
        <div
          className="absolute bottom-[-10%] left-[-8%] w-100 h-100 rounded-[60%_40%_30%_70%/60%_30%_70%_40%]"
          style={{ background: "radial-gradient(ellipse, var(--color-sky) 0%, var(--color-lavender-light) 50%, transparent 70%)", opacity: 0.25 }}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-5 relative z-10 max-w-6xl">
        {/* header */}
        <div className="text-center mb-16 md:mb-20">
          <div className="mb-4">
            <span className="inline-block py-1 px-3 rounded-full bg-white border border-border text-[10px] tracking-widest uppercase text-ink-muted shadow-sm">
              Отзывы
            </span>
          </div>
          <div className="relative inline-block">
            <img alt="" loading="lazy" className="object-contain" width={200} height={100} src="/books/watercolors/ribbon1.webp" />
            <h2 className="font-display text-5xl md:text-7xl text-ink leading-tight relative inline-block">
              <span className="block mb-1 text-ink-muted/50 text-5xl md:text-5xl font-hand -rotate-2 origin-bottom-left font-bold">
                Что говорят
              </span>
              Счастливые{" "}
              <span className="relative inline-block">
                <span className="italic text-lavender-muted">семьи</span>
                <svg className="absolute w-[115%] h-5 -bottom-2 -left-[7%] text-lavender pointer-events-none" viewBox="0 0 100 20" preserveAspectRatio="none">
                  <path d="M0 12 Q 25 2 50 12 T 100 12" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.35" />
                </svg>
              </span>
            </h2>
          </div>
        </div>

        {/* carousel */}
        <div className="relative">
          <NavButton side="left" onClick={() => (index === 0 ? goTo(total - 1) : goTo(index - 1))} />
          <NavButton side="right" onClick={next} />

          <div
            className="overflow-hidden px-2 sm:px-5 md:px-16"
            style={{
              maskImage: "linear-gradient(to right, transparent, black 4%, black 96%, transparent)",
              WebkitMaskImage: "linear-gradient(to right, transparent, black 4%, black 96%, transparent)",
            }}
          >
            <div
              className={`flex ${noAnim ? "" : "transition-transform duration-500 ease-out"}`}
              style={{ transform: `translate3d(calc(${index} * -50%), 0, 0)` }}
            >
              {loop.map((r, i) => (
                <div key={i} className="mx-2 min-w-0 flex-[0_0_50%] pt-6 pb-4 sm:mx-3 md:mx-4">
                  <ReviewCard {...r} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* dots */}
        <div className="mt-6 flex items-center justify-center gap-2">
          {reviews.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                i === index % total ? "w-8 bg-ink" : "w-2 bg-ink/20 hover:bg-ink/40"
              }`}
            />
          ))}
        </div>

        <div className="mt-12 flex items-center justify-center gap-5">
          <div className="h-px flex-1 max-w-24 bg-linear-to-r from-transparent to-border" />
          <div className="flex items-center gap-4 text-sm text-ink-muted">
            <div className="flex -space-x-2.5">
              {["Е", "Д", "А", "О"].map((l) => (
                <div key={l} className="w-7 h-7 rounded-full border-2 border-bg bg-white flex items-center justify-center text-[10px] font-display font-semibold text-ink-muted shadow-sm">
                  {l}
                </div>
              ))}
            </div>
            <p className="font-body">
              Уже <span className="font-bold text-ink">500+</span> историй
            </p>
          </div>
          <div className="h-px flex-1 max-w-24 bg-linear-to-l from-transparent to-border" />
        </div>
      </div>
    </section>
  );
}

function ReviewCard({
  text,
  name,
  role,
  tape,
  radius,
  radiusBg,
}: {
  text: string;
  name: string;
  role: string;
  tape: { left: string; rot: number; color: string };
  radius: string;
  radiusBg: string;
}) {
  return (
    <div className="group relative cursor-default">
      <div
        className={`absolute -top-3.5 z-20 h-6 w-20 ${tape.color} shadow-md pointer-events-none`}
        style={{ left: tape.left, transform: `rotate(${tape.rot}deg)`, borderRadius: "2px" }}
      />
      <div className={`absolute inset-0 bg-ink/8 ${radiusBg} translate-x-2 translate-y-3 transition-transform duration-500 group-hover:translate-x-3.5 group-hover:translate-y-4`} />
      <div className={`relative bg-white ${radius} overflow-hidden border border-border-light/50 p-6 transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-xl group-hover:shadow-ink/5 sm:p-8 md:p-9`}>
        <div className="relative z-10">
          <div className="flex gap-1 mb-5">
            {[0, 1, 2, 3, 4].map((s) => (
              <svg key={s} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="fill-amber-400 text-amber-400">
                <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
              </svg>
            ))}
          </div>
          <p className="mb-4 font-body leading-relaxed text-ink">
            <span className="font-display text-3xl text-lavender/50 leading-none mr-1 select-none align-text-top">“</span>
            {text}
            <span className="font-display text-3xl text-lavender/50 leading-none ml-0.5 select-none align-text-bottom">”</span>
          </p>
          <div className="border-t border-border/30 pt-5 flex items-center justify-between">
            <div>
              <p className="font-display text-lg font-semibold text-ink leading-none">{name}</p>
              <p className="text-[11px] text-ink-muted mt-1 tracking-wide">{role}</p>
            </div>
            <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-lavender-muted opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110">
              <path d="M12 2 L14 9 L21 9 L15.5 13.5 L17.5 21 L12 16.5 L6.5 21 L8.5 13.5 L3 9 L10 9 Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const pos = side === "left" ? "left-0 md:-left-6" : "right-0 md:-right-6";
  return (
    <button
      onClick={onClick}
      aria-label={side === "left" ? "Предыдущий отзыв" : "Следующий отзыв"}
      className={`absolute top-1/2 -translate-y-1/2 z-30 hidden h-12 w-12 items-center justify-center rounded-full border border-border bg-white/95 text-ink shadow-lg transition-all hover:scale-110 hover:bg-white cursor-pointer md:flex ${pos}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {side === "left" ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
      </svg>
    </button>
  );
}
