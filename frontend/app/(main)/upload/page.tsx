"use client";

import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";

export default function UploadPage() {
  const token = useAuthStore((state) => state.token);
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleFileUpload = async (file: File) => {
    setStatus("uploading");
    setMessage("Processing your archive…");
    const formData = new FormData();
    formData.append("archiveFile", file);
    try {
      const res = await fetch("http://localhost:8080/api/v1/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      setStatus("success");
      setMessage(data.message ?? "Archive processed successfully!");
      setTimeout(() => router.push("/gallery"), 2000);
    } catch (e) {
      setStatus("error");
      setMessage((e as Error).message);
    }
  };

  if (!token) return null;

  return (
    <main className="min-h-screen nebula-bg flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-4"
            style={{ background: "linear-gradient(135deg, #00A3C4, #005266)", boxShadow: "0 0 40px rgba(0,163,196,0.3)" }}>
            <span className="text-white font-bold text-xl">IV</span>
          </div>
          <h1 className="text-3xl font-bold text-star-200">Upload Your Archive</h1>
          <p className="mt-2 text-star-500 text-sm">Drag &amp; drop your Instagram <code className="text-neon-400">.zip</code> file to begin processing.</p>
        </div>

        {/* Drop zone */}
        <div
          onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]); }}
          className={`relative rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer ${isDragging ? "glow-cyan" : ""}`}
          style={{
            background: isDragging ? "rgba(0, 163, 196, 0.1)" : "rgba(13, 24, 41, 0.7)",
            border: `2px dashed ${isDragging ? "rgba(0, 229, 255, 0.6)" : "rgba(0, 163, 196, 0.3)"}`,
            backdropFilter: "blur(12px)",
          }}
        >
          <input type="file" id="file-upload" className="hidden" accept=".zip"
            onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }} />
          <label htmlFor="file-upload" className="cursor-pointer block">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(0, 163, 196, 0.1)", border: "1px solid rgba(0, 163, 196, 0.3)" }}>
              <Upload className={`w-7 h-7 ${isDragging ? "text-neon-300" : "text-neon-500"}`} />
            </div>
            <p className="text-star-200 font-medium text-lg">
              <span className="text-neon-400">Click to select</span> or drag &amp; drop
            </p>
            <p className="text-star-500 text-sm mt-1">Instagram ZIP archive — up to 2 GB</p>
          </label>
        </div>

        {/* Status */}
        {status !== "idle" && (
          <div className={`mt-4 p-4 rounded-xl flex items-center gap-3 ${
            status === "success" ? "bg-green-900/20 border border-green-500/30" :
            status === "error" ? "bg-red-900/20 border border-red-500/30" :
            "bg-neon-700/10 border border-neon-600/30"}`}>
            {status === "uploading" && (
              <div className="w-5 h-5 rounded-full border-2 border-neon-500 border-t-transparent animate-spin shrink-0" />
            )}
            {status === "success" && <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />}
            {status === "error" && <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />}
            <p className={`text-sm font-medium ${status === "success" ? "text-green-300" : status === "error" ? "text-red-300" : "text-neon-300"}`}>
              {message}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
