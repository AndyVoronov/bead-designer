import TemplateBrowser from "@/components/templates/TemplateBrowser";

/**
 * Home page — a welcoming template gallery.
 *
 * Server Component that renders the app title, subtitle, and the client-side
 * TemplateBrowser for horizontal-scrolling template cards. No 3D canvas on
 * this page — keeps it lightweight and fast to load.
 */
export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col home-page-root">
      {/* Hero section */}
      <header className="px-4 pt-12 pb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Конструктор бусин
        </h1>
        <p className="text-base text-gray-500 leading-relaxed">
          Выберите шаблон или создайте своё изделие
        </p>
      </header>

      {/* Template gallery */}
      <TemplateBrowser />

      {/* Footer spacer */}
      <div className="flex-1" />
      <footer className="px-4 py-6 text-center">
        <span className="text-xs text-gray-300">
          Toy Designer &middot; бисероплетение
        </span>
      </footer>
    </main>
  );
}
