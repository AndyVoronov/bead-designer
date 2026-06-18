"use client";

import { useState, useRef, useEffect } from "react";

/**
 * FAQ section for /books — sketch-card styled accordion cards
 * (matches momomoments.ru FAQ cards: rounded sketch border, "+" toggle).
 */

const faqData = [
  {
    q: "Как создаётся персонализированная книга?",
    a: "Оформляя заказ, вы загружаете фотографии — одну или несколько в зависимости от количества героев в сюжете. Вместе с фотографией необходимо заполнить простую анкету, указав имя будущего персонажа, цвет глаз и волос.\n\nСервис предложит выбрать один из вариантов изображений для обложки и разворотов, так что вы сможете добавить в книгу именно те иллюстрации, которые вам больше понравятся.\n\nКак только изображения будут выбраны, вы получите электронную версию книги на указанную почту. Если во время оформления заказа вы не отказались от печатной версии, то макет будет автоматически отправлен в печать.",
  },
  {
    q: "Безопасно ли загружать фотографии?",
    a: "Абсолютно безопасно. Мы используем фотографии только для создания будущих персонажей. Все данные шифруются, фотографии не передаются третьим лицам и автоматически удаляются после завершения процесса.",
  },
  {
    q: "Сколько времени занимает создание книги?",
    a: "Процесс создания книги со всеми иллюстрациями занимает в среднем около 30 минут, если нет повышенной загруженности сервиса. Вы получите уведомление, когда книга будет готова к чтению.",
  },
  {
    q: "Для какого возраста подходят истории?",
    a: "Наши рассказы подходят для всей семьи, в том числе для детей до 12 лет. У каждой истории указан рекомендуемый возраст, чтобы текст был понятным и интересным для ребёнка. А также есть сюжеты, в которых участвуют сразу два персонажа.",
  },
  {
    q: "Можно ли не печатать книгу?",
    a: "Можно. В процессе оформления заказа вы сможете отказаться от печатной версии книги и оплатить только электронную версию.",
  },
  {
    q: "Как работает кнопка «Попробовать»?",
    a: "Кнопка «Попробовать» — это возможность увидеть демо-иллюстрацию с именем ребёнка и персонажем, созданным на основе его фото. Для получения полноценной книги в высоком качестве и без ограничений нужно оформить заказ, выбрав подходящий сюжет из каталога историй.",
  },
  {
    q: "Можно ли редактировать готовую книгу?",
    a: "Во время создания иллюстраций вы сможете выбирать понравившиеся изображения из нескольких вариантов для обложки и разворотов будущей книги. В текст истории будет интегрировано указанное вами имя. Изменить сюжет рассказа нельзя.",
  },
  {
    q: "Когда я получу напечатанную книгу?",
    a: "Если вы не отказались от печатной версии книги при оформлении заказа, то макет отправится в печать автоматически после того, как вы завершите выбор понравившихся иллюстраций. Печать и доставка обычно занимают от 5 до 10 дней в зависимости от транспортной компании и региона.\n\nЧтобы успеть к конкретной дате, оформляйте заказ заблаговременно — желательно за 14 дней.",
  },
];

const sketch = [
  "sketch-card-1",
  "sketch-card-2",
  "sketch-card-3",
  "sketch-card-4",
];

export default function BooksFaq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 md:py-32 relative overflow-hidden">
      <div
        className="absolute top-0 right-0 w-[30rem] h-[30rem] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, var(--color-sky) 0%, transparent 70%)", opacity: 0.08 }}
      />
      <div
        className="absolute bottom-0 left-0 w-[30rem] h-[30rem] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, var(--color-lavender) 0%, transparent 70%)", opacity: 0.08 }}
      />
      <div className="container mx-auto px-5 max-w-4xl relative z-10">
        <div className="text-center mb-16 md:mb-20">
          <span className="inline-block py-1 px-3 rounded-full bg-white border border-border text-[10px] tracking-widest uppercase text-ink-muted mb-4 shadow-sm">
            FAQ
          </span>
          <h2 className="font-display text-5xl md:text-7xl text-ink leading-tight mb-6">
            Ответы на{" "}
            <span className="relative inline-block">
              <span className="italic text-lavender-muted">вопросы</span>
              <svg
                className="absolute w-[115%] h-4 -bottom-1 -left-[7%] text-lavender pointer-events-none"
                viewBox="0 0 100 12"
                preserveAspectRatio="none"
              >
                <path
                  d="M2 6 C15 2, 30 10, 50 6 C70 2, 85 10, 98 6"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  opacity="0.4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h2>
        </div>

        <div className="space-y-5">
          {faqData.map((item, i) => (
            <FaqCard
              key={i}
              q={item.q}
              a={item.a}
              sketchClass={sketch[i % sketch.length]}
              isOpen={open === i}
              onToggle={() => setOpen((prev) => (prev === i ? null : i))}
            />
          ))}
        </div>

        <div className="mt-16 text-center">
          <a href="#">
            <div className="inline-flex items-center gap-3 p-1 pl-1.5 pr-4 bg-white border border-border rounded-full shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
              <div className="w-8 h-8 rounded-full bg-lavender-light flex items-center justify-center text-ink-light group-hover:scale-110 transition-transform">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />
                </svg>
              </div>
              <span className="text-sm font-medium text-ink-muted group-hover:text-ink transition-colors">
                Не нашли ответ?{" "}
                <span className="text-ink underline decoration-dashed underline-offset-4 decoration-ink/30 group-hover:decoration-ink">
                  Напишите нам
                </span>
              </span>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}

function FaqCard({
  q,
  a,
  sketchClass,
  isOpen,
  onToggle,
}: {
  q: string;
  a: string;
  sketchClass: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    // measure the inner scroll height
    const inner = el.firstElementChild as HTMLElement | null;
    setHeight(isOpen && inner ? inner.scrollHeight : 0);
  }, [isOpen]);

  return (
    <div
      className={`group overflow-hidden transition-all duration-300 border-[2.5px] ${sketchClass} bg-white/60 border-ink/20 ${
        isOpen ? "bg-white border-ink/35" : "hover:bg-white hover:border-ink/35"
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 md:p-7 text-left cursor-pointer focus:outline-none"
      >
        <span className="flex items-center gap-3">
          <span
            className={`font-display text-lg md:text-xl font-bold transition-colors ${
              isOpen ? "text-ink" : "text-ink/80 group-hover:text-ink"
            }`}
          >
            {q}
          </span>
        </span>
        <div
          className={`shrink-0 ml-4 w-10 h-10 flex items-center justify-center transition-all duration-300 border-2 bg-white border-ink/30 group-hover:border-ink/50 ${
            isOpen ? "bg-ink border-ink" : ""
          }`}
          style={{ borderRadius: "255px 15px 225px / 15px 225px 15px 255px" }}
        >
          <span
            className={`text-xl font-hand leading-none select-none transition-transform duration-300 ${
              isOpen ? "rotate-45 text-white" : "text-ink-muted"
            }`}
          >
            +
          </span>
        </div>
      </button>
      <div
        ref={contentRef}
        className="transition-all duration-300 ease-out"
        style={{ height: `${height}px` }}
      >
        <div className="px-5 md:px-7 pb-7 pt-0">
          <div className="h-0 w-full border-t-2 border-dashed border-ink/15 mb-5" />
          <div className="text-ink-muted leading-relaxed text-base md:text-lg pl-9 space-y-3">
            {a.split("\n\n").map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
