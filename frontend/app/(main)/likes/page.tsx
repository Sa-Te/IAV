"use client";

import { useAuthStore } from "@/stores/authStore";
import { useLikesStore } from "@/stores/likesStore";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import TabNav from "@/components/ui/TabNav";
import EmptyState from "@/components/ui/EmptyState";
import { formatDistanceToNow } from "date-fns";

type Tab = "post_likes" | "comment_likes" | "story_likes";

export default function LikesPage() {
  const token = useAuthStore((s) => s.token);
  const { post_likes, comment_likes, story_likes, loading, fetchLikes } = useLikesStore();
  const [tab, setTab] = useState<Tab>("post_likes");

  useEffect(() => { if (token) fetchLikes(token); }, [token, fetchLikes]);

  const tabs = [
    { key: "post_likes" as Tab, label: "Post Likes", count: post_likes.length },
    { key: "comment_likes" as Tab, label: "Comment Likes", count: comment_likes.length },
    { key: "story_likes" as Tab, label: "Story Likes", count: story_likes.length },
  ];

  return (
    <div>
      <PageHeader
        icon={Heart}
        title="Likes"
        description="Everything you've ever liked on Instagram."
        accent="#E84393"
        stats={[
          { label: "Post Likes", value: post_likes.length },
          { label: "Comment Likes", value: comment_likes.length },
          { label: "Story Likes", value: story_likes.length },
        ]}
      />
      <TabNav tabs={tabs} active={tab} onChange={setTab} />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass-card p-4 flex gap-3 items-center">
              <div className="w-7 h-7 rounded-full shimmer shrink-0" />
              <div className="flex-1 space-y-1.5"><div className="h-3 shimmer rounded w-1/3" /><div className="h-2.5 shimmer rounded w-1/2" /></div>
              <div className="h-2.5 shimmer rounded w-20 shrink-0" />
            </div>
          ))}
        </div>
      ) : tab === "post_likes" ? (
        post_likes.length === 0 ? <EmptyState icon={Heart} title="No post likes" message="Your liked posts will appear here." /> : (
          <div className="space-y-1.5">
            {post_likes.map((l) => (
              <div key={l.id} className="glass-card p-3.5 flex items-center gap-3 hover:border-neon-500/30 transition-all">
                <Heart className="w-4 h-4 text-pink-500 shrink-0" />
                <span className="font-medium text-neon-400 text-sm">@{l.creator_username}</span>
                {l.post_url && <a href={l.post_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-star-500 hover:text-neon-400 truncate transition-colors flex-1">{l.post_url}</a>}
                <span className="text-xs text-star-500 whitespace-nowrap shrink-0">
                  {l.liked_at ? formatDistanceToNow(new Date(l.liked_at), { addSuffix: true }) : "—"}
                </span>
              </div>
            ))}
          </div>
        )
      ) : tab === "comment_likes" ? (
        comment_likes.length === 0 ? <EmptyState icon={Heart} title="No comment likes" message="Your liked comments will appear here." /> : (
          <div className="space-y-1.5">
            {comment_likes.map((l) => (
              <div key={l.id} className="glass-card p-3.5 flex items-center gap-3 hover:border-neon-500/30 transition-all">
                <Heart className="w-4 h-4 text-pink-500 shrink-0" />
                <span className="font-medium text-neon-400 text-sm">@{l.owner_username}</span>
                {l.post_url && <a href={l.post_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-star-500 hover:text-neon-400 truncate transition-colors flex-1">{l.post_url}</a>}
                <span className="text-xs text-star-500 whitespace-nowrap shrink-0">
                  {l.liked_at ? formatDistanceToNow(new Date(l.liked_at), { addSuffix: true }) : "—"}
                </span>
              </div>
            ))}
          </div>
        )
      ) : (
        story_likes.length === 0 ? <EmptyState icon={Heart} title="No story likes" message="Your liked stories will appear here." /> : (
          <div className="space-y-1.5">
            {story_likes.map((l) => (
              <div key={l.id} className="glass-card p-3.5 flex items-center gap-3 hover:border-neon-500/30 transition-all">
                <Heart className="w-4 h-4 text-pink-500 shrink-0" />
                <span className="font-medium text-neon-400 text-sm">@{l.creator_username}</span>
                <span className="flex-1" />
                <span className="text-xs text-star-500 whitespace-nowrap shrink-0">
                  {l.liked_at ? formatDistanceToNow(new Date(l.liked_at), { addSuffix: true }) : "—"}
                </span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
