"use client";

import { useAuthStore } from "@/stores/authStore";
import { useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react";

interface Connection {
  id: number;
  username: string;
  connection_type: string;
  timestamp: string;
  contact_info?: string;
}

const CONNECTION_TYPES = [
  "Followers",
  "Following",
  "Contacts",
  "Blocked",
  "Close Friends",
  "Requests Received",
  "Requests Sent",
  "Recent Requests Sent",
  "Unfollowed",
  "Removed Suggestions",
  "Restricted",
  "Story Hidden From",
];

export default function ConnectionsPage() {
  const token = useAuthStore((state) => state.token);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeFilter, setActiveFilter] = useState("Followers");

  useEffect(() => {
    const fetchConnections = async () => {
      if (token) {
        try {
          const response = await fetch(
            "http://localhost:8080/api/v1/connections",
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (!response.ok) throw new Error("Failed to fetch connections");
          const data: Connection[] = await response.json();

          const normalized: Connection[] = data.map((d: any) => ({
            id: d.ID,
            username: d.Username,
            connection_type: d.connection_type,
            timestamp: d.Timestamp || "",
            contact_info: d.contact_info,
          }));

          setConnections(normalized);
        } catch (error) {
          console.error("Error fetching connections:", error);
        }
      }
    };
    fetchConnections();
  }, [token]);

  const filteredConnections = useMemo(() => {
    if (!connections) return [];

    const filterTypeMap: { [key: string]: string } = {
      Followers: "follower",
      Following: "following",
      Contacts: "contact",
      Blocked: "blocked",
      "Close Friends": "close_friend",
      "Requests Received": "request_received",
      "Requests Sent": "request_sent",
      "Recent Requests Sent": "request_sent_permanent",
      Unfollowed: "unfollowed",
      "Removed Suggestions": "suggestion_removed",
      Restricted: "restricted",
      "Story Hidden From": "story_hidden_from",
    };
    const filterType = filterTypeMap[activeFilter];

    // This filter is now safe because the backend is sending the correct field name.
    return connections.filter(
      (conn) =>
        conn.connection_type &&
        conn.connection_type.toLowerCase() === filterType
    );
  }, [connections, activeFilter]);

  const formatDateSafe = (timestamp: string) => {
    if (!timestamp) return "N/A";

    const date = new Date(timestamp); // parse directly
    if (isNaN(date.getTime())) return "N/A";

    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <main className="min-h-screen text-white">
      <div className="flex items-center space-x-4 mb-8">
        <Users className="w-10 h-10" />
        <h1 className="text-4xl font-bold">Connections</h1>
      </div>

      <div className="flex space-x-2 mb-8">
        {CONNECTION_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setActiveFilter(type)}
            className={`px-4 py-2 font-semibold text-sm rounded-full transition-colors duration-200 ${
              activeFilter === type
                ? "bg-cyan-500 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="bg-gray-800 rounded-lg shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-gray-700">
              <tr>
                <th className="p-4">Name / Username</th>
                <th className="p-4">
                  {activeFilter === "Contacts" ? "Contact Info" : "Date"}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredConnections.length > 0 ? (
                filteredConnections.map((conn) => (
                  <tr
                    key={`${conn.username || conn.id || Math.random()}-${
                      conn.connection_type || "unknown"
                    }`}
                    className="border-b border-gray-700 hover:bg-gray-700/50"
                  >
                    <td className="p-4 font-medium">{conn.username}</td>
                    <td className="p-4 text-gray-400">
                      {activeFilter === "Contacts"
                        ? conn.contact_info || "N/A"
                        : formatDateSafe(conn.timestamp)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr key="no-results-row">
                  <td colSpan={2} className="p-8 text-center text-gray-400">
                    No {activeFilter.toLowerCase()} found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
