import type { Product, ProductListItem, Badge, CompositeChild } from '@/types/catalog';

/** Calculate effective price after discount */
export function getEffectivePrice(basePrice: number, discountPercent: number): number {
  if (discountPercent <= 0 || discountPercent > 100) return basePrice;
  return Math.round(basePrice * (1 - discountPercent / 100) * 100) / 100;
}

/** Calculate total price for a product (simple or composite) */
export function getProductPrice(product: Product): number {
  if (product.type === 'composite' && product.compositeItems.length > 0) {
    const componentsTotal = product.compositeItems.reduce((sum, item) => {
      if (!item.child) return sum;
      return sum + getEffectivePrice(item.child.basePrice, item.child.discountPercent) * item.quantity;
    }, 0);
    return getEffectivePrice(componentsTotal, product.discountPercent);
  }
  return getEffectivePrice(product.basePrice, product.discountPercent);
}

/** Calculate total price from ProductListItem (for cart - no composite detail) */
export function getListItemPrice(item: ProductListItem): number {
  return getEffectivePrice(item.basePrice, item.discountPercent);
}

/** Format price in Russian format */
export function formatPrice(price: number): string {
  return price.toLocaleString('ru-RU') + ' ₽';
}

/** Generate URL-friendly slug from Russian text */
export function generateSlug(text: string): string {
  const translitMap: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu',
    'я': 'ya',
  };
  return text
    .toLowerCase()
    .split('')
    .map((ch) => translitMap[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Get the main image URL for a product */
export function getMainImage(images: { url: string; isMain: boolean }[]): string | null {
  const main = images.find((img) => img.isMain);
  return main?.url ?? images[0]?.url ?? null;
}

/** Get display badges from product */
export function getDisplayBadges(badges: { badge?: Badge }[]): Badge[] {
  return badges.map((b) => b.badge).filter(Boolean) as Badge[];
}

/** Order status labels in Russian */
export const ORDER_STATUS_LABELS: Record<string, string> = {
  new: 'Новый',
  confirmed: 'Подтверждён',
  processing: 'В работе',
  shipped: 'Отправлен',
  completed: 'Выполнен',
  cancelled: 'Отменён',
};

/** Order status colors */
export const ORDER_STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-orange-100 text-orange-800',
  shipped: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

/** Default badge seeds for initial setup */
export const DEFAULT_BADGES = [
  { label: 'NEW', textColor: '#ffffff', bgColor: '#10b981' },
  { label: 'SALE', textColor: '#ffffff', bgColor: '#ef4444' },
  { label: 'HIT', textColor: '#ffffff', bgColor: '#f59e0b' },
  { label: 'LIMITED', textColor: '#ffffff', bgColor: '#8b5cf6' },
];

/** Default categories */
export const DEFAULT_CATEGORIES = [
  { name: 'Держатели', slug: 'derzhateli', order: 0 },
  { name: 'Браслеты', slug: 'braslety', order: 1 },
  { name: 'Подвески', slug: 'podveski', order: 2 },
  { name: 'Вязаные игрушки', slug: 'vyazanye-igrushki', order: 3 },
  { name: 'Наборы', slug: 'nabory', order: 4 },
  { name: 'Аксессуары', slug: 'aksessuary', order: 5 },
];
