"use client";

import { Navbar } from "./navbar";
import { Hero } from "./hero";
import { Features } from "./features";
import { IntegrationsOrbit } from "./integrations-orbit";
import { HowItWorks } from "./how-it-works";
import { Pricing } from "./pricing";
import { CTA } from "./cta";
import { Footer } from "./footer";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />
      <Hero />
      <Features />
      <IntegrationsOrbit />
      <HowItWorks />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  );
}
