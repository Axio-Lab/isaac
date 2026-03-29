"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { TaskSubmission } from "@/hooks/useHumanTasks";
import { submissionStatusColor } from "./submission-status";

interface SubmissionDetailDialogProps {
  submission: TaskSubmission | null;
  onClose: () => void;
}

export function SubmissionDetailDialog({ submission, onClose }: SubmissionDetailDialogProps) {
  return (
    <Dialog.Root open={!!submission} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-xl shadow-2xl w-[calc(100%-2rem)] max-w-md max-h-[85vh] overflow-y-auto p-5 z-50"
        >
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-sm font-semibold text-foreground">Submission Details</Dialog.Title>
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
                ...(submission.aiScore != null ? [["AI Score", String(submission.aiScore)]] : []),
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">{label}</span>
                  <span className="text-[11px] font-medium text-foreground">{value}</span>
                </div>
              ))}

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Status</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium border ${submissionStatusColor(submission.status)}`}
                >
                  {submission.status}
                </span>
              </div>

              {submission.aiFindings && (
                <div>
                  <span className="text-[11px] text-muted-foreground block mb-1">AI Findings</span>
                  <p className="text-[11px] bg-muted p-2.5 rounded-lg leading-relaxed">{submission.aiFindings}</p>
                </div>
              )}
              {submission.aiFeedback && (
                <div>
                  <span className="text-[11px] text-muted-foreground block mb-1">AI Feedback</span>
                  <p className="text-[11px] bg-muted p-2.5 rounded-lg leading-relaxed">{submission.aiFeedback}</p>
                </div>
              )}
              {submission.rawMessage && (
                <div>
                  <span className="text-[11px] text-muted-foreground block mb-1">Raw Message</span>
                  <p className="text-[11px] bg-muted p-2.5 rounded-lg whitespace-pre-wrap">{submission.rawMessage}</p>
                </div>
              )}
              {submission.imageUrl && (
                <div>
                  <span className="text-[11px] text-muted-foreground block mb-1">Evidence</span>
                  <img src={submission.imageUrl} alt="Evidence" className="rounded-lg w-full" />
                </div>
              )}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
