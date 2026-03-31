"use client";

import { useAuth } from "@/hooks/useAuth";
import { signOut } from "@/lib/auth-client";
import { useTheme } from "@/app/providers";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckSquare,
  Radio,
  FileText,
  Hash,
  Flag,
  // Sparkles,
  Bot,
  Plug,
  LogOut,
  Loader2,
  Menu,
  X,
  ChevronRight,
  Sun,
  Moon,
} from "lucide-react";

const navItems = [
  // { href: "/chat", label: "Chat", icon: Bot },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/liveboard", label: "Liveboard", icon: Radio },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/flagged-workers", label: "Flagged Workers", icon: Flag },
  { href: "/channels", label: "Channels", icon: Hash },
  // { href: "/skills", label: "Skills", icon: Sparkles },
  { href: "/connected-apps", label: "Connected Apps", icon: Plug },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground tracking-wide">Loading</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const currentPage = navItems.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 shrink-0 flex flex-col bg-card border-r border-border transition-transform duration-200 ease-out lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between h-13 px-4 border-b border-border shrink-0">
          <Link href="/tasks" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
              <img src="/images/isaac-mark.svg" alt="" className="h-4 w-4" width={16} height={16} />
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground">Isaac</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-primary" : ""}`} />
                {item.label}
                {isActive && <ChevronRight className="h-3 w-3 ml-auto opacity-50" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-linear-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center text-[10px] font-semibold shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{user?.name || "User"}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
            <button
              onClick={toggleTheme}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? (
                <Sun className="h-3.5 w-3.5" />
              ) : (
                <Moon className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              onClick={() =>
                signOut({
                  fetchOptions: { onSuccess: () => router.replace("/login") },
                })
              }
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center h-13 px-4 border-b border-border bg-card/50 backdrop-blur-sm shrink-0 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 -ml-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 ml-3">
            {currentPage && (
              <>
                <currentPage.icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">{currentPage.label}</span>
              </>
            )}
          </div>
          <button
            onClick={toggleTheme}
            className="ml-auto p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </header>

        <main className="flex-1 overflow-hidden relative">
          <div data-scroll-container className="absolute inset-0 overflow-y-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
