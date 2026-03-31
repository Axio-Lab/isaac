"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface PricingTier {
  name: string;
  monthlyPrices: {
    USD: number | null;
    NGN: number | null;
  };
  description: string;
  features: string[];
  cta: string;
  ctaHref: string;
  popular?: boolean;
}

const tiers: PricingTier[] = [
  {
    name: "Basic",
    monthlyPrices: {
      USD: 9,
      NGN: 15000,
    },
    description: "For individuals getting started with Isaac",
    features: [
      "Up to 3 active tasks",
      "5 workers",
      "Isaac vetting and scoring",
      "WhatsApp and Telegram",
      "Daily reports",
      "Email support",
    ],
    cta: "Start Free Trial",
    ctaHref: "/signup",
  },
  {
    name: "Pro",
    monthlyPrices: {
      USD: 49,
      NGN: 70000,
    },
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
  },
  {
    name: "Business",
    monthlyPrices: {
      USD: 109,
      NGN: 150000,
    },
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
  },
  {
    name: "Enterprise",
    monthlyPrices: {
      USD: null,
      NGN: null,
    },
    description: "Custom setup, white-label, and dedicated infrastructure",
    features: [
      "Everything in Business",
      "White-label branding",
      "Custom deployment",
      "SSO and advanced security",
      "Dedicated account manager",
      "SLA guarantee",
      "Custom integrations",
      "On-premise option",
    ],
    cta: "Contact Sales",
    ctaHref: "mailto:sales@verxio.xyz",
  },
];

const cardRotations = ["rotate-[-1deg]", "rotate-[1deg]", "rotate-[-1.5deg]", "rotate-[0.5deg]"];

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
  const [currency, setCurrency] = useState<"USD" | "NGN">("USD");
  const { ref, visible } = useInViewOnce();

  const getPrice = (monthly: number | null) => {
    if (monthly === null) return null;
    return yearly ? Math.round(monthly * 0.8) : monthly;
  };

  const formatPrice = (price: number) => {
    if (currency === "NGN") {
      return `₦${price.toLocaleString()}`;
    }
    return `$${price}`;
  };

  return (
    <section id="pricing" className="relative py-14 overflow-hidden">
      <div className="absolute inset-0 bg-background" />

      <div ref={ref} className="relative max-w-6xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div
          className={`text-center mb-14 transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="text-4xl sm:text-5xl lg:text-5xl font-bold text-foreground tracking-tight leading-tight">
            Simple pricing, <span className="text-primary">no surprises</span>
          </h2>
          <p className="mt-3 text-base text-muted-foreground max-w-lg mx-auto">
            Choose your plan and scale as you grow. Need more credits? Purchase additional packs
            anytime without upgrading.
          </p>

          <div className="mt-8 flex flex-col items-center gap-2.5">
            <div className="inline-flex items-center gap-1 p-1 rounded-full border border-border bg-card">
              <button
                onClick={() => setYearly(false)}
                className={cn(
                  "px-4 py-2 rounded-full text-[12px] font-medium transition-all duration-300",
                  !yearly
                    ? "bg-foreground/8 dark:bg-white/10 text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setYearly(true)}
                className={cn(
                  "px-4 py-2 rounded-full text-[12px] font-medium transition-all duration-300 flex items-center gap-1.5",
                  yearly
                    ? "bg-primary/15 text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Yearly
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                  -20%
                </span>
              </button>
            </div>

            <div className="inline-flex items-center gap-0.5 p-[2px] rounded-full border border-border bg-card scale-95">
              <button
                onClick={() => setCurrency("USD")}
                className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-medium leading-none transition-all duration-300",
                  currency === "USD"
                    ? "bg-primary/15 text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                USD
              </button>
              <button
                onClick={() => setCurrency("NGN")}
                className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-medium leading-none transition-all duration-300",
                  currency === "NGN"
                    ? "bg-primary/15 text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                NGN
              </button>
            </div>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {tiers.map((tier, i) => {
            const monthlyPrice = tier.monthlyPrices[currency];
            const price = getPrice(monthlyPrice);

            return (
              <div
                key={tier.name}
                className={cn(
                  "relative group transition-all duration-500",
                  cardRotations[i],
                  "hover:rotate-0",
                  visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
                )}
                style={{ transitionDelay: `${i * 100 + 100}ms` }}
              >
                {/* Card with neo-brutalist shadow */}
                <div
                  className={cn(
                    "landing-edge-shadow absolute inset-0 bg-card",
                    "border-2 border-foreground/15 dark:border-white/15",
                    "rounded-xl shadow-[4px_4px_0px_0px] shadow-foreground/10 dark:shadow-white/10",
                    "transition-all duration-300",
                    "group-hover:shadow-[6px_6px_0px_0px]",
                    "group-hover:translate-x-[-2px] group-hover:translate-y-[-2px]"
                  )}
                />

                <div className="relative h-full p-5 flex flex-col">
                  {/* Popular badge */}
                  {tier.popular && (
                    <div className="absolute -top-3 -right-2 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full rotate-6 border-2 border-foreground/15 dark:border-white/15 tracking-wider uppercase">
                      Popular
                    </div>
                  )}

                  <div className="mb-5 min-h-[56px]">
                    <h3 className="text-lg font-semibold text-foreground">{tier.name}</h3>
                    <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed wrap-break-word">
                      {tier.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="mb-5 min-h-[62px]">
                    {price !== null ? (
                      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                        <span className="text-3xl font-bold text-foreground break-all">
                          {formatPrice(price)}
                        </span>
                        <span className="text-sm text-muted-foreground">/mo</span>
                        {yearly && monthlyPrice && (
                          <span className="text-[11px] text-muted-foreground/50 line-through">
                            {formatPrice(monthlyPrice)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-2xl font-bold text-foreground">Custom</span>
                    )}
                    {yearly && price !== null && monthlyPrice !== null && (
                      <p className="text-[10px] text-emerald-500 mt-1">
                        Billed {formatPrice(price * 12)}/year, save{" "}
                        {formatPrice((monthlyPrice - price) * 12)}
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <div className="space-y-2.5 mb-6 flex-1 min-h-0">
                    {tier.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2.5">
                        <div className="w-4 h-4 rounded-full border border-foreground/15 dark:border-white/15 flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 text-foreground/70" />
                        </div>
                        <span className="text-[12px] leading-relaxed text-foreground/70 wrap-break-word">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <Link
                    href={tier.ctaHref}
                    className={cn(
                      "mt-auto block w-full py-2.5 rounded-lg text-[13px] font-semibold text-center",
                      "border-2 border-foreground/15 dark:border-white/15",
                      "transition-all duration-300",
                      "shadow-[3px_3px_0px_0px] shadow-foreground/10 dark:shadow-white/10",
                      "hover:shadow-[5px_5px_0px_0px]",
                      "hover:translate-x-[-2px] hover:translate-y-[-2px]",
                      tier.popular
                        ? "bg-primary text-white hover:bg-primary/90"
                        : "bg-card text-foreground hover:bg-muted/50"
                    )}
                  >
                    {tier.cta}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
