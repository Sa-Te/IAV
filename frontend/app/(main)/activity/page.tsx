"use client";

import React, { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useActivityStore, ActivityType } from "@/stores/activityStore";
import { useEffect, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { Zap, Eye, FileVideo, ThumbsDown, UserCheck, ExternalLink } from "lucide-react";
import ActivityHeatmap from "./ActivityHeatMap";
import PageHeader from "@/components/ui/PageHeader";
import TabNav from "@/components/ui/TabNav";
import EmptyState from "@/components/ui/EmptyState";

const TABS: { key: ActivityType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "ad_viewed", label: "Ads Viewed", icon: Zap },
  { key: "post_viewed", label: "Posts Viewed", icon: Eye },
  { key: "video_watched", label: "Videos Watched", icon: FileVideo },
  { key: "suggested_profile_viewed", label: "Profiles Suggested", icon: UserCheck },
  { key: "post_not_interested", label: "Not Interested", icon: ThumbsDown },
];

const PAGE_SIZE = 100;

export default function ActivityPage() {
  const token = useAuthStore((s) => s.token);
  const { activities, loading, error, activeTab, fetchActivities, setActiveTab } =
    useActivityStore();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    if (token) fetchActivities(token);
  }, [token, fetchActivities]);

  const filtered = useMemo(
    () => activities.filter((a) => a.activity_type === activeTab),
    [activities, activeTab],
  );

  const handleTabChange = (t: ActivityType) => { setActiveTab(t); setVisibleCount(PAGE_SIZE); };

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    activities.forEach((a) => {
      c[a.activity_type] = (c[a.activity_type] || 0) + 1;
    });
    return c;
  }, [activities]);

  const tabs = TABS.map((t) => ({
    key: t.key,
    label: t.label,
    icon: t.icon,
    count: counts[t.key] ?? 0,
  }));

  return (
    <div>
      <PageHeader
        icon={Zap}
        title="Activity"
        description="A record of your content interactions across Instagram."
        stats={[{ label: "Total Events", value: activities.length }]}
      />

      {!loading && activities.length > 0 && <ActivityHeatmap data={filtered} />}

      <TabNav tabs={tabs} active={activeTab} onChange={handleTabChange} />

      <div className="glass-card p-4 md:p-6 min-h-64">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-nebula-700/30">
                <div className="w-9 h-9 rounded-full shimmer shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 shimmer rounded w-2/5" />
                  <div className="h-2.5 shimmer rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-400 text-sm mb-3">{error}</p>
            <button
              onClick={() => { if (token) fetchActivities(token); }}
              className="px-4 py-2 rounded-lg text-sm text-neon-400 transition-colors"
              style={{ background: "rgba(0, 163, 196, 0.08)", border: "1px solid rgba(0, 163, 196, 0.2)" }}
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Zap} title="No activity" message="No events recorded for this category." />
        ) : (
          <>
            <ul className="space-y-2">
              {filtered.slice(0, visibleCount).map((item) => {
                const TabIcon = TABS.find((t) => t.key === activeTab)?.icon ?? Zap;
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-nebula-700/30 hover:bg-nebula-600/30 transition-colors"
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: "rgba(0, 163, 196, 0.12)",
                        border: "1px solid rgba(0, 163, 196, 0.2)",
                      }}
                    >
                      <TabIcon className="w-4 h-4 text-neon-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {item.author ? (
                        <p className="text-sm font-medium text-star-200">
                          {activeTab === "ad_viewed" && (
                            <span className="text-star-500 mr-1">Ad from</span>
                          )}
                          <span className="text-neon-400">{item.author}</span>
                        </p>
                      ) : (
                        <p className="text-sm font-medium text-star-200">
                          Marked as not interested
                        </p>
                      )}
                      {item.details && (
                        <a
                          href={item.details}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-star-500 hover:text-neon-400 transition-colors mt-0.5"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View content
                        </a>
                      )}
                    </div>
                    <span className="text-xs text-star-500 whitespace-nowrap shrink-0">
                      {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                    </span>
                  </li>
                );
              })}
            </ul>
            {visibleCount < filtered.length && (
              <button
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                className="mt-4 w-full py-2.5 rounded-xl text-sm text-neon-400 transition-colors"
                style={{ background: "rgba(0, 163, 196, 0.06)", border: "1px solid rgba(0, 163, 196, 0.2)" }}
              >
                Load more ({filtered.length - visibleCount} remaining)
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
