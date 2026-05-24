"use client";

import { useAuthStore } from "@/stores/authStore";
import { useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import TabNav from "@/components/ui/TabNav";
import EmptyState from "@/components/ui/EmptyState";
import { formatDistanceToNow } from "date-fns";

interface Connection {
  id: number;
  username: string;
  connection_type: string;
  timestamp: string;
  contact_info: string;
}

const TYPE_LABELS: Record<string, string> = {
  follower: "Followers",
  following: "Following",
  blocked: "Blocked",
  close_friends: "Close Friends",
  contact: "Contacts",
  pending: "Pending",
  restricted: "Restricted",
  removed: "Removed",
  unfollowed: "Unfollowed",
  hide_story: "Hidden from Story",
};

export default function ConnectionsPage() {
  const token = useAuthStore((s) => s.token);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState("follower");

  useEffect(() => {
    if (!token) return;
    fetch("http://localhost:8080/api/v1/connections", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setConnections)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    connections.forEach((c) => { counts[c.connection_type] = (counts[c.connection_type] || 0) + 1; });
    return counts;
  }, [connections]);

  const availableTypes = Object.keys(typeCounts).sort();

  const filtered = useMemo(() => connections.filter((c) => c.connection_type === activeType), [connections, activeType]);

  const tabs = availableTypes.map((t) => ({ key: t, label: TYPE_LABELS[t] ?? t, count: typeCounts[t] }));

  return (
    <div>
      <PageHeader
        icon={Users}
        title="Connections"
        description="Everyone you follow, follow you, or have interacted with."
        stats={[
          { label: "Followers", value: typeCounts["follower"] ?? 0 },
          { label: "Following", value: typeCounts["following"] ?? 0 },
          { label: "Total", value: connections.length },
        ]}
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass-card p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full shimmer shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 shimmer rounded w-1/3" />
                <div className="h-2.5 shimmer rounded w-1/5" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <TabNav tabs={tabs} active={activeType} onChange={setActiveType} />
          {filtered.length === 0 ? (
            <EmptyState icon={Users} title="No connections" message={`No ${TYPE_LABELS[activeType] ?? activeType} found in your archive.`} />
          ) : (
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neon-600/20">
                      <th className="text-left px-4 py-3 text-star-500 font-medium text-xs uppercase tracking-wider">Username</th>
                      {activeType === "contact" && <th className="text-left px-4 py-3 text-star-500 font-medium text-xs uppercase tracking-wider">Contact</th>}
                      <th className="text-left px-4 py-3 text-star-500 font-medium text-xs uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-nebula-700/50">
                    {filtered.map((c) => (
                      <tr key={c.id} className="hover:bg-nebula-700/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-star-200">
                          <a href={`https://instagram.com/${c.username}`} target="_blank" rel="noopener noreferrer"
                            className="hover:text-neon-400 transition-colors">
                            @{c.username}
                          </a>
                        </td>
                        {activeType === "contact" && (
                          <td className="px-4 py-3 text-star-400">{c.contact_info || "—"}</td>
                        )}
                        <td className="px-4 py-3 text-star-500 whitespace-nowrap">
                          {c.timestamp ? formatDistanceToNow(new Date(c.timestamp), { addSuffix: true }) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
