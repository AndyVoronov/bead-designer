export default function BlogLoading() {
  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Page header skeleton */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
            <div className="h-6 w-24 rounded-lg bg-gray-200 animate-pulse" />
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero skeleton */}
        <div className="h-48 sm:h-64 rounded-xl bg-gray-200 animate-pulse mb-8" />

        {/* Category pills */}
        <div className="flex gap-2 mb-8 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-24 rounded-full bg-gray-200 animate-pulse" />
          ))}
        </div>

        {/* Post grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
              <div className="aspect-[16/10] bg-gray-200 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-3 w-16 rounded-full bg-gray-200 animate-pulse" />
                <div className="h-5 w-full rounded-lg bg-gray-200 animate-pulse" />
                <div className="h-5 w-3/4 rounded-lg bg-gray-200 animate-pulse" />
                <div className="h-4 w-full rounded bg-gray-100 animate-pulse" />
                <div className="h-4 w-2/3 rounded bg-gray-100 animate-pulse" />
                <div className="flex justify-between pt-2">
                  <div className="h-3 w-20 rounded bg-gray-100 animate-pulse" />
                  <div className="h-3 w-16 rounded bg-gray-100 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
