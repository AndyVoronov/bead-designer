"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { signIn } from "next-auth/react";
import { useAuth, notifyAuthChange } from "@/lib/auth-provider";

/**
 * Login modal triggered by protected actions.
 *
 * Yandex and VK use standard OAuth redirect flow via NextAuth.
 * Telegram uses Telegram Login Widget in a popup.
 */
export function LoginModal() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<string[]>([]);
  // Focus trap when modal opens
  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Move focus to close button
      closeBtnRef.current?.focus();
      // Prevent body scroll
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Focus trap: keep Tab within modal
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !modalRef.current) return;

    const focusable = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, []);

  const popupRef = useRef<Window | null>(null);

  // Fetch available providers on mount
  useEffect(() => {
    fetch("/api/auth/providers")
      .then((r) => r.json())
      .then((data) => setProviders(data.providers ?? []))
      .catch(() => setProviders(["yandex"]));
  }, []);

  // Listen for auth-required event
  useEffect(() => {
    const handler = () => {
      if (!user) setIsOpen(true);
    };
    window.addEventListener("auth-required", handler);
    return () => window.removeEventListener("auth-required", handler);
  }, [user]);

  // Auto-close when user logs in
  useEffect(() => {
    if (user && isOpen) {
      setIsOpen(false);
      if (popupRef.current) {
        popupRef.current.close();
        popupRef.current = null;
      }
    }
  }, [user, isOpen]);

  // Listen for Telegram widget postMessage
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      // Only accept from our own origin or Telegram widget
      if (event.origin !== window.location.origin && event.origin !== "https://oauth.telegram.org") return;
      if (event.data?.type !== "tg_login") return;

      const { id, first_name, last_name, username, photo_url } = event.data;
      try {
        const res = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, first_name, last_name, username, photo_url }),
        });
        if (res.ok) {
          notifyAuthChange();
          if (popupRef.current) {
            popupRef.current.close();
            popupRef.current = null;
          }
        } else {
          setError("Ошибка входа через Telegram");
        }
      } catch {
        setError("Ошибка входа через Telegram");
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Check URL params for OAuth errors after redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "OAuthCallback") {
      setError("Не удалось войти. Попробуйте ещё раз.");
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setError(null);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, close]);

  const signInProvider = (provider: string) => {
    setError(null);
    signIn(provider, {
      callbackUrl: window.location.pathname,
    });
  };

  const signInTelegram = () => {
    setError(null);
    // Open popup with Telegram Login Widget
    const width = 400;
    const height = 500;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;

    const popup = window.open(
      "",
      "telegram_login",
      `width=${width},height=${height},left=${left},top=${top}`
    );
    popupRef.current = popup;

    if (popup) {
      popup.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Вход через Telegram</title>
          <style>
            body { display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; font-family: -apple-system, sans-serif; background: #fff; }
            .container { text-align: center; padding: 20px; }
            h2 { color: #333; margin-bottom: 8px; }
            p { color: #888; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Вход через Telegram</h2>
            <p>Нажмите кнопку ниже</p>
            <div id="telegram-widget" style="margin-top: 24px;"></div>
          </div>
          <script src="https://telegram.org/js/telegram-widget.js?22" data-telegram-login="toydesigner_bot" data-size="large" data-radius="12" data-onauth="onTelegramAuth(user)" data-request-access="write"><\/script>
          <script>
            function onTelegramAuth(user) {
              window.opener.postMessage({
                type: 'tg_login',
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name || '',
                username: user.username || '',
                photo_url: user.photo_url || ''
              }, window.opener.origin);
              document.getElementById('telegram-widget').innerHTML = '<p style="color: #27ae60; font-weight: 500;">✓ Вход выполнен</p><p style="color: #888; font-size: 13px;">Можете закрыть это окно</p>';
            }
          <\/script>
        </body>
        </html>
      `);
    }
  };

  if (!isOpen) return null;

  const showYandex = providers.includes("yandex");
  const showTelegram = providers.includes("telegram");
  const showVK = providers.includes("vkontakte");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Вход в аккаунт">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        onKeyDown={handleKeyDown}
        className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 z-10"
      >
        {/* Close button */}
        <button
          ref={closeBtnRef}
          onClick={close}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          aria-label="Закрыть"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-1">
            Войти в аккаунт
          </h3>
          <p className="text-sm text-gray-500">
            Войдите, чтобы сохранять дизайны и оставлять отзывы
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 text-rose-600 text-sm">
            {error}
          </div>
        )}

        {/* Provider buttons */}
        <div className="flex flex-col gap-3">
          {/* Yandex */}
          {showYandex && (
            <button
              onClick={() => signInProvider("yandex")}
              className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl bg-[#FC3F1D] text-white font-medium hover:bg-[#e0360e] transition-colors cursor-pointer active:scale-[0.98]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M10.478 11.632l4.644-7.132H12.21L8.756 10.5V0h-2.91v24h2.91V13.836l3.784 6.297h3.28l-4.48-5.87 4.688-7.132h-3.452z" />
              </svg>
              <span>Войти через Яндекс</span>
            </button>
          )}

          {/* Telegram */}
          {showTelegram && (
            <button
              onClick={signInTelegram}
              className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl bg-[#2AABEE] text-white font-medium hover:bg-[#229ED9] transition-colors cursor-pointer active:scale-[0.98]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
              <span>Войти через Telegram</span>
            </button>
          )}

          {/* VK */}
          {showVK && (
            <button
              onClick={() => signInProvider("vkontakte")}
              className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl bg-[#0077FF] text-white font-medium hover:bg-[#0066dd] transition-colors cursor-pointer active:scale-[0.98]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M12.785 16.241s.288-.032.436-.194c.136-.148.132-.427.132-.427s-.02-1.304.587-1.496c.596-.188 1.362 1.259 2.174 1.815.614.42 1.08.328 1.08.328l2.175-.03s1.14-.07.6-.964c-.044-.073-.314-.662-1.618-1.874-1.366-1.269-1.183-1.063.462-3.256.998-1.328 1.398-2.14 1.273-2.487-.119-.332-.854-.244-.854-.244l-2.447.015s-.182-.025-.316.056c-.132.079-.216.263-.216.263s-.39 1.038-.91 1.922c-1.096 1.863-1.534 1.961-1.713 1.846-.416-.27-.312-1.083-.312-1.66 0-1.807.274-2.56-.534-2.756-.268-.065-.465-.108-1.15-.115-.878-.009-1.621.003-2.042.21-.28.137-.496.442-.364.459.162.021.53.099.724.363.252.34.242 1.104.242 1.104s.145 2.127-.337 2.39c-.331.18-.784-.188-1.757-1.874-.498-.863-.874-1.816-.874-1.816s-.072-.177-.2-.272c-.156-.114-.374-.15-.374-.15l-2.326.015s-.35.01-.479.162c-.114.135-.009.413-.009.413s1.816 4.254 3.87 6.396c1.884 1.965 4.023 1.836 4.023 1.836h.97z" />
              </svg>
              <span>Войти через ВКонтакте</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-400 text-center mt-4">
          Нажимая кнопку, вы соглашаетесь с условиями использования
        </p>
      </div>
    </div>
  );
}
