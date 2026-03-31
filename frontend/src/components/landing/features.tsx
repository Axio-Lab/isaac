"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Shield,
  BarChart3,
  Zap,
  Clock,
  Users,
} from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "AI-Powered Vetting",
    description:
      "Isaac automatically reviews every submission with computer vision and LLM analysis, scoring against your custom acceptance rules.",
    gradient: "from-blue-500 to-cyan-400",
  },
  {
    icon: Shield,
    title: "Real-Time Compliance",
    description:
      "Monitor task completion across your entire distributed workforce. Missed deadlines, late submissions, and quality issues — flagged instantly.",
    gradient: "from-violet-500 to-purple-400",
  },
  {
    icon: BarChart3,
    title: "Intelligent Reports",
    description:
      "Auto-generated daily compliance reports delivered to your preferred channel. Worker performance, pass rates, and flagged issues — all summarized.",
    gradient: "from-emerald-500 to-teal-400",
  },
  {
    icon: Zap,
    title: "Automated Workflows",
    description:
      "Create tasks, assign workers, schedule reminders, and let Isaac handle the follow-ups. No manual chasing required.",
    gradient: "from-amber-500 to-orange-400",
  },
  {
    icon: Clock,
    title: "Multi-Channel Support",
    description:
      "Workers submit via WhatsApp, Telegram, Slack, Discord, or webhooks. Isaac meets your team where they already work.",
    gradient: "from-rose-500 to-pink-400",
  },
  {
    icon: Users,
    title: "Scalable Management",
    description:
      "From 5 workers to 5,000 — Isaac scales effortlessly. Manage multiple tasks, teams, and reporting lines from a single dashboard.",
    gradient: "from-sky-500 to-indigo-400",
  },
];

function useInView(threshold = 0.15) {
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

function FeatureCard({
  feature,
  index,
  visible,
}: {
  feature: (typeof features)[0];
  index: number;
  visible: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const Icon = feature.icon;

  return (
    <div
      className={`group relative rounded-2xl border border-white/6 bg-white/2 p-6 lg:p-8 transition-all duration-700 ease-out hover:border-white/12 hover:bg-white/4 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-linear-to-br ${feature.gradient} blur-xl`}
        style={{ opacity: hovered ? 0.04 : 0 }}
      />

      <div
        className={`relative h-12 w-12 rounded-xl flex items-center justify-center mb-5 bg-linear-to-br ${feature.gradient} shadow-lg transition-transform duration-300 group-hover:scale-110`}
      >
        <Icon className="h-6 w-6 text-foreground" />
      </div>

      <h3 className="relative text-[15px] font-semibold text-foreground mb-2 tracking-tight">
        {feature.title}
      </h3>
      <p className="relative text-[13px] text-foreground/45 leading-relaxed">
        {feature.description}
      </p>

      <div className="absolute bottom-0 left-6 right-6 h-px bg-linear-to-r from-transparent via-white/6 to-transparent group-hover:via-white/12 transition-colors duration-500" />
    </div>
  );
}

export function Features() {
  const { ref, visible } = useInView();

  return (
    <section id="features" className="relative pt-2 pb-14 overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/6 to-transparent" />

      <div ref={ref} className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <div
          className={`text-center mb-16 transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="inline-flex px-3 py-1 rounded-full text-[11px] font-medium tracking-wider uppercase text-primary/80 border border-primary/20 bg-primary/5">
            Features
          </span>
          <h2 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
            Everything you need to
            <br />
            <span className="bg-linear-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
              manage at scale
            </span>
          </h2>
          <p className="mt-4 text-base text-foreground/40 max-w-xl mx-auto">
            Isaac combines AI intelligence with operational rigor to give you complete visibility
            over your workforce.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} visible={visible} />
          ))}
        </div>
      </div>
    </section>
  );
}
