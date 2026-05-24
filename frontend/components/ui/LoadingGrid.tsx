export default function LoadingGrid({ cols = 3, rows = 2 }: { cols?: number; rows?: number }) {
  return (
    <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: cols * rows }).map((_, i) => (
        <div key={i} className="glass-card p-4 space-y-3">
          <div className="h-4 shimmer rounded-md w-3/4" />
          <div className="h-3 shimmer rounded-md w-1/2" />
        </div>
      ))}
    </div>
  );
}
