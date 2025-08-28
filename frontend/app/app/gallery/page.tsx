"use client";

import { useAuthStore } from "@/stores/authStore";
import { useEffect, useMemo, useState } from "react";
import { useMediaStore } from "@/stores/mediaStore";
import Tabs from "@/components/Tabs";
import { LayoutGrid, Rows3 } from "lucide-react";

interface MediaItem {
  id: number;
  user_id: number;
  uri: string;
  caption: string;
  taken_at: string;
  media_type: string;
}

interface GroupedMedia {
  [key: string]: MediaItem[];
}

function MediaRenderer({ uri, token }: { uri: string; token: string | null }) {
  const [mediaSrc, setMediaSrc] = useState<string | null>(null);

  useEffect(() => {
    // We create a flag to prevent state updates if the component unmounts
    // while the fetch is in progress. This is a good practice for cleanup.
    let isMounted = true;

    const loadMedia = async () => {
      if (!token || !uri) return;

      try {
        // Make an AUTHORIZED fetch request for the media file.
        const response = await fetch(
          `http://localhost:8080/api/v1/mediafile/${uri}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch media file");
        }
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        // If the component is still mounted, update the state with the new URL.
        if (isMounted) {
          setMediaSrc(objectUrl);
        }
      } catch (error) {
        console.error("Error loading media file:", uri, error);
        if (isMounted) {
          setMediaSrc(null); // Could set a placeholder error image here
        }
      }
    };

    loadMedia();

    //  Cleanup Function: When the component unmounts, revoke the
    //    temporary URL to prevent memory leaks in the browser.
    return () => {
      isMounted = false;
      if (mediaSrc) {
        URL.revokeObjectURL(mediaSrc);
      }
    };
  }, [uri, token]);

  // While loading, we can show a placeholder or shimmer effect.
  if (!mediaSrc) {
    return (
      <div className="w-full h-full bg-gray-700 animate-pulse rounded-t-lg"></div>
    );
  }

  const fileExtension = uri.split(".").pop()?.toLowerCase();

  if (["mp4", "mov", "webm"].includes(fileExtension || "")) {
    return (
      <video controls className="w-full h-full object-cover rounded-t-lg">
        <source
          src={mediaSrc}
          type={
            fileExtension === "mov"
              ? "video/quicktime"
              : `video/${fileExtension}`
          }
        />
        Your browser does not support the video tag.
      </video>
    );
  }

  return (
    <img
      src={mediaSrc}
      alt={uri}
      className="w-full h-full object-cover rounded-t-lg"
    />
  );
}

function ViewSwitcher() {
  const { currentView, setCurrentView } = useMediaStore();
  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => setCurrentView("Grid")}
        className={`p-2 rounded-md ${
          currentView === "Grid" ? "bg-cyan-500" : "bg-gray-700"
        } hover:bg-cyan-600 transition-colors`}
      >
        <LayoutGrid className="w-5 h-5" />
      </button>
      <button
        onClick={() => setCurrentView("Timeline")}
        className={`p-2 rounded-md ${
          currentView === "Timeline" ? "bg-cyan-500" : "bg-gray-700"
        } hover:bg-cyan-600 transition-colors`}
      >
        <Rows3 className="w-5 h-5" />
      </button>
    </div>
  );
}

function TimelineView({
  groupedMedia,
  token,
}: {
  groupedMedia: GroupedMedia;
  token: string | null;
}) {
  const months = Object.keys(groupedMedia);
  if (months.length === 0) return <p>No media found for this period.</p>;

  return (
    <div>
      {months.map((month) => (
        <section key={month} className="mb-12">
          <h2 className="text-2xl font-semibold sticky top-0 bg-gray-900/50 backdrop-blur-sm py-4 z-10">
            {month}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {groupedMedia[month].map((item) => (
              <div
                key={item.id}
                className="bg-gray-800 rounded-lg flex flex-col shadow-lg"
              >
                <div className="aspect-square bg-gray-700 rounded-t-lg">
                  <MediaRenderer uri={item.uri} token={token} />
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-300 truncate">
                    {item.caption || "No caption"}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(item.taken_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function GridView({
  media,
  token,
}: {
  media: MediaItem[];
  token: string | null;
}) {
  if (media.length === 0) return <p>No media found.</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {media.map((item) => (
        <div
          key={item.id}
          className="bg-gray-800 rounded-lg flex flex-col shadow-lg"
        >
          <div className="aspect-square bg-gray-700 rounded-t-lg">
            <MediaRenderer uri={item.uri} token={token} />
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-300 truncate">
              {item.caption || "No caption"}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {new Date(item.taken_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function GalleryPage() {
  const token = useAuthStore((state) => state.token);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const { activeTab, currentView } = useMediaStore();

  useEffect(() => {
    const fetchMedia = async () => {
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

          const data: MediaItem[] = await response.json();
          const uniqueMedia = Array.from(
            new Map(data.map((item) => [item.id, item])).values()
          );
          setMedia(uniqueMedia || []);
        } catch (error) {
          console.error("Error fetching media:", error);
        }
      }
    };

    fetchMedia();
  }, [token]);

  const filteredAndSortedMedia = useMemo(() => {
    if (!media) return [];
    const filterType = activeTab === "Posts" ? "post" : "story";
    return media
      .filter((item) => item.media_type.toLowerCase() === filterType)
      .sort(
        (a, b) =>
          new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime()
      );
  }, [media, activeTab]);

  const groupedMedia = useMemo(() => {
    if (!filteredAndSortedMedia) return {};
    return filteredAndSortedMedia.reduce((acc, item) => {
      const date = new Date(item.taken_at);
      const monthYear = date.toLocaleString("default", {
        month: "long",
        year: "numeric",
      });
      if (!acc[monthYear]) {
        acc[monthYear] = [];
      }
      acc[monthYear].push(item);
      return acc;
    }, {} as GroupedMedia);
  }, [filteredAndSortedMedia]);

  return (
    <main className="min-h-screen text-white">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Your Gallery</h1>
        <ViewSwitcher />
      </div>
      <Tabs />
      <div>
        {currentView === "Timeline" && (
          <TimelineView groupedMedia={groupedMedia} token={token} />
        )}
        {currentView === "Grid" && (
          <GridView media={filteredAndSortedMedia} token={token} />
        )}
      </div>
    </main>
  );
}
