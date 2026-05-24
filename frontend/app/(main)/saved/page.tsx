"use client";

import { useAuthStore } from "@/stores/authStore";
import { useSavedStore } from "@/stores/savedStore";
import { useEffect, useState } from "react";
import { Bookmark, FolderOpen } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import TabNav from "@/components/ui/TabNav";
import EmptyState from "@/components/ui/EmptyState";
import { formatDistanceToNow } from "date-fns";

type Tab = "saved_media" | "collections" | "collection_items";

export default function SavedPage() {
  const token = useAuthStore((s) => s.token);
  const { saved_media, collections, collection_items, loading, fetchSaved } = useSavedStore();
  const [tab, setTab] = useState<Tab>("saved_media");

  useEffect(() => { if (token) fetchSaved(token); }, [token, fetchSaved]);

  const tabs = [
    { key: "saved_media" as Tab, label: "Saved Posts", count: saved_media.length },
    { key: "collections" as Tab, label: "Collections", count: collections.length },
    { key: "collection_items" as Tab, label: "Collection Items", count: collection_items.length },
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
        ]}
      />
      <TabNav tabs={tabs} active={tab} onChange={setTab} />

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="glass-card p-4 h-16 shimmer" />)}</div>
      ) : tab === "saved_media" ? (
        saved_media.length === 0 ? <EmptyState icon={Bookmark} title="No saved posts" message="Posts you bookmark will appear here." /> : (
          <div className="space-y-1.5">
            {saved_media.map((m) => (
              <div key={m.id} className="glass-card p-3.5 flex items-center gap-3 hover:border-neon-500/30 transition-all">
                <Bookmark className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-neon-400 text-sm font-medium">@{m.creator_username}</span>
                {m.post_url && <a href={m.post_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-star-500 hover:text-neon-400 truncate flex-1 transition-colors">{m.post_url}</a>}
                <span className="text-xs text-star-500 whitespace-nowrap shrink-0">
                  {m.saved_at ? formatDistanceToNow(new Date(m.saved_at), { addSuffix: true }) : "—"}
                </span>
              </div>
            ))}
          </div>
        )
      ) : tab === "collections" ? (
        collections.length === 0 ? <EmptyState icon={FolderOpen} title="No collections" message="Your saved collections will appear here." /> : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {collections.map((c) => (
              <div key={c.id} className="glass-card p-4 hover:border-neon-500/30 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-semibold text-star-200 text-sm truncate">{c.collection_name}</span>
                </div>
                <p className="text-xs text-star-500">
                  Created {c.created_at ? formatDistanceToNow(new Date(c.created_at), { addSuffix: true }) : "—"}
                </p>
              </div>
            ))}
          </div>
        )
      ) : (
        collection_items.length === 0 ? <EmptyState icon={Bookmark} title="No items" message="Items in your collections will appear here." /> : (
          <div className="space-y-1.5">
            {collection_items.map((ci) => (
              <div key={ci.id} className="glass-card p-3.5 flex items-center gap-3 hover:border-neon-500/30 transition-all">
                <span className="stat-badge">{ci.collection_name}</span>
                <span className="text-neon-400 text-sm">@{ci.creator_username}</span>
                {ci.item_url && <a href={ci.item_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-star-500 hover:text-neon-400 truncate flex-1 transition-colors">{ci.item_url}</a>}
                <span className="text-xs text-star-500 whitespace-nowrap shrink-0">
                  {ci.added_at ? formatDistanceToNow(new Date(ci.added_at), { addSuffix: true }) : "—"}
                </span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
