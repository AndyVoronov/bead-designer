import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FFF8F5] flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Illustration */}
        <div className="w-32 h-32 mx-auto mb-6 bg-rose-50 rounded-full flex items-center justify-center">
          <svg
            className="w-16 h-16 text-rose-300"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </div>

        <h1 className="text-4xl font-bold text-gray-800 mb-2">404</h1>
        <p className="text-lg text-gray-500 mb-2">Страница не найдена</p>
        <p className="text-sm text-gray-400 mb-8">
          Возможно, товар был удалён или ссылка устарела.
          Попробуйте найти нужное через каталог.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/catalog"
            className="px-6 py-2.5 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition-colors text-center"
          >
            Перейти в каталог
          </Link>
          <Link
            href="/"
            className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors text-center"
          >
            На главную
          </Link>
        </div>

        {/* Quick links */}
        <nav className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-400">
          <Link href="/about" className="hover:text-rose-500 transition-colors">
            О нас
          </Link>
          <Link href="/delivery" className="hover:text-rose-500 transition-colors">
            Доставка
          </Link>
          <Link href="/faq" className="hover:text-rose-500 transition-colors">
            FAQ
          </Link>
          <a
            href="https://t.me/karinavoronova"
            target="_blank"
            rel="noreferrer"
            className="hover:text-rose-500 transition-colors"
          >
            Написать в Telegram
          </a>
        </nav>
      </div>
    </div>
  );
}
