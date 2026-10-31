"use client";

import Link from "next/link";
import { ArrowRight, LayoutGrid, Shield, Zap } from "lucide-react";

const features = [
  { icon: LayoutGrid, title: "All Your Data", desc: "Gallery, messages, likes, connections — every corner of your archive." },
  { icon: Shield, title: "Private by Design", desc: "Runs locally. Your data never leaves your machine." },
  { icon: Zap, title: "Instant Insights", desc: "Activity heatmaps, topic clouds, security timelines." },
];

export default function Home() {
  return (
    <main className="min-h-screen nebula-bg flex flex-col items-center justify-center p-6 text-center">
      {/* Logo */}
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
        style={{ background: "linear-gradient(135deg, #00A3C4, #005266)", boxShadow: "0 0 60px rgba(0,163,196,0.4)" }}>
        <span className="text-white font-bold text-2xl">IV</span>
      </div>

      <h1 className="text-5xl font-bold text-star-200 mb-3">InstaVault</h1>
      <p className="text-star-400 text-lg max-w-md mb-10">
        Explore your entire Instagram archive — beautifully, privately, completely.
      </p>

      <div className="flex gap-3 mb-14">
        <Link href="/login"
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #00A3C4, #007A95)", boxShadow: "0 0 24px rgba(0,163,196,0.3)" }}>
          Sign In <ArrowRight className="w-4 h-4" />
        </Link>
        <Link href="/register"
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200"
          style={{ background: "rgba(13, 24, 41, 0.8)", border: "1px solid rgba(0, 163, 196, 0.3)", color: "#00C4E8" }}>
          Create Account
        </Link>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 max-w-2xl w-full">
        {features.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="glass-card p-5 text-left">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
              style={{ background: "rgba(0, 163, 196, 0.1)", border: "1px solid rgba(0, 163, 196, 0.2)" }}>
              <Icon className="w-5 h-5 text-neon-400" />
            </div>
            <h3 className="font-semibold text-star-200 mb-1">{title}</h3>
            <p className="text-star-500 text-sm">{desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
