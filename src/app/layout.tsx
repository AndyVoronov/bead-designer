import type { Metadata, Viewport } from "next";
import { Nunito, Pacifico } from "next/font/google";
import { AuthProvider } from "@/lib/auth-provider";
import { LoginModal } from "@/components/auth/LoginModal";
import { ScrollFix } from "@/components/ScrollFix";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/components/seo/JsonLd";
import { StoreRatingJsonLd } from "@/components/seo/StoreRatingJsonLd";
import { ExitIntentPopup } from "@/components/ExitIntentPopup";
import MetricsScript from "@/components/analytics/MetricsScript";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin", "cyrillic"],
  variable: "--font-nunito",
  display: "swap",
});

const pacifico = Pacifico({
  subsets: ["latin"],
  variable: "--font-pacifico",
  display: "swap",
  weight: "400",
});

export const metadata: Metadata = {
  title: {
    default: "5 минут тишины — Игрушки для малышей",
    template: "%s — 5 минут тишины",
  },
  description:
    "Уникальные игрушки и аксессуары для малышей — держатели для пустышек, браслеты, подвески. Соберите своё изделие в 3D-конструкторе или выберите из готовых шаблонов.",
  metadataBase: new URL("https://5minutesofsilence.ru"),
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "5 минут тишины",
    title: "5 минут тишины — Игрушки для малышей",
    description:
      "Уникальные игрушки и аксессуары для малышей — держатели для пустышек, браслеты, подвески.",
    images: [{ url: "/api/uploads/og-logo.png", width: 1200, height: 630, alt: "5 минут тишины" }],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${nunito.variable} ${pacifico.variable}`}>
      <body className="font-nunito">
        {/* Skip to content — accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-rose-500 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium focus:shadow-lg"
        >
          Перейти к содержимому
        </a>
        <MetricsScript />
        <ScrollFix />
        <AuthProvider>
          <ToastProvider>
            <OrganizationJsonLd />
            <WebSiteJsonLd />
            <StoreRatingJsonLd />
            <main id="main-content">
              {children}
            </main>
            <LoginModal />
            <ExitIntentPopup />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
