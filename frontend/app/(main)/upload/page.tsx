"use client";

import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { Upload, CheckCircle, AlertCircle, FileArchive } from "lucide-react";

type Phase = "idle" | "uploading" | "processing" | "success" | "error";

export default function UploadPage() {
  const token = useAuthStore((state) => state.token);
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");

  const handleFileUpload = useCallback(
    (file: File) => {
      setPhase("uploading");
      setProgress(0);

      const formData = new FormData();
      formData.append("archiveFile", file);

      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };

      xhr.upload.onload = () => {
        setProgress(100);
        setPhase("processing");
      };

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText) as { message?: string };
          if (xhr.status >= 200 && xhr.status < 300) {
            setPhase("success");
            setMessage(data.message ?? "Archive processed successfully!");
            setTimeout(() => router.push("/gallery"), 2000);
          } else {
            setPhase("error");
            setMessage(data.message ?? "Upload failed. Please try again.");
          }
        } catch {
          setPhase("error");
          setMessage("Unexpected server response.");
        }
      };

      xhr.onerror = () => {
        setPhase("error");
        setMessage("Network error — check that the server is running.");
      };

      xhr.open("POST", "/api/v1/upload");
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.send(formData);
    },
    [token, router],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload],
  );

  if (!token) return null;

  const busy = phase === "uploading" || phase === "processing";

  return (
    <main className="min-h-screen nebula-bg flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="text-center mb-10">
          <div
            className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-4"
            style={{
              background: "linear-gradient(135deg, #00A3C4, #005266)",
              boxShadow: "0 0 40px rgba(0,163,196,0.3)",
            }}
          >
            <span className="text-white font-bold text-xl">IV</span>
          </div>
          <h1 className="text-3xl font-bold text-star-200">Upload Your Archive</h1>
          <p className="mt-2 text-star-500 text-sm">
            Drag &amp; drop your Instagram <code className="text-neon-400">.zip</code> file to begin
            processing.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDragEnter={(e) => {
            e.preventDefault();
            if (!busy) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={busy ? undefined : onDrop}
          className={`relative rounded-2xl p-12 text-center transition-all duration-300 ${busy ? "cursor-not-allowed opacity-70" : "cursor-pointer"} ${isDragging ? "glow-cyan" : ""}`}
          style={{
            background: isDragging ? "rgba(0, 163, 196, 0.1)" : "rgba(13, 24, 41, 0.7)",
            border: `2px dashed ${isDragging ? "rgba(0, 229, 255, 0.6)" : "rgba(0, 163, 196, 0.3)"}`,
            backdropFilter: "blur(12px)",
          }}
        >
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept=".zip"
            disabled={busy}
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
            }}
          />
          <label htmlFor="file-upload" className={busy ? "cursor-not-allowed block" : "cursor-pointer block"}>
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{
                background: "rgba(0, 163, 196, 0.1)",
                border: "1px solid rgba(0, 163, 196, 0.3)",
              }}
            >
              <FileArchive className={`w-7 h-7 ${isDragging ? "text-neon-300" : "text-neon-500"}`} />
            </div>
            <p className="text-star-200 font-medium text-lg">
              <span className="text-neon-400">Click to select</span> or drag &amp; drop
            </p>
            <p className="text-star-500 text-sm mt-1">Instagram ZIP archive — up to 2 GB</p>
          </label>
        </div>

        {/* Progress + status */}
        {phase !== "idle" && (
          <div className="mt-5 space-y-3">
            {/* Progress bar — shown during upload */}
            {phase === "uploading" && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs text-neon-400 font-medium">Uploading…</span>
                  <span className="text-xs text-star-400 tabular-nums">{progress}%</span>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ background: "rgba(0, 163, 196, 0.1)", border: "1px solid rgba(0, 163, 196, 0.2)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-200"
                    style={{
                      width: `${progress}%`,
                      background: "linear-gradient(90deg, #005266, #00A3C4, #00E5FF)",
                      boxShadow: "0 0 8px rgba(0, 229, 255, 0.5)",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Processing pulse — shown while server parses */}
            {phase === "processing" && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs text-neon-400 font-medium">Processing archive…</span>
                  <span className="text-xs text-star-500">This may take a minute</span>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden relative"
                  style={{ background: "rgba(0, 163, 196, 0.1)", border: "1px solid rgba(0, 163, 196, 0.2)" }}
                >
                  <div
                    className="absolute inset-y-0 rounded-full animate-pulse"
                    style={{
                      width: "60%",
                      left: "20%",
                      background: "linear-gradient(90deg, transparent, #00A3C4, transparent)",
                      animation: "shimmer 1.5s ease-in-out infinite",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Final state badge */}
            {(phase === "success" || phase === "error") && (
              <div
                className={`p-4 rounded-xl flex items-center gap-3 ${
                  phase === "success"
                    ? "bg-green-900/20 border border-green-500/30"
                    : "bg-red-900/20 border border-red-500/30"
                }`}
              >
                {phase === "success" ? (
                  <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                )}
                <p
                  className={`text-sm font-medium ${phase === "success" ? "text-green-300" : "text-red-300"}`}
                >
                  {message}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tips */}
        {phase === "idle" && (
          <div
            className="mt-6 p-4 rounded-xl"
            style={{ background: "rgba(0, 163, 196, 0.04)", border: "1px solid rgba(0, 163, 196, 0.1)" }}
          >
            <p className="text-xs text-star-500 font-medium mb-2 uppercase tracking-wider">How to export</p>
            <ol className="space-y-1 text-xs text-star-500 list-decimal list-inside">
              <li>Open Instagram → Settings → Your activity → Download your information</li>
              <li>Select JSON format and request your data</li>
              <li>Download the ZIP file from your email and upload it here</li>
            </ol>
          </div>
        )}

        {/* Spinner overlay during upload/processing */}
        {busy && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <Upload className="w-4 h-4 text-neon-500 animate-bounce" />
            <p className="text-xs text-star-400">
              {phase === "uploading"
                ? "Uploading your archive to the server…"
                : "Parsing your data — hashtags, photos, connections, and more…"}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
