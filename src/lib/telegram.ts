/**
 * Generate a Telegram deep link with a pre-filled message for ordering.
 * Username "VoronovAndrey" from D008.
 */
export function generateTelegramLink(designCode: string, beadCount: number): string {
  const message = `Здравствуйте! Хочу заказать изделие.\nКод: ${designCode}\nБусин: ${beadCount}`;
  return `https://t.me/VoronovAndrey?text=${encodeURIComponent(message)}`;
}
