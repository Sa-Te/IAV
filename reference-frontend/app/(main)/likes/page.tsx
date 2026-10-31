"use client";

import { useAuthStore } from "@/stores/authStore";
import { useLikesStore } from "@/stores/likesStore";
import { useEffect, useState } from "react";
import { Heart, ExternalLink } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import TabNav from "@/components/ui/TabNav";
import EmptyState from "@/components/ui/EmptyState";
import { formatDistanceToNow } from "date-fns";

type Tab = "post_likes" | "comment_likes" | "story_likes";

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

export default function LikesPage() {
  const token = useAuthStore((s) => s.token);
  const { post_likes, comment_likes, story_likes, loading, fetchLikes } = useLikesStore();
  const [tab, setTab] = useState<Tab>("post_likes");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    if (token) fetchLikes(token);
  }, [token, fetchLikes]);

  const handleTabChange = (t: Tab) => { setTab(t); setVisibleCount(PAGE_SIZE); };

  const tabs = [
    { key: "post_likes" as Tab, label: "Post Likes", count: post_likes.length },
    { key: "comment_likes" as Tab, label: "Comment Likes", count: comment_likes.length },
    { key: "story_likes" as Tab, label: "Story Likes", count: story_likes.length },
  ];

  const current =
    tab === "post_likes" ? post_likes : tab === "comment_likes" ? comment_likes : story_likes;

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
      <TabNav tabs={tabs} active={tab} onChange={handleTabChange} />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass-card p-4 flex gap-3 items-center">
              <div className="w-7 h-7 rounded-full shimmer shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 shimmer rounded w-1/3" />
                <div className="h-2.5 shimmer rounded w-1/2" />
              </div>
              <div className="h-2.5 shimmer rounded w-20 shrink-0" />
            </div>
          ))}
        </div>
      ) : current.length === 0 ? (
        <EmptyState
          icon={Heart}
          title={`No ${tab.replace("_", " ")}`}
          message="Your liked content will appear here."
        />
      ) : (
        <>
          <div className="space-y-1.5">
            {current.slice(0, visibleCount).map((l) => {
              const username =
                tab === "post_likes"
                  ? (l as typeof post_likes[0]).creator_username
                  : tab === "comment_likes"
                  ? (l as typeof comment_likes[0]).owner_username
                  : (l as typeof story_likes[0]).creator_username;
              const postUrl =
                "post_url" in l ? (l as { post_url: string }).post_url : undefined;

              return (
                <div
                  key={l.id}
                  className="glass-card p-3.5 flex items-center gap-3 hover:border-neon-500/30 transition-all"
                >
                  <Heart className="w-4 h-4 text-pink-500 shrink-0" />
                  <span className="font-medium text-neon-400 text-sm">@{username}</span>
                  {postUrl && <PostLink url={postUrl} />}
                  <span className="flex-1" />
                  <span className="text-xs text-star-500 whitespace-nowrap shrink-0">
                    {l.liked_at
                      ? formatDistanceToNow(new Date(l.liked_at), { addSuffix: true })
                      : "—"}
                  </span>
                </div>
              );
            })}
          </div>
          {visibleCount < current.length && (
            <button
              onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
              className="mt-4 w-full py-2.5 rounded-xl text-sm text-neon-400 transition-colors"
              style={{ background: "rgba(0, 163, 196, 0.06)", border: "1px solid rgba(0, 163, 196, 0.2)" }}
            >
              Load more ({current.length - visibleCount} remaining)
            </button>
          )}
        </>
      )}
    </div>
  );
}
