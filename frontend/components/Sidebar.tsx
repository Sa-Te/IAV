"use client";

import Link from "next/link";
import { useState } from "react";
import { useUIStore } from "@/stores/uiStore";
import {
  LayoutGrid,
  Users,
  Activity,
  User,
  Settings,
  LogOut,
  X,
  Hash,
} from "lucide-react";

export default function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { isSidebarOpen, toggleSidebar } = useUIStore();

  return (
    <aside
      className={`bg-gray-800 text-white p-4 flex flex-col fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out
      ${
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      } md:translate-x-0 ${isExpanded ? "md:w-64" : "md:w-20"}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="flex items-center justify-between mb-8 h-8">
        <h2
          className={`text-2xl font-bold transition-opacity duration-200 ${
            isExpanded ? "opacity-100" : "opacity-0"
          }`}
        >
          IAV
        </h2>
        {/* Close button is ONLY visible on mobile */}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md hover:bg-gray-700 md:hidden"
        >
          <X />
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex flex-col space-y-2 flex-grow">
        <NavItem
          isExpanded={isExpanded}
          icon={<LayoutGrid />}
          href="/app/gallery"
        >
          Media
        </NavItem>
        <NavItem
          isExpanded={isExpanded}
          icon={<Users />}
          href="/app/connections"
        >
          Connections
        </NavItem>
        <NavItem
          isExpanded={isExpanded}
          icon={<Activity />}
          href="/app/activity"
        >
          Activity
        </NavItem>
        <NavItem isExpanded={isExpanded} icon={<User />} href="/app/profile">
          Profile
        </NavItem>
        <NavItem isExpanded={isExpanded} icon={<Hash />} href="/app/hashtags">
          Hashtags
        </NavItem>
      </nav>

      {/* Bottom Navigation */}
      <div className="flex flex-col space-y-2">
        <NavItem
          isExpanded={isExpanded}
          icon={<Settings />}
          href="/app/settings"
        >
          Settings
        </NavItem>
        <NavItem isExpanded={isExpanded} icon={<LogOut />} as="button">
          Logout
        </NavItem>
      </div>
    </aside>
  );
}

function NavItem({ isExpanded, icon, children, href, as = "link" }: any) {
  const commonClasses =
    "flex items-center p-2 rounded-lg hover:bg-gray-700 h-10";
  const content = (
    <>
      <div className="w-6">{icon}</div>
      <span
        className={`ml-4 whitespace-nowrap transition-opacity duration-200 ${
          isExpanded ? "opacity-100" : "opacity-0"
        }`}
      >
        {children}
      </span>
    </>
  );
  if (as === "button") {
    return (
      <button className={`${commonClasses} w-full text-left`}>{content}</button>
    );
  }
  return (
    <Link href={href} className={commonClasses}>
      {content}
    </Link>
  );
}
