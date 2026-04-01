"use client";

import { useState, useEffect } from "react";
import { useScroll } from "@react-three/drei";
import Link from "next/link";
import {
  Heart,
  ShoppingBag,
  Star,
  CheckCircle,
  Send,
  Baby,
  Quote,
  Sparkles,
  Palette,
  Box,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Gem,
  User,
} from "lucide-react";
import { decodeDesign } from "@/lib/serialization";
import { getCatalogBead } from "@/data/catalogBeads";
import { useAuth } from "@/lib/auth-provider";

/* ── Types ──────────────────────────────────────────────────────────────── */

interface Template {
  id: string;
  name: string;
  designCode: string;
  beadCount: number;
}

/* ── Section wrapper ────────────────────────────────────────────────────── */

function Section({
  children,
  className = "",
  id = "",
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`min-h-screen flex flex-col justify-center p-6 md:p-8 max-w-6xl mx-auto ${className}`}
    >
      {children}
    </section>
  );
}

/* ── Profile button (in nav) ──────────────────────────────────────────── */

function ProfileButton() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user) {
    return (
      <Link
        href="/profile"
        className="flex items-center gap-1.5 text-rose-500 hover:text-rose-600 transition-colors"
        title="Личный кабинет"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-xs font-semibold overflow-hidden">
          {user.image ? (
            <img src={user.image} alt="" className="w-full h-full object-cover" />
          ) : (
            (user.name ?? "U").charAt(0).toUpperCase()
          )}
        </div>
      </Link>
    );
  }

  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent("auth-required"))}
      className="flex items-center gap-1.5 text-gray-500 hover:text-rose-500 transition-colors"
      title="Войти"
    >
      <User size={20} />
    </button>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

function beadWord(n: number) {
  if (n % 10 === 1 && n % 100 !== 11) return "бусина";
  if (
    n % 10 >= 2 &&
    n % 10 <= 4 &&
    (n % 100 < 12 || n % 100 > 14)
  )
    return "бусины";
  return "бусин";
}

const MAX_PREVIEW = 8;
const FALLBACK = "#D1D5DB";

function getPreviewColors(designCode: string): string[] {
  try {
    const design = decodeDesign(designCode);
    const ids = design?.b ?? [];
    return ids.slice(0, MAX_PREVIEW).map(
      (id) => getCatalogBead(id)?.color ?? FALLBACK
    );
  } catch {
    return [];
  }
}

/* ── Material marquee data ──────────────────────────────────────────────── */

const MATERIALS = [
  { label: "Дерево", icon: Gem },
  { label: "Силикон", icon: Sparkles },
  { label: "Вязаные", icon: Box },
  { label: "Пластик", icon: Palette },
  { label: "Сферы", icon: CircleIcon },
  { label: "Звёзды", icon: Star },
  { label: "Сердечки", icon: Heart },
  { label: "Диски", icon: RotateCcw },
];

function CircleIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

/* ── Reviews ────────────────────────────────────────────────────────────── */

const reviews = [
  {
    name: "Анна С.",
    text: "Заказала держатель для пустышки с именем дочки. Получила очень быстро, бусины красивые и безопасные. Теперь не теряем пустышку!",
    product: "Держатель",
  },
  {
    name: "Мария В.",
    text: "Это гениально — можно собрать свой собственный держатель в 3D! Выбрала цвета под погремушку, заказала, результат превзошёл ожидания.",
    product: "Конструктор",
  },
  {
    name: "Елена П.",
    text: "Заказывала три держателя сразу — себе и подругам на выписку. Все в восторге! Отличный подарок для молодой мамы.",
    product: "Подарок",
  },
  {
    name: "Дарья К.",
    text: "Бусины качественные, нет запаха. Клипса держится крепко, не открывается сама. Дочка тянет в рот — всё безопасно.",
    product: "Качество",
  },
  {
    name: "Виктория М.",
    text: "Уже третий заказ! Каждый раз собираю новую комбинацию. Деревянные бусины — мои любимые, выглядят очень стильно.",
    product: "Постоянный клиент",
  },
  {
    name: "Ольга Т.",
    text: "Очень удобный конструктор — сразу видишь, как будет выглядеть изделие. Идеально для тех, кто любит всё продумать до мелочей.",
    product: "3D-редактор",
  },
  {
    name: "Анастасия Л.",
    text: "Заказала держатель на крещение — с крестиком и белыми бусинами. Получила много комплиментов в церкви!",
    product: "Держатель",
  },
  {
    name: "Юлия Б.",
    text: "Спасибо за индивидуальный подход! Помогли подобрать цвета под цветочек на коляске. Работа выполнена с душой.",
    product: "Сервис",
  },
  {
    name: "Кристина Ф.",
    text: "Брала в подарок племяннице — сборный браслет из бусин. Ребенок счастлив, родители в восторге от упаковки!",
    product: "Браслет",
  },
  {
    name: "Наталья Г.",
    text: "После стирки держатель выглядит как новый. Бусины не потускнели, нить не растянулась. Рекомендую!",
    product: "Качество",
  },
];

/* ── Review card ────────────────────────────────────────────────────────── */

const ReviewCard = ({ data }: { data: (typeof reviews)[0] }) => (
  <div className="w-80 flex-shrink-0 bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white mx-4 flex flex-col">
    <div className="flex justify-between items-start mb-4">
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={16} className="text-yellow-400 fill-yellow-400" />
        ))}
      </div>
      <Quote size={24} className="text-rose-200" />
    </div>
    <p className="text-gray-600 text-sm mb-4 italic flex-grow">
      &ldquo;{data.text}&rdquo;
    </p>
    <div className="mt-auto border-t border-gray-100 pt-3 flex justify-between items-center">
      <span className="font-bold text-gray-800 text-sm">{data.name}</span>
      <span className="text-xs text-rose-400 bg-rose-50 px-2 py-1 rounded-full">
        {data.product}
      </span>
    </div>
  </div>
);

/* ── Main overlay ───────────────────────────────────────────────────────── */

export function LandingOverlay() {
  const scroll = useScroll();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    requestType: "Держатель для пустышки",
    comment: "",
  });

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => (r.ok ? r.json() : []))
      .then(setTemplates)
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el && scroll.el) {
      const rect = el.getBoundingClientRect();
      scroll.el.scrollTo({
        top: rect.top + scroll.el.scrollTop - 100,
        behavior: "smooth",
      });
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const message = `Привет! Новая заявка с сайта Toy Designer:\n\nИмя: ${formData.name}\nИнтересует: ${formData.requestType}\nКомментарий: ${formData.comment}`;
    const url = `https://t.me/karinavoronova?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="w-full font-nunito">
      {/* Marquee animation */}
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 60s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 w-full p-4 md:p-6 flex justify-between items-center z-50 pointer-events-auto">
        <div className="text-2xl font-hand text-rose-500 drop-shadow-sm select-none flex items-center gap-2">
          <Baby size={32} />
          Toy Designer
        </div>
        <div className="hidden md:flex items-center gap-4 text-gray-700 font-semibold bg-white/50 backdrop-blur-sm px-6 py-2 rounded-full shadow-sm">
          <button
            onClick={() => scrollTo("about")}
            className="hover:text-rose-500 transition-colors"
          >
            О нас
          </button>
          <button
            onClick={() => scrollTo("gallery")}
            className="hover:text-rose-500 transition-colors"
          >
            Конструктор
          </button>
          <button
            onClick={() => scrollTo("reviews")}
            className="hover:text-rose-500 transition-colors"
          >
            Отзывы
          </button>
          <button
            onClick={() => scrollTo("contact")}
            className="hover:text-rose-500 transition-colors"
          >
            Контакты
          </button>
          <ProfileButton />
        </div>
        <div className="md:hidden flex items-center gap-2">
          <ProfileButton />
          <button
            onClick={() => scrollTo("contact")}
            className="text-rose-500 font-bold text-sm bg-white/80 px-4 py-2 rounded-full shadow-sm"
          >
            Связаться
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <Section id="home">
        <div className="w-full md:w-1/2">
          <h1 className="text-5xl md:text-7xl font-hand text-rose-500 mb-6 drop-shadow-md leading-tight">
            Бусины
            <br />
            для крохи
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-md font-medium leading-relaxed">
            <b className="text-gray-800">Toy Designer</b> — конструктор
            держателей для пустышек из бусин. Соберите уникальное изделие
            в 3D-редакторе или выберите из готовых шаблонов.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pointer-events-auto">
            <Link
              href="/editor"
              className="px-8 py-3 bg-rose-500 text-white rounded-full font-bold shadow-lg hover:bg-rose-600 hover:scale-105 transition-all flex items-center justify-center gap-2"
            >
              <Heart size={20} fill="currentColor" />
              Собрать свой
            </Link>
            <button
              onClick={() => scrollTo("gallery")}
              className="px-8 py-3 bg-white text-rose-500 rounded-full font-bold shadow-md hover:bg-rose-50 transition-all text-center"
            >
              Готовые шаблоны
            </button>
          </div>
        </div>
      </Section>

      {/* ── ABOUT ── */}
      <Section id="about" className="items-end text-right">
        <div className="w-full md:w-1/2 bg-white/60 backdrop-blur-sm p-6 md:p-8 rounded-3xl shadow-xl border border-white/50">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">
            С заботой о малыше
          </h2>
          <p className="text-lg text-gray-700 mb-4">
            Каждый держатель собирается из безопасных материалов — дерево,
            силикон, гипоаллергенный пластик. Нить крепкая, клипса надёжная.
            Создаю вещи, которые радуют глаз и не вредят здоровью.
          </p>
          <ul className="space-y-3 text-gray-600">
            <li className="flex items-center justify-end gap-3">
              <span>Деревянные и силиконовые бусины</span>
              <CheckCircle size={20} className="text-green-500" />
            </li>
            <li className="flex items-center justify-end gap-3">
              <span>Реалистичный 3D-конструктор</span>
              <Sparkles size={20} className="text-yellow-500" />
            </li>
            <li className="flex items-center justify-end gap-3">
              <span>100+ вариантов бусин</span>
              <Palette size={20} className="text-rose-500" />
            </li>
          </ul>
        </div>
      </Section>

      {/* ── GALLERY — шаблоны ── */}
      <Section id="gallery">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-12 bg-white/40 backdrop-blur-sm inline-block mx-auto px-8 py-2 rounded-full">
          Шаблоны
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pointer-events-auto pb-10">
          {/* Blank card */}
          <Link href="/editor" className="contents">
            <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl shadow-xl hover:scale-[1.03] transition-transform duration-300 flex flex-col h-full min-h-[170px] justify-center items-center gap-3 border-2 border-dashed border-rose-300 hover:border-rose-400 cursor-pointer">
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center">
                <Sparkles size={24} className="text-rose-400" />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-gray-800 text-sm">
                  Начать с нуля
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Собрать в конструкторе
                </p>
              </div>
            </div>
          </Link>

          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-md animate-pulse h-[170px]"
                />
              ))
            : templates.map((t) => {
                const colors = getPreviewColors(t.designCode);
                return (
                  <Link key={t.id} href={`/design/${t.designCode}`} className="contents">
                    <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl shadow-xl hover:scale-[1.03] hover:shadow-2xl transition-all duration-300 flex flex-col cursor-pointer">
                      {/* Bead preview dots */}
                      <div className="flex items-center gap-1.5 flex-wrap min-h-[22px] mb-3">
                        {colors.map((c, i) => (
                          <span
                            key={i}
                            className="block w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <h3 className="font-bold text-gray-800 text-sm leading-tight line-clamp-2">
                        {t.name}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">
                        {t.beadCount} {beadWord(t.beadCount)}
                      </p>
                      <button className="mt-auto pt-3 w-full py-2 bg-rose-400 text-white rounded-lg font-bold text-xs hover:bg-rose-500 transition-colors flex items-center justify-center gap-1.5">
                        <ShoppingBag size={14} />
                        Заказать
                      </button>
                    </div>
                  </Link>
                );
              })}
        </div>
      </Section>

      {/* ── MATERIAL MARQUEE ── */}
      <Section
        id="materials"
        className="!min-h-[50vh] items-center overflow-hidden !p-0"
      >
        <div className="py-12 w-full">
          <div className="relative w-full overflow-hidden pointer-events-auto">
            <div className="flex w-max animate-marquee">
              {[...MATERIALS, ...MATERIALS, ...MATERIALS, ...MATERIALS].map(
                (m, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 mx-6 bg-white/50 backdrop-blur-sm px-5 py-2.5 rounded-full shadow-sm"
                  >
                    <m.icon size={18} className="text-rose-400" />
                    <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">
                      {m.label}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* ── REVIEWS ── */}
      <Section id="reviews" className="overflow-hidden !p-0">
        <div className="py-20 w-full">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-12 bg-white/40 backdrop-blur-sm inline-block mx-auto px-8 py-2 rounded-full relative z-10 left-1/2 -translate-x-1/2">
            Отзывы мамочек
          </h2>
          <div className="relative w-full overflow-hidden pointer-events-auto">
            <div className="flex w-max animate-marquee">
              {[...reviews, ...reviews].map((review, i) => (
                <ReviewCard key={i} data={review} />
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ── CONTACT ── */}
      <Section id="contact" className="items-center">
        <div className="w-full max-w-4xl bg-white/80 backdrop-blur-xl p-4 md:p-10 rounded-3xl shadow-2xl flex flex-col md:flex-row gap-10">
          <div className="flex-1 space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800">
              Свяжитесь со мной
            </h2>
            <p className="text-gray-600">
              Понравился шаблон или есть своя идея? Заполните форму — обсудим
              детали в&nbsp;Телеграм!
            </p>
            <div className="space-y-4 pt-4">
              <a
                href="https://t.me/karinavoronova"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-4 text-gray-700 hover:text-rose-600 transition-colors"
              >
                <div className="bg-rose-100 p-3 rounded-full">
                  <Send size={24} />
                </div>
                <span className="font-semibold">@karinavoronova</span>
              </a>
            </div>
          </div>

          <div className="flex-1 bg-white p-6 rounded-2xl shadow-lg border border-rose-100 pointer-events-auto">
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  Ваше имя
                </label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  type="text"
                  required
                  className="w-full p-3 rounded-lg bg-gray-50 text-gray-900 border-2 border-rose-100 focus:border-rose-400 outline-none transition-colors placeholder:text-gray-400"
                  placeholder="Ваше имя"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  Что вас интересует?
                </label>
                <select
                  name="requestType"
                  value={formData.requestType}
                  onChange={handleInputChange}
                  className="w-full p-3 rounded-lg bg-gray-50 text-gray-900 border-2 border-rose-100 focus:border-rose-400 outline-none transition-colors"
                >
                  <option>Держатель для пустышки</option>
                  <option>Браслет из бусин</option>
                  <option>Подвеска</option>
                  <option>Свой вариант из конструктора</option>
                  <option>Индивидуальный заказ</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  Комментарий
                </label>
                <textarea
                  name="comment"
                  value={formData.comment}
                  onChange={handleInputChange}
                  className="w-full p-3 rounded-lg bg-gray-50 text-gray-900 border-2 border-rose-100 focus:border-rose-400 outline-none transition-colors h-24 resize-none placeholder:text-gray-400"
                  placeholder="Цвет, размер или вопросы..."
                />
              </div>
              <button
                type="submit"
                className="w-full bg-rose-500 text-white py-3 rounded-lg font-bold shadow-md hover:bg-rose-600 transition-colors flex items-center justify-center gap-2"
              >
                <Send size={18} />
                Отправить в Telegram
              </button>
            </form>
          </div>
        </div>
      </Section>

      {/* ── FOOTER ── */}
      <footer className="w-full text-center p-6 text-gray-400 text-sm pb-16">
        &copy; {new Date().getFullYear()} Toy Designer&ensp;&middot;&ensp;Конструктор
        игрушек из бусин
      </footer>
    </div>
  );
}
