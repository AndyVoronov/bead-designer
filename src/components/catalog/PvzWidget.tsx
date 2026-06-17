"use client";

import { useEffect, useRef, useCallback, useState } from "react";

declare global {
  interface Window {
    YaDelivery?: {
      createWidget: (config: {
        containerId: string;
        params: Record<string, unknown>;
      }) => void;
      setParams: (params: Record<string, unknown>) => void;
    };
  }
}

interface PvzWidgetProps {
  city: string;
  onPointSelect?: (data: {
    id: string;
    fullAddress: string;
    locality: string;
    street: string;
    house: string;
  }) => void;
}

const WIDGET_CONTAINER_ID = "yandex-delivery-widget";

export default function PvzWidget({ city, onPointSelect }: PvzWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load widget script once
  useEffect(() => {
    if (document.getElementById("yandex-delivery-script")) {
      // Already loading/loaded
      const checkLoaded = setInterval(() => {
        if (window.YaDelivery) {
          setLoaded(true);
          clearInterval(checkLoaded);
        }
      }, 100);
      return () => clearInterval(checkLoaded);
    }

    const script = document.createElement("script");
    script.id = "yandex-delivery-script";
    script.src = "https://ndd-widget.landpro.site/widget.js";
    script.async = true;

    const onLoad = () => {
      // Small delay to ensure YaDelivery is available
      setTimeout(() => {
        if (window.YaDelivery) {
          setLoaded(true);
        } else {
          setError("Не удалось загрузить виджет карты");
        }
      }, 200);
    };

    script.addEventListener("load", onLoad);
    script.addEventListener("error", () => setError("Ошибка загрузки виджета"));

    document.head.appendChild(script);

    return () => {
      script.removeEventListener("load", onLoad);
    };
  }, []);

  // Listen for point selection events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && onPointSelect) {
        onPointSelect({
          id: detail.id || "",
          fullAddress: detail.address?.full_address || "",
          locality: detail.address?.locality || "",
          street: detail.address?.street || "",
          house: detail.address?.house || "",
        });
      }
    };

    document.addEventListener("YaNddWidgetPointSelected", handler);
    return () => document.removeEventListener("YaNddWidgetPointSelected", handler);
  }, [onPointSelect]);

  // Create/update widget when loaded or city changes
  useEffect(() => {
    if (!loaded || !window.YaDelivery || !containerRef.current) return;

    // Clear container before recreating
    const container = containerRef.current;
    if (container.firstChild) {
      container.innerHTML = "";
    }

    // Create a new div for the widget
    const widgetDiv = document.createElement("div");
    widgetDiv.id = WIDGET_CONTAINER_ID;
    container.appendChild(widgetDiv);

    window.YaDelivery.createWidget({
      containerId: WIDGET_CONTAINER_ID,
      params: {
        city: city || "Москва",
        size: {
          height: "350px",
          width: "100%",
        },
        delivery_price: "от 250",
        delivery_term: "от 2 дней",
        show_select_button: true,
        filter: {
          type: ["pickup_point", "terminal"],
          is_yandex_branded: false,
          payment_methods: ["already_paid", "card_on_receipt", "cash_on_receipt"],
          payment_methods_filter: "or",
        },
      },
    });

    return () => {
      if (container.firstChild) {
        container.innerHTML = "";
      }
    };
  }, [loaded, city]);

  // Update city via setParams without full recreation
  const prevCityRef = useRef(city);
  useEffect(() => {
    if (loaded && window.YaDelivery?.setParams && prevCityRef.current !== city && city) {
      window.YaDelivery.setParams({ city });
      prevCityRef.current = city;
    }
  }, [loaded, city]);

  if (error) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
        {error}
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 bg-white">
      {!loaded && (
        <div className="flex items-center justify-center h-[350px] bg-gray-50">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-rose-500 rounded-full animate-spin" />
            <span className="text-xs text-gray-400">Загрузка карты...</span>
          </div>
        </div>
      )}
      <div ref={containerRef} className={loaded ? "" : "hidden"} />
    </div>
  );
}
