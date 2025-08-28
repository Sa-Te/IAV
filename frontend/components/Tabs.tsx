"use client";

import { useMediaStore } from "@/stores/mediaStore";

const TABS = ["Posts", "Stories"];

export default function Tabs() {
  const { activeTab, setActiveTab } = useMediaStore();

  return (
    <div className="mb-8">
      <nav className="flex space-x-2">
        {TABS.map((tabName) => (
          <button
            key={tabName}
            onClick={() => setActiveTab(tabName)}
            className={`px-4 py-2 font-semibold text-sm rounded-full transition-colors duration-200
              ${
                activeTab === tabName
                  ? "bg-cyan-500 text-white" // Active "chip" style
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600" // Inactive style
              }
            `}
          >
            {tabName}
          </button>
        ))}
      </nav>
    </div>
  );
}
