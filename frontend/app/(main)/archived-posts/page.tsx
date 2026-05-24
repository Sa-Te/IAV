"use client";

import { useAuthStore } from "@/stores/authStore";
import { useArchivedPostsStore } from "@/stores/archivedPostsStore";
import { useEffect } from "react";
import { Archive, Image as ImageIcon } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

export default function ArchivedPostsPage() {
  const token = useAuthStore((s) => s.token);
  const { posts, loading, fetchArchivedPosts } = useArchivedPostsStore();

  useEffect(() => { if (token) fetchArchivedPosts(token); }, [token, fetchArchivedPosts]);

  return (
    <div>
      <PageHeader
        icon={Archive}
        title="Archived Posts"
        description="Posts you've archived — hidden from your profile but still in your data."
        stats={[{ label: "Archived", value: posts.length }]}
      />

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="glass-card overflow-hidden">
              <div className="aspect-square shimmer" />
              <div className="p-3 space-y-2"><div className="h-2.5 shimmer rounded w-3/4" /><div className="h-2 shimmer rounded w-1/2" /></div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState icon={Archive} title="No archived posts" message="Posts you've archived on Instagram will appear here." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {posts.map((p) => (
            <div key={p.id} className="glass-card overflow-hidden hover:border-neon-500/40 transition-all duration-200">
              <div className="aspect-square bg-nebula-700 flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-star-600" />
              </div>
              <div className="p-3">
                <p className="text-xs text-star-300 truncate">{p.caption || "No caption"}</p>
                <p className="text-[10px] text-star-500 mt-1">{p.taken_at ? new Date(p.taken_at).toLocaleDateString() : "—"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
