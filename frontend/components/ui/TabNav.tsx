"use client";

interface Tab<T extends string> {
  key: T;
  label: string;
  icon?: React.ElementType;
  count?: number;
}

interface TabNavProps<T extends string> {
  tabs: Tab<T>[];
  active: T;
  onChange: (key: T) => void;
}

export default function TabNav<T extends string>({ tabs, active, onChange }: TabNavProps<T>) {
  return (
    <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-150
              ${isActive
                ? "bg-neon-500/15 text-neon-300 border border-neon-500/30"
                : "text-star-400 hover:text-star-200 hover:bg-nebula-700/60 border border-transparent"
              }`}
          >
            {tab.icon && <tab.icon className="w-4 h-4" />}
            {tab.label}
            {tab.count !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold
                ${isActive ? "bg-neon-500/20 text-neon-400" : "bg-nebula-600 text-star-400"}`}>
                {tab.count.toLocaleString()}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
