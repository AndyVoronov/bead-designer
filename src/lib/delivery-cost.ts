// Delivery cost calculation service
// Two delivery methods: Яндекс.Маркет ПВЗ + Самовывоз
// When YANDEX_DELIVERY_API_KEY is set, uses real Yandex.Delivery API for dynamic cost
// Otherwise, uses static fallback rate

export interface DeliveryOption {
  method: string;
  label: string;
  cost: number;
  estimatedDays: string;
  description: string;
}

const DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    method: "yandex_pvz",
    label: "ПВЗ Яндекс.Маркет",
    cost: 250,
    estimatedDays: "2–5 дней",
    description: "Доставка до пункта выдачи Яндекс.Маркет",
  },
  {
    method: "pickup",
    label: "Самовывоз",
    cost: 0,
    estimatedDays: "1–2 дня",
    description: "Бесплатный самовывоз",
  },
];

export function getDeliveryCost(method: string): DeliveryOption {
  return DELIVERY_OPTIONS.find((o) => o.method === method) || DELIVERY_OPTIONS[0];
}

export function getAllDeliveryOptions(): DeliveryOption[] {
  return [...DELIVERY_OPTIONS];
}

/**
 * Fetch dynamic delivery cost from Yandex.Delivery API.
 * Requires: YANDEX_DELIVERY_API_KEY, YANDEX_SENDER_ID in environment.
 * Falls back to static rate if API is unavailable.
 */
export async function fetchYandexDeliveryCost(
  city: string,
  weightGrams = 500, // default weight for children's accessories
): Promise<{ cost: number; estimatedDays: string } | null> {
  const apiKey = process.env.YANDEX_DELIVERY_API_KEY;
  const senderId = process.env.YANDEX_SENDER_ID;

  if (!apiKey || !senderId) return null;

  try {
    const res = await fetch("https://b2b.cargo.yandex.ru/api/v1/delivery", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        senderId,
        deliveryType: "PICKUP", // PVZ
        recipient: { city },
        dimensions: {
          weight: weightGrams,
          length: 30,
          width: 20,
          height: 10,
        },
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const offer = data?.offers?.[0];
    if (!offer) return null;

    return {
      cost: Math.round(offer.price),
      estimatedDays: `${offer.deliveryTimeMin || 2}–${offer.deliveryTimeMax || 5} дней`,
    };
  } catch {
    return null;
  }
}
