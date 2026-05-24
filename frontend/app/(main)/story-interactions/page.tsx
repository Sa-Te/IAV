"use client";

import { useAuthStore } from "@/stores/authStore";
import { useStoryStore } from "@/stores/storyStore";
import { useEffect, useState } from "react";
import { Film, HelpCircle, CheckSquare, MessageCircle, Sliders, Smile } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import TabNav from "@/components/ui/TabNav";
import EmptyState from "@/components/ui/EmptyState";
import { formatDistanceToNow } from "date-fns";

type Tab = "polls" | "quizzes" | "questions" | "sliders" | "reactions";

export default function StoryInteractionsPage() {
  const token = useAuthStore((s) => s.token);
  const { polls, quizzes, questions, emoji_sliders, reactions, loading, fetchStoryInteractions } = useStoryStore();
  const [tab, setTab] = useState<Tab>("polls");

  useEffect(() => { if (token) fetchStoryInteractions(token); }, [token, fetchStoryInteractions]);

  const tabs = [
    { key: "polls" as Tab, label: "Polls", icon: HelpCircle, count: polls.length },
    { key: "quizzes" as Tab, label: "Quizzes", icon: CheckSquare, count: quizzes.length },
    { key: "questions" as Tab, label: "Questions", icon: MessageCircle, count: questions.length },
    { key: "sliders" as Tab, label: "Sliders", icon: Sliders, count: emoji_sliders.length },
    { key: "reactions" as Tab, label: "Reactions", icon: Smile, count: reactions.length },
  ];

  const renderItem = (id: number, creator: string, date: string, detail?: string | number) => (
    <div key={id} className="glass-card p-3.5 flex items-center gap-3 hover:border-neon-500/30 transition-all">
      <Film className="w-4 h-4 text-purple-400 shrink-0" />
      <span className="text-neon-400 text-sm font-medium">@{creator}</span>
      {detail !== undefined && detail !== "" && (
        <span className="text-star-300 text-sm">{String(detail)}</span>
      )}
      <span className="flex-1" />
      <span className="text-xs text-star-500 whitespace-nowrap">{date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : "—"}</span>
    </div>
  );

  return (
    <div>
      <PageHeader
        icon={Film}
        title="Story Interactions"
        description="Polls, quizzes, and reactions you've participated in on stories."
        accent="#A855F7"
        stats={[
          { label: "Polls", value: polls.length },
          { label: "Quizzes", value: quizzes.length },
          { label: "Other", value: questions.length + emoji_sliders.length + reactions.length },
        ]}
      />
      <TabNav tabs={tabs} active={tab} onChange={setTab} />

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="glass-card h-14 shimmer" />)}</div>
      ) : tab === "polls" ? (
        polls.length === 0 ? <EmptyState icon={HelpCircle} title="No polls" message="Story polls you answered will appear here." /> : (
          <div className="space-y-1.5">{polls.map((p) => renderItem(p.id, p.creator_username, p.answered_at, p.poll_answer))}</div>
        )
      ) : tab === "quizzes" ? (
        quizzes.length === 0 ? <EmptyState icon={CheckSquare} title="No quizzes" message="Story quizzes you answered will appear here." /> : (
          <div className="space-y-1.5">{quizzes.map((q) => renderItem(q.id, q.creator_username, q.answered_at, q.quiz_answer))}</div>
        )
      ) : tab === "questions" ? (
        questions.length === 0 ? <EmptyState icon={MessageCircle} title="No questions" message="Story questions you responded to will appear here." /> : (
          <div className="space-y-1.5">{questions.map((q) => renderItem(q.id, q.creator_username, q.responded_at))}</div>
        )
      ) : tab === "sliders" ? (
        emoji_sliders.length === 0 ? <EmptyState icon={Sliders} title="No slider responses" message="Emoji sliders you interacted with will appear here." /> : (
          <div className="space-y-1.5">
            {emoji_sliders.map((s) => (
              <div key={s.id} className="glass-card p-3.5 flex items-center gap-3 hover:border-neon-500/30 transition-all">
                <Sliders className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="text-neon-400 text-sm font-medium">@{s.creator_username}</span>
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex-1 h-1.5 rounded-full bg-nebula-600 max-w-32">
                    <div className="h-full rounded-full bg-neon-500" style={{ width: `${Math.min(100, s.slider_value * 100)}%` }} />
                  </div>
                  <span className="text-star-300 text-xs">{(s.slider_value * 100).toFixed(0)}%</span>
                </div>
                <span className="text-xs text-star-500 whitespace-nowrap">{s.responded_at ? formatDistanceToNow(new Date(s.responded_at), { addSuffix: true }) : "—"}</span>
              </div>
            ))}
          </div>
        )
      ) : (
        reactions.length === 0 ? <EmptyState icon={Smile} title="No reactions" message="Story reactions will appear here." /> : (
          <div className="space-y-1.5">{reactions.map((r) => renderItem(r.id, r.creator_username, r.responded_at))}</div>
        )
      )}
    </div>
  );
}
