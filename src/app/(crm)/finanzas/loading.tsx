export default function FinanzasLoading() {
  return (
    <div className="w-full max-w-[1000px] mx-auto space-y-6 animate-pulse">
      <div className="h-7 w-32 bg-surface-raised rounded-lg" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5 h-24" />
        ))}
      </div>
      <div className="card p-5 h-64" />
    </div>
  );
}
