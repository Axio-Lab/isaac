"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, X, Zap, ExternalLink } from "lucide-react";
import { useComposioAppDetails } from "@/hooks/useComposioConnections";

interface AppDetailPanelProps {
  slug: string;
  onClose: () => void;
}

export function AppDetailPanel({ slug, onClose }: AppDetailPanelProps) {
  const { data, isLoading } = useComposioAppDetails(slug);
  const app = data?.app;

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-xl shadow-2xl w-[calc(100%-2rem)] max-w-lg max-h-[80vh] overflow-y-auto z-50"
        >
          <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border px-5 py-3 flex items-center justify-between z-10">
            <Dialog.Title className="text-sm font-semibold text-foreground">
              {app?.name || slug} — Tools
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1 rounded-md hover:bg-muted text-muted-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="p-5">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-5">
                {app?.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{app.description}</p>
                )}

                {app?.actions && app.actions.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
                      Actions ({app.actions.length})
                    </h3>
                    <div className="space-y-1.5">
                      {app.actions.map((action, index) => (
                        <div
                          key={`${slug}-action-${index}-${action.name}`}
                          className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-muted/50 border border-border/50"
                        >
                          <Zap className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium text-foreground truncate">
                              {action.name.replace(/_/g, " ")}
                            </p>
                            {action.description && (
                              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                                {action.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {app?.triggers && app.triggers.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
                      Triggers ({app.triggers.length})
                    </h3>
                    <div className="space-y-1.5">
                      {app.triggers.map((trigger, index) => (
                        <div
                          key={`${slug}-trigger-${index}-${trigger.name}`}
                          className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-muted/50 border border-border/50"
                        >
                          <ExternalLink className="h-3 w-3 text-warning mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium text-foreground truncate">
                              {trigger.name.replace(/_/g, " ")}
                            </p>
                            {trigger.description && (
                              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                                {trigger.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!app?.actions || app.actions.length === 0) &&
                  (!app?.triggers || app.triggers.length === 0) && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No tools available for this app yet.
                    </p>
                  )}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
