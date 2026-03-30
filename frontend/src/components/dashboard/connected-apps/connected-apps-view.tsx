"use client";

import { useState, useEffect } from "react";
import {
  useComposioConnectedAccounts,
  useComposioApps,
  useInitiateComposioConnection,
  useDeleteComposioConnection,
} from "@/hooks/useComposioConnections";
import type { ComposioApp } from "@/hooks/useComposioConnections";
import { Loader2, Search, Plug, Unplug, Zap, ChevronRight, Check } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import { AppPagination } from "@/components/ui/pagination";
import { AppDetailPanel } from "./app-detail-panel";
import { AVAILABLE_PAGE_SIZE, CONNECTED_PAGE_SIZE } from "./constants";

export function ConnectedAppsView() {
  const { data: accountsData, isLoading: accountsLoading } = useComposioConnectedAccounts();
  const { data: appsData, isLoading: appsLoading } = useComposioApps();
  const initiateConnection = useInitiateComposioConnection();
  const deleteConnection = useDeleteComposioConnection();
  const [search, setSearch] = useState("");
  const [selectedAppSlug, setSelectedAppSlug] = useState<string | null>(null);
  const [availablePage, setAvailablePage] = useState(1);
  const [connectedPage, setConnectedPage] = useState(1);

  const accounts = accountsData?.accounts ?? [];
  const allApps = appsData?.apps ?? [];

  const connectedSlugs = new Set(accounts.map((a) => a.appName.toLowerCase()));

  const filteredApps = allApps.filter(
    (app) =>
      app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.slug.toLowerCase().includes(search.toLowerCase())
  );

  const connectedApps = filteredApps.filter((app) => connectedSlugs.has(app.slug.toLowerCase()));
  const availableApps = filteredApps.filter((app) => !connectedSlugs.has(app.slug.toLowerCase()));

  const connectedTotalPages = Math.ceil(connectedApps.length / CONNECTED_PAGE_SIZE);
  const pagedConnectedApps = connectedApps.slice(
    (connectedPage - 1) * CONNECTED_PAGE_SIZE,
    connectedPage * CONNECTED_PAGE_SIZE
  );

  const availableTotalPages = Math.ceil(availableApps.length / AVAILABLE_PAGE_SIZE);
  const pagedAvailableApps = availableApps.slice(
    (availablePage - 1) * AVAILABLE_PAGE_SIZE,
    availablePage * AVAILABLE_PAGE_SIZE
  );

  useEffect(() => {
    setAvailablePage(1);
    setConnectedPage(1);
  }, [search]);

  function scrollToTop() {
    document.querySelector("[data-scroll-container]")?.scrollTo({ top: 0, behavior: "smooth" });
  }

  function getAccountForApp(app: ComposioApp) {
    return accounts.find((a) => a.appName.toLowerCase() === app.slug.toLowerCase());
  }

  const isLoading = accountsLoading || appsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-foreground tracking-tight">Connected Apps</h1>
        <p className="text-xs text-muted-foreground">
          Connect your apps to extend Isaac&apos;s capabilities
        </p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search 1000+ apps..."
          className="w-full pl-9 pr-4 py-2 bg-muted border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {connectedApps.length > 0 && (
        <div className="mb-8">
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Connected ({connectedApps.length})
          </h2>
          <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {pagedConnectedApps.map((app) => {
              const account = getAccountForApp(app);
              const isDisconnectingThis =
                deleteConnection.isPending &&
                account &&
                deleteConnection.variables?.accountId === account.id;
              return (
                <div
                  key={app.slug}
                  className="group relative border border-border rounded-xl p-3.5 bg-card hover:border-primary/30 transition-all duration-150"
                >
                  <div className="absolute top-3 right-3">
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-success/10 border border-success/20">
                      <Check className="h-2.5 w-2.5 text-success" />
                      <span className="text-[9px] font-medium text-success">Connected</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 mb-3">
                    {app.logo ? (
                      <img src={app.logo} alt={app.name} className="h-8 w-8 rounded-lg" />
                    ) : (
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                        {app.name.charAt(0)}
                      </div>
                    )}
                    <p className="text-xs font-medium text-foreground truncate pr-16">{app.name}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedAppSlug(app.slug)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted text-[10px] font-medium text-foreground hover:bg-accent transition-colors"
                    >
                      <Zap className="h-2.5 w-2.5" /> View Tools
                    </button>
                    <button
                      type="button"
                      aria-busy={isDisconnectingThis}
                      aria-label={isDisconnectingThis ? "Disconnecting…" : "Disconnect"}
                      onClick={() => account && deleteConnection.mutate({ accountId: account.id })}
                      disabled={deleteConnection.isPending}
                      className="inline-flex items-center justify-center gap-1.5 min-w-9 px-2.5 py-1.5 rounded-lg border border-border text-[10px] font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-70"
                    >
                      {isDisconnectingThis ? (
                        <Loader2 className="h-2.5 w-2.5 animate-spin shrink-0" />
                      ) : (
                        <Unplug className="h-2.5 w-2.5 shrink-0" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {connectedTotalPages > 1 && (
            <div className="mt-4">
              <AppPagination
                page={connectedPage}
                totalPages={connectedTotalPages}
                onPageChange={(p) => {
                  setConnectedPage(p);
                  scrollToTop();
                }}
              />
            </div>
          )}
        </div>
      )}

      <div>
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Available ({availableApps.length})
        </h2>

        {availableApps.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xs text-muted-foreground">
              {search ? "No apps match your search." : "No apps available."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pagedAvailableApps.map((app) => {
                const isConnectingThis =
                  initiateConnection.isPending &&
                  initiateConnection.variables?.appSlug === app.slug;
                return (
                  <div
                    key={app.slug}
                    className="group border border-border rounded-xl p-3.5 bg-card hover:border-border/80 transition-all duration-150"
                  >
                    <div className="flex items-center gap-2.5 mb-3">
                      {app.logo ? (
                        <img src={app.logo} alt={app.name} className="h-8 w-8 rounded-lg" />
                      ) : (
                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                          {app.name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{app.name}</p>
                        {app.categories && app.categories.length > 0 && (
                          <p className="text-[9px] text-muted-foreground truncate mt-0.5">
                            {(app.categories as string[]).slice(0, 2).join(" · ")}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <GlassButton
                        onClick={() => initiateConnection.mutate({ appSlug: app.slug })}
                        disabled={initiateConnection.isPending}
                        aria-busy={isConnectingThis}
                        size="sm"
                        className="flex-1 glass-filled"
                        contentClassName="flex items-center justify-center gap-1.5 text-[10px] px-2.5 py-1.5"
                      >
                        {isConnectingThis ? (
                          <>
                            <Loader2 className="h-2.5 w-2.5 animate-spin shrink-0" />
                            Connecting…
                          </>
                        ) : (
                          <>
                            <Plug className="h-2.5 w-2.5 shrink-0" />
                            Connect
                          </>
                        )}
                      </GlassButton>
                      <button
                        type="button"
                        onClick={() => setSelectedAppSlug(app.slug)}
                        className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-lg border border-border text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <ChevronRight className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {availableTotalPages > 1 && (
              <div className="mt-6 pb-4">
                <AppPagination
                  page={availablePage}
                  totalPages={availableTotalPages}
                  onPageChange={(p) => {
                    setAvailablePage(p);
                    scrollToTop();
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>

      {selectedAppSlug && (
        <AppDetailPanel slug={selectedAppSlug} onClose={() => setSelectedAppSlug(null)} />
      )}
    </div>
  );
}
