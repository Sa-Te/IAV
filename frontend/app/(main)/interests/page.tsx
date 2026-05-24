"use client";

import { useAuthStore } from "@/stores/authStore";
import { useEffect, useState } from "react";
import { Tag } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

interface AdInterests {
  advertisers: string[];
  topics: string[];
}

export default function InterestsPage() {
  const token = useAuthStore((s) => s.token);
  const [data, setData] = useState<AdInterests>({ advertisers: [], topics: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"advertisers" | "topics">("advertisers");

  useEffect(() => {
    if (!token) return;
    fetch("/api/v1/ad-interests", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const current = activeTab === "advertisers" ? data.advertisers : data.topics;

  const getShade = (i: number) => {
    const shades = [
      "rgba(0, 163, 196, 0.12)", "rgba(0, 196, 232, 0.10)", "rgba(0, 100, 150, 0.15)",
      "rgba(0, 140, 180, 0.12)", "rgba(0, 229, 255, 0.08)"
    ];
    return shades[i % shades.length];
  };

  return (
    <div>
      <PageHeader
        icon={Tag}
        title="Ad Interests"
        description="What Instagram thinks you're interested in — used to target ads at you."
        stats={[
          { label: "Advertisers", value: data.advertisers.length },
          { label: "Topics", value: data.topics.length },
        ]}
      />

      <div className="flex gap-1 mb-6">
        {(["advertisers", "topics"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 capitalize
              ${activeTab === tab
                ? "bg-neon-500/15 text-neon-300 border border-neon-500/30"
                : "text-star-400 hover:text-star-200 hover:bg-nebula-700/60 border border-transparent"
              }`}>
            {tab}
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full font-semibold
              ${activeTab === tab ? "bg-neon-500/20 text-neon-400" : "bg-nebula-600 text-star-400"}`}>
              {(tab === "advertisers" ? data.advertisers : data.topics).length.toLocaleString()}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="h-7 shimmer rounded-lg" style={{ width: `${50 + (i * 23) % 120}px` }} />
          ))}
        </div>
      ) : current.length === 0 ? (
        <EmptyState icon={Tag} title="Nothing here" message="No data found for this category." />
      ) : (
        <div className="flex flex-wrap gap-2">
          {current.map((item, i) => (
            <span key={i}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium text-star-300 transition-colors duration-150 hover:text-neon-300"
              style={{ background: getShade(i), border: "1px solid rgba(0, 163, 196, 0.18)" }}>
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
