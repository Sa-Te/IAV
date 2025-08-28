"use client";

import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import { Menu } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
  const isHydrated = useAuthStore((state) => !state.isHydrating);
  const router = useRouter();
  const pathName = usePathname(); //get current URL path

  const { toggleSidebar } = useUIStore();

  useEffect(() => {
    if (isHydrated && !token) {
      router.push("/login");
    }
  }, [isHydrated, token, router]);

  const showLayout = pathName !== "/app/upload";

  if (!isHydrated) {
    return <div>Loading session...</div>;
  }

  if (token) {
    // If we are on the upload page, just show the content without any layout
    if (!showLayout) {
      return <>{children}</>;
    }

    // Otherwise, show the full layout with the sidebar and header
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Sidebar />
        {/* Main content has padding for the slim sidebar ONLY on medium screens and up */}
        <div className="md:pl-20 transition-all duration-300 ease-in-out">
          {/* Header with hamburger is ONLY visible on screens smaller than medium */}
          <header className="sticky top-0 bg-gray-900/50 backdrop-blur-sm p-4 md:hidden z-40">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-md hover:bg-gray-700"
            >
              <Menu />
            </button>
          </header>
          <main className="p-4 sm:p-8">{children}</main>
        </div>
      </div>
    );
  }

  // If we are hydrated and there's no token, return null
  // because the useEffect has already started the redirect.
  return null;
}
