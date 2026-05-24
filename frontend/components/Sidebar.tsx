"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import {
  LayoutGrid,
  Users,
  Zap,
  User,
  Hash,
  Tag,
  Heart,
  MessageSquare,
  Bookmark,
  Archive,
  Compass,
  Globe,
  Shield,
  Search,
  Film,
  MessageCircle,
  Upload,
  LogOut,
  X,
  ChevronRight,
} from "lucide-react";

interface NavSection {
  label: string;
  items: NavItemDef[];
}

interface NavItemDef {
  href: string;
  icon: React.ElementType;
  label: string;
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Media",
    items: [
      { href: "/gallery", icon: LayoutGrid, label: "Gallery" },
      { href: "/archived-posts", icon: Archive, label: "Archived" },
    ],
  },
  {
    label: "Social",
    items: [
      { href: "/connections", icon: Users, label: "Connections" },
      { href: "/likes", icon: Heart, label: "Likes" },
      { href: "/comments", icon: MessageSquare, label: "Comments" },
      { href: "/saved", icon: Bookmark, label: "Saved" },
      { href: "/messages", icon: MessageCircle, label: "Messages" },
      { href: "/story-interactions", icon: Film, label: "Stories" },
    ],
  },
  {
    label: "You",
    items: [
      { href: "/profile", icon: User, label: "Profile" },
      { href: "/activity", icon: Zap, label: "Activity" },
      { href: "/hashtags", icon: Hash, label: "Hashtags" },
      { href: "/interests", icon: Tag, label: "Interests" },
      { href: "/topics", icon: Compass, label: "Topics" },
      { href: "/search-history", icon: Search, label: "Searches" },
    ],
  },
  {
    label: "Privacy",
    items: [
      { href: "/security", icon: Shield, label: "Security" },
      { href: "/off-meta", icon: Globe, label: "Off-Meta" },
    ],
  },
];

export default function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { isSidebarOpen, toggleSidebar } = useUIStore();
  const { logout } = useAuthStore();
  const pathname = usePathname();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out
        border-r border-neon-600/20
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0
        ${isExpanded ? "md:w-56" : "md:w-16"}`}
      style={{ background: "rgba(5, 11, 24, 0.97)", backdropFilter: "blur(20px)" }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-neon-600/20 shrink-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg, #00A3C4, #005266)" }}>
          <span className="text-white font-bold text-sm">IV</span>
        </div>
        <span className={`ml-3 font-bold text-star-200 text-lg tracking-wide transition-all duration-200
          ${isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"}`}>
          InstaVault
        </span>
        <button
          onClick={toggleSidebar}
          className="ml-auto p-1.5 rounded-md hover:bg-nebula-700 text-star-400 md:hidden"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-1">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <div className={`px-4 py-1.5 transition-all duration-200 ${isExpanded ? "opacity-100" : "opacity-0 h-0 overflow-hidden py-0"}`}>
              <span className="text-[10px] font-semibold tracking-widest uppercase text-star-500">
                {section.label}
              </span>
            </div>
            {section.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => window.innerWidth < 768 && toggleSidebar()}
                  className={`flex items-center h-10 mx-2 px-2.5 rounded-lg transition-all duration-150 group relative
                    ${isActive
                      ? "bg-neon-500/15 text-neon-300"
                      : "text-star-400 hover:bg-nebula-700/60 hover:text-star-200"
                    }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r bg-neon-400" />
                  )}
                  <item.icon className={`w-5 h-5 shrink-0 ${isActive ? "text-neon-400" : ""}`} />
                  <span className={`ml-3 text-sm font-medium whitespace-nowrap transition-all duration-200
                    ${isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"}`}>
                    {item.label}
                  </span>
                  {isExpanded && isActive && (
                    <ChevronRight className="ml-auto w-3.5 h-3.5 text-neon-500 shrink-0" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-neon-600/20 py-3 px-2 space-y-1 shrink-0">
        <Link
          href="/upload"
          className="flex items-center h-10 px-2.5 rounded-lg text-star-400 hover:bg-nebula-700/60 hover:text-star-200 transition-all duration-150"
        >
          <Upload className="w-5 h-5 shrink-0" />
          <span className={`ml-3 text-sm font-medium whitespace-nowrap transition-all duration-200
            ${isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"}`}>
            Upload Archive
          </span>
        </Link>
        <button
          onClick={() => logout()}
          className="flex items-center h-10 w-full px-2.5 rounded-lg text-star-400 hover:bg-red-900/20 hover:text-red-400 transition-all duration-150"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className={`ml-3 text-sm font-medium whitespace-nowrap transition-all duration-200
            ${isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"}`}>
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
}
