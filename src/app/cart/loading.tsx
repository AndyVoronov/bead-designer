export default function CartLoading() {
  return (
    <div className="home-page-root min-h-screen bg-[#FFF8F5]">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <div className="h-5 w-28 bg-gray-200 rounded animate-pulse" />
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 flex gap-4">
            <div className="w-20 h-20 bg-gray-100 rounded-lg animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
              <div className="h-5 w-1/3 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
        ))}
        <div className="h-48 bg-white rounded-xl border border-gray-100 animate-pulse" />
      </main>
    </div>
  );
}
