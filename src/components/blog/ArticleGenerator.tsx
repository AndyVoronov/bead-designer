"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";

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

    const body: Record<string, string> = { topic: topic.trim() };
    if (requirements.trim()) body.requirements = requirements.trim();

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
  };

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
