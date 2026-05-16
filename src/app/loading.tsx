export default function Loading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background-mp)" }}>
      {/* Header skeleton */}
      <div className="h-[72px]" style={{ background: "rgba(250,248,245,0)" }} />

      {/* Hero skeleton */}
      <div
        className="shimmer"
        style={{ minHeight: 480 }}
      />

      {/* Grid skeleton */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div
          className="shimmer h-7 w-52 rounded-xl mb-8"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden"
              style={{ background: "white", boxShadow: "var(--shadow-mp-card)" }}
            >
              {/* Image skeleton */}
              <div
                className="shimmer w-full"
                style={{ aspectRatio: "16/9" }}
              />
              {/* Body skeleton */}
              <div className="p-4 space-y-3">
                <div className="shimmer h-6 w-32 rounded-lg" />
                <div className="shimmer h-4 w-full rounded-lg" />
                <div className="shimmer h-4 w-3/4 rounded-lg" />
                <div className="flex gap-2 pt-1">
                  <div className="shimmer h-6 w-16 rounded-full" />
                  <div className="shimmer h-6 w-16 rounded-full" />
                  <div className="shimmer h-6 w-20 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
