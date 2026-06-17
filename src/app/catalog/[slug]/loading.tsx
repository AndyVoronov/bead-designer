export default function ProductDetailLoading() {
  return (
    <div className="home-page-root min-h-screen bg-[#FFF8F5]">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-8 bg-gray-100 rounded-full animate-pulse" />
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="h-5 w-40 bg-gray-200 rounded animate-pulse mb-4" />
        {/* Image gallery + info grid */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="aspect-square bg-gray-100 rounded-2xl animate-pulse" />
          <div className="space-y-4">
            <div className="h-7 w-3/4 bg-gray-100 rounded animate-pulse" />
            <div className="h-5 w-1/3 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-5/6 bg-gray-100 rounded animate-pulse" />
            <div className="h-12 w-full bg-gray-200 rounded-xl animate-pulse mt-6" />
          </div>
        </div>
        {/* Reviews skeleton */}
        <div className="mt-10 space-y-3">
          <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
              <div className="h-4 w-1/4 bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
