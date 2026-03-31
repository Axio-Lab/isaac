"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const apps = [
  { name: "Gmail", logo: "/logo/gmail.svg" },
  { name: "Slack", logo: "/logo/slack.svg" },
  { name: "Discord", logo: "/logo/discord.svg" },
  { name: "GitHub", logo: "/logo/github.svg", darkInvert: true },
  { name: "Notion", logo: "/logo/notion.svg", darkInvert: true },
  { name: "Sheets", logo: "/logo/googlesheets.svg" },
  { name: "Docs", logo: "/logo/googledocs.svg" },
  { name: "Stripe", logo: "/logo/stripe.svg" },
  { name: "Jira", logo: "/logo/jira.svg" },
  { name: "HubSpot", logo: "/logo/hubspot.svg" },
  { name: "Calendar", logo: "/logo/googlecalendar.svg" },
  { name: "Airtable", logo: "/logo/airtable.svg" },
  { name: "Telegram", logo: "/logo/telegram.svg" },
];

const TOTAL = apps.length;

function OrbitCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const isDark = () => document.documentElement.classList.contains("dark");

    const dataPulses: Array<{
      appIdx: number;
      progress: number;
      speed: number;
    }> = [];

    let lastPulse = 0;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const orbitR = Math.min(w, h) * 0.345;
      const t = performance.now() * 0.001;
      const dark = isDark();

      const ringAlpha = dark ? 0.06 : 0.08;
      const spokeBase = dark ? 0.05 : 0.07;
      const spokeHighlight = dark ? 0.35 : 0.25;
      const pulseRgb = dark ? "96,165,250" : "37,99,235";
      const spokeRgb = "59,130,246";

      // Orbit rings
      for (let r = 0; r < 3; r++) {
        const ringRadius = orbitR * (0.75 + r * 0.13);
        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${spokeRgb},${ringAlpha - r * 0.015})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Center breathing glow — matches the hub size
      const hubR = Math.min(w, h) * 0.062;
      const breathe = 0.06 + 0.03 * Math.sin(t * 1.5);
      ctx.beginPath();
      ctx.arc(cx, cy, hubR + 8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${spokeRgb},${breathe})`;
      ctx.fill();

      // Highlight cycles through apps
      const highlightIdx = Math.floor(t * 0.4) % TOTAL;

      // Draw spokes from center to each app tile position
      for (let i = 0; i < TOTAL; i++) {
        const angle = (Math.PI * 2 * i) / TOTAL - Math.PI / 2;
        const ax = cx + Math.cos(angle) * orbitR;
        const ay = cy + Math.sin(angle) * orbitR;
        const highlighted = i === highlightIdx;

        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([3, 5]);
        ctx.lineDashOffset = -t * 18;
        ctx.moveTo(cx, cy);
        ctx.lineTo(ax, ay);

        if (highlighted) {
          const grad = ctx.createLinearGradient(cx, cy, ax, ay);
          grad.addColorStop(0, `rgba(${spokeRgb},${spokeHighlight})`);
          grad.addColorStop(1, `rgba(${spokeRgb},0.08)`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.5;
        } else {
          ctx.strokeStyle = `rgba(${spokeRgb},${spokeBase})`;
          ctx.lineWidth = 0.7;
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Glow behind highlighted app
        if (highlighted) {
          ctx.beginPath();
          ctx.arc(ax, ay, 26, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${spokeRgb},0.05)`;
          ctx.fill();
        }
      }

      // Fire data pulses
      if (t - lastPulse > 0.3) {
        dataPulses.push({
          appIdx: Math.floor(Math.random() * TOTAL),
          progress: 0,
          speed: 0.006 + Math.random() * 0.008,
        });
        lastPulse = t;
        if (dataPulses.length > 16) dataPulses.shift();
      }

      for (let i = dataPulses.length - 1; i >= 0; i--) {
        const p = dataPulses[i];
        p.progress += p.speed;
        if (p.progress > 1) {
          dataPulses.splice(i, 1);
          continue;
        }

        const angle = (Math.PI * 2 * p.appIdx) / TOTAL - Math.PI / 2;
        const ease =
          p.progress < 0.5 ? 2 * p.progress * p.progress : 1 - Math.pow(-2 * p.progress + 2, 2) / 2;
        const px = cx + Math.cos(angle) * orbitR * ease;
        const py = cy + Math.sin(angle) * orbitR * ease;
        const fade =
          p.progress < 0.1 ? p.progress / 0.1 : p.progress > 0.85 ? (1 - p.progress) / 0.15 : 1;

        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${pulseRgb},${0.7 * fade})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${pulseRgb},${0.12 * fade})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

function AppTile({ app, index }: { app: (typeof apps)[0]; index: number }) {
  const angleRad = (Math.PI * 2 * index) / TOTAL - Math.PI / 2;
  const left = 50 + Math.cos(angleRad) * 34.5;
  const top = 50 + Math.sin(angleRad) * 34.5;

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
      style={{ left: `${left}%`, top: `${top}%` }}
    >
      <div className="flex flex-col items-center gap-1.5 group cursor-default">
        <div className="landing-edge-shadow-soft h-9 w-9 sm:h-11 sm:w-11 rounded-xl border border-border bg-card/95 backdrop-blur-sm flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_4px_20px_rgba(59,130,246,0.15)] overflow-hidden">
          <img
            src={app.logo}
            alt={app.name}
            className={cn(
              "h-4.5 w-4.5 sm:h-5.5 sm:w-5.5 object-contain",
              app.darkInvert && "dark:invert"
            )}
          />
        </div>
        <span className="text-[8px] sm:text-[9px] text-muted-foreground/50 font-medium tracking-wider uppercase group-hover:text-muted-foreground transition-colors">
          {app.name}
        </span>
      </div>
    </div>
  );
}

function useInViewOnce(threshold = 0.1) {
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
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

export function IntegrationsOrbit() {
  const { ref: sectionRef, visible } = useInViewOnce();

  return (
    <section id="integrations" className="relative py-14 overflow-hidden">
      <div className="absolute inset-0 bg-background" />

      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.06)_0%,transparent_65%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.08)_0%,transparent_65%)] pointer-events-none" />

      <div ref={sectionRef} className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-14 items-center">
          {/* Left: text */}
          <div
            className={cn(
              "transition-all duration-700",
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            <h2 className="text-4xl sm:text-5xl lg:text-5xl font-bold text-foreground tracking-tight leading-tight">
              <span className="text-primary">Isaac</span> plugs directly into your existing
              architecture.
            </h2>
            <p className="mt-4 text-base text-muted-foreground max-w-md">
              With over 1,000+ apps and 10,000+ custom actions. Isaac reads, writes, and acts across
              your tools without you switching tabs.
            </p>

            <div className="mt-8 flex flex-col gap-3 text-[13px] text-muted-foreground">
              <div className="flex items-center gap-2.5">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>Gmail, Slack, Discord, Notion, Jira, and more</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>Read, write, trigger, schedule across every app</span>
              </div>
            </div>
          </div>

          {/* Right: orbit */}
          <div
            className={cn(
              "flex justify-center transition-all duration-1000",
              visible ? "opacity-100 scale-100" : "opacity-0 scale-90"
            )}
          >
            <div className="relative w-full max-w-[600px] aspect-square">
              <OrbitCanvas />

              {/* Center hub — circle, pinned to exact center */}
              <div
                className="absolute z-20 h-16 w-16 sm:h-18 sm:w-18"
                style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
              >
                <div className="relative h-full w-full rounded-full bg-linear-to-br from-primary to-blue-600 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3),0_0_60px_rgba(59,130,246,0.1)]">
                  <img
                    src="/images/isaac-mark.svg"
                    alt="Isaac"
                    className="h-7 w-7 sm:h-8 sm:w-8"
                    width={32}
                    height={32}
                  />
                </div>
                <div className="absolute inset-[-6px] rounded-full border border-primary/20 animate-ping-slow" />
                <div className="absolute inset-[-14px] rounded-full border border-primary/10 animate-[ping-slow_3s_ease-out_infinite_0.5s]" />
              </div>

              {/* App tiles on the orbit */}
              {apps.map((app, i) => (
                <AppTile key={app.name} app={app} index={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
