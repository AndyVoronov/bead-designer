"use client";

import { useState } from "react";
import { Send, MessageCircle, Link as LinkIcon, Check } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";

interface ShareButtonsProps {
  title: string;
  url: string;
}

export function ShareButtons({ title, url }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${title} — ${url}`)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Ссылка скопирована");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Не удалось скопировать ссылку");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-400 mr-1">Поделиться:</span>
      <a
        href={telegramUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#229ED9] hover:bg-blue-50 rounded-lg transition-colors"
        aria-label="Поделиться в Telegram"
      >
        <Send size={16} />
        <span className="hidden sm:inline">Telegram</span>
      </a>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#25D366] hover:bg-green-50 rounded-lg transition-colors"
        aria-label="Поделиться в WhatsApp"
      >
        <MessageCircle size={16} />
        <span className="hidden sm:inline">WhatsApp</span>
      </a>
      <button
        onClick={copyLink}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
        aria-label="Копировать ссылку"
      >
        {copied ? <Check size={16} className="text-green-500" /> : <LinkIcon size={16} />}
        <span className="hidden sm:inline">{copied ? "Скопировано" : "Копировать"}</span>
      </button>
    </div>
  );
}
