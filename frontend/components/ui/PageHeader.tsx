interface StatItem {
  label: string;
  value: number | string;
}

interface PageHeaderProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  stats?: StatItem[];
  accent?: string;
}

export default function PageHeader({ icon: Icon, title, description, stats, accent = "#00A3C4" }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-start gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `linear-gradient(135deg, ${accent}22, ${accent}44)`, border: `1px solid ${accent}44` }}>
          <Icon className="w-6 h-6" style={{ color: accent }} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-star-200">{title}</h1>
          {description && <p className="mt-1 text-sm text-star-500">{description}</p>}
        </div>
      </div>
      {stats && stats.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-3">
          {stats.map((s) => (
            <div key={s.label} className="glass-card px-4 py-3 flex flex-col">
              <span className="text-xl font-bold text-neon-400">{s.value.toLocaleString()}</span>
              <span className="text-xs text-star-500 mt-0.5">{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
