"use client";

import { useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";

export function BlogSubscribeForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const toast = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Введите корректный email");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, source: "blog" }),
      });

      if (res.ok) {
        toast.success("Вы подписались на обновления блога!");
        setSubscribed(true);
      } else {
        const data = await res.json().catch(() => ({ error: "Ошибка" }));
        toast.error(data.error || "Не удалось подписаться");
      }
    } catch {
      toast.error("Ошибка при подписке");
    } finally {
      setLoading(false);
    }
  }

  if (subscribed) {
    return (
      <div className="text-center py-4">
        <p className="text-green-600 font-semibold">✓ Вы подписаны на обновления!</p>
        <p className="text-sm text-gray-500 mt-1">
          Новые статьи будут приходить на {email}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="email"
          placeholder="Ваш email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={200}
          className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300 transition-colors"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 disabled:bg-gray-300 rounded-lg transition-colors shrink-0 cursor-pointer"
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Mail size={16} />
        )}
        Подписаться
      </button>
    </form>
  );
}
