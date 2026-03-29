"use client";

import * as Dialog from "@radix-ui/react-dialog";
import ReactMarkdown from "react-markdown";
import { X, ExternalLink } from "lucide-react";
import type { TaskComplianceReport } from "@/hooks/useHumanTasks";

interface ReportDetailDialogProps {
  report: TaskComplianceReport | null;
  onClose: () => void;
}

export function ReportDetailDialog({ report, onClose }: ReportDetailDialogProps) {
  return (
    <Dialog.Root open={!!report} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-xl shadow-2xl w-[calc(100%-2rem)] max-w-2xl max-h-[85vh] overflow-y-auto p-5 z-50"
        >
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-sm font-semibold text-foreground">Report Details</Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1 rounded-md hover:bg-muted text-muted-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </Dialog.Close>
          </div>

          {report && (
            <div className="space-y-4">
              <p className="text-[11px] text-muted-foreground">
                Period: {new Date(report.periodStart).toLocaleDateString()} &mdash;{" "}
                {new Date(report.periodEnd).toLocaleDateString()}
              </p>
              <div className="prose prose-invert prose-xs max-w-none">
                <ReactMarkdown>{report.summaryMarkdown}</ReactMarkdown>
              </div>
              {report.deliveredAt && (
                <div className="pt-3 border-t border-border">
                  <p className="text-[11px] text-muted-foreground">
                    Delivered at {new Date(report.deliveredAt).toLocaleString()}
                  </p>
                </div>
              )}
              {report.documentUrl && (
                <a
                  href={report.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> View Document
                </a>
              )}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
