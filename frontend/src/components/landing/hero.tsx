"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const ISAAC_ACTIONS = [
  { verb: "Delegating", target: "Photo inspection to 12 field workers", color: "#3b82f6" },
  { verb: "Vetting", target: "Warehouse submission #4891", color: "#22c55e" },
  { verb: "Scoring", target: "Kitchen cleanliness — 94/100", color: "#f59e0b" },
  { verb: "Alerting", target: "3 missed deadlines in Lagos team", color: "#ef4444" },
  { verb: "Generating", target: "Daily compliance report for HQ", color: "#a855f7" },
  { verb: "Onboarding", target: "New worker via WhatsApp", color: "#06b6d4" },
  { verb: "Delivering", target: "Report to #ops-reviews on Slack", color: "#3b82f6" },
  { verb: "Approving", target: "Store front photo — passed all rules", color: "#22c55e" },
  { verb: "Rejecting", target: "Blurry evidence — requesting resubmit", color: "#ef4444" },
  { verb: "Scheduling", target: "Evening check-in for 48 workers", color: "#f59e0b" },
];

function NeuralCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const nodes: Array<{
      x: number; y: number; vx: number; vy: number;
      baseRadius: number; phase: number;
    }> = [];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const W = () => canvas.getBoundingClientRect().width;
    const H = () => canvas.getBoundingClientRect().height;

    for (let i = 0; i < 50; i++) {
      nodes.push({
        x: Math.random() * W(),
        y: Math.random() * H(),
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        baseRadius: Math.random() * 1.4 + 0.4,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const pulses: Array<{
      fromIdx: number; toIdx: number; progress: number; speed: number;
    }> = [];
    let lastPulse = 0;

    const isDark = () => document.documentElement.classList.contains("dark");

    const draw = () => {
      const w = W();
      const h = H();
      ctx.clearRect(0, 0, w, h);
      const t = performance.now() * 0.001;
      const dark = isDark();
      const nodeColor = dark ? "59,130,246" : "59,130,246";
      const nodeAlphaBase = dark ? 0.1 : 0.06;
      const edgeAlphaBase = dark ? 0.03 : 0.018;
      const pulseColor = dark ? "96,165,250" : "37,99,235";

      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        n.phase += 0.01;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(${nodeColor},${edgeAlphaBase * (1 - dist / 130)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      for (const n of nodes) {
        const r = n.baseRadius * (0.7 + 0.3 * Math.sin(n.phase));
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${nodeColor},${nodeAlphaBase + 0.06 * Math.sin(n.phase)})`;
        ctx.fill();
      }

      if (t - lastPulse > 0.5 && nodes.length > 1) {
        const a = Math.floor(Math.random() * nodes.length);
        let b = a;
        while (b === a) b = Math.floor(Math.random() * nodes.length);
        pulses.push({ fromIdx: a, toIdx: b, progress: 0, speed: 0.007 + Math.random() * 0.008 });
        lastPulse = t;
        if (pulses.length > 12) pulses.shift();
      }

      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.progress += p.speed;
        if (p.progress > 1) { pulses.splice(i, 1); continue; }
        const from = nodes[p.fromIdx];
        const to = nodes[p.toIdx];
        const px = from.x + (to.x - from.x) * p.progress;
        const py = from.y + (to.y - from.y) * p.progress;
        const fade = p.progress < 0.1 ? p.progress / 0.1 : p.progress > 0.85 ? (1 - p.progress) / 0.15 : 1;
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${pulseColor},${0.5 * fade})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

function TerminalCard() {
  const [visibleActions, setVisibleActions] = useState<Array<{
    id: number; action: (typeof ISAAC_ACTIONS)[0]; entering: boolean; ts: string;
  }>>([]);
  const counterRef = useRef(0);

  useEffect(() => {
    const fmt = () => {
      const d = new Date();
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
    };

    const addAction = () => {
      const action = ISAAC_ACTIONS[counterRef.current % ISAAC_ACTIONS.length];
      const id = counterRef.current++;
      const ts = fmt();
      setVisibleActions((prev) => [{ id, action, entering: true, ts }, ...prev].slice(0, 6));
      setTimeout(() => {
        setVisibleActions((prev) => prev.map((a) => (a.id === id ? { ...a, entering: false } : a)));
      }, 60);
    };
    addAction();
    const interval = setInterval(addAction, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full rounded-2xl border border-border bg-card/80 dark:bg-card/60 backdrop-blur-xl shadow-2xl dark:shadow-[0_8px_60px_rgba(0,0,0,0.5)] overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <span className="ml-2 text-[11px] text-muted-foreground font-medium tracking-wide">
          isaac operations
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
          </span>
          <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-medium">live</span>
        </div>
      </div>

      {/* Feed */}
      <div className="p-4 space-y-0.5 font-mono" style={{ minHeight: 260 }}>
        {visibleActions.map((item, idx) => (
          <div
            key={item.id}
            className="flex items-baseline gap-2.5 py-1.5 transition-all duration-400 ease-out"
            style={{
              opacity: item.entering ? 0 : Math.max(1 - idx * 0.12, 0.2),
              transform: item.entering ? "translateX(-8px)" : "translateX(0)",
            }}
          >
            <span className="text-[10px] text-muted-foreground/50 tabular-nums shrink-0 select-none">
              {item.ts}
            </span>
            <span
              className="text-[11px] font-semibold uppercase tracking-wider shrink-0"
              style={{ color: item.action.color }}
            >
              {item.action.verb}
            </span>
            <span className="text-[11px] text-foreground/50 truncate">
              {item.action.target}
            </span>
          </div>
        ))}

        {/* Blinking cursor */}
        <div className="flex items-center gap-2 py-1.5 mt-1">
          <span className="text-[11px] text-primary font-semibold">{">"}</span>
          <div className="w-2 h-4 bg-primary/80 animate-[cursor-blink_1s_step-end_infinite]" />
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          AI-managed operations, 24/7
        </span>
        <span className="text-[10px] text-muted-foreground/50 tabular-nums">
          {ISAAC_ACTIONS.length} action types
        </span>
      </div>
    </div>
  );
}

function MetricsBar() {
  const [counts, setCounts] = useState({ tasks: 0, workers: 0, actions: 0 });

  useEffect(() => {
    const targets = { tasks: 1247, workers: 8430, actions: 10000 };
    const duration = 2000;
    const start = performance.now();
    const tick = () => {
      const elapsed = performance.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCounts({
        tasks: Math.round(targets.tasks * ease),
        workers: Math.round(targets.workers * ease),
        actions: Math.round(targets.actions * ease),
      });
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, []);

  const stats = [
    { label: "Tasks managed", value: counts.tasks.toLocaleString() },
    { label: "Workers monitored", value: counts.workers.toLocaleString() },
    { label: "Actions executed", value: `${(counts.actions / 1000).toFixed(0)}K+` },
  ];

  return (
    <div className="flex gap-8 sm:gap-10 mt-10">
      {stats.map((s) => (
        <div key={s.label}>
          <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">{s.value}</div>
          <div className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mt-0.5">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

export function Hero() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-background">
      {/* Ambient glows — theme-aware */}
      <div className="absolute top-[10%] left-[25%] -translate-x-1/2 w-[1000px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.08)_0%,transparent_65%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.12)_0%,transparent_65%)] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[10%] w-[500px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.04)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.06)_0%,transparent_70%)] pointer-events-none" />

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-3 dark:opacity-3 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <NeuralCanvas />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-8 py-28 lg:py-0">
        <div
          className={`grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-16 items-center transition-all duration-1000 ease-out ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          {/* Left — copy */}
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-card/60 backdrop-blur-sm mb-6">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              <span className="text-[10px] font-medium text-muted-foreground tracking-wider uppercase">
                Autonomous operations running
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-bold tracking-tight text-foreground leading-[1.12]">
              Meet <span className="text-primary">Isaac</span>,{" "}
              <span className="whitespace-nowrap">your business</span>{" "}
              <span className="whitespace-nowrap">operations manager</span>
            </h1>

            <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-lg leading-relaxed">
              Isaac delegates, evaluates, decides and manages your business operations perfectly across 
              your entire workforce in real-time.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="group relative inline-flex items-center gap-2 px-7 py-3 text-[13px] font-semibold text-white rounded-xl bg-primary hover:bg-primary/90 transition-all duration-300 shadow-[0_0_25px_rgba(59,130,246,0.25)] hover:shadow-[0_0_40px_rgba(59,130,246,0.4)] hover:-translate-y-0.5"
              >
                Start Now
                <svg className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
                <div className="absolute inset-0 rounded-xl bg-linear-to-b from-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>
              <a
                href="#how-it-works"
                className="px-7 py-3 text-[13px] font-medium text-muted-foreground hover:text-foreground rounded-xl border border-border hover:border-border/80 hover:bg-muted/50 transition-all duration-300 hover:-translate-y-0.5"
              >
                See how it works
              </a>
            </div>

            <MetricsBar />
          </div>

          {/* Right — terminal card */}
          <div
            className={`transition-all duration-1000 delay-150 ease-out ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <TerminalCard />
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-6 bg-linear-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
}
