"use client";

import { useAuthStore } from "@/stores/authStore";
import { useSavedStore } from "@/stores/savedStore";
import { useEffect, useState } from "react";
import { Bookmark, FolderOpen, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import TabNav from "@/components/ui/TabNav";
import EmptyState from "@/components/ui/EmptyState";
import { formatDistanceToNow } from "date-fns";

type Tab = "saved_media" | "collections";

const PAGE_SIZE = 50;

function PostLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-star-500 hover:text-neon-400 transition-colors"
    >
      <ExternalLink className="w-3 h-3" />
      View post
    </a>
  );
}

export default function SavedPage() {
  const token = useAuthStore((s) => s.token);
  const { saved_media, collections, collection_items, loading, fetchSaved } = useSavedStore();
  const [tab, setTab] = useState<Tab>("saved_media");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [expandedCollections, setExpandedCollections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (token) fetchSaved(token);
  }, [token, fetchSaved]);

  const handleTabChange = (t: Tab) => { setTab(t); setVisibleCount(PAGE_SIZE); };

  const toggleCollection = (name: string) =>
    setExpandedCollections((prev) => ({ ...prev, [name]: !prev[name] }));

  const tabs = [
    { key: "saved_media" as Tab, label: "Saved Posts", count: saved_media.length },
    { key: "collections" as Tab, label: "Collections", count: collections.length },
  ];

  return (
    <div>
      <PageHeader
        icon={Bookmark}
        title="Saved"
        description="Posts and collections you've bookmarked."
        accent="#F59E0B"
        stats={[
          { label: "Saved Posts", value: saved_media.length },
          { label: "Collections", value: collections.length },
          { label: "Collection Items", value: collection_items.length },
        ]}
      />
      <TabNav tabs={tabs} active={tab} onChange={handleTabChange} />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card p-4 h-16 shimmer" />
          ))}
        </div>
      ) : tab === "saved_media" ? (
        saved_media.length === 0 ? (
          <EmptyState icon={Bookmark} title="No saved posts" message="Posts you bookmark will appear here." />
        ) : (
          <>
            <div className="space-y-1.5">
              {saved_media.slice(0, visibleCount).map((m) => (
                <div
                  key={m.id}
                  className="glass-card p-3.5 flex items-center gap-3 hover:border-neon-500/30 transition-all"
                >
                  <Bookmark className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-neon-400 text-sm font-medium">@{m.creator_username}</span>
                  {m.post_url && <PostLink url={m.post_url} />}
                  <span className="flex-1" />
                  <span className="text-xs text-star-500 whitespace-nowrap shrink-0">
                    {m.saved_at ? formatDistanceToNow(new Date(m.saved_at), { addSuffix: true }) : "—"}
                  </span>
                </div>
              ))}
            </div>
            {visibleCount < saved_media.length && (
              <button
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                className="mt-4 w-full py-2.5 rounded-xl text-sm text-neon-400 transition-colors"
                style={{ background: "rgba(0, 163, 196, 0.06)", border: "1px solid rgba(0, 163, 196, 0.2)" }}
              >
                Load more ({saved_media.length - visibleCount} remaining)
              </button>
            )}
          </>
        )
      ) : (
        collections.length === 0 ? (
          <EmptyState icon={FolderOpen} title="No collections" message="Your saved collections will appear here." />
        ) : (
          <div className="space-y-2">
            {collections.map((c) => {
              const items = collection_items.filter((ci) => ci.collection_name === c.collection_name);
              const isExpanded = expandedCollections[c.collection_name] ?? false;
              return (
                <div key={c.id} className="glass-card overflow-hidden">
                  {/* Collection header — clickable */}
                  <button
                    onClick={() => toggleCollection(c.collection_name)}
                    className="w-full p-4 flex items-center gap-3 hover:bg-nebula-700/30 transition-colors text-left"
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.25)" }}
                    >
                      <FolderOpen className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-star-200 text-sm">{c.collection_name}</p>
                      <p className="text-xs text-star-500 mt-0.5">
                        {items.length} item{items.length !== 1 ? "s" : ""} ·{" "}
                        Created{" "}
                        {c.created_at
                          ? formatDistanceToNow(new Date(c.created_at), { addSuffix: true })
                          : "—"}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-star-500 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-star-500 shrink-0" />
                    )}
                  </button>

                  {/* Collection items — expanded */}
                  {isExpanded && (
                    <div className="border-t border-nebula-700/50">
                      {items.length === 0 ? (
                        <p className="px-4 py-3 text-xs text-star-500">No items in this collection.</p>
                      ) : (
                        <div className="divide-y divide-nebula-700/30">
                          {items.map((ci) => (
                            <div
                              key={ci.id}
                              className="px-4 py-3 flex items-center gap-3 hover:bg-nebula-700/20 transition-colors"
                            >
                              <Bookmark className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span className="text-neon-400 text-sm">@{ci.creator_username}</span>
                              {ci.item_url && <PostLink url={ci.item_url} />}
                              <span className="flex-1" />
                              <span className="text-xs text-star-500 whitespace-nowrap shrink-0">
                                {ci.added_at
                                  ? formatDistanceToNow(new Date(ci.added_at), { addSuffix: true })
                                  : "—"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
