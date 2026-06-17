import { NextResponse } from "next/server";

/**
 * Returns the list of configured OAuth providers.
 * Used by LoginModal to conditionally show provider buttons.
 */
export async function GET() {
  const providers: string[] = ["yandex"];

  if (process.env.AUTH_VK_ID && process.env.AUTH_VK_SECRET) {
    providers.push("vkontakte");
  }

  // Telegram is always available if the bot is configured
  if (process.env.TELEGRAM_BOT_NAME) {
    providers.push("telegram");
  }

  return NextResponse.json({ providers });
}
