"use client";

import { useAuthStore } from "@/stores/authStore";
import { useSecurityStore } from "@/stores/securityStore";
import { useEffect, useState } from "react";
import { Shield, LogIn, LogOut, Lock, Eye, AlertCircle, UserPlus } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import TabNav from "@/components/ui/TabNav";
import EmptyState from "@/components/ui/EmptyState";
import { formatDistanceToNow } from "date-fns";

type Tab = "logins" | "logouts" | "password" | "privacy" | "account" | "signup";

export default function SecurityPage() {
  const token = useAuthStore((s) => s.token);
  const { login_history, logout_history, password_changes, privacy_changes, account_status, signup_info, loading, fetchSecurity } = useSecurityStore();
  const [tab, setTab] = useState<Tab>("logins");

  useEffect(() => { if (token) fetchSecurity(token); }, [token, fetchSecurity]);

  const tabs = [
    { key: "logins" as Tab, label: "Logins", icon: LogIn, count: login_history.length },
    { key: "logouts" as Tab, label: "Logouts", icon: LogOut, count: logout_history.length },
    { key: "password" as Tab, label: "Passwords", icon: Lock, count: password_changes.length },
    { key: "privacy" as Tab, label: "Privacy", icon: Eye, count: privacy_changes.length },
    { key: "account" as Tab, label: "Account Status", icon: AlertCircle, count: account_status.length },
    { key: "signup" as Tab, label: "Signup", icon: UserPlus },
  ];

  return (
    <div>
      <PageHeader
        icon={Shield}
        title="Security"
        description="Your login history, privacy settings, and account events."
        accent="#10B981"
        stats={[
          { label: "Logins", value: login_history.length },
          { label: "Privacy Changes", value: privacy_changes.length },
        ]}
      />
      <TabNav tabs={tabs} active={tab} onChange={setTab} />

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="glass-card h-16 shimmer" />)}</div>
      ) : tab === "logins" ? (
        login_history.length === 0 ? <EmptyState icon={LogIn} title="No login records" message="Your login history will appear here." /> : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-neon-600/20">
                  <th className="text-left px-4 py-3 text-star-500 font-medium text-xs uppercase tracking-wider">IP Address</th>
                  <th className="text-left px-4 py-3 text-star-500 font-medium text-xs uppercase tracking-wider hidden md:table-cell">Device</th>
                  <th className="text-left px-4 py-3 text-star-500 font-medium text-xs uppercase tracking-wider">When</th>
                </tr></thead>
                <tbody className="divide-y divide-nebula-700/50">
                  {login_history.map((l) => (
                    <tr key={l.id} className="hover:bg-nebula-700/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-star-300 text-xs">{l.ip_address || "—"}</td>
                      <td className="px-4 py-3 text-star-400 text-xs max-w-xs truncate hidden md:table-cell">{l.user_agent || "—"}</td>
                      <td className="px-4 py-3 text-star-500 text-xs whitespace-nowrap">
                        {l.logged_in_at ? formatDistanceToNow(new Date(l.logged_in_at), { addSuffix: true }) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : tab === "logouts" ? (
        logout_history.length === 0 ? <EmptyState icon={LogOut} title="No logout records" message="Your logout history will appear here." /> : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-neon-600/20">
                  <th className="text-left px-4 py-3 text-star-500 font-medium text-xs uppercase tracking-wider">IP Address</th>
                  <th className="text-left px-4 py-3 text-star-500 font-medium text-xs uppercase tracking-wider hidden md:table-cell">Device</th>
                  <th className="text-left px-4 py-3 text-star-500 font-medium text-xs uppercase tracking-wider">When</th>
                </tr></thead>
                <tbody className="divide-y divide-nebula-700/50">
                  {logout_history.map((l) => (
                    <tr key={l.id} className="hover:bg-nebula-700/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-star-300 text-xs">{l.ip_address || "—"}</td>
                      <td className="px-4 py-3 text-star-400 text-xs max-w-xs truncate hidden md:table-cell">{l.user_agent || "—"}</td>
                      <td className="px-4 py-3 text-star-500 text-xs whitespace-nowrap">
                        {l.logged_out_at ? formatDistanceToNow(new Date(l.logged_out_at), { addSuffix: true }) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : tab === "password" ? (
        password_changes.length === 0 ? <EmptyState icon={Lock} title="No password changes" message="Password change records will appear here." /> : (
          <div className="space-y-2">
            {password_changes.map((p) => (
              <div key={p.id} className="glass-card p-4 flex items-center gap-3">
                <Lock className="w-4 h-4 text-green-400 shrink-0" />
                <span className="text-star-200 text-sm">Password changed</span>
                <span className="flex-1" />
                <span className="text-xs text-star-500">{p.changed_at ? formatDistanceToNow(new Date(p.changed_at), { addSuffix: true }) : "—"}</span>
              </div>
            ))}
          </div>
        )
      ) : tab === "privacy" ? (
        privacy_changes.length === 0 ? <EmptyState icon={Eye} title="No privacy changes" message="Privacy setting changes will appear here." /> : (
          <div className="space-y-2">
            {privacy_changes.map((p) => (
              <div key={p.id} className="glass-card p-4 flex items-center gap-3">
                <Eye className="w-4 h-4 text-neon-400 shrink-0" />
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: p.privacy_status === "Private" ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)",
                    border: p.privacy_status === "Private" ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(34,197,94,0.3)",
                    color: p.privacy_status === "Private" ? "#f87171" : "#4ade80" }}>
                  {p.privacy_status}
                </span>
                <span className="flex-1" />
                <span className="text-xs text-star-500">{p.changed_at ? formatDistanceToNow(new Date(p.changed_at), { addSuffix: true }) : "—"}</span>
              </div>
            ))}
          </div>
        )
      ) : tab === "account" ? (
        account_status.length === 0 ? <EmptyState icon={AlertCircle} title="No status changes" message="Account status changes will appear here." /> : (
          <div className="space-y-2">
            {account_status.map((a) => (
              <div key={a.id} className="glass-card p-4 flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-star-200 text-sm font-medium">{a.activation_type}</span>
                {a.reason && <span className="text-star-500 text-xs">— {a.reason}</span>}
                <span className="flex-1" />
                <span className="text-xs text-star-500">{a.changed_at ? formatDistanceToNow(new Date(a.changed_at), { addSuffix: true }) : "—"}</span>
              </div>
            ))}
          </div>
        )
      ) : (
        !signup_info ? <EmptyState icon={UserPlus} title="No signup info" message="Signup details will appear here." /> : (
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { label: "Username at Signup", value: signup_info.username_at_signup },
              { label: "Email at Signup", value: signup_info.email_at_signup },
              { label: "Signup IP", value: signup_info.signup_ip },
              { label: "Device", value: signup_info.device_model },
              { label: "Signed Up", value: signup_info.signed_up_at ? new Date(signup_info.signed_up_at).toLocaleDateString() : "—" },
            ].filter((f) => f.value).map(({ label, value }) => (
              <div key={label} className="glass-card p-4">
                <p className="text-xs text-star-500 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-star-200 font-medium font-mono text-sm">{value}</p>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
