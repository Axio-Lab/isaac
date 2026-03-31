"use client";

import { useEffect, useRef, useState } from "react";

const apps = [
  { name: "Gmail", color: "#EA4335", icon: "M" },
  { name: "Slack", color: "#4A154B", icon: "S" },
  { name: "Discord", color: "#5865F2", icon: "D" },
  { name: "GitHub", color: "#ffffff", icon: "G" },
  { name: "Notion", color: "#ffffff", icon: "N" },
  { name: "Sheets", color: "#34A853", icon: "S" },
  { name: "Stripe", color: "#635BFF", icon: "S" },
  { name: "Jira", color: "#0052CC", icon: "J" },
  { name: "HubSpot", color: "#FF7A59", icon: "H" },
  { name: "Linear", color: "#5E6AD2", icon: "L" },
  { name: "Airtable", color: "#18BFFF", icon: "A" },
  { name: "Telegram", color: "#26A5E4", icon: "T" },
];

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
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const dataDots: Array<{
      angle: number;
      speed: number;
      radius: number;
      progress: number;
      appIndex: number;
    }> = [];

    for (let i = 0; i < 8; i++) {
      dataDots.push({
        angle: (Math.PI * 2 * i) / 8,
        speed: 0.003 + Math.random() * 0.004,
        radius: 2 + Math.random() * 1.5,
        progress: Math.random(),
        appIndex: Math.floor(Math.random() * apps.length),
      });
    }

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const orbitRadius = Math.min(w, h) * 0.38;
      const t = Date.now() * 0.001;

      // Outer orbit rings
      for (let r = 0; r < 2; r++) {
        const ringR = orbitRadius * (0.85 + r * 0.15);
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(59, 130, 246, ${0.06 - r * 0.02})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Center ping
      const pingScale = 1 + 0.15 * Math.sin(t * 1.5);
      const pingAlpha = 0.08 + 0.04 * Math.sin(t * 1.5);
      ctx.beginPath();
      ctx.arc(cx, cy, 40 * pingScale, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(59, 130, 246, ${pingAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, 55 * pingScale, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(59, 130, 246, ${pingAlpha * 0.5})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Dashed spokes to each app
      const highlightIdx = Math.floor(t * 0.5) % apps.length;

      for (let i = 0; i < apps.length; i++) {
        const angle = (Math.PI * 2 * i) / apps.length - Math.PI / 2;
        const ax = cx + Math.cos(angle) * orbitRadius;
        const ay = cy + Math.sin(angle) * orbitRadius;
        const isHighlighted = i === highlightIdx;

        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([4, 6]);
        ctx.lineDashOffset = -t * 20;
        ctx.moveTo(cx, cy);
        ctx.lineTo(ax, ay);

        if (isHighlighted) {
          const grad = ctx.createLinearGradient(cx, cy, ax, ay);
          grad.addColorStop(0, "rgba(0, 163, 240, 0.6)");
          grad.addColorStop(1, "rgba(59, 130, 246, 0.15)");
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.5;
        } else {
          ctx.strokeStyle = "rgba(59, 130, 246, 0.08)";
          ctx.lineWidth = 0.8;
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        if (isHighlighted) {
          ctx.beginPath();
          ctx.arc(ax, ay, 28, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(59, 130, 246, 0.06)";
          ctx.fill();
        }
      }

      // Data dots
      for (const dot of dataDots) {
        dot.progress += dot.speed;
        if (dot.progress > 1) {
          dot.progress = 0;
          dot.appIndex = Math.floor(Math.random() * apps.length);
        }

        const angle = (Math.PI * 2 * dot.appIndex) / apps.length - Math.PI / 2;
        const p = dot.progress;
        const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        const dx = cx + Math.cos(angle) * orbitRadius * eased;
        const dy = cy + Math.sin(angle) * orbitRadius * eased;
        const alpha = p < 0.1 ? p / 0.1 : p > 0.9 ? (1 - p) / 0.1 : 1;

        ctx.beginPath();
        ctx.arc(dx, dy, dot.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 163, 240, ${0.8 * alpha})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(dx, dy, dot.radius + 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 163, 240, ${0.15 * alpha})`;
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

function AppTile({
  app,
  index,
  total,
  containerSize,
}: {
  app: (typeof apps)[0];
  index: number;
  total: number;
  containerSize: number;
}) {
  const angle = (360 / total) * index - 90;
  const rad = (angle * Math.PI) / 180;
  const radius = containerSize * 0.38;
  const x = 50 + (Math.cos(rad) * radius * 100) / containerSize;
  const y = 50 + (Math.sin(rad) * radius * 100) / containerSize;

  const floatDelay = index * 0.3;

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        animation: `float-tile 4s ease-in-out ${floatDelay}s infinite`,
      }}
    >
      <div className="flex flex-col items-center gap-1.5 group cursor-default">
        <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl border border-white/8 bg-white/4 backdrop-blur-sm flex items-center justify-center text-sm font-bold transition-all duration-300 group-hover:border-white/20 group-hover:bg-white/8 group-hover:scale-110 shadow-[0_2px_20px_rgba(0,0,0,0.3)]">
          <span style={{ color: app.color }}>{app.icon}</span>
        </div>
        <span className="text-[9px] text-foreground/30 font-medium tracking-wider uppercase group-hover:text-foreground/60 transition-colors">
          {app.name}
        </span>
      </div>
    </div>
  );
}

export function IntegrationsOrbit() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState(500);
  const { ref: sectionRef, visible } = useInViewOnce();

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const s = Math.min(containerRef.current.offsetWidth, 600);
        setContainerSize(s);
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  return (
    <section id="integrations" className="relative py-14 overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/6 to-transparent" />

      <div ref={sectionRef} className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <div
          className={`text-center mb-16 transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="inline-flex px-3 py-1 rounded-full text-[11px] font-medium tracking-wider uppercase text-cyan-400/80 border border-cyan-400/20 bg-cyan-400/5">
            Integrations
          </span>
          <h2 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
            Connected to{" "}
            <span className="bg-linear-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              1,000+ apps
            </span>
          </h2>
          <p className="mt-4 text-base text-foreground/40 max-w-lg mx-auto">
            Powered by Composio, Isaac integrates with your entire stack and can execute over
            10,000+ automated actions across platforms.
          </p>
        </div>

        <div className="flex justify-center">
          <div
            ref={containerRef}
            className={`relative w-full max-w-[600px] aspect-square transition-all duration-1000 ${
              visible ? "opacity-100 scale-100" : "opacity-0 scale-90"
            }`}
          >
            <OrbitCanvas />

            {/* Center hub */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
              <div className="relative h-20 w-20 rounded-2xl bg-linear-to-br from-[#00A3F0] to-[#0066CC] flex items-center justify-center shadow-[0_0_40px_rgba(0,163,240,0.3)]">
                <img
                  src="/images/isaac-mark.svg"
                  alt="Isaac"
                  className="h-8 w-8"
                  width={32}
                  height={32}
                />
                <div className="absolute inset-0 rounded-2xl animate-ping-slow border-2 border-[#00A3F0]/30" />
                <div
                  className="absolute inset-0 rounded-2xl border-2 border-[#00A3F0]/15"
                  style={{ animation: "ping-slow 3s ease-out infinite 0.5s" }}
                />
              </div>
            </div>

            {apps.map((app, i) => (
              <AppTile
                key={app.name}
                app={app}
                index={i}
                total={apps.length}
                containerSize={containerSize}
              />
            ))}
          </div>
        </div>

        <div
          className={`mt-12 flex flex-wrap justify-center gap-6 text-[13px] text-foreground/30 transition-all duration-700 delay-300 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-cyan-400/60" />
            <span>1,000+ App Integrations</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-cyan-400/60" />
            <span>10,000+ Automated Actions</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-cyan-400/60" />
            <span>Powered by Composio</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function useInViewOnce(threshold = 0.15) {
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
