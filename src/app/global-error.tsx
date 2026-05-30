"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ru">
      <body>
        <div className="min-h-screen bg-[#FFF8F5] flex flex-col items-center justify-center px-4 font-sans">
          <div className="text-center max-w-sm">
            <h1 className="text-3xl font-bold text-gray-800 mb-3">Ошибка</h1>
            <p className="text-sm text-gray-400 mb-6">
              Произошла ошибка на сервере.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => reset()}
                className="px-6 py-2.5 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition-colors cursor-pointer"
              >
                Попробовать снова
              </button>
              <a
                href="/"
                className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                На главную
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
