"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const PvzWidget = dynamic(() => import("./PvzWidget"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[350px] bg-gray-50 rounded-xl">
      <div className="w-6 h-6 border-2 border-gray-200 border-t-rose-500 rounded-full animate-spin" />
    </div>
  ),
});

export default function PvzDelivery() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500" aria-hidden="true">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm">Найти ближайший ПВЗ</h3>
              <p className="text-xs text-gray-400 mt-0.5">Открыть карту с пунктами выдачи Яндекс.Маркет</p>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      ) : (
        <div>
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-800 text-sm">Карта пунктов выдачи</h3>
            <button
              onClick={() => setExpanded(false)}
              className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              Свернуть
            </button>
          </div>
          <PvzWidget city="Москва" />
          <p className="text-xs text-gray-400 text-center py-3">
            Укажите свой город при оформлении заказа — мы доставим до ближайшего ПВЗ
          </p>
        </div>
      )}
    </div>
  );
}
