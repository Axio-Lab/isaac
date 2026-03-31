"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

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

/* ── Step 1 animation: task config form ── */
function TaskCreateAnimation() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setPhase((p) => (p + 1) % 4), 1600);
    return () => clearInterval(timer);
  }, []);

  const lines = [
    { label: "Task name", value: "Morning kitchen inspection", active: phase >= 0 },
    { label: "Evidence type", value: "Photo + checklist", active: phase >= 1 },
    { label: "Schedule", value: "Daily at 7:00 AM", active: phase >= 2 },
    { label: "Pass threshold", value: "85%", active: phase >= 3 },
  ];

  return (
    <div className="space-y-2 font-mono text-[11px]">
      {lines.map((l, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center justify-between px-3 py-1.5 rounded-md border transition-all duration-500",
            l.active
              ? "border-primary/30 bg-primary/5 text-foreground"
              : "border-transparent text-foreground/20"
          )}
        >
          <span className="text-foreground/40">{l.label}</span>
          <span className={l.active ? "text-primary" : ""}>{l.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Step 2 animation: workers joining ── */
function WorkerOnboardAnimation() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setCount((c) => (c + 1) % 6), 1200);
    return () => clearInterval(timer);
  }, []);

  const workers = [
    { name: "Sarah M.", channel: "WhatsApp" },
    { name: "James K.", channel: "Telegram" },
    { name: "Amara D.", channel: "Slack" },
    { name: "Chen W.", channel: "Discord" },
    { name: "Priya R.", channel: "WhatsApp" },
  ];

  return (
    <div className="space-y-1.5 font-mono text-[11px]">
      {workers.map((w, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-500",
            i < count ? "opacity-100" : "opacity-0 translate-x-4"
          )}
        >
          <div
            className={cn(
              "h-1.5 w-1.5 rounded-full transition-colors duration-500",
              i < count ? "bg-emerald-400" : "bg-foreground/10"
            )}
          />
          <span className="text-foreground/60">{w.name}</span>
          <span className="text-foreground/20 ml-auto">{w.channel}</span>
        </div>
      ))}
      <div className="text-right text-foreground/30 pr-3 pt-1">
        {Math.min(count, 5)}/5 onboarded
      </div>
    </div>
  );
}

/* ── Step 3 animation: vetting pipeline ── */
function VettingPipelineAnimation() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setStep((s) => (s + 1) % 5), 1400);
    return () => clearInterval(timer);
  }, []);

  const pipeline = [
    { label: "Submission received", color: "text-sky-400" },
    { label: "Running 4 acceptance rules", color: "text-amber-400" },
    { label: "Quality score: 92/100", color: "text-purple-400" },
    { label: "Result: Approved", color: "text-emerald-400" },
    { label: "Feedback sent to worker", color: "text-blue-400" },
  ];

  return (
    <div className="space-y-1.5 font-mono text-[11px]">
      {pipeline.map((p, i) => (
        <div
          key={i}
          className={cn(
            "px-3 py-1.5 rounded-md transition-all duration-500",
            i <= step ? "opacity-100" : "opacity-0",
            i === step ? `${p.color} bg-white/3` : "text-foreground/25"
          )}
        >
          <span className="text-foreground/30 mr-2">{">>"}</span>
          {p.label}
        </div>
      ))}
    </div>
  );
}

/* ── Step 4 animation: report generation ── */
function ReportAnimation() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setPhase((p) => (p + 1) % 4), 2000);
    return () => clearInterval(timer);
  }, []);

  const metrics = [
    { label: "Pass rate", value: "94%", bar: 94 },
    { label: "Submissions", value: "47/50", bar: 94 },
    { label: "Flagged", value: "2", bar: 4 },
  ];

  return (
    <div className="space-y-3 font-mono text-[11px]">
      {metrics.map((m, i) => (
        <div
          key={i}
          className={cn(
            "transition-all duration-700",
            i <= phase ? "opacity-100" : "opacity-0 translate-y-2"
          )}
        >
          <div className="flex justify-between text-foreground/40 mb-1 px-1">
            <span>{m.label}</span>
            <span className="text-foreground/60">{m.value}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-foreground/5 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-1000 ease-out",
                m.bar > 50 ? "bg-primary/60" : "bg-amber-400/60"
              )}
              style={{ width: i <= phase ? `${m.bar}%` : "0%" }}
            />
          </div>
        </div>
      ))}
      <div
        className={cn(
          "flex items-center gap-2 pt-2 px-1 transition-all duration-500",
          phase >= 3 ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-emerald-400/70">Report delivered to Slack + Google Docs</span>
      </div>
    </div>
  );
}

const STEPS = [
  {
    number: "01",
    title: "Define the task",
    description:
      "Set up what needs to get done. Photo evidence, checklists, schedules, scoring rules, reference samples. Isaac learns what 'good' looks like from you.",
    Animation: TaskCreateAnimation,
  },
  {
    number: "02",
    title: "Assign your team",
    description:
      "Add workers via WhatsApp, Telegram, Slack, or Discord. Isaac onboards them, explains the task, and starts sending scheduled reminders automatically.",
    Animation: WorkerOnboardAnimation,
  },
  {
    number: "03",
    title: "Isaac vets every submission",
    description:
      "Workers submit evidence through chat. Isaac scores quality, checks compliance against your rules, and gives instant feedback. No manual review needed.",
    Animation: VettingPipelineAnimation,
  },
  {
    number: "04",
    title: "Reports land in your inbox",
    description:
      "Daily compliance reports with pass rates, flagged workers, and performance trends. Delivered as Google Docs, Slack messages, or straight to your dashboard.",
    Animation: ReportAnimation,
  },
];

const AUTO_ADVANCE_MS = 6000;

export function HowItWorks() {
  const { ref, visible } = useInViewOnce();
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState<"right" | "left">("right");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback(
    (idx: number) => {
      setDirection(idx > active ? "right" : "left");
      setActive(idx);
    },
    [active]
  );

  // Auto-advance
  useEffect(() => {
    if (!visible) return;
    timerRef.current = setTimeout(() => {
      setDirection("right");
      setActive((prev) => (prev + 1) % STEPS.length);
    }, AUTO_ADVANCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active, visible]);

  const currentStep = STEPS[active];

  return (
    <section id="how-it-works" className="relative py-14 overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/6 to-transparent" />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.05)_0%,transparent_70%)] pointer-events-none" />

      <div ref={ref} className="relative max-w-5xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div
          className={cn(
            "text-center mb-12 transition-all duration-700",
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <span className="inline-flex px-3 py-1 rounded-full text-[11px] font-medium tracking-wider uppercase text-primary/80 border border-primary/20 bg-primary/5">
            How it Works
          </span>
          <h2 className="mt-5 text-4xl sm:text-5xl lg:text-5xl font-bold text-foreground tracking-tight leading-tight">
            Four steps to <span className="text-primary">total oversight</span>
          </h2>
          <p className="mt-4 text-base text-muted-foreground max-w-lg mx-auto">
            From task setup to compliance reports, Isaac handles everything in between.
          </p>
        </div>

        {/* Slider area */}
        <div
          className={cn(
            "transition-all duration-700",
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          )}
        >
          {/* Step navigation tabs */}
          <div className="flex items-stretch gap-2 sm:gap-3 mb-8">
            {STEPS.map((step, i) => (
              <button
                key={step.number}
                onClick={() => goTo(i)}
                className={cn(
                  "landing-edge-shadow-soft relative flex-1 text-left px-3 sm:px-4 py-3 sm:py-4 rounded-xl border transition-all duration-400 cursor-pointer group",
                  i === active
                    ? "border-primary/30 bg-primary/5"
                    : "border-white/6 bg-white/2 hover:border-white/10 hover:bg-white/4"
                )}
              >
                <span
                  className={cn(
                    "block text-[10px] sm:text-[11px] font-bold tracking-widest uppercase transition-colors duration-300",
                    i === active
                      ? "text-primary"
                      : "text-foreground/25 group-hover:text-foreground/40"
                  )}
                >
                  Step {step.number}
                </span>
                <span
                  className={cn(
                    "block text-xs sm:text-sm font-semibold mt-0.5 tracking-tight transition-colors duration-300",
                    i === active
                      ? "text-foreground"
                      : "text-foreground/40 group-hover:text-foreground/60"
                  )}
                >
                  {step.title}
                </span>

                {/* Progress bar that fills during auto-advance */}
                <div className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-foreground/5 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full bg-primary/50",
                      i === active ? "animate-[fill-bar_6s_linear]" : "w-0"
                    )}
                  />
                </div>
              </button>
            ))}
          </div>

          {/* Slide content: side-by-side text + animation */}
          <div className="landing-edge-shadow relative rounded-2xl border border-white/6 bg-white/2 overflow-hidden min-h-[280px]">
            <div
              key={active}
              className={cn(
                "grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 p-6 sm:p-8 lg:p-10",
                direction === "right"
                  ? "animate-[slide-in-right_0.4s_ease-out]"
                  : "animate-[slide-in-left_0.4s_ease-out]"
              )}
            >
              {/* Left: text */}
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold">
                    {currentStep.number}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
                    {currentStep.title}
                  </h3>
                </div>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {currentStep.description}
                </p>
              </div>

              {/* Right: live animation */}
              <div className="flex items-center">
                <div className="landing-edge-shadow-soft w-full rounded-xl border border-white/6 bg-background/50 p-5">
                  <div className="flex items-center gap-1.5 mb-4">
                    <div className="h-2 w-2 rounded-full bg-red-400/60" />
                    <div className="h-2 w-2 rounded-full bg-amber-400/60" />
                    <div className="h-2 w-2 rounded-full bg-emerald-400/60" />
                    <span className="ml-2 text-[10px] text-foreground/20 font-mono">
                      isaac / step-{currentStep.number}
                    </span>
                  </div>
                  <currentStep.Animation />
                </div>
              </div>
            </div>

            {/* Shimmer overlay */}
            <div
              className="absolute inset-0 pointer-events-none opacity-40"
              style={{
                background:
                  "linear-gradient(105deg, transparent 40%, rgba(59,130,246,0.04) 50%, transparent 60%)",
                backgroundSize: "200% 100%",
                animation: "shimmer-border 3s linear infinite",
              }}
            />
          </div>

          {/* Dot indicators for mobile */}
          <div className="flex items-center justify-center gap-2 mt-5 lg:hidden">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
                  i === active ? "w-6 bg-primary" : "w-1.5 bg-foreground/15 hover:bg-foreground/25"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
