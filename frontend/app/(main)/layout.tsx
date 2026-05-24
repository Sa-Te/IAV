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
  const pathname = usePathname();
  const { toggleSidebar } = useUIStore();

  useEffect(() => {
    if (isHydrated && !token) {
      router.push("/login");
    }
  }, [isHydrated, token, router]);

  const showLayout = pathname !== "/upload";

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center nebula-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #00A3C4, #005266)" }}>
            <span className="text-white font-bold">IV</span>
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-neon-500 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!token) return null;

  if (!showLayout) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen nebula-bg">
      <Sidebar />
      <div className="md:pl-16 transition-all duration-300 ease-in-out">
        {/* Mobile header */}
        <header className="sticky top-0 z-40 flex items-center h-14 px-4 md:hidden border-b border-neon-600/20"
          style={{ background: "rgba(5, 11, 24, 0.95)", backdropFilter: "blur(12px)" }}>
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg text-star-400 hover:bg-nebula-700 hover:text-star-200 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="ml-3 flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #00A3C4, #005266)" }}>
              <span className="text-white font-bold text-xs">IV</span>
            </div>
            <span className="font-semibold text-star-200 text-sm">InstaVault</span>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 sm:py-8 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
