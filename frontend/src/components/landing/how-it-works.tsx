"use client";

import { useEffect, useRef, useState } from "react";
import { PlusCircle, Users, Brain, FileBarChart } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: PlusCircle,
    title: "Create a Task",
    description:
      "Define what needs to be done — photo evidence, documents, check-ins. Set acceptance rules, schedules, and scoring criteria. Add reference samples so Isaac knows what 'good' looks like.",
    gradient: "from-blue-500 to-cyan-400",
  },
  {
    number: "02",
    icon: Users,
    title: "Assign Workers",
    description:
      "Add your distributed team via WhatsApp, Telegram, Slack, or Discord. Isaac onboards them automatically, explains the task, and starts sending scheduled reminders.",
    gradient: "from-violet-500 to-purple-400",
  },
  {
    number: "03",
    icon: Brain,
    title: "Isaac Vets Submissions",
    description:
      "Workers submit evidence through chat. Isaac uses AI to analyze each submission against your rules — scoring quality, checking compliance, and providing instant feedback.",
    gradient: "from-emerald-500 to-teal-400",
  },
  {
    number: "04",
    icon: FileBarChart,
    title: "Get Intelligent Reports",
    description:
      "Daily compliance reports auto-generate with pass rates, flagged workers, and performance trends. Delivered as Google Docs, Slack messages, or in your dashboard.",
    gradient: "from-amber-500 to-orange-400",
  },
];

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

export function HowItWorks() {
  const { ref, visible } = useInViewOnce();

  return (
    <section id="how-it-works" className="relative py-14 overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/6 to-transparent" />

      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.05)_0%,transparent_70%)] pointer-events-none" />

      <div ref={ref} className="relative max-w-5xl mx-auto px-6 lg:px-8">
        <div
          className={`text-center mb-20 transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="inline-flex px-3 py-1 rounded-full text-[11px] font-medium tracking-wider uppercase text-emerald-400/80 border border-emerald-400/20 bg-emerald-400/5">
            How it Works
          </span>
          <h2 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
            Four steps to
            <br />
            <span className="bg-linear-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              total oversight
            </span>
          </h2>
        </div>

        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-8 lg:left-1/2 lg:-translate-x-px top-0 bottom-0 w-px bg-linear-to-b from-white/6 via-primary/20 to-white/6" />

          <div className="space-y-16 lg:space-y-24">
            {steps.map((step, i) => {
              const Icon = step.icon;
              const isLeft = i % 2 === 0;

              return (
                <div
                  key={step.number}
                  className={`relative flex items-start gap-6 lg:gap-0 transition-all duration-700 ease-out ${
                    visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
                  }`}
                  style={{ transitionDelay: `${i * 150 + 200}ms` }}
                >
                  {/* Timeline dot */}
                  <div className="absolute left-8 lg:left-1/2 -translate-x-1/2 z-10">
                    <div
                      className={`h-4 w-4 rounded-full border-2 border-primary bg-background shadow-[0_0_12px_rgba(59,130,246,0.4)]`}
                    />
                  </div>

                  {/* Content */}
                  <div
                    className={`ml-16 lg:ml-0 lg:w-1/2 ${
                      isLeft ? "lg:pr-16 lg:text-right" : "lg:pl-16 lg:ml-auto"
                    }`}
                  >
                    <div
                      className={`group p-6 rounded-2xl border border-white/6 bg-white/2 hover:border-white/10 hover:bg-white/4 transition-all duration-500 ${
                        isLeft ? "lg:ml-auto" : ""
                      }`}
                    >
                      <div
                        className={`flex items-center gap-4 mb-4 ${
                          isLeft ? "lg:flex-row-reverse" : ""
                        }`}
                      >
                        <div
                          className={`h-10 w-10 rounded-xl flex items-center justify-center bg-linear-to-br ${step.gradient} shadow-lg transition-transform duration-300 group-hover:scale-110`}
                        >
                          <Icon className="h-5 w-5 text-foreground" />
                        </div>
                        <div>
                          <span className="text-[11px] font-bold tracking-widest text-primary/60 uppercase">
                            Step {step.number}
                          </span>
                          <h3 className="text-[15px] font-semibold text-foreground tracking-tight">
                            {step.title}
                          </h3>
                        </div>
                      </div>
                      <p
                        className={`text-[13px] text-foreground/40 leading-relaxed ${
                          isLeft ? "lg:text-right" : ""
                        }`}
                      >
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
