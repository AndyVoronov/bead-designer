"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
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
  Gem,
  User,
  Package,
  Truck,
  CreditCard,
  HelpCircle,
  Info,
} from "lucide-react";
import { decodeDesign } from "@/lib/serialization";
import { getCatalogBead } from "@/data/catalogBeads";
import { useToast } from "@/components/ui/ToastProvider";
import { useCartCount } from "@/hooks/useCartCount";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { getEffectivePrice, formatPrice } from "@/lib/catalog-utils";

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
      className={`min-h-screen flex flex-col justify-center p-6 md:p-8 max-w-6xl mx-auto scroll-mt-20 ${className}`}
    >
      {children}
    </section>
  );
}

/* ── Profile button (in nav) ──────────────────────────────────────────── */

// NOTE: This component renders inside R3F Canvas (not DOM tree),
// so useAuth() doesn't work here. We fetch session directly.

function ProfileButton() {
  const [user, setUser] = useState<{ id: string; name: string | null; email: string | null; image: string | null } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/csrf")
      .then((res) => res.json())
      .then((data) => setCsrfToken(data.csrfToken))
      .catch(() => {});

    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => setUser(data.user))
      .catch(() => {});
  }, []);

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  if (user) {
    return (
      <div ref={menuRef} className="relative">
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
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
          className="ml-1 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          aria-label="Меню"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
            <a
              href="/profile"
              className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Мой профиль
            </a>
            <form
              action="/api/auth/signout"
              method="POST"
              style={{ display: "contents" }}
            >
              <input type="hidden" name="csrfToken" value={csrfToken} />
              <button
                type="submit"
                className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
              >
                Выйти
              </button>
            </form>
          </div>
        )}
      </div>
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

const FALLBACK_REVIEWS = [
  {
    name: "Анна С.",
    text: "Заказала держатель для пустышки с именем дочки. Получила очень быстро, бусины красивые и безопасные. Теперь не теряем пустышку!",
    product: "Держатель",
    rating: 5,
  },
  {
    name: "Мария В.",
    text: "Это гениально — можно собрать свой собственный держатель в 3D! Выбрала цвета под погремушку, заказала, результат превзошёл ожидания.",
    product: "Конструктор",
    rating: 5,
  },
  {
    name: "Елена П.",
    text: "Заказывала три держателя сразу — себе и подругам на выписку. Все в восторге! Отличный подарок для молодой мамы.",
    product: "Подарок",
    rating: 5,
  },
  {
    name: "Дарья К.",
    text: "Бусины качественные, нет запаха. Клипса держится крепко, не открывается сама. Дочка тянет в рот — всё безопасно.",
    product: "Качество",
    rating: 5,
  },
  {
    name: "Виктория М.",
    text: "Уже третий заказ! Каждый раз собираю новую комбинацию. Деревянные бусины — мои любимые, выглядят очень стильно.",
    product: "Постоянный клиент",
    rating: 5,
  },
  {
    name: "Ольга Т.",
    text: "Очень удобный конструктор — сразу видишь, как будет выглядеть изделие. Идеально для тех, кто любит всё продумать до мелочей.",
    product: "3D-редактор",
    rating: 5,
  },
  {
    name: "Анастасия Л.",
    text: "Заказала держатель на крещение — с крестиком и белыми бусинами. Получила много комплиментов в церкви!",
    product: "Держатель",
    rating: 5,
  },
  {
    name: "Юлия Б.",
    text: "Спасибо за индивидуальный подход! Помогли подобрать цвета под цветочек на коляске. Работа выполнена с душой.",
    product: "Сервис",
    rating: 5,
  },
  {
    name: "Кристина Ф.",
    text: "Брала в подарок племяннице — сборный браслет из бусин. Ребенок счастлив, родители в восторге от упаковки!",
    product: "Браслет",
    rating: 5,
  },
  {
    name: "Наталья Г.",
    text: "После стирки держатель выглядит как новый. Бусины не потускнели, нить не растянулась. Рекомендую!",
    product: "Качество",
    rating: 5,
  },
];

interface DbReview {
  id: number;
  authorName: string;
  rating: number;
  text: string;
  product: { id: number; name: string; slug: string } | null;
}

/* ── Review card ────────────────────────────────────────────────────────── */

const ReviewCard = ({ data, fallback }: { data: DbReview; fallback?: boolean }) => (
  <div className="w-80 flex-shrink-0 bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white mx-4 flex flex-col">
    <div className="flex justify-between items-start mb-4">
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={16} className={i < data.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"} />
        ))}
      </div>
      <Quote size={24} className="text-rose-200" />
    </div>
    <p className="text-gray-600 text-sm mb-4 italic flex-grow">
      &ldquo;{data.text}&rdquo;
    </p>
    <div className="mt-auto border-t border-gray-100 pt-3 flex justify-between items-center">
      <span className="font-bold text-gray-800 text-sm">{data.authorName}</span>
      <span className="text-xs text-rose-400 bg-rose-50 px-2 py-1 rounded-full">
        {data.product?.name || (fallback ? (data as unknown as { product: string }).product : "")}
      </span>
    </div>
  </div>
);

/* ── Review form ───────────────────────────────────────────────────────── */

function ReviewForm() {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => setLoggedIn(!!s?.user?.id))
      .catch(() => setLoggedIn(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0 || text.trim().length < 5) return;
    setSubmitting(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, text: text.trim(), categoryId: null }),
      });
      if (res.ok) {
        setStatus("success");
        setRating(0);
        setText("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pointer-events-auto w-full max-w-lg mx-auto mt-12 px-6">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white p-6">
        <h3 className="font-semibold text-gray-800 text-center mb-4">
          Оставить свой отзыв
        </h3>

        {loggedIn === false && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 mb-3">Войдите, чтобы оставить отзыв</p>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("auth-required"))}
              className="px-4 py-2 bg-rose-500 text-white text-sm font-medium rounded-xl hover:bg-rose-600 transition-colors cursor-pointer"
            >
              Войти через Яндекс
            </button>
          </div>
        )}

        {loggedIn === true && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Star rating */}
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-0.5 cursor-pointer bg-transparent border-none"
                  aria-label={`${star} звезда`}
                >
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill={(hoverRating || rating) >= star ? "#f59e0b" : "none"}
                    stroke={(hoverRating || rating) >= star ? "#f59e0b" : "#d1d5db"}
                    strokeWidth="2"
                    className="transition-colors"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </button>
              ))}
            </div>

            {/* Text */}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Расскажите о вашем опыте..."
              rows={3}
              maxLength={1000}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent placeholder:text-gray-400"
            />

            {/* Submit */}
            <button
              type="submit"
              disabled={rating === 0 || text.trim().length < 5 || submitting}
              className="w-full py-2.5 bg-rose-500 text-white font-medium rounded-xl text-sm hover:bg-rose-600 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
            >
              {submitting ? "Отправка..." : "Отправить отзыв"}
            </button>

            {status === "success" && (
              <p className="text-center text-sm text-emerald-600">
                Спасибо! Ваш отзыв отправлен и появится после модерации.
              </p>
            )}
            {status === "error" && (
              <p className="text-center text-sm text-red-500">
                Ошибка отправки. Попробуйте ещё раз.
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

/* ── Newsletter Form ──────────────────────────────────────────────────── */

function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [promoCode, setPromoCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setStatus("loading");
    fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, source: "footer" }),
    })
      .then((r) => (r.ok ? "success" : "error"))
      .then((s) => {
        setStatus(s);
        if (s === "success") {
          // Generate promo code
          fetch("/api/admin/promo-codes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: `NEWS${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
              scope: "cart",
              discountPercent: 5,
              description: "Скидка 5% за подписку",
              isActive: true,
              maxUses: 100,
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            }),
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (d?.code) setPromoCode(d.code); })
            .catch(() => {});
        }
      })
      .catch(() => setStatus("error"));
  };

  if (status === "success") {
    return (
      <div className="pointer-events-none">
        <p className="text-sm text-emerald-600 font-medium">
          Спасибо за подписку!
          {promoCode && (
            <span className="text-rose-500 ml-1">Промокод: <strong>{promoCode}</strong></span>
          )}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full sm:w-auto pointer-events-auto">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
        className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent placeholder:text-gray-400"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="px-4 py-2 bg-rose-500 text-white text-sm font-medium rounded-xl hover:bg-rose-600 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
      >
        {status === "loading" ? "..." : "OK"}
      </button>
    </form>
  );
}

/* ── Main overlay ───────────────────────────────────────────────────────── */

export function LandingOverlay() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [products, setProducts] = useState<Array<{
    id: number; name: string; slug: string; basePrice: number;
    discountPercent: number; mainImage: { id: number; url: string } | null;
    badges: Array<{ label: string; textColor: string; bgColor: string }>;
  }>>([]);
  const [cartCount, setCartCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dbReviews, setDbReviews] = useState<DbReview[]>([]);
  const [searchResults, setSearchResults] = useState<Array<{
    id: number; name: string; slug: string; basePrice: number;
    discountPercent: number; mainImage: { id: number; url: string } | null;
  }>>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addingProductId, setAddingProductId] = useState<number | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { items: recentlyViewed } = useRecentlyViewed();
  const [formData, setFormData] = useState({
    name: "",
    requestType: "Держатель для пустышки",
    comment: "",
  });

  // Lazy load: products only when catalog section is near viewport
  const [productsLoaded, setProductsLoaded] = useState(false);
  const catalogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (productsLoaded) return;
    const el = catalogRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setProductsLoaded(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [productsLoaded]);

  // Load products when section becomes visible
  useEffect(() => {
    if (!productsLoaded) return;
    fetch("/api/products?limit=6&sort=newest")
      .then((r) => (r.ok ? r.json() : { products: [] }))
      .then((data) => setProducts(data.products ?? []))
      .catch(() => {});
  }, [productsLoaded]);

  useEffect(() => {
    Promise.all([
      fetch("/api/templates")
        .then((r) => (r.ok ? r.json() : []))
        .then(setTemplates)
        .catch(() => setTemplates([])),
      fetch("/api/cart?count=1")
        .then((r) => (r.ok ? r.json() : { count: 0 }))
        .then((data) => setCartCount(data.count ?? 0))
        .catch(() => {}),
      fetch("/api/reviews")
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setDbReviews(data);
          }
        })
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const { refetch: refetchCart } = useCartCount();
  const toastCtx = useToast();

  const handleLandingAddToCart = async (productId: number) => {
    setAddingProductId(productId);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      if (!res.ok) throw new Error();
      toastCtx.success("Товар добавлен в корзину");
      refetchCart();
    } catch {
      toastCtx.error("Не удалось добавить в корзину");
    } finally {
      setAddingProductId(null);
    }
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const message = `Привет! Новая заявка с сайта 5 минут тишины:\n\nИмя: ${formData.name}\nИнтересует: ${formData.requestType}\nКомментарий: ${formData.comment}`;
    const url = `https://t.me/karinavoronova?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Search with debounce
  useEffect(() => {
    if (!searchOpen) return;
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setSearchLoading(true);
      fetch(`/api/products?search=${encodeURIComponent(searchQuery)}&limit=5`)
        .then((r) => (r.ok ? r.json() : { products: [] }))
        .then((data) => setSearchResults(data.products ?? []))
        .catch(() => setSearchResults([]))
        .finally(() => setSearchLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchOpen]);

  // Close search on click outside
  useEffect(() => {
    if (!searchOpen) return;
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [searchOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

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
          5 минут тишины
        </div>
        <div className="hidden md:flex items-center gap-4 text-gray-700 font-semibold bg-white/50 backdrop-blur-sm px-6 py-2 rounded-full shadow-sm">
          <button
            onClick={() => scrollTo("about")}
            className="hover:text-rose-500 transition-colors"
          >
            О нас
          </button>
          <button
            onClick={() => scrollTo("catalog")}
            className="hover:text-rose-500 transition-colors"
          >
            Каталог
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
          {/* Search button */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="text-gray-500 hover:text-rose-500 transition-colors p-0.5 cursor-pointer"
            aria-label="Поиск"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          <Link
            href="/cart"
            className="relative flex items-center text-gray-500 hover:text-rose-500 transition-colors"
            title="Корзина"
          >
            <ShoppingBag size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
        <div className="md:hidden flex items-center gap-3">
          <ProfileButton />
          <Link
            href="/cart"
            className="relative flex items-center text-gray-500 hover:text-rose-500 transition-colors"
            title="Корзина"
          >
            <ShoppingBag size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-gray-600 hover:text-rose-500 transition-colors p-1"
            aria-label="Меню"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {mobileMenuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* ── SEARCH DROPDOWN ── */}
      {searchOpen && (
        <div ref={searchRef} className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-lg pointer-events-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="p-3 border-b border-gray-100">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Найти товар..."
                className="w-full px-4 py-2.5 text-sm border-0 focus:outline-none focus:ring-0 bg-transparent placeholder:text-gray-400"
                autoFocus
              />
            </div>
            {searchLoading && (
              <div className="p-4 text-center text-sm text-gray-400">Поиск...</div>
            )}
            {!searchLoading && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="p-4 text-center text-sm text-gray-400">Ничего не найдено</div>
            )}
            {!searchLoading && searchResults.length > 0 && (
              <div className="max-h-80 overflow-y-auto">
                {searchResults.map((p) => {
                  const price = p.discountPercent > 0
                    ? Math.round(p.basePrice * (1 - p.discountPercent / 100))
                    : p.basePrice;
                  return (
                    <Link
                      key={p.id}
                      href={`/catalog/${p.slug}`}
                      onClick={() => setSearchOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      {p.mainImage ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0 relative">
                          <Image src={`/api${p.mainImage.url}`} alt="" fill className="object-cover" sizes="40px" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center">
                          <Baby size={16} className="text-gray-300" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                        <p className="text-xs text-gray-400">{price.toLocaleString("ru-RU")} &#8381;</p>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                    </Link>
                  );
                })}
                <Link
                  href={`/catalog?search=${encodeURIComponent(searchQuery)}`}
                  onClick={() => setSearchOpen(false)}
                  className="block text-center text-sm text-rose-500 font-medium py-3 border-t border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  Все результаты
                </Link>
              </div>
            )}
            {searchQuery.length < 2 && (
              <div className="p-4 text-center text-sm text-gray-400">Введите минимум 2 символа</div>
            )}
          </div>
        </div>
      )}

      {/* ── MOBILE MENU DROPDOWN ── */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-white/90 backdrop-blur-lg border-b border-gray-100 shadow-lg pointer-events-auto">
          <div className="flex flex-col p-4 gap-1">
            <Link href="/catalog" className="flex items-center gap-3 text-gray-700 font-semibold hover:text-rose-500 transition-colors py-2.5 px-2 rounded-xl hover:bg-rose-50" onClick={() => setMobileMenuOpen(false)}>
              <Package size={18} className="text-rose-400" />
              Каталог
            </Link>
            <button onClick={() => { setSearchOpen(true); setMobileMenuOpen(false); }} className="flex items-center gap-3 text-gray-700 font-semibold hover:text-rose-500 transition-colors py-2.5 px-2 rounded-xl hover:bg-rose-50 text-left w-full cursor-pointer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-400"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              Поиск
            </button>
            <button onClick={() => { scrollTo("about"); setMobileMenuOpen(false); }} className="flex items-center gap-3 text-gray-700 font-semibold hover:text-rose-500 transition-colors py-2.5 px-2 rounded-xl hover:bg-rose-50 text-left w-full cursor-pointer">
              <Info size={18} className="text-rose-400" />
              О нас
            </button>
            <Link href="/delivery" className="flex items-center gap-3 text-gray-700 font-semibold hover:text-rose-500 transition-colors py-2.5 px-2 rounded-xl hover:bg-rose-50" onClick={() => setMobileMenuOpen(false)}>
              <Truck size={18} className="text-rose-400" />
              Доставка
            </Link>
            <button onClick={() => { scrollTo("gallery"); setMobileMenuOpen(false); }} className="flex items-center gap-3 text-gray-700 font-semibold hover:text-rose-500 transition-colors py-2.5 px-2 rounded-xl hover:bg-rose-50 text-left w-full cursor-pointer">
              <Sparkles size={18} className="text-rose-400" />
              Шаблоны
            </button>
            <button onClick={() => { scrollTo("reviews"); setMobileMenuOpen(false); }} className="flex items-center gap-3 text-gray-700 font-semibold hover:text-rose-500 transition-colors py-2.5 px-2 rounded-xl hover:bg-rose-50 text-left w-full cursor-pointer">
              <Star size={18} className="text-rose-400" />
              Отзывы
            </button>
            <Link href="/faq" className="flex items-center gap-3 text-gray-700 font-semibold hover:text-rose-500 transition-colors py-2.5 px-2 rounded-xl hover:bg-rose-50" onClick={() => setMobileMenuOpen(false)}>
              <HelpCircle size={18} className="text-rose-400" />
              Частые вопросы
            </Link>
            <Link href="/reviews" className="flex items-center gap-3 text-gray-700 font-semibold hover:text-rose-500 transition-colors py-2.5 px-2 rounded-xl hover:bg-rose-50" onClick={() => setMobileMenuOpen(false)}>
              <HelpCircle size={18} className="text-rose-400" />
              Отзывы
            </Link>
            <div className="border-t border-gray-100 mt-2 pt-2">
              <button onClick={() => { scrollTo("contact"); setMobileMenuOpen(false); }} className="flex items-center gap-3 text-gray-700 font-semibold hover:text-rose-500 transition-colors py-2.5 px-2 rounded-xl hover:bg-rose-50 text-left w-full cursor-pointer">
                <Send size={18} className="text-rose-400" />
                Контакты
              </button>
              <Link href="/editor" className="flex items-center gap-3 text-rose-500 font-bold hover:text-rose-600 transition-colors py-2.5 px-2 rounded-xl hover:bg-rose-50" onClick={() => setMobileMenuOpen(false)}>
                <Palette size={18} />
                Конструктор
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <Section id="home">
        <div className="w-full md:w-1/2">
          <h1 className="text-5xl md:text-7xl font-hand text-rose-500 mb-6 drop-shadow-md leading-tight">
            5 минут
            <br />
            тишины
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-md font-medium leading-relaxed">
            <b className="text-gray-800">5 минут тишины</b> — уникальные
            игрушки и аксессуары для малышей. Соберите изделие
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
            Каждое изделие собирается из безопасных материалов — дерево,
            силикон, гипоаллергенный пластик. Нить крепкая, клипса надёжная.
            Игрушки, которые радуют глаз и не вредят здоровью.
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

      {/* ── CATALOG PRODUCTS ── */}
      <Section id="catalog">
        <div className="w-full" ref={catalogRef}>
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 bg-white/40 backdrop-blur-sm px-8 py-2 rounded-full">
              Наши товары
            </h2>
            <Link
              href="/catalog"
              className="text-rose-500 hover:text-rose-600 font-semibold text-sm flex items-center gap-1 transition-colors"
            >
              Все товары
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-5 pointer-events-auto">
            {products.map((p) => {
              const hasDiscount = p.discountPercent > 0;
              const effectivePrice = hasDiscount
                ? Math.round(p.basePrice * (1 - p.discountPercent / 100))
                : p.basePrice;

              return (
                <Link key={p.id} href={`/catalog/${p.slug}`} className="contents">
                  <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 flex flex-col cursor-pointer overflow-hidden group">
                    {/* Image */}
                    <div className="relative aspect-square bg-gray-100">
                      {p.mainImage ? (
                        <Image
                          src={`/api${p.mainImage.url}`}
                          alt={p.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Baby size={48} />
                        </div>
                      )}
                      {/* Badges */}
                      {p.badges.length > 0 && (
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          {p.badges.map((b) => (
                            <span
                              key={b.label}
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ color: b.textColor, backgroundColor: b.bgColor }}
                            >
                              {b.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3 flex flex-col gap-1 flex-1">
                      <h3 className="font-bold text-gray-800 text-sm leading-tight line-clamp-2 group-hover:text-rose-600 transition-colors">
                        {p.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-bold text-gray-900">
                          {effectivePrice.toLocaleString("ru-RU")} ₽
                        </span>
                        {hasDiscount && (
                          <span className="text-xs text-gray-400 line-through">
                            {p.basePrice.toLocaleString("ru-RU")} ₽
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleLandingAddToCart(p.id);
                        }}
                        disabled={addingProductId === p.id}
                        className="mt-auto w-full py-2 rounded-xl text-xs font-semibold bg-rose-500 text-white hover:bg-rose-600 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {addingProductId === p.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="5" x2="12" y2="19" />
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            В корзину
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ── RECENTLY VIEWED ── */}
      {recentlyViewed.length > 0 && (
        <section className="py-12 px-4 md:px-8">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-lg font-bold text-gray-700 mb-4 text-center">
              Недавно просмотренные
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pointer-events-auto">
              {recentlyViewed.slice(0, 8).map((item) => (
                <Link
                  key={item.id}
                  href={`/catalog/${item.slug}`}
                  className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group border border-gray-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="aspect-square relative bg-gray-50">
                    {item.mainImage ? (
                      <Image
                        src={`/api${item.mainImage.url}`}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 text-gray-300">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-medium text-gray-700 group-hover:text-rose-500 transition-colors line-clamp-2 leading-tight">
                      {item.name}
                    </p>
                    <p className="text-xs font-bold text-gray-800 mt-1">
                      {formatPrice(getEffectivePrice(item.basePrice, item.discountPercent))}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

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
              {dbReviews.length > 0
                ? [...dbReviews, ...dbReviews].map((review, i) => (
                    <ReviewCard key={review.id ?? i} data={review} />
                  ))
                : [...FALLBACK_REVIEWS, ...FALLBACK_REVIEWS].map((review, i) => (
                    <ReviewCard key={i} data={review as unknown as DbReview} fallback />
                  ))}
            </div>
          </div>

          {/* Review form */}
          <ReviewForm />
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
      <footer className="w-full bg-white/60 backdrop-blur-sm border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-10">
          {/* Footer nav */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Магазин</h4>
              <div className="flex flex-col gap-2">
                <a href="/catalog" className="text-sm text-gray-600 hover:text-rose-500 transition-colors">Каталог</a>
                <Link href="/editor" className="text-sm text-gray-600 hover:text-rose-500 transition-colors">Конструктор</Link>
                <a href="/cart" className="text-sm text-gray-600 hover:text-rose-500 transition-colors">Корзина</a>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Информация</h4>
              <div className="flex flex-col gap-2">
                <Link href="/about" className="text-sm text-gray-600 hover:text-rose-500 transition-colors">О нас</Link>
                <Link href="/blog" className="text-sm text-gray-600 hover:text-rose-500 transition-colors">Блог</Link>
                <Link href="/delivery" className="text-sm text-gray-600 hover:text-rose-500 transition-colors">Доставка и оплата</Link>
                <Link href="/faq" className="text-sm text-gray-600 hover:text-rose-500 transition-colors">Частые вопросы</Link>
                <Link href="/reviews" className="text-sm text-gray-600 hover:text-rose-500 transition-colors">Отзывы</Link>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Разделы</h4>
              <div className="flex flex-col gap-2">
                <button onClick={() => scrollTo("reviews")} className="text-sm text-gray-600 hover:text-rose-500 transition-colors text-left">Отзывы</button>
                <button onClick={() => scrollTo("gallery")} className="text-sm text-gray-600 hover:text-rose-500 transition-colors text-left">Шаблоны</button>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Контакты</h4>
              <div className="flex flex-col gap-2">
                <a href="https://t.me/karinavoronova" target="_blank" rel="noreferrer" className="text-sm text-gray-600 hover:text-rose-500 transition-colors">Telegram</a>
                <a href="https://wa.me/79261234567" target="_blank" rel="noreferrer" className="text-sm text-gray-600 hover:text-rose-500 transition-colors">WhatsApp</a>
                <button onClick={() => scrollTo("contact")} className="text-sm text-gray-600 hover:text-rose-500 transition-colors text-left">Написать</button>
              </div>
            </div>
          </div>

          {/* Newsletter */}
          <div className="bg-white/80 rounded-2xl p-5 mb-8 border border-gray-100">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-gray-800">Будьте первыми</h4>
                <p className="text-xs text-gray-400 mt-0.5">Узнавайте о новинках и акциях</p>
              </div>
              <NewsletterForm />
            </div>
          </div>

          {/* Bottom */}
          <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-rose-500 font-hand text-lg select-none">
              <Baby size={20} />
              5 минут тишины
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span>&copy; {new Date().getFullYear()} 5 минут тишины</span>
              <Link href="/privacy" className="hover:text-gray-600 transition-colors">Конфиденциальность</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
