"use client";

import { useAuthStore } from "@/stores/authStore";
import { useEffect, useState } from "react";
import { Hash } from "lucide-react";

interface Hashtag {
  id: number;
  name: string;
  timestamp: string;
}

export default function HashtagsPage() {
  const token = useAuthStore((state) => state.token);
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHashtags = async () => {
      if (!token) return;
      try {
        const response = await fetch("http://localhost:8080/api/v1/hashtags", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to fetch hashtags");
        const data = await response.json();
        setHashtags(data);
      } catch (err) {
        setError((err as Error).message);
        console.error("Error fetching hashtags:", err);
      }
    };
    fetchHashtags();
  }, [token]);

  return (
    <main>
      <div className="flex items-center space-x-4 mb-8">
        <Hash className="w-10 h-10" />
        <h1 className="text-4xl font-bold">Followed Hashtags</h1>
      </div>

      {error && <p className="text-red-500">{error}</p>}

      {hashtags.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {hashtags.map((tag) => (
            <div
              key={tag.id}
              className="bg-gray-800 p-4 rounded-lg text-center shadow-lg"
            >
              <p className="font-bold text-cyan-400 truncate">#{tag.name}</p>
              <p className="text-xs text-gray-500 mt-1">
                Followed on {new Date(tag.timestamp).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400">No followed hashtags found.</p>
      )}
    </main>
  );
}
