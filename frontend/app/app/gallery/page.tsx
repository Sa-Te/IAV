"use client";

import { useAuthStore } from "@/stores/authStore";
import { useEffect, useState } from "react";

// Define a type for our media items to use in the component.
interface MediaItem {
  id: number;
  user_id: number;
  uri: string;
  caption: string;
  taken_at: string;
  media_type: string;
}

export default function GalleryPage() {
  const token = useAuthStore((state) => state.token);
  const [media, setMedia] = useState<MediaItem[]>([]);

  useEffect(() => {
    const fetchMedia = async () => {
      // We only fetch if the token exists.
      if (token) {
        try {
          const response = await fetch("http://localhost:8080/api/v1/media", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error("Failed to fetch media");
          }

          const data = await response.json();
          setMedia(data || []); // Ensure we always have an array
        } catch (error) {
          console.error("Error fetching media:", error);
        }
      }
    };

    fetchMedia();
  }, [token]);

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-8">Your Gallery</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {media && media.length > 0 ? (
          media.map((item) => (
            <div key={item.id} className="bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-300">
                {item.caption || "No caption"}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {new Date(item.taken_at).toLocaleDateString()}
              </p>
            </div>
          ))
        ) : (
          <p>No media found. Have you uploaded your archive yet?</p>
        )}
      </div>
    </main>
  );
}
