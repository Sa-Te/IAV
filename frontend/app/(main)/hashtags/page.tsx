"use client";

import { useAuthStore } from "@/stores/authStore";
import { useEffect, useState } from "react";
import { Hash } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

interface Hashtag { id: number; hashtag_name: string; }

export default function HashtagsPage() {
  const token = useAuthStore((s) => s.token);
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch("http://localhost:8080/api/v1/hashtags", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setHashtags)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div>
      <PageHeader
        icon={Hash}
        title="Hashtags"
        description="Hashtags you follow on Instagram."
        stats={[{ label: "Followed", value: hashtags.length }]}
      />

      {loading ? (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="h-8 shimmer rounded-full" style={{ width: `${60 + (i * 17) % 80}px` }} />
          ))}
        </div>
      ) : hashtags.length === 0 ? (
        <EmptyState icon={Hash} title="No hashtags" message="You don't follow any hashtags yet." />
      ) : (
        <div className="flex flex-wrap gap-2">
          {hashtags.map((h) => (
            <span key={h.id}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 hover:border-neon-400/50"
              style={{ background: "rgba(0, 163, 196, 0.08)", border: "1px solid rgba(0, 163, 196, 0.2)", color: "#00C4E8" }}>
              <Hash className="w-3 h-3 opacity-70" />
              {h.hashtag_name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
