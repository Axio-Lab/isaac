"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CTA() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section className="relative py-14 overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/6 to-transparent" />

      {/* Background radial gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.1)_0%,transparent_60%)] pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(139,92,246,0.06)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(6,182,212,0.06)_0%,transparent_70%)] pointer-events-none" />

      <div ref={ref} className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
        <div
          className={`transition-all duration-1000 ease-out ${
            visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-12 scale-95"
          }`}
        >
          <div className="relative inline-block mb-8">
            <div className="h-16 w-16 rounded-2xl bg-linear-to-br from-primary to-blue-600 flex items-center justify-center shadow-[0_0_50px_rgba(59,130,246,0.3)] mx-auto">
              <img
                src="/images/isaac-mark.svg"
                alt="Isaac"
                className="h-7 w-7"
                width={28}
                height={28}
              />
            </div>
            <div className="absolute inset-0 h-16 w-16 rounded-2xl animate-ping-slow border-2 border-primary/20 mx-auto" />
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-tight">
            Ready to put your
            <br />
            <span className="bg-linear-to-r from-primary via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              operations on autopilot?
            </span>
          </h2>

          <p className="mt-6 text-lg text-foreground/40 max-w-xl mx-auto leading-relaxed">
            Join teams who trust Isaac to monitor, evaluate, and manage their workforce. Set up in
            minutes, see results immediately.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="group relative inline-flex items-center gap-2 px-8 py-4 text-[15px] font-semibold text-white rounded-2xl bg-primary hover:bg-primary/90 transition-all duration-300 shadow-[0_0_40px_rgba(59,130,246,0.35)] hover:shadow-[0_0_60px_rgba(59,130,246,0.5)] hover:-translate-y-0.5"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              <div className="absolute inset-0 rounded-2xl bg-linear-to-b from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
            <Link
              href="mailto:sales@verxio.xyz"
              className="px-8 py-4 text-[15px] font-medium text-foreground/60 hover:text-foreground rounded-2xl border border-white/8 hover:border-white/15 hover:bg-white/3 transition-all duration-300"
            >
              Talk to Sales
            </Link>
          </div>

          <p className="mt-8 text-[12px] text-foreground/25">
            No credit card required · 14-day free trial · Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}
