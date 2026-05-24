"use client";

import { useAuthStore } from "@/stores/authStore";
import { useMessagesStore } from "@/stores/messagesStore";
import { useEffect, useMemo } from "react";
import { MessageCircle, Users } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { formatDistanceToNow } from "date-fns";

export default function MessagesPage() {
  const token = useAuthStore((s) => s.token);
  const { conversations, messages, activeConversation, loading, fetchMessages, setActiveConversation } = useMessagesStore();

  useEffect(() => { if (token) fetchMessages(token); }, [token, fetchMessages]);

  const activeMessages = useMemo(() =>
    messages.filter((m) => m.conversation_id === activeConversation)
      .sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()),
    [messages, activeConversation]
  );

  const activeConv = conversations.find((c) => c.conversation_id === activeConversation);

  return (
    <div>
      <PageHeader
        icon={MessageCircle}
        title="Messages"
        description="Your direct message history from the archive."
        stats={[
          { label: "Conversations", value: conversations.length },
          { label: "Messages", value: messages.length },
        ]}
      />

      {loading ? (
        <div className="flex gap-4 h-96">
          <div className="w-64 glass-card space-y-2 p-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 shimmer rounded-lg" />)}
          </div>
          <div className="flex-1 glass-card p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className={`h-10 shimmer rounded-xl ${i % 2 ? "ml-auto w-1/2" : "w-2/3"}`} />)}
          </div>
        </div>
      ) : conversations.length === 0 ? (
        <EmptyState icon={MessageCircle} title="No messages" message="Your direct messages will appear here." />
      ) : (
        <div className="flex gap-4 h-[600px]">
          {/* Conversation list */}
          <div className="w-64 shrink-0 glass-card flex flex-col overflow-hidden">
            <div className="p-3 border-b border-neon-600/20">
              <p className="text-xs font-semibold text-star-500 uppercase tracking-wider">Conversations</p>
            </div>
            <div className="overflow-y-auto flex-1">
              {conversations.map((conv) => {
                const isActive = conv.conversation_id === activeConversation;
                const convMessages = messages.filter((m) => m.conversation_id === conv.conversation_id);
                const lastMsg = convMessages[0];
                const participants = conv.participants?.join(", ") ?? conv.conversation_id;
                return (
                  <button key={conv.id} onClick={() => setActiveConversation(conv.conversation_id)}
                    className={`w-full text-left p-3 flex flex-col gap-0.5 transition-colors border-b border-nebula-700/30
                      ${isActive ? "bg-neon-500/10" : "hover:bg-nebula-700/40"}`}>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-star-500 shrink-0" />
                      <span className={`text-xs font-medium truncate ${isActive ? "text-neon-400" : "text-star-200"}`}>{participants}</span>
                    </div>
                    {lastMsg && (
                      <p className="text-xs text-star-500 truncate pl-5">{lastMsg.content || "Media"}</p>
                    )}
                    <p className="text-[10px] text-star-600 pl-5">{convMessages.length} messages</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message thread */}
          <div className="flex-1 glass-card flex flex-col overflow-hidden">
            {activeConv ? (
              <>
                <div className="p-4 border-b border-neon-600/20 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-neon-400" />
                  <span className="font-medium text-star-200 text-sm">{activeConv.participants?.join(", ") ?? activeConv.conversation_id}</span>
                  <span className="ml-auto stat-badge">{activeMessages.length} messages</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {activeMessages.map((msg) => (
                    <div key={msg.id} className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-neon-400">{msg.sender_name}</span>
                        <span className="text-[10px] text-star-600">
                          {msg.sent_at ? formatDistanceToNow(new Date(msg.sent_at), { addSuffix: true }) : "—"}
                        </span>
                      </div>
                      <div className="glass-card px-3 py-2 max-w-xl text-sm text-star-200 rounded-xl"
                        style={{ background: "rgba(13, 24, 41, 0.9)" }}>
                        {msg.content || <span className="italic text-star-500">Media / attachment</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-star-500 text-sm">Select a conversation</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
