"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X, CheckCircle2, Video, Loader2 } from "lucide-react";

interface ArticleGeneratorProps {
  onGenerated: (data: { slug: string; title: string }) => void;
}

type StepId = "planning" | "writing" | "animating" | "rendering" | "done" | "error";

interface StepInfo {
  id: StepId;
  icon: string;
  label: string;
}

const STEPS: StepInfo[] = [
  { id: "planning", icon: "🧠", label: "Планирование" },
  { id: "writing", icon: "✍️", label: "Написание контента" },
  { id: "animating", icon: "🎬", label: "Создание анимаций" },
  { id: "rendering", icon: "🎞", label: "Рендер видео" },
];

function getStepOrder(step: StepId): number {
  const order: Record<string, number> = {
    planning: 1,
    writing: 2,
    animating: 3,
    rendering: 4,
    done: 5,
    error: -1,
  };
  return order[step] || 0;
}

export default function ArticleGenerator({ onGenerated }: ArticleGeneratorProps) {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [requirements, setRequirements] = useState("");
  const [renderVideos, setRenderVideos] = useState(true);

  // Generation state
  const [active, setActive] = useState(false);
  const [step, setStep] = useState<StepId | "idle">("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const handleGenerate = () => {
    if (!topic.trim() || topic.trim().length < 3) return;

    setActive(true);
    setStep("planning");
    setProgress(5);
    setMessage("Подключаюсь к серверу...");
    setError("");

    abortRef.current = new AbortController();
    const params = new URLSearchParams({ topic: topic.trim() });
    if (requirements.trim()) params.set("requirements", requirements.trim());
    if (!renderVideos) params.set("noVideos", "1");

    const eventSource = new EventSource(
      `/api/admin/blog/generate?${params.toString()}`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setStep(data.step);
        setProgress(data.progress);
        if (data.message) setMessage(data.message);

        if (data.step === "done" && data.slug) {
          eventSource.close();
          setActive(false);
          // Small delay so user sees "done"
          setTimeout(() => {
            onGenerated({ slug: data.slug, title: data.title });
          }, 1000);
        }

        if (data.step === "error") {
          eventSource.close();
          setError(data.message || "Ошибка генерации");
          setStep("error");
          setActive(false);
        }
      } catch {
        // ignore parse errors
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      setError("Потеряно соединение с сервером");
      setStep("error");
      setActive(false);
    };

    // Store ref for cleanup
    (eventSource as any).__abortController = abortRef.current;
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setActive(false);
    setStep("idle");
    setProgress(0);
    setMessage("");
  };

  const handleReset = () => {
    setStep("idle");
    setProgress(0);
    setMessage("");
    setError("");
    setTopic("");
    setRequirements("");
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* ── Idle form ── */}
      {!active && (step === "idle" || step === "error") && (
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

          {/* Render videos toggle */}
          <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <Video className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">MP4-анимации</p>
                <p className="text-xs text-gray-400">Remotion рендер ~2 мин на анимацию</p>
              </div>
            </div>
            <button
              onClick={() => setRenderVideos(!renderVideos)}
              className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer border-none ${
                renderVideos ? "bg-purple-500" : "bg-gray-300"
              }`}
              role="switch"
              aria-checked={renderVideos}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  renderVideos ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* Error message */}
          {step === "error" && error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={topic.trim().length < 3}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-purple-500 to-rose-500 rounded-xl hover:from-purple-600 hover:to-rose-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-none shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            Сгенерировать статью
          </button>
        </div>
      )}

      {/* ── Active generation ── */}
      {active && step !== "done" && step !== "error" && step !== "idle" && (
        <div className="space-y-5">
          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 truncate mr-2">
                {message}
              </span>
              <span className="text-sm text-gray-400 whitespace-nowrap">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-rose-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Pipeline steps */}
          <div className="space-y-2">
            {STEPS.filter(
              (s) => renderVideos || (s.id !== "animating" && s.id !== "rendering")
            ).map((item) => {
              const currentOrder = getStepOrder(step as StepId);
              const itemOrder = getStepOrder(item.id);
              const isCurrent = step === item.id;
              const isDone = currentOrder > itemOrder;

              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                    isCurrent
                      ? "bg-purple-50 border border-purple-200"
                      : isDone
                        ? "bg-green-50 border border-green-200"
                        : "bg-gray-50 border border-gray-100"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span
                    className={`text-sm font-medium flex-1 ${
                      isCurrent
                        ? "text-purple-700"
                        : isDone
                          ? "text-green-700"
                          : "text-gray-400"
                    }`}
                  >
                    {item.label}
                  </span>
                  {isDone && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                  {isCurrent && <Loader2 className="w-4 h-4 text-purple-500 shrink-0 animate-spin" />}
                </div>
              );
            })}

            {/* DB save step (always last) */}
            <div
              className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                step === "rendering"
                  ? "bg-purple-50 border border-purple-200"
                  : getStepOrder(step as StepId) > getStepOrder("rendering")
                    ? "bg-green-50 border border-green-200"
                    : "bg-gray-50 border border-gray-100"
              }`}
            >
              <span className="text-lg">💾</span>
              <span className={`text-sm font-medium flex-1 ${
                step === "rendering" ? "text-purple-700"
                  : getStepOrder(step as StepId) > getStepOrder("rendering") ? "text-green-700"
                  : "text-gray-400"
              }`}>
                Сохранение и публикация
              </span>
              {getStepOrder(step as StepId) > getStepOrder("rendering") && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
              {step === "rendering" && <Loader2 className="w-4 h-4 text-purple-500 shrink-0 animate-spin" />}
            </div>
          </div>

          {/* Cancel */}
          <button
            onClick={handleCancel}
            className="w-full px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors cursor-pointer border-none"
          >
            Отменить
          </button>
        </div>
      )}

      {/* ── Done ── */}
      {step === "done" && (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Статья опубликована!</h3>
          <p className="text-sm text-gray-500">Перенаправляю на статью...</p>
        </div>
      )}
    </div>
  );
}
