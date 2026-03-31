"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

function useInView(threshold = 0.08) {
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

/* ── Vetting simulation: submission arrives, gets scored, verdict shown ── */
function VettingAnimation() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setStep((s) => (s + 1) % 5), 1800);
    return () => clearInterval(timer);
  }, []);

  const steps = [
    {
      label: "Submission received",
      detail: "Kitchen photo from worker #12",
      color: "text-sky-400",
    },
    {
      label: "Analyzing image",
      detail: "Checking against 4 acceptance rules",
      color: "text-amber-400",
    },
    { label: "Scoring", detail: "Quality: 91/100", color: "text-purple-400" },
    { label: "Approved", detail: "Feedback sent to worker", color: "text-emerald-400" },
    { label: "Logged", detail: "Added to daily report", color: "text-blue-400" },
  ];

  return (
    <div className="mt-4 space-y-1.5 font-mono text-[11px]">
      {steps.map((s, i) => (
        <div
          key={s.label}
          className={cn(
            "flex items-center gap-2 transition-all duration-500",
            i <= step ? "opacity-100 translate-x-0" : "opacity-0 translate-x-3"
          )}
        >
          <div
            className={cn(
              "h-1.5 w-1.5 rounded-full shrink-0 transition-colors duration-300",
              i < step
                ? "bg-emerald-400"
                : i === step
                  ? "bg-amber-400 animate-pulse"
                  : "bg-muted-foreground/20"
            )}
          />
          <span
            className={cn(
              "transition-colors duration-300",
              i === step ? s.color : "text-muted-foreground/60"
            )}
          >
            {s.label}
          </span>
          {i === step && (
            <span className="text-muted-foreground/40 truncate ml-auto">{s.detail}</span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Compliance simulation: live deadline tracker ── */
function ComplianceAnimation() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(timer);
  }, []);

  const workers = [
    { name: "Maria L.", status: "on-time" },
    { name: "James K.", status: "on-time" },
    { name: "Ade O.", status: "late" },
    { name: "Chen W.", status: "on-time" },
  ];
  const flagged = tick % 3 === 0;

  return (
    <div className="mt-4 space-y-1.5 text-[11px]">
      {workers.map((w, i) => {
        const isLate = w.status === "late";
        const justFlagged = isLate && flagged;
        return (
          <div key={w.name} className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground/70">{w.name}</span>
            <span
              className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-medium transition-all duration-500",
                isLate
                  ? justFlagged
                    ? "bg-red-500/15 text-red-400 scale-105"
                    : "bg-red-500/10 text-red-400/70"
                  : "bg-emerald-500/10 text-emerald-400/70"
              )}
            >
              {isLate ? (justFlagged ? "FLAGGED" : "Late") : "On time"}
            </span>
          </div>
        );
      })}
      {flagged && (
        <div className="text-[10px] text-red-400/60 animate-pulse pt-0.5">
          Isaac: Alert sent to manager
        </div>
      )}
    </div>
  );
}

/* ── Report simulation: building a report line by line ── */
function ReportAnimation() {
  const [line, setLine] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setLine((l) => (l + 1) % 6), 1400);
    return () => clearInterval(timer);
  }, []);

  const lines = [
    { text: "Pass rate: 87%", color: "text-emerald-400" },
    { text: "Submissions: 42/48", color: "text-blue-400" },
    { text: "Missed: 6", color: "text-red-400" },
    { text: "Flagged workers: 2", color: "text-amber-400" },
    { text: "Generating PDF...", color: "text-purple-400" },
    { text: "Delivered to #ops-reviews", color: "text-emerald-400" },
  ];

  return (
    <div className="mt-4 space-y-1 font-mono text-[11px]">
      {lines.map((l, i) => (
        <div
          key={l.text}
          className={cn(
            "flex items-center gap-2 transition-all duration-400",
            i <= line ? "opacity-100" : "opacity-0"
          )}
        >
          <span className="text-muted-foreground/30">{">"}</span>
          <span className={cn(i === line ? l.color : "text-muted-foreground/50")}>{l.text}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Workflow simulation: task lifecycle ── */
function WorkflowAnimation() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setPhase((p) => (p + 1) % 4), 2200);
    return () => clearInterval(timer);
  }, []);

  const phases = [
    { action: "Task created", target: "Daily store inspection", icon: "+" },
    { action: "Workers assigned", target: "12 field agents notified", icon: ">" },
    { action: "Reminder sent", target: "Deadline in 30 minutes", icon: "!" },
    { action: "Evidence collected", target: "11/12 submissions received", icon: "#" },
  ];

  return (
    <div className="mt-4 space-y-2 text-[11px]">
      {phases.map((p, i) => (
        <div
          key={p.action}
          className={cn(
            "flex items-center gap-2.5 transition-all duration-500",
            i <= phase ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          )}
        >
          <div
            className={cn(
              "h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors duration-300",
              i === phase
                ? "bg-primary/15 text-primary"
                : i < phase
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-muted text-muted-foreground/30"
            )}
          >
            {i < phase ? "ok" : p.icon}
          </div>
          <div className="min-w-0">
            <span
              className={cn(
                "font-medium",
                i === phase ? "text-foreground" : "text-muted-foreground/60"
              )}
            >
              {p.action}
            </span>
            {i === phase && <p className="text-muted-foreground/40 truncate">{p.target}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Multi-channel simulation: messages flowing across platforms ── */
function ChannelAnimation() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setActive((a) => (a + 1) % 4), 1600);
    return () => clearInterval(timer);
  }, []);

  const channels = [
    { name: "WhatsApp", msg: "Photo received from Maria", color: "text-emerald-400" },
    { name: "Telegram", msg: "Reminder sent to Ade", color: "text-sky-400" },
    { name: "Slack", msg: "Report posted to #ops", color: "text-purple-400" },
    { name: "Discord", msg: "Worker onboarded", color: "text-indigo-400" },
  ];

  return (
    <div className="mt-4 space-y-1.5 text-[11px]">
      {channels.map((ch, i) => (
        <div
          key={ch.name}
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded-md transition-all duration-500",
            i === active ? "bg-foreground/4 dark:bg-white/5" : ""
          )}
        >
          <span
            className={cn(
              "font-medium w-20 shrink-0 transition-colors duration-300",
              i === active ? ch.color : "text-muted-foreground/40"
            )}
          >
            {ch.name}
          </span>
          <span
            className={cn(
              "truncate transition-all duration-500",
              i === active
                ? "text-muted-foreground opacity-100 translate-x-0"
                : "text-muted-foreground/30 opacity-60 translate-x-1"
            )}
          >
            {ch.msg}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Scale simulation: counter climbing ── */
function ScaleAnimation() {
  const [counts, setCounts] = useState({ workers: 12, tasks: 3, actions: 140 });
  useEffect(() => {
    const timer = setInterval(() => {
      setCounts((c) => ({
        workers: c.workers >= 5000 ? 12 : c.workers + Math.floor(Math.random() * 200 + 50),
        tasks: c.tasks >= 200 ? 3 : c.tasks + Math.floor(Math.random() * 8 + 2),
        actions: c.actions >= 10000 ? 140 : c.actions + Math.floor(Math.random() * 400 + 100),
      }));
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mt-4 flex gap-4 text-[11px]">
      {[
        { label: "Workers", value: counts.workers.toLocaleString(), color: "text-rose-400" },
        { label: "Tasks", value: counts.tasks.toLocaleString(), color: "text-amber-400" },
        { label: "Actions", value: counts.actions.toLocaleString(), color: "text-blue-400" },
      ].map((s) => (
        <div key={s.label} className="flex-1">
          <div
            className={cn("text-lg font-bold tabular-nums transition-all duration-300", s.color)}
          >
            {s.value}
          </div>
          <div className="text-muted-foreground/40 text-[10px]">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Feature data ── */
interface FeatureDef {
  title: string;
  description: string;
  status: string;
  meta: string;
  tags: string[];
  animation: React.ReactNode;
}

const heroFeature: FeatureDef = {
  title: "Autonomous Vetting",
  meta: "Real-time",
  description:
    "Isaac receives worker submissions, analyzes images and text against your acceptance rules, scores each one, and sends feedback directly to the worker.",
  status: "Live",
  tags: ["Vision", "Scoring", "Rules", "Feedback"],
  animation: <VettingAnimation />,
};

const middleRow: FeatureDef[] = [
  {
    title: "Compliance Tracking",
    meta: "24/7",
    description:
      "Isaac watches every deadline. Late submissions and repeat offenders get flagged before you even ask.",
    status: "Active",
    tags: ["Deadlines", "Alerts"],
    animation: <ComplianceAnimation />,
  },
  {
    title: "Report Generation",
    meta: "Daily",
    description:
      "Pass rates, worker breakdowns, and flagged issues compiled and delivered to Slack, Google Docs, or your inbox.",
    status: "Auto",
    tags: ["Analytics", "Delivery"],
    animation: <ReportAnimation />,
  },
  {
    title: "Workflow Automation",
    meta: "Zero-touch",
    description:
      "Create a task, assign workers, set a schedule. Isaac sends reminders, collects evidence, and follows up.",
    status: "Active",
    tags: ["Scheduling", "Follow-ups"],
    animation: <WorkflowAnimation />,
  },
];

const bottomRow: FeatureDef[] = [
  {
    title: "Multi-Channel Reach",
    meta: "5 platforms",
    description: "Isaac talks to workers on whichever platform they already use.",
    status: "Connected",
    tags: ["WhatsApp", "Slack", "Telegram"],
    animation: <ChannelAnimation />,
  },
  {
    title: "Built to Scale",
    meta: "Unlimited",
    description: "5 workers or 5,000. Isaac handles the volume without slowing down.",
    status: "Enterprise",
    tags: ["Teams", "Scale"],
    animation: <ScaleAnimation />,
  },
];

/* ── Card ── */
function FeatureCard({
  item,
  index,
  visible,
  direction = "up",
}: {
  item: FeatureDef;
  index: number;
  visible: boolean;
  direction?: "up" | "left" | "right";
}) {
  const hiddenClass =
    direction === "left"
      ? "opacity-0 -translate-x-12"
      : direction === "right"
        ? "opacity-0 translate-x-12"
        : "opacity-0 translate-y-10";

  return (
    <div
      className={cn(
        "group relative p-5 rounded-xl overflow-hidden transition-all duration-700 ease-out",
        "landing-edge-shadow-soft border border-border bg-card",
        "hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_4px_24px_rgba(255,255,255,0.04)]",
        "hover:-translate-y-1 will-change-transform",
        visible ? "opacity-100 translate-x-0 translate-y-0" : hiddenClass
      )}
      style={{ transitionDelay: `${index * 120}ms` }}
    >
      <div className="relative flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-foreground tracking-tight text-[15px]">
            {item.title}
            <span className="ml-2 text-[11px] text-muted-foreground font-normal">{item.meta}</span>
          </h3>
          <span
            className={cn(
              "text-[10px] font-medium px-2 py-0.5 rounded-md",
              "bg-foreground/5 dark:bg-white/10 text-muted-foreground",
              item.status === "Live" && "text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15"
            )}
          >
            {item.status === "Live" && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
            )}
            {item.status}
          </span>
        </div>

        <p className="text-[13px] text-muted-foreground leading-relaxed mt-2">{item.description}</p>

        {/* Live simulation */}
        {item.animation}

        {/* Tags */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-4">
          {item.tags.map((tag) => (
            <span key={tag} className="px-1.5 py-0.5 rounded-md bg-foreground/5 dark:bg-white/10">
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Section ── */
export function Features() {
  const { ref, visible } = useInView();

  return (
    <section id="features" className="relative pt-2 pb-14 overflow-hidden">
      <div className="absolute inset-0 bg-background" />

      <div ref={ref} className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <div
          className={`text-center mb-12 transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="inline-flex px-3 py-1 rounded-full text-[11px] font-medium tracking-wider uppercase text-primary/80 border border-primary/20 bg-primary/5">
            Isaac&apos;s Capabilities
          </span>
          <h2 className="mt-5 text-4xl sm:text-5xl lg:text-5xl font-bold text-foreground tracking-tight leading-tight">
            Everything <span className="text-primary">Isaac</span> does for you
          </h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-lg mx-auto">
            Set the rules. Assign the work. Isaac handles the rest.
          </p>
        </div>

        <div className="space-y-3">
          <FeatureCard item={heroFeature} index={0} visible={visible} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {middleRow.map((item, i) => (
              <FeatureCard key={item.title} item={item} index={i + 1} visible={visible} />
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FeatureCard item={bottomRow[0]} index={5} visible={visible} direction="left" />
            <FeatureCard item={bottomRow[1]} index={5} visible={visible} direction="right" />
          </div>
        </div>
      </div>
    </section>
  );
}
