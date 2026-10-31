"use client";

import { useAuthStore } from "@/stores/authStore";
import { useSearchHistoryStore } from "@/stores/searchHistoryStore";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { formatDistanceToNow } from "date-fns";

export default function SearchHistoryPage() {
  const token = useAuthStore((s) => s.token);
  const { entries, loading, fetchSearchHistory } = useSearchHistoryStore();
  const [filter, setFilter] = useState("");
  const [activeType, setActiveType] = useState("all");

  useEffect(() => { if (token) fetchSearchHistory(token); }, [token, fetchSearchHistory]);

  const types = useMemo(() => {
    const s = new Set(entries.map((e) => e.search_type));
    return ["all", ...Array.from(s)];
  }, [entries]);

  const filtered = useMemo(() => {
    let result = entries;
    if (activeType !== "all") result = result.filter((e) => e.search_type === activeType);
    if (filter.trim()) result = result.filter((e) => e.search_query.toLowerCase().includes(filter.toLowerCase()));
    return result;
  }, [entries, activeType, filter]);

  return (
    <div>
      <PageHeader
        icon={Search}
        title="Search History"
        description="Profiles and keywords you've searched for on Instagram."
        stats={[{ label: "Total Searches", value: entries.length }]}
      />

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-48 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-star-500" />
          <input
            type="text"
            placeholder="Filter searches..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm text-star-200 placeholder-star-500 outline-none focus:border-neon-500/50 transition-colors"
            style={{ background: "rgba(13, 24, 41, 0.8)", border: "1px solid rgba(0, 163, 196, 0.2)" }}
          />
        </div>
        <div className="flex gap-1">
          {types.map((t) => (
            <button key={t} onClick={() => setActiveType(t)}
              className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-all duration-150
                ${activeType === t ? "bg-neon-500/15 text-neon-300 border border-neon-500/30" : "text-star-400 border border-transparent hover:bg-nebula-700/60"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 10 }).map((_, i) => <div key={i} className="glass-card h-12 shimmer" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="No searches found" message={filter ? "Try a different filter." : "Your search history will appear here."} />
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-neon-600/20">
                <th className="text-left px-4 py-3 text-star-500 font-medium text-xs uppercase tracking-wider">Query</th>
                <th className="text-left px-4 py-3 text-star-500 font-medium text-xs uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 text-star-500 font-medium text-xs uppercase tracking-wider">When</th>
              </tr></thead>
              <tbody className="divide-y divide-nebula-700/50">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-nebula-700/30 transition-colors">
                    <td className="px-4 py-3 text-star-200 font-medium">{e.search_query}</td>
                    <td className="px-4 py-3">
                      <span className="stat-badge capitalize">{e.search_type}</span>
                    </td>
                    <td className="px-4 py-3 text-star-500 text-xs whitespace-nowrap">
                      {e.searched_at ? formatDistanceToNow(new Date(e.searched_at), { addSuffix: true }) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
