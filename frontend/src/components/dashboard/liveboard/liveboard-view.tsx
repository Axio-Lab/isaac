"use client";

import { useState } from "react";
import { useHumanTasks, useTaskSubmissions } from "@/hooks/useHumanTasks";
import type { TaskSubmission } from "@/hooks/useHumanTasks";
import { Loader2, Radio } from "lucide-react";
import { SubmissionDetailDialog } from "./submission-detail-dialog";
import { submissionStatusColor } from "./submission-status";

export function LiveboardView() {
  const { data: tasksData, isLoading: tasksLoading } = useHumanTasks();
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState<TaskSubmission | null>(null);

  const { data: submissionsData, isLoading: subsLoading } = useTaskSubmissions(selectedTaskId, {
    status: statusFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const tasks = tasksData?.tasks ?? [];
  const submissions = submissionsData?.submissions ?? [];

  if (tasksLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-2.5 mb-6">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">Liveboard</h1>
          <p className="text-xs text-muted-foreground">Real-time submission tracking</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-6 p-3.5 border border-border rounded-xl bg-card">
        <div className="min-w-[140px]">
          <label className="block text-[10px] font-medium text-muted-foreground mb-1">Task</label>
          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-input rounded-lg text-xs bg-background text-foreground"
          >
            <option value="">Select a task...</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-medium text-muted-foreground mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-input rounded-lg text-xs bg-background text-foreground"
          >
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="VETTED">Vetted</option>
            <option value="MISSED">Missed</option>
            <option value="LATE">Late</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-medium text-muted-foreground mb-1">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-2.5 py-1.5 border border-input rounded-lg text-xs bg-background text-foreground"
          />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-muted-foreground mb-1">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-2.5 py-1.5 border border-input rounded-lg text-xs bg-background text-foreground"
          />
        </div>
      </div>

      {!selectedTaskId ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Radio className="h-8 w-8 text-muted-foreground opacity-30 mb-3" />
          <p className="text-xs text-muted-foreground">Select a task to view submissions.</p>
        </div>
      ) : subsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xs text-muted-foreground">No submissions found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {submissions.map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() => setSelectedSubmission(sub)}
              className="text-left border border-border rounded-xl p-3.5 bg-card hover:border-primary/20 transition-all duration-150"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-foreground">{sub.worker?.name || "Unknown"}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium border ${submissionStatusColor(sub.status)}`}
                >
                  {sub.status}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">Due: {new Date(sub.dueAt).toLocaleString()}</p>
              {sub.submittedAt && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Submitted: {new Date(sub.submittedAt).toLocaleString()}
                </p>
              )}
              {sub.aiScore != null && (
                <p className="text-[10px] mt-1.5">
                  Score:{" "}
                  <span className={sub.aiScore >= 70 ? "text-success font-medium" : "text-destructive font-medium"}>
                    {sub.aiScore}
                  </span>
                </p>
              )}
              {sub.imageUrl && (
                <div className="mt-2.5 h-16 bg-muted rounded-lg overflow-hidden">
                  <img src={sub.imageUrl} alt="Evidence" className="h-full w-full object-cover" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <SubmissionDetailDialog submission={selectedSubmission} onClose={() => setSelectedSubmission(null)} />
    </div>
  );
}
