"use client";

import dynamic from "next/dynamic";

const LandingPage = dynamic(
  () => import("@/components/landing/LandingPage"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-[#FFF8F5] flex items-center justify-center">
        <div className="text-rose-400 text-lg animate-pulse">Загрузка...</div>
      </div>
    ),
  }
);

export default function Home() {
  return <LandingPage />;
}
