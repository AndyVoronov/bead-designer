"use client";

import { useState, useEffect } from "react";

export default function MapWidget() {
  const [mapUrl, setMapUrl] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [workingHours, setWorkingHours] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/site-settings")
      .then((r) => r.json())
      .then((data) => {
        setMapUrl(data.yandex_maps_url || "");
        setAddress(data.address || "");
        setPhone(data.phone || "");
        setWorkingHours(data.working_hours || "Пн-Пт 10:00–20:00");
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) {
    return (
      <section className="animate-pulse">
        <div className="bg-gray-100 rounded-2xl h-48" />
      </section>
    );
  }

  if (!mapUrl && !address) return null;

  return (
    <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Contact info bar */}
      {(address || phone || workingHours) && (
        <div className="p-4 flex flex-wrap gap-4 text-sm">
          {address && (
            <div className="flex items-center gap-2 text-gray-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-rose-500 shrink-0">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {address}
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-2 text-gray-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-rose-500 shrink-0">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <a href={`tel:${phone.replace(/\s/g, "")}`} className="hover:text-rose-500 transition-colors">{phone}</a>
            </div>
          )}
          {workingHours && (
            <div className="flex items-center gap-2 text-gray-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-rose-500 shrink-0">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {workingHours}
            </div>
          )}
        </div>
      )}

      {/* Map iframe */}
      {mapUrl ? (
        <iframe
          src={mapUrl}
          width="100%"
          height="350"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Карта"
          className="w-full"
        />
      ) : (
        <div className="h-48 bg-gray-50 flex items-center justify-center text-gray-400 text-sm">
          Карта будет добавлена в настройках сайта
        </div>
      )}
    </section>
  );
}
