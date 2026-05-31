"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, Loader2, CheckCircle2, Search, X } from "lucide-react";

interface ArticleGeneratorProps {
  onGenerated: (data: { slug: string; title: string }) => void;
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

export default function ArticleGenerator({ onGenerated }: ArticleGeneratorProps) {
  const [topic, setTopic] = useState("");
  const [requirements, setRequirements] = useState("");
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const jobIdRef = useRef<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        // Silently fail — product selector is optional
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

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

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

    // Step 1: POST to start job
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

        // Step 2: poll for completion
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
            // Network error on poll — don't kill the job, just retry next tick
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

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const selectedProducts = products.filter((p) =>
    selectedProductIds.includes(p.id)
  );

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
                {/* Search input */}
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

                {/* Product list with checkboxes */}
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
            onClick={status === "error" ? handleReset : handleGenerate}
            disabled={status === "error" ? false : topic.trim().length < 3}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-purple-500 to-rose-500 rounded-xl hover:from-purple-600 hover:to-rose-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-none shadow-sm"
          >
            {status === "error" ? (
              "Попробовать снова"
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
          <h3 className="text-lg font-bold text-gray-900 mb-1">Статья опубликована!</h3>
          <p className="text-sm text-gray-500">{message}</p>
        </div>
      )}
    </div>
  );
}
