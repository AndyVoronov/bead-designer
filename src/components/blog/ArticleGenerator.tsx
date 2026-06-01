"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, Loader2, CheckCircle2, Search, X, Clock } from "lucide-react";

interface ArticleGeneratorProps {
  onGenerated: (data: { slug: string; title: string }) => void;
  publishMode?: "now" | "scheduled";
  scheduledAt?: string;
  onScheduled?: (topic: string, scheduledAt: string) => void;
  onScheduleCreated?: () => void;
}

interface PollResult {
  status: "pending" | "done" | "error";
  message: string;
  progress: number;
  slug?: string;
  title?: string;
  error?: string;
}

interface ProductOption {
  id: number;
  name: string;
  slug: string;
  shortDescription: string | null;
  basePrice: number;
  recommendedAge: string | null;
  images: { url: string }[];
}

export default function ArticleGenerator({
  onGenerated,
  publishMode: publishModeProp,
  scheduledAt: scheduledAtProp,
  onScheduled,
  onScheduleCreated,
}: ArticleGeneratorProps) {
  const [topic, setTopic] = useState("");
  const [requirements, setRequirements] = useState("");
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const jobIdRef = useRef<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Internal publish mode (can be overridden by prop)
  const [internalPublishMode, setInternalPublishMode] = useState<"now" | "scheduled">(
    publishModeProp || "now"
  );
  const [internalScheduledAt, setInternalScheduledAt] = useState(scheduledAtProp || "");
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);

  // Sync with props
  useEffect(() => {
    if (publishModeProp) setInternalPublishMode(publishModeProp);
  }, [publishModeProp]);
  useEffect(() => {
    if (scheduledAtProp) setInternalScheduledAt(scheduledAtProp);
  }, [scheduledAtProp]);

  // Product selector state
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [productsLoaded, setProductsLoaded] = useState(false);

  // Load products on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/blog/products");
        if (res.ok) {
          const data: ProductOption[] = await res.json();
          setProducts(data);
          setProductsLoaded(true);
        }
      } catch {
        setProductsLoaded(true);
      }
    })();
  }, []);

  const toggleProduct = (id: number) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // ── Moscow timezone helpers ──
  const MOSCOW_TZ = "Europe/Moscow";

  function formatMoscowDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString("ru-RU", {
      timeZone: MOSCOW_TZ,
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getMoscowNowISO(): string {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("sv-SE", {
      timeZone: MOSCOW_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    return formatter.format(now);
  }

  // ── Handle schedule ──
  const handleScheduleSubmit = async () => {
    if (!topic.trim() || topic.trim().length < 3) return;
    if (!internalScheduledAt) return;

    setScheduleSubmitting(true);

    try {
      const res = await fetch("/api/admin/blog/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          additionalRequirements: requirements.trim() || undefined,
          productIds: selectedProductIds.length > 0 ? selectedProductIds : undefined,
          // datetime-local gives "2026-06-01T15:02" without timezone.
          // Append Europe/Moscow offset to ensure correct UTC conversion.
          scheduledAt: new Date(internalScheduledAt + "+03:00").toISOString(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `Ошибка: ${res.status}`);
        setScheduleSubmitting(false);
        return;
      }

      // Show success state
      setStatus("done");
      setMessage(`Публикация запланирована на ${formatMoscowDate(internalScheduledAt)}`);
      setScheduleSubmitting(false);

      onScheduled?.(topic.trim(), internalScheduledAt);
      onScheduleCreated?.();
    } catch {
      setError("Не удалось подключиться к серверу");
      setScheduleSubmitting(false);
    }
  };

  const handleGenerate = () => {
    if (!topic.trim() || topic.trim().length < 3) return;

    setActive(true);
    setStatus("generating");
    setMessage("Запускаю генерацию...");
    setProgress(5);
    setError("");

    const body: Record<string, string | number[]> = { topic: topic.trim() };
    if (requirements.trim()) body.requirements = requirements.trim();
    if (selectedProductIds.length > 0) body.productIds = selectedProductIds;

    (async () => {
      try {
        const res = await fetch("/api/admin/blog/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.message || `Ошибка: ${res.status}`);
          setStatus("error");
          setActive(false);
          return;
        }

        jobIdRef.current = data.jobId;

        pollTimerRef.current = setInterval(async () => {
          if (!jobIdRef.current) return;

          try {
            const pollRes = await fetch(`/api/admin/blog/generate?id=${jobIdRef.current}`);
            const job: PollResult = await pollRes.json();

            setMessage(job.message);
            setProgress(job.progress);

            if (job.status === "done") {
              stopPolling();
              setStatus("done");
              setMessage(`Статья «${job.title}» опубликована!`);
              setActive(false);
              setTimeout(() => {
                onGenerated({ slug: job.slug!, title: job.title! });
              }, 1500);
            } else if (job.status === "error") {
              stopPolling();
              setError(job.error || job.message || "Ошибка генерации");
              setStatus("error");
              setActive(false);
            }
          } catch {
            // Network error — retry next tick
          }
        }, 2000);
      } catch {
        setError("Не удалось подключиться к серверу");
        setStatus("error");
        setActive(false);
      }
    })();
  };

  const handleCancel = () => {
    stopPolling();
    jobIdRef.current = null;
    setActive(false);
    setStatus("idle");
    setMessage("");
    setProgress(0);
  };

  const handleReset = () => {
    setStatus("idle");
    setMessage("");
    setError("");
    setTopic("");
    setRequirements("");
    setProgress(0);
    setSelectedProductIds([]);
  };

  const handleSubmit = () => {
    if (internalPublishMode === "scheduled") {
      handleScheduleSubmit();
    } else {
      handleGenerate();
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const selectedProducts = products.filter((p) =>
    selectedProductIds.includes(p.id)
  );

  const isFormDisabled =
    topic.trim().length < 3 ||
    (internalPublishMode === "scheduled" && !internalScheduledAt);

  return (
    <div className="max-w-lg mx-auto">
      {/* Idle / Error form */}
      {!active && (status === "idle" || status === "error") && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              О чём статья?
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder='Например: "Как выбрать первую погремушку для новорождённого"'
              rows={3}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Дополнительные требования{" "}
              <span className="font-normal text-gray-400">(необязательно)</span>
            </label>
            <textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder='Например: "Упомяни наши вязанные погремушки"'
              rows={2}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Product selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Привязать товары{" "}
              <span className="font-normal text-gray-400">(необязательно)</span>
            </label>

            {products.length > 0 && (
              <>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Найти товар..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  {productSearch && (
                    <button
                      type="button"
                      onClick={() => setProductSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                  {filteredProducts.length === 0 ? (
                    <div className="p-3 text-sm text-gray-400 text-center">
                      Товары не найдены
                    </div>
                  ) : (
                    filteredProducts.map((product) => (
                      <label
                        key={product.id}
                        className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                          selectedProductIds.includes(product.id)
                            ? "bg-purple-50"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedProductIds.includes(product.id)}
                          onChange={() => toggleProduct(product.id)}
                          className="w-4 h-4 rounded border-gray-300 text-purple-500 focus:ring-purple-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {product.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {product.basePrice.toLocaleString("ru-RU")} ₽
                            {product.recommendedAge && ` · ${product.recommendedAge}`}
                          </div>
                        </div>
                        {product.images[0] && (
                          <img
                            src={product.images[0].url}
                            alt={product.name}
                            className="w-8 h-8 rounded object-cover flex-shrink-0"
                          />
                        )}
                      </label>
                    ))
                  )}
                </div>
              </>
            )}

            {productsLoaded && products.length === 0 && (
              <div className="text-sm text-gray-400 text-center py-3 border border-gray-200 rounded-lg">
                Нет активных товаров в каталоге
              </div>
            )}

            {!productsLoaded && (
              <div className="text-sm text-gray-400 text-center py-3 border border-gray-200 rounded-lg">
                Загрузка товаров...
              </div>
            )}
          </div>

          {/* Preview of selected products CTA */}
          {selectedProducts.length > 0 && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-sm text-purple-800">
              <span className="font-medium">Будет добавлен CTA-блок с товарами:</span>{" "}
              {selectedProducts.map((p) => p.name).join(", ")}
            </div>
          )}

          {status === "error" && error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={status === "error" ? handleReset : handleSubmit}
            disabled={status === "error" ? false : isFormDisabled || scheduleSubmitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-purple-500 to-rose-500 rounded-xl hover:from-purple-600 hover:to-rose-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-none shadow-sm"
          >
            {scheduleSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : status === "error" ? (
              "Попробовать снова"
            ) : internalPublishMode === "scheduled" ? (
              <>
                <Clock className="w-4 h-4" />
                Запланировать публикацию
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Сгенерировать статью
              </>
            )}
          </button>
        </div>
      )}

      {/* Generating */}
      {active && status === "generating" && (
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 truncate mr-2">
                {message}
              </span>
              <span className="text-sm text-gray-400 whitespace-nowrap">
                {progress}%
              </span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-rose-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
            <Loader2 className="w-4 h-4 text-yellow-600 animate-spin shrink-0" />
            <span className="text-xs text-yellow-700">
              Генерация идёт на сервере. Можно закрыть вкладку и вернуться позже — статья будет сохранена.
            </span>
          </div>

          <button
            onClick={handleCancel}
            className="w-full px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors cursor-pointer border-none"
          >
            Прекратить отслеживание
          </button>
        </div>
      )}

      {/* Done */}
      {status === "done" && (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">
            {internalPublishMode === "scheduled" && !active ? "Публикация запланирована!" : "Статья опубликована!"}
          </h3>
          <p className="text-sm text-gray-500">{message}</p>
          <button
            onClick={handleReset}
            className="mt-4 px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors cursor-pointer border-none"
          >
            Создать ещё
          </button>
        </div>
      )}
    </div>
  );
}
