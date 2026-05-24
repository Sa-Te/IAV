"use client";

import { useAuthStore } from "@/stores/authStore";
import { useTopicsStore } from "@/stores/topicsStore";
import { useEffect, useState } from "react";
import { Compass, MapPin, Tag, Brain } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import TabNav from "@/components/ui/TabNav";
import EmptyState from "@/components/ui/EmptyState";

type Tab = "ai_interests" | "topics" | "locations";

export default function TopicsPage() {
  const token = useAuthStore((s) => s.token);
  const { ai_interests, topics, inferred_location, locations_of_interest, loading, fetchTopics } = useTopicsStore();
  const [tab, setTab] = useState<Tab>("ai_interests");

  useEffect(() => { if (token) fetchTopics(token); }, [token, fetchTopics]);

  const tabs = [
    { key: "ai_interests" as Tab, label: "AI Interests", icon: Brain, count: ai_interests.length },
    { key: "topics" as Tab, label: "Topics", icon: Tag, count: topics.length },
    { key: "locations" as Tab, label: "Locations", icon: MapPin, count: locations_of_interest.length + (inferred_location ? 1 : 0) },
  ];

  const getShade = (i: number) => {
    const shades = ["rgba(0, 163, 196, 0.12)", "rgba(0, 100, 180, 0.12)", "rgba(0, 196, 150, 0.10)", "rgba(100, 100, 200, 0.12)"];
    return shades[i % shades.length];
  };

  return (
    <div>
      <PageHeader
        icon={Compass}
        title="Topics & Location"
        description="What Instagram's algorithm knows about your interests and whereabouts."
        accent="#06B6D4"
        stats={[
          { label: "AI Interests", value: ai_interests.length },
          { label: "Topics", value: topics.length },
          { label: "Locations", value: locations_of_interest.length },
        ]}
      />
      <TabNav tabs={tabs} active={tab} onChange={setTab} />

      {loading ? (
        <div className="flex flex-wrap gap-2">{Array.from({ length: 20 }).map((_, i) => <div key={i} className="h-8 shimmer rounded-lg" style={{ width: `${60 + (i * 29) % 100}px` }} />)}</div>
      ) : tab === "ai_interests" ? (
        ai_interests.length === 0 ? <EmptyState icon={Brain} title="No AI interests" message="Instagram's inferred interests about you will appear here." /> : (
          <div className="flex flex-wrap gap-2">
            {ai_interests.map((a, i) => (
              <span key={a.id} className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm text-star-300 transition-colors hover:text-neon-300"
                style={{ background: getShade(i), border: "1px solid rgba(0, 163, 196, 0.18)" }}>
                {a.interest_description}
              </span>
            ))}
          </div>
        )
      ) : tab === "topics" ? (
        topics.length === 0 ? <EmptyState icon={Tag} title="No topics" message="Recommended topics will appear here." /> : (
          <div className="flex flex-wrap gap-2">
            {topics.map((t) => (
              <span key={t.id} className="inline-flex items-center px-3 py-1.5 rounded-full text-sm text-star-300 transition-colors hover:text-neon-300"
                style={{ background: "rgba(0, 163, 196, 0.08)", border: "1px solid rgba(0, 163, 196, 0.2)" }}>
                {t.topic_name}
              </span>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-4">
          {inferred_location && (
            <div className="glass-card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(0, 163, 196, 0.1)", border: "1px solid rgba(0, 163, 196, 0.2)" }}>
                <MapPin className="w-5 h-5 text-neon-400" />
              </div>
              <div>
                <p className="text-xs text-star-500 uppercase tracking-wider mb-0.5">Inferred Location</p>
                <p className="text-star-200 font-semibold">{inferred_location.city_name}</p>
              </div>
              <span className="ml-auto stat-badge">Primary</span>
            </div>
          )}
          {locations_of_interest.length === 0 && !inferred_location ? (
            <EmptyState icon={MapPin} title="No location data" message="Location data from your archive will appear here." />
          ) : (
            <div>
              <p className="text-sm text-star-500 mb-3 font-medium">Locations of Interest</p>
              <div className="flex flex-wrap gap-2">
                {locations_of_interest.map((loc, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-star-300"
                    style={{ background: "rgba(0, 163, 196, 0.08)", border: "1px solid rgba(0, 163, 196, 0.18)" }}>
                    <MapPin className="w-3 h-3 text-neon-500 shrink-0" />
                    {loc}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
