"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const setToken = useAuthStore((state) => state.setToken);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/v1/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      if (data.token) {
        setToken(data.token);
        router.push("/gallery");
      } else {
        throw new Error("No token received");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl text-star-200 placeholder-star-600 outline-none transition-all duration-200 focus:border-neon-500/60 text-sm";
  const inputStyle = { background: "rgba(13, 24, 41, 0.8)", border: "1px solid rgba(0, 163, 196, 0.2)" };

  return (
    <div className="min-h-screen nebula-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-4"
            style={{ background: "linear-gradient(135deg, #00A3C4, #005266)", boxShadow: "0 0 30px rgba(0,163,196,0.25)" }}>
            <span className="text-white font-bold text-lg">IV</span>
          </div>
          <h1 className="text-2xl font-bold text-star-200">Welcome back</h1>
          <p className="text-star-500 text-sm mt-1">Sign in to InstaVault</p>
        </div>

        <div className="glass-card p-6 space-y-5">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-star-400 mb-1.5 uppercase tracking-wider">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className={inputClass} style={inputStyle} placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-star-400 mb-1.5 uppercase tracking-wider">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className={inputClass} style={inputStyle} placeholder="••••••••" />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-300"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all duration-200 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #00A3C4, #007A95)", boxShadow: loading ? "none" : "0 0 20px rgba(0,163,196,0.25)" }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Signing in…
                </span>
              ) : "Sign In"}
            </button>
          </form>

          <p className="text-center text-star-500 text-sm">
            No account?{" "}
            <Link href="/register" className="text-neon-400 hover:text-neon-300 font-medium transition-colors">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
