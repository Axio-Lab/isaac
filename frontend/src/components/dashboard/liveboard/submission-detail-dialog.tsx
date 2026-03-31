"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ImageOff } from "lucide-react";
import type { TaskSubmission } from "@/hooks/useHumanTasks";
import { submissionStatusColor } from "./submission-status";

interface SubmissionDetailDialogProps {
  submission: TaskSubmission | null;
  onClose: () => void;
}

function parseAiFindings(raw: string | null | undefined): string[] {
  if (raw == null || raw.trim() === "") return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((x) => String(x)).filter((s) => s.length > 0);
    }
  } catch {
    /* not JSON */
  }
  return [raw.trim()];
}

function EvidenceImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1.5 bg-muted/40 border border-border rounded-lg py-6 ${className ?? ""}`}
      >
        <ImageOff className="h-5 w-5 text-muted-foreground" />
        <p className="text-[10px] text-muted-foreground">Evidence could not be loaded</p>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => {
        console.error("[EvidenceImage] Failed to load:", { src, alt });
        setFailed(true);
      }}
    />
  );
}

function isaacFeedbackText(submission: TaskSubmission): string | null {
  if (submission.status === "REJECTED") {
    return "This submission did not meet the required acceptance criteria.";
  }
  if (submission.aiFeedback?.trim()) {
    return submission.aiFeedback.trim();
  }
  if (submission.status === "APPROVED" || submission.status === "VETTED") {
    return "This submission met the acceptance criteria.";
  }
  return null;
}

export function SubmissionDetailDialog({ submission, onClose }: SubmissionDetailDialogProps) {
  const feedback = submission ? isaacFeedbackText(submission) : null;
  const items = submission?.items ?? [];
  const isMultiItem = items.length > 0;
  const receivedCount = items.filter((it) => it.receivedAt != null).length;

  return (
    <Dialog.Root open={!!submission} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-xl shadow-2xl w-[calc(100%-2rem)] max-w-md max-h-[85vh] overflow-y-auto p-5 z-50"
        >
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-sm font-semibold text-foreground">
              Submission Details
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1 rounded-md hover:bg-muted text-muted-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </Dialog.Close>
          </div>

          {submission && (
            <div className="space-y-2.5">
              {[
                ["Worker", submission.worker?.name || "Unknown"],
                ["Due At", new Date(submission.dueAt).toLocaleString()],
                ...(submission.submittedAt
                  ? [["Submitted", new Date(submission.submittedAt).toLocaleString()]]
                  : []),
                ...(submission.latenessSeconds && submission.latenessSeconds > 0
                  ? [["Lateness", `${Math.round(submission.latenessSeconds / 60)}m`]]
                  : []),
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
                  <span className="text-[11px] font-medium text-foreground text-right">
                    {value}
                  </span>
                </div>
              ))}

              {submission.aiScore != null && (
                <p className="text-[11px] leading-relaxed text-foreground">
                  Isaac scored this submission {submission.aiScore}%.
                </p>
              )}

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Status</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium border ${submissionStatusColor(submission.status)}`}
                >
                  {submission.status}
                  {submission.status === "COLLECTING" &&
                    isMultiItem &&
                    ` (${receivedCount}/${items.length})`}
                </span>
              </div>

              {isMultiItem && (
                <div>
                  <span className="text-[11px] text-muted-foreground block mb-1.5">
                    Evidence items ({receivedCount}/{items.length} received)
                  </span>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className="rounded-lg border border-border p-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-medium text-foreground">
                            {item.label}
                          </span>
                          {item.receivedAt ? (
                            <span className="text-[9px] text-success">
                              {new Date(item.receivedAt).toLocaleTimeString()}
                            </span>
                          ) : (
                            <span className="text-[9px] text-muted-foreground italic">Pending</span>
                          )}
                        </div>
                        {item.imageUrl && (
                          <EvidenceImage
                            src={item.imageUrl}
                            alt={item.label}
                            className="rounded-md w-full max-h-32 object-cover"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {submission.aiFindings != null && submission.aiFindings !== "" && (
                <div>
                  <span className="text-[11px] text-muted-foreground block mb-1">
                    Findings against acceptance criteria
                  </span>
                  {(() => {
                    const findings = parseAiFindings(submission.aiFindings);
                    if (findings.length === 0) {
                      return (
                        <p className="text-[11px] bg-muted p-2.5 rounded-lg leading-relaxed text-muted-foreground italic">
                          No findings recorded.
                        </p>
                      );
                    }
                    return (
                      <ul className="text-[11px] bg-muted p-2.5 rounded-lg leading-relaxed list-disc list-inside space-y-1">
                        {findings.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    );
                  })()}
                </div>
              )}

              {feedback && (
                <div>
                  <span className="text-[11px] text-muted-foreground block mb-1">
                    Isaac&apos;s feedback
                  </span>
                  <p className="text-[11px] bg-muted p-2.5 rounded-lg leading-relaxed">
                    {feedback}
                  </p>
                </div>
              )}

              {!isMultiItem && submission.imageUrl && (
                <div>
                  <span className="text-[11px] text-muted-foreground block mb-1">
                    Submitted evidence
                  </span>
                  <EvidenceImage
                    src={submission.imageUrl}
                    alt="Submitted evidence"
                    className="rounded-lg w-full"
                  />
                </div>
              )}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
