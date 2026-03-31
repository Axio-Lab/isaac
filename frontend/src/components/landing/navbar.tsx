"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Sun, Moon } from "lucide-react";
import { useTheme } from "@/app/providers";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Integrations", href: "#integrations" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-background/70 backdrop-blur-xl border-b border-white/6 shadow-[0_1px_40px_rgba(59,130,246,0.04)]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
              <img src="/images/isaac-mark.svg" alt="" className="h-4 w-4" width={16} height={16} />
            </div>
            <span className="text-[15px] font-bold tracking-tight text-foreground">Isaac</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-[13px] text-foreground/60 hover:text-foreground transition-colors duration-200 rounded-lg hover:bg-white/4"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-foreground/50 hover:text-foreground hover:bg-muted/50 transition-colors duration-200"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link
              href="/login"
              className="px-4 py-2 text-[13px] text-foreground/70 hover:text-foreground transition-colors duration-200"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="relative px-5 py-2.5 text-[13px] font-semibold text-white rounded-xl bg-primary/90 hover:bg-primary transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]"
            >
              Get Started
            </Link>
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-foreground/50 hover:text-foreground hover:bg-muted/50 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-lg text-foreground/60 hover:text-foreground hover:bg-white/6"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-out ${
          mobileOpen ? "max-h-80 border-t border-white/6" : "max-h-0"
        }`}
      >
        <div className="px-6 py-4 space-y-1 bg-background/90 backdrop-blur-xl">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-2.5 text-[13px] text-foreground/60 hover:text-foreground rounded-lg hover:bg-white/4 transition-colors"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-3 flex flex-col gap-2">
            <Link
              href="/login"
              className="px-4 py-2.5 text-[13px] text-foreground/70 hover:text-foreground text-center rounded-lg border border-white/8"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2.5 text-[13px] font-semibold text-white text-center rounded-xl bg-primary/90 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
