"use client";

import { useAuthStore } from "@/stores/authStore";
import { useProfileStore } from "@/stores/profileStore";
import { useEffect, useState } from "react";
import { User, Camera, RefreshCw, Mail, Phone, Calendar } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import TabNav from "@/components/ui/TabNav";
import EmptyState from "@/components/ui/EmptyState";
import MediaRenderer from "@/features/gallery/components/MediaRenderer";
import { formatDistanceToNow } from "date-fns";

type Tab = "overview" | "changes" | "photos";

const FIELD_ICONS: Record<string, React.ElementType> = {
  email: Mail,
  phone_number: Phone,
  date_of_birth: Calendar,
  bio: User,
};

export default function ProfilePage() {
  const token = useAuthStore((s) => s.token);
  const { profile, changes, photos, loading, fetchProfile } = useProfileStore();
  const [tab, setTab] = useState<Tab>("overview");
  const [expandedChange, setExpandedChange] = useState<number | null>(null);

  useEffect(() => {
    if (token) fetchProfile(token);
  }, [token, fetchProfile]);

  const tabs = [
    { key: "overview" as Tab, label: "Overview" },
    { key: "changes" as Tab, label: "Change Log", count: changes.length },
    { key: "photos" as Tab, label: "Photos", count: photos.length },
  ];

  return (
    <div>
      <PageHeader
        icon={User}
        title="Profile"
        description="Your Instagram profile information and history."
        stats={[
          { label: "Changes", value: changes.length },
          { label: "Photos", value: photos.length },
        ]}
      />
      <TabNav tabs={tabs} active={tab} onChange={setTab} />

      {loading ? (
        <div className="glass-card p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-4 shimmer rounded w-1/5" />
              <div className="h-4 shimmer rounded w-2/5" />
            </div>
          ))}
        </div>
      ) : tab === "overview" ? (
        !profile ? (
          <EmptyState icon={User} title="No profile data" message="Upload your archive to see profile information." />
        ) : (
          <div className="space-y-4">
            {/* Profile photo in overview */}
            {profile.profile_photo_uri && (
              <div className="flex items-center gap-4 glass-card p-4">
                <div
                  className="w-20 h-20 rounded-2xl overflow-hidden shrink-0"
                  style={{ border: "1px solid rgba(0, 163, 196, 0.3)" }}
                >
                  <MediaRenderer uri={profile.profile_photo_uri} token={token} />
                </div>
                <div>
                  <p className="font-bold text-star-200 text-xl">@{profile.username || "—"}</p>
                  {profile.bio && (
                    <p className="text-sm text-star-400 mt-1 max-w-md">{profile.bio}</p>
                  )}
                </div>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              {[
                { label: "Username", value: profile.username, icon: User },
                { label: "Email", value: profile.email, icon: Mail },
                { label: "Phone", value: profile.phone_number, icon: Phone },
                { label: "Gender", value: profile.gender, icon: User },
                { label: "Date of Birth", value: profile.date_of_birth, icon: Calendar },
                { label: "Bio", value: profile.bio, icon: User },
              ]
                .filter((f) => f.value)
                .map(({ label, value, icon: Icon }) => (
                  <div key={label} className="glass-card p-4 flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "rgba(0, 163, 196, 0.1)", border: "1px solid rgba(0, 163, 196, 0.2)" }}
                    >
                      <Icon className="w-4 h-4 text-neon-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-star-500 uppercase tracking-wider mb-0.5">{label}</p>
                      <p className="text-star-200 font-medium break-words">{value}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )
      ) : tab === "changes" ? (
        changes.length === 0 ? (
          <EmptyState icon={RefreshCw} title="No changes" message="Profile change history will appear here." />
        ) : (
          <div className="space-y-2">
            {changes.map((c) => {
              const Icon = FIELD_ICONS[c.field_changed] ?? RefreshCw;
              const isExpanded = expandedChange === c.id;
              const isTruncatable =
                (c.previous_value?.length ?? 0) > 60 || (c.new_value?.length ?? 0) > 60;
              return (
                <div key={c.id} className="glass-card p-4 hover:border-neon-500/30 transition-all">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-neon-400" />
                      <span className="text-sm font-medium text-star-200 capitalize">
                        {c.field_changed.replace(/_/g, " ")}
                      </span>
                    </div>
                    <span className="text-xs text-star-500">
                      {c.changed_at
                        ? formatDistanceToNow(new Date(c.changed_at), { addSuffix: true })
                        : "—"}
                    </span>
                  </div>
                  {c.previous_value && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-start gap-2 text-xs flex-wrap">
                        <span className="text-star-600 shrink-0 mt-0.5">Before:</span>
                        <span
                          className={`text-star-500 break-words ${
                            isTruncatable && !isExpanded ? "line-clamp-2" : ""
                          }`}
                        >
                          {c.previous_value}
                        </span>
                      </div>
                      <div className="flex items-start gap-2 text-xs flex-wrap">
                        <span className="text-star-600 shrink-0 mt-0.5">After:</span>
                        <span
                          className={`text-neon-400 break-words ${
                            isTruncatable && !isExpanded ? "line-clamp-2" : ""
                          }`}
                        >
                          {c.new_value}
                        </span>
                      </div>
                      {isTruncatable && (
                        <button
                          onClick={() => setExpandedChange(isExpanded ? null : c.id)}
                          className="text-xs text-neon-500 hover:text-neon-300 transition-colors mt-1"
                        >
                          {isExpanded ? "Show less" : "Show full text"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        photos.length === 0 ? (
          <EmptyState icon={Camera} title="No photos" message="Profile photo history will appear here." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((ph, i) => (
              <div key={ph.id} className="glass-card overflow-hidden hover:border-neon-500/30 transition-all">
                <div className="aspect-square bg-nebula-700 overflow-hidden">
                  {ph.photo_uri ? (
                    <MediaRenderer uri={ph.photo_uri} token={token} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera className="w-8 h-8 text-star-600" />
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-xs text-star-500">
                    {i === 0
                      ? "Most recent"
                      : ph.set_at
                      ? formatDistanceToNow(new Date(ph.set_at), { addSuffix: true })
                      : "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
