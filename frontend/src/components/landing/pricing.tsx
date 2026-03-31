"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";

interface Plan {
  name: string;
  monthlyPrice: number | null;
  description: string;
  features: string[];
  cta: string;
  ctaHref: string;
  popular?: boolean;
  gradient: string;
  enterprise?: boolean;
}

const plans: Plan[] = [
  {
    name: "Basic",
    monthlyPrice: 9,
    description: "For individuals getting started with task compliance",
    features: [
      "Up to 3 active tasks",
      "10 workers",
      "AI vetting & scoring",
      "WhatsApp & Telegram",
      "Daily reports",
      "Email support",
    ],
    cta: "Start Free Trial",
    ctaHref: "/signup",
    gradient: "from-white/6 to-white/2",
  },
  {
    name: "Pro",
    monthlyPrice: 49,
    description: "For growing teams that need full automation",
    features: [
      "Unlimited tasks",
      "50 workers",
      "All messaging platforms",
      "Custom acceptance rules",
      "Report delivery (Docs, Slack)",
      "Composio integrations (100+ apps)",
      "Priority support",
    ],
    cta: "Start Free Trial",
    ctaHref: "/signup",
    popular: true,
    gradient: "from-primary/20 to-primary/5",
  },
  {
    name: "Business",
    monthlyPrice: 99,
    description: "For operations teams managing at scale",
    features: [
      "Everything in Pro",
      "Unlimited workers",
      "Advanced analytics",
      "1,000+ integrations",
      "10,000+ automated actions",
      "Custom report templates",
      "API access",
      "Dedicated support",
    ],
    cta: "Start Free Trial",
    ctaHref: "/signup",
    gradient: "from-violet-500/10 to-purple-500/3",
  },
  {
    name: "Enterprise",
    monthlyPrice: null,
    description: "Custom setup, white-label, and dedicated infrastructure",
    features: [
      "Everything in Business",
      "White-label branding",
      "Custom deployment",
      "SSO & advanced security",
      "Dedicated account manager",
      "SLA guarantee",
      "Custom integrations",
      "On-premise option",
    ],
    cta: "Contact Sales",
    ctaHref: "mailto:sales@verxio.xyz",
    enterprise: true,
    gradient: "from-amber-500/10 to-orange-500/3",
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

export function Pricing() {
  const [yearly, setYearly] = useState(true);
  const { ref, visible } = useInViewOnce();

  const getPrice = (monthly: number | null) => {
    if (monthly === null) return null;
    if (yearly) return Math.round(monthly * 0.8);
    return monthly;
  };

  return (
    <section id="pricing" className="relative py-14 overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/6 to-transparent" />

      <div ref={ref} className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <div
          className={`text-center mb-12 transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="inline-flex px-3 py-1 rounded-full text-[11px] font-medium tracking-wider uppercase text-amber-400/80 border border-amber-400/20 bg-amber-400/5">
            Pricing
          </span>
          <h2 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
            Simple, transparent{" "}
            <span className="bg-linear-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              pricing
            </span>
          </h2>
          <p className="mt-4 text-base text-foreground/40 max-w-lg mx-auto">
            Start free and scale as you grow. All plans include a 14-day trial.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-3 p-1 rounded-full border border-white/8 bg-white/2">
            <button
              onClick={() => setYearly(false)}
              className={`px-4 py-2 rounded-full text-[12px] font-medium transition-all duration-300 ${
                !yearly
                  ? "bg-white/10 text-foreground shadow-sm"
                  : "text-foreground/40 hover:text-foreground/60"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`px-4 py-2 rounded-full text-[12px] font-medium transition-all duration-300 flex items-center gap-1.5 ${
                yearly
                  ? "bg-primary/20 text-primary shadow-sm"
                  : "text-foreground/40 hover:text-foreground/60"
              }`}
            >
              Yearly
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full">
                -20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan, i) => {
            const price = getPrice(plan.monthlyPrice);

            return (
              <div
                key={plan.name}
                className={`relative group rounded-2xl border p-6 transition-all duration-700 ease-out hover:-translate-y-1 ${
                  plan.popular
                    ? "border-primary/30 bg-linear-to-b from-primary/8 to-transparent shadow-[0_0_40px_rgba(59,130,246,0.08)]"
                    : "border-white/6 bg-white/2 hover:border-white/12"
                } ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}
                style={{ transitionDelay: `${i * 100 + 100}ms` }}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-[10px] font-bold text-white tracking-wider uppercase shadow-[0_0_20px_rgba(59,130,246,0.4)]">
                      <Sparkles className="h-3 w-3" />
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-[15px] font-semibold text-foreground">{plan.name}</h3>
                  <p className="text-[12px] text-foreground/35 mt-1 leading-relaxed">
                    {plan.description}
                  </p>
                </div>

                <div className="mb-6">
                  {price !== null ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-foreground">${price}</span>
                      <span className="text-[13px] text-foreground/30">
                        /{yearly ? "mo" : "mo"}
                      </span>
                      {yearly && plan.monthlyPrice && (
                        <span className="ml-2 text-[12px] text-foreground/20 line-through">
                          ${plan.monthlyPrice}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold text-foreground">Custom</span>
                    </div>
                  )}
                  {yearly && price !== null && (
                    <p className="text-[11px] text-emerald-400/70 mt-1">
                      Billed ${price * 12}/year — save ${(plan.monthlyPrice! - price) * 12}/year
                    </p>
                  )}
                </div>

                <ul className="space-y-2.5 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-[12px] text-foreground/50">
                      <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.ctaHref}
                  className={`block w-full py-2.5 rounded-xl text-[13px] font-semibold text-center transition-all duration-300 ${
                    plan.popular
                      ? "bg-primary text-white hover:bg-primary/90 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]"
                      : "border border-white/8 text-foreground/70 hover:text-foreground hover:border-white/15 hover:bg-white/4"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
