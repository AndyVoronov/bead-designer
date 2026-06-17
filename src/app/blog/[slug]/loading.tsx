export default function BlogPostLoading() {
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

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumbs skeleton */}
        <div className="flex items-center gap-2 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-3 w-16 rounded bg-gray-200 animate-pulse" />
          ))}
        </div>

        {/* Hero image skeleton */}
        <div className="w-full h-[300px] rounded-xl bg-gray-200 animate-pulse mb-8" />

        {/* Title skeleton */}
        <div className="space-y-3 mb-6">
          <div className="h-8 w-full rounded-lg bg-gray-200 animate-pulse" />
          <div className="h-8 w-3/4 rounded-lg bg-gray-200 animate-pulse" />
        </div>

        {/* Meta row skeleton */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-5 h-5 rounded-full bg-gray-200 animate-pulse" />
          <div className="h-3 w-24 rounded bg-gray-200 animate-pulse" />
          <div className="h-3 w-20 rounded bg-gray-100 animate-pulse" />
          <div className="h-3 w-16 rounded bg-gray-100 animate-pulse" />
          <div className="h-3 w-12 rounded bg-gray-100 animate-pulse" />
        </div>

        {/* Tags skeleton */}
        <div className="flex gap-2 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-6 w-16 rounded-full bg-gray-100 animate-pulse" />
          ))}
        </div>

        {/* Content paragraphs */}
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-4 rounded bg-gray-100 animate-pulse"
              style={{ width: `${85 + Math.random() * 15}%` }}
            />
          ))}
        </div>
      </article>
    </div>
  );
}
