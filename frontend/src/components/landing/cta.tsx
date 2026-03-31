"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";

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

      <div
        ref={ref}
        className={`landing-edge-shadow relative mx-auto flex w-full max-w-4xl sm:max-w-5xl flex-col justify-center items-center gap-y-6 border-y border-border px-5 sm:px-10 lg:px-20 py-12 sm:py-16 transition-all duration-1000 ease-out ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
        style={{
          backgroundImage:
            "radial-gradient(60% 100% at 22% 0%, color-mix(in srgb, var(--color-foreground) 10%, transparent) 0%, transparent 100%)",
        }}
      >
        <Plus
          className="absolute top-[-12px] left-[-12px] z-10 h-6 w-6 text-muted-foreground/30"
          strokeWidth={1}
        />
        <Plus
          className="absolute top-[-12px] right-[-12px] z-10 h-6 w-6 text-muted-foreground/30"
          strokeWidth={1}
        />
        <Plus
          className="absolute bottom-[-12px] left-[-12px] z-10 h-6 w-6 text-muted-foreground/30"
          strokeWidth={1}
        />
        <Plus
          className="absolute bottom-[-12px] right-[-12px] z-10 h-6 w-6 text-muted-foreground/30"
          strokeWidth={1}
        />

        <div className="-inset-y-6 pointer-events-none absolute left-0 w-px border-l border-border" />
        <div className="-inset-y-6 pointer-events-none absolute right-0 w-px border-r border-border" />

        <div className="-z-10 absolute top-0 left-1/2 h-full border-l border-dashed border-border" />

        <div className="space-y-2.5 max-w-2xl">
          <h2 className="text-center text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight leading-tight">
            Ready to put your <span className="text-primary">operations on autopilot?</span>
          </h2>
          <p className="text-center text-base text-muted-foreground max-w-lg mx-auto">
            Isaac bridges the gap between high-level operations and the granular reality of
            micro-managing tasks.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Link
            href="mailto:sales@verxio.xyz"
            className="px-6 py-3 text-[13px] font-medium text-foreground rounded-lg border border-border hover:bg-muted/50 transition-all duration-300"
          >
            Contact Sales
          </Link>
          <Link
            href="/signup"
            className="group inline-flex items-center gap-1.5 px-6 py-3 text-[13px] font-semibold text-white rounded-lg bg-primary hover:bg-primary/90 transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.2)] hover:shadow-[0_0_30px_rgba(59,130,246,0.35)]"
          >
            Get Started
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
