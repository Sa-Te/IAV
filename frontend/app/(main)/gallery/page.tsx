"use client";

import { useAuthStore } from "@/stores/authStore";
import { useGalleryStore } from "@/stores/galleryStore";
import { useEffect, useMemo } from "react";
import { LayoutGrid } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import PageHeader from "@/components/ui/PageHeader";
import TabNav from "@/components/ui/TabNav";
import EmptyState from "@/components/ui/EmptyState";
import ViewSwitcher, { type GalleryView } from "@/features/gallery/components/ViewSwitcher";
import GridView from "@/features/gallery/components/GridView";
import TimelineView from "@/features/gallery/components/TimelineView";
import MapView from "@/features/gallery/components/MapView";
import CycloneView from "@/features/gallery/components/CycloneView";
import DetailModal from "@/features/gallery/components/DetailModal";

const TABS = [
  { key: "Posts", label: "Posts" },
  { key: "Stories", label: "Stories" },
];

export default function GalleryPage() {
  const token = useAuthStore((s) => s.token);
  const {
    items, loading, activeTab, setActiveTab,
    currentView, setCurrentView,
    selectedIndex, setSelectedIndex,
    fetchMedia,
  } = useGalleryStore();

  useEffect(() => {
    if (token) fetchMedia(token);
  }, [token, fetchMedia]);

  const filtered = useMemo(() => {
    const type = activeTab === "Posts" ? "post" : "story";
    return items
      .filter((i) => i.media_type.toLowerCase() === type)
      .sort((a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime());
  }, [items, activeTab]);

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, typeof filtered>>((acc, item) => {
      const key = new Date(item.taken_at).toLocaleString("default", { month: "long", year: "numeric" });
      (acc[key] = acc[key] ?? []).push(item);
      return acc;
    }, {});
  }, [filtered]);

  const postCount = items.filter((i) => i.media_type === "post").length;
  const storyCount = items.filter((i) => i.media_type === "story").length;

  return (
    <div>
      <AnimatePresence>
        {selectedIndex !== null && (
          <DetailModal
            items={filtered}
            index={selectedIndex}
            token={token}
            onClose={() => setSelectedIndex(null)}
            onNav={setSelectedIndex}
          />
        )}
      </AnimatePresence>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <PageHeader
          icon={LayoutGrid}
          title="Gallery"
          description="Your photos and videos, organised across time."
          stats={[
            { label: "Posts", value: postCount },
            { label: "Stories", value: storyCount },
          ]}
        />
        <ViewSwitcher current={currentView as GalleryView} onChange={setCurrentView} />
      </div>

      <TabNav
        tabs={TABS.map((t) => ({ ...t, count: t.key === "Posts" ? postCount : storyCount }))}
        active={activeTab}
        onChange={setActiveTab}
      />

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="glass-card overflow-hidden">
              <div className="aspect-square shimmer" />
              <div className="p-3 space-y-2">
                <div className="h-2.5 shimmer rounded w-3/4" />
                <div className="h-2 shimmer rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={LayoutGrid} title="No media yet" message="Upload your Instagram archive to see your photos and videos here." />
      ) : currentView === "Grid" ? (
        <GridView media={filtered} token={token} onSelect={setSelectedIndex} />
      ) : currentView === "Timeline" ? (
        <TimelineView groupedMedia={grouped} allItems={filtered} token={token} onSelect={setSelectedIndex} />
      ) : currentView === "Cyclone" ? (
        <CycloneView items={filtered} token={token} onSelect={setSelectedIndex} />
      ) : (
        <MapView />
      )}
    </div>
  );
}
