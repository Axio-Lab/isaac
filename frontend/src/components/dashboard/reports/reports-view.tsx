"use client";

import { useState } from "react";
import {
  useHumanTasks,
  useTaskReports,
  useGenerateReport,
  useDeleteReport,
} from "@/hooks/useHumanTasks";
import type { TaskComplianceReport } from "@/hooks/useHumanTasks";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Loader2,
  MoreVertical,
  FileText,
  Trash2,
  Eye,
  RefreshCw,
} from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import { ReportDetailDialog } from "./report-detail-dialog";

export function ReportsView() {
  const { data: tasksData, isLoading: tasksLoading } = useHumanTasks();
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const { data: reportsData, isLoading: reportsLoading } = useTaskReports(selectedTaskId);
  const generateReport = useGenerateReport();
  const deleteReport = useDeleteReport();
  const [selectedReport, setSelectedReport] = useState<TaskComplianceReport | null>(null);

  const tasks = tasksData?.tasks ?? [];
  const reports = reportsData?.reports ?? [];

  async function handleGenerate() {
    if (!selectedTaskId) return;
    await generateReport.mutateAsync({ taskId: selectedTaskId });
  }

  async function handleDelete(report: TaskComplianceReport) {
    if (!confirm("Delete this report?")) return;
    await deleteReport.mutateAsync({ taskId: selectedTaskId, reportId: report.id });
  }

  if (tasksLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">Reports</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Compliance & performance reports</p>
        </div>
        {selectedTaskId && (
          <GlassButton
            onClick={handleGenerate}
            disabled={generateReport.isPending}
            size="sm"
            className="glass-filled"
            contentClassName="flex items-center gap-1.5 text-xs"
          >
            {generateReport.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            Generate
          </GlassButton>
        )}
      </div>

      <div className="mb-6">
        <label className="block text-[10px] font-medium text-muted-foreground mb-1.5">Select Task</label>
        <select
          value={selectedTaskId}
          onChange={(e) => setSelectedTaskId(e.target.value)}
          className="px-3 py-2 border border-input rounded-lg text-xs bg-background text-foreground min-w-[200px]"
        >
          <option value="">Select a task...</option>
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {!selectedTaskId ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center mb-3">
            <FileText className="h-5 w-5 text-muted-foreground opacity-50" />
          </div>
          <p className="text-xs text-muted-foreground">Select a task to view its reports.</p>
        </div>
      ) : reportsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xs text-muted-foreground">No reports yet. Click &quot;Generate&quot; to create one.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((report) => (
            <div
              key={report.id}
              className="border border-border rounded-xl p-4 bg-card hover:border-border/80 transition-all duration-150"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground mb-1.5">
                    {new Date(report.periodStart).toLocaleDateString()} &mdash;{" "}
                    {new Date(report.periodEnd).toLocaleDateString()}
                  </p>
                  <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                    <span>
                      Submissions:{" "}
                      <span className="font-medium text-foreground">{report.totalSubmissions}</span>
                    </span>
                    <span>
                      Missed: <span className="font-medium text-destructive">{report.missedCount}</span>
                    </span>
                    {report.avgScore != null && (
                      <span>
                        Avg Score: <span className="font-medium text-foreground">{report.avgScore.toFixed(1)}</span>
                      </span>
                    )}
                    {report.passRate != null && (
                      <span>
                        Pass Rate:{" "}
                        <span className="font-medium text-foreground">{(report.passRate * 100).toFixed(0)}%</span>
                      </span>
                    )}
                    <span>
                      {report.deliveredAt ? (
                        <span className="font-medium text-success">Delivered</span>
                      ) : (
                        <span className="font-medium text-warning">Not delivered</span>
                      )}
                    </span>
                  </div>
                </div>

                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors">
                      <MoreVertical className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="min-w-[140px] bg-popover text-popover-foreground border border-border rounded-lg shadow-xl p-1 z-50"
                      sideOffset={4}
                      align="end"
                    >
                      <DropdownMenu.Item
                        className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] rounded-md cursor-pointer outline-none hover:bg-muted"
                        onSelect={() => setSelectedReport(report)}
                      >
                        <Eye className="h-3 w-3" /> View
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] rounded-md cursor-pointer outline-none hover:bg-muted text-destructive"
                        onSelect={() => handleDelete(report)}
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
            </div>
          ))}
        </div>
      )}

      <ReportDetailDialog report={selectedReport} onClose={() => setSelectedReport(null)} />
    </div>
  );
}
