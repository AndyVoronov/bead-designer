import type { Metadata, Viewport } from "next";
import { Nunito, Pacifico } from "next/font/google";
import { AuthProvider } from "@/lib/auth-provider";
import { LoginModal } from "@/components/auth/LoginModal";
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
  title: "Toy Designer — Конструктор бусин",
  description:
    "Создайте уникальное изделие из бусин — держатель для пустышки, браслет или подвеску. 3D-конструктор с реалистичной физикой.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${nunito.variable} ${pacifico.variable}`}>
      <body className="font-nunito">
        <AuthProvider>
          {children}
          <LoginModal />
        </AuthProvider>
      </body>
    </html>
  );
}
