"use client";

import { useAuthStore } from "@/stores/authStore";
import { useOffMetaStore } from "@/stores/offMetaStore";
import { useEffect, useMemo, useState } from "react";
import { Globe } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { formatDistanceToNow } from "date-fns";

export default function OffMetaPage() {
  const token = useAuthStore((s) => s.token);
  const { activities, loading, fetchOffMeta } = useOffMetaStore();
  const [activeApp, setActiveApp] = useState("all");

  useEffect(() => { if (token) fetchOffMeta(token); }, [token, fetchOffMeta]);

  const appCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    activities.forEach((a) => { counts[a.app_name] = (counts[a.app_name] || 0) + 1; });
    return counts;
  }, [activities]);

  const apps = useMemo(() => ["all", ...Object.keys(appCounts).sort()], [appCounts]);

  const filtered = useMemo(() =>
    activeApp === "all" ? activities : activities.filter((a) => a.app_name === activeApp),
    [activities, activeApp]
  );

  const topApps = useMemo(() =>
    Object.entries(appCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
    [appCounts]
  );

  return (
    <div>
      <PageHeader
        icon={Globe}
        title="Off-Meta Activity"
        description="Apps and websites that shared your activity with Meta/Instagram."
        accent="#8B5CF6"
        stats={[
          { label: "Total Events", value: activities.length },
          { label: "Unique Apps", value: Object.keys(appCounts).length },
        ]}
      />

      {!loading && topApps.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-star-500 uppercase tracking-wider mb-3 font-medium">Top Sources</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {topApps.map(([app, count]) => (
              <button key={app} onClick={() => setActiveApp(app)}
                className={`glass-card p-3 text-left hover:border-neon-500/30 transition-all ${activeApp === app ? "border-neon-500/40" : ""}`}>
                <p className="text-neon-400 font-bold text-lg">{count.toLocaleString()}</p>
                <p className="text-star-500 text-xs truncate mt-0.5">{app}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* App filter */}
      {apps.length > 2 && (
        <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
          {apps.slice(0, 10).map((app) => (
            <button key={app} onClick={() => setActiveApp(app)}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all duration-150
                ${activeApp === app ? "bg-neon-500/15 text-neon-300 border border-neon-500/30" : "text-star-400 border border-transparent hover:bg-nebula-700/60"}`}>
              {app === "all" ? "All" : app}
              <span className={`ml-1.5 text-xs ${activeApp === app ? "text-neon-500" : "text-star-600"}`}>
                {app === "all" ? activities.length : appCounts[app]}
              </span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="glass-card h-14 shimmer" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Globe} title="No activity" message="Off-Meta activity events will appear here." />
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-neon-600/20">
                <th className="text-left px-4 py-3 text-star-500 font-medium text-xs uppercase tracking-wider">App / Site</th>
                <th className="text-left px-4 py-3 text-star-500 font-medium text-xs uppercase tracking-wider">Event</th>
                <th className="text-left px-4 py-3 text-star-500 font-medium text-xs uppercase tracking-wider hidden sm:table-cell">ID</th>
                <th className="text-left px-4 py-3 text-star-500 font-medium text-xs uppercase tracking-wider">When</th>
              </tr></thead>
              <tbody className="divide-y divide-nebula-700/50">
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-nebula-700/30 transition-colors">
                    <td className="px-4 py-3 text-star-200 font-medium text-sm max-w-[200px] truncate">{a.app_name}</td>
                    <td className="px-4 py-3"><span className="stat-badge">{a.event_type}</span></td>
                    <td className="px-4 py-3 font-mono text-star-500 text-xs hidden sm:table-cell max-w-[120px] truncate">{a.event_id || "—"}</td>
                    <td className="px-4 py-3 text-star-500 text-xs whitespace-nowrap">
                      {a.event_at ? formatDistanceToNow(new Date(a.event_at), { addSuffix: true }) : "—"}
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
