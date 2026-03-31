import Link from "next/link";
import { ArrowLeft, Compass, Home } from "lucide-react";

export default function NotFound() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.10),transparent_28%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.03),transparent_20%,transparent_80%,rgba(255,255,255,0.02))]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12">
        <div className="grid w-full gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <section className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              <Compass className="h-3.5 w-3.5 text-primary" />
              Page not found
            </div>

            <div className="space-y-4">
              <p className="text-[84px] font-semibold leading-none tracking-[-0.08em] text-white sm:text-[110px]">
                404
              </p>
              <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                This route fell outside <span className="text-primary">Isaac&apos;s</span> operating
                map.
              </h1>
              <p className="max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
                The page you requested does not exist, may have moved, or was never published. Use
                one of the links below to get back into the product.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/30 bg-primary/15 px-5 py-3 text-sm font-medium text-white transition hover:bg-primary/20 glow-subtle"
              >
                <Home className="h-4 w-4" />
                Go home
              </Link>
              <Link
                href="/tasks"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-foreground transition hover:bg-white/8"
              >
                <ArrowLeft className="h-4 w-4" />
                Open dashboard
              </Link>
            </div>
          </section>

          <section className="landing-edge-shadow rounded-[28px] border border-white/8 bg-card/80 p-5 backdrop-blur-xl dark:bg-card/60">
            <div className="rounded-[24px] border border-white/8 bg-black/70 p-5">
              <div className="mb-5 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-2 text-[11px] font-medium tracking-wide text-muted-foreground">
                  route diagnostics
                </span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="rounded-2xl border border-red-500/15 bg-red-500/8 p-3 text-red-200">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-red-300/80">status</p>
                  <p className="mt-1 text-sm text-white">404_NOT_FOUND</p>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/3 p-3">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    probable cause
                  </p>
                  <p className="mt-1 text-foreground">
                    Unknown route, stale bookmark, or incomplete navigation path.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/3 p-3">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    suggested recovery
                  </p>
                  <ul className="mt-1 space-y-1.5 text-foreground">
                    <li>Open the main landing page.</li>
                    <li>Jump back into the dashboard.</li>
                    <li>Use the sidebar or top nav to continue.</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
