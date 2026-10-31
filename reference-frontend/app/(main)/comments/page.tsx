"use client";

import { useAuthStore } from "@/stores/authStore";
import { useCommentsStore } from "@/stores/commentsStore";
import { useEffect, useState } from "react";
import { MessageSquare, ExternalLink } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import TabNav from "@/components/ui/TabNav";
import EmptyState from "@/components/ui/EmptyState";
import { formatDistanceToNow } from "date-fns";
import { fixInstagramEncoding } from "@/lib/fixEncoding";

type Tab = "post_comments" | "reel_comments";

const PAGE_SIZE = 50;

export default function CommentsPage() {
  const token = useAuthStore((s) => s.token);
  const { post_comments, reel_comments, loading, fetchComments } = useCommentsStore();
  const [tab, setTab] = useState<Tab>("post_comments");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    if (token) fetchComments(token);
  }, [token, fetchComments]);

  // Reset pagination when tab changes
  const handleTabChange = (t: Tab) => { setTab(t); setVisibleCount(PAGE_SIZE); };

  const tabs = [
    { key: "post_comments" as Tab, label: "Post Comments", count: post_comments.length },
    { key: "reel_comments" as Tab, label: "Reel Comments", count: reel_comments.length },
  ];

  const current = tab === "post_comments" ? post_comments : reel_comments;
  const visible = current.slice(0, visibleCount);

  return (
    <div>
      <PageHeader
        icon={MessageSquare}
        title="Comments"
        description="Comments you've left on posts and reels."
        stats={[
          { label: "Post Comments", value: post_comments.length },
          { label: "Reel Comments", value: reel_comments.length },
        ]}
      />
      <TabNav tabs={tabs} active={tab} onChange={handleTabChange} />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card p-4 space-y-2">
              <div className="flex gap-2 items-center">
                <div className="h-3 shimmer rounded w-1/4" />
                <div className="h-2.5 shimmer rounded w-16" />
              </div>
              <div className="h-3 shimmer rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : current.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No comments" message="Your comments will appear here." />
      ) : (
        <>
          <div className="space-y-2">
            {visible.map((c) => {
              const owner =
                tab === "post_comments"
                  ? (c as typeof post_comments[0]).post_owner_username
                  : (c as typeof reel_comments[0]).reel_owner_username;
              const commentText = fixInstagramEncoding(c.comment_text);
              return (
                <div key={c.id} className="glass-card p-4 hover:border-neon-500/30 transition-all">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-star-500">commented on</span>
                      <span className="text-sm font-medium text-neon-400">@{owner}</span>
                      <span className="text-xs text-star-500">
                        {tab === "post_comments" ? "post" : "reel"}
                      </span>
                    </div>
                    <span className="text-xs text-star-500 whitespace-nowrap">
                      {c.commented_at
                        ? formatDistanceToNow(new Date(c.commented_at), { addSuffix: true })
                        : "—"}
                    </span>
                  </div>
                  <p className="text-sm text-star-200 leading-relaxed break-words">{commentText}</p>
                </div>
              );
            })}
          </div>
          {visibleCount < current.length && (
            <button
              onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
              className="mt-4 w-full py-2.5 rounded-xl text-sm text-neon-400 transition-colors flex items-center justify-center gap-2"
              style={{ background: "rgba(0, 163, 196, 0.06)", border: "1px solid rgba(0, 163, 196, 0.2)" }}
            >
              <ExternalLink className="w-4 h-4" />
              Load more ({current.length - visibleCount} remaining)
            </button>
          )}
        </>
      )}
    </div>
  );
}
