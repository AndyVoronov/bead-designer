import { prisma } from "@/lib/prisma";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  confirmed: "Подтверждён",
  processing: "В работе",
  shipped: "Отправлен",
  completed: "Выполнен",
  cancelled: "Отменён",
};

/**
 * Escape special characters for Telegram MarkdownV2.
 * Must escape: _ * [ ] ( ) ~ ` > # + - = | { } . !
 */
function escapeMd(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, "\\$1");
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Send a Telegram message to a user about their order status change.
 * Only works for users who logged in via Telegram (have telegramChatId).
 */
export async function notifyUserOrderStatusChange(
  userId: number,
  orderType: "catalog" | "design",
  orderId: number,
  newStatus: string,
  amount?: number,
): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log("[notify] TELEGRAM_BOT_TOKEN not set, skipping notification");
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramChatId: true, name: true },
    });

    if (!user?.telegramChatId) {
      console.log(`[notify] User ${userId} has no telegramChatId, skipping`);
      return;
    }

    const statusLabel = STATUS_LABELS[newStatus] ?? newStatus;
    const icon = newStatus === "completed" ? "&#9989;" : newStatus === "shipped" ? "&#128230;" : newStatus === "cancelled" ? "&#10060;" : "&#128221;";

    let message = `${icon} <b>Статус заказа обновлён</b>\n\n`;
    message += `Заказ #${orderId} (${orderType === "catalog" ? "Магазин" : "Конструктор"})\n`;
    message += `Новый статус: <b>${escapeHtml(statusLabel)}</b>\n`;
    if (amount) {
      message += `Сумма: ${amount.toLocaleString("ru-RU")} &#8381;\n`;
    }
    message += `\nС уважением, 5 минут тишины`;

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: user.telegramChatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[notify] Telegram API error: ${res.status} ${errText}`);
    } else {
      console.log(`[notify] Sent status update to user ${userId} (chat ${user.telegramChatId})`);
    }
  } catch (err) {
    console.error("[notify] Failed to send notification:", err);
  }
}
