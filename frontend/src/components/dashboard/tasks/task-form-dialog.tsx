"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import {
  Loader2,
  X,
  Plus,
  Trash2,
  Search,
  Sparkles,
  ChevronDown,
  AlertCircle,
  ExternalLink,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import type { HumanTask } from "@/hooks/useHumanTasks";
import { useAiFillTask } from "@/hooks/useHumanTasks";
import type { TaskChannel } from "@/hooks/useTaskChannels";
import type { ComposioConnectedAccount } from "@/hooks/useComposioConnections";
import { useInitiateComposioConnection } from "@/hooks/useComposioConnections";
import type { TaskFormData, DeliveryDestination } from "./constants";
import {
  EVIDENCE_TYPES,
  RECURRENCE_TYPES,
  REPORT_DOC_TYPES,
  DELIVERY_TYPES,
  COMPOSIO_DELIVERY_TYPES,
  DRAFT_STORAGE_KEY,
  defaultForm,
  emptyDestination,
  getAllTimezones,
  getTimezoneOffset,
} from "./constants";

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTask: HumanTask | null;
  form: TaskFormData;
  setForm: React.Dispatch<React.SetStateAction<TaskFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  onSaveDraft: () => void;
  draftPending: boolean;
  createPending: boolean;
  updatePending: boolean;
  channels: TaskChannel[];
  connectedAccounts: ComposioConnectedAccount[];
}

const inputClass =
  "w-full px-3 py-2 border border-input rounded-lg text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring";
const labelClass = "block text-[11px] font-medium text-muted-foreground mb-1";
const sectionClass = "border-t border-border pt-3.5";
const sectionTitle = "text-[11px] font-medium text-foreground mb-2.5";

function TimezoneSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (tz: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const allTz = useMemo(() => getAllTimezones(), []);
  const filtered = useMemo(() => {
    if (!query) return allTz;
    const q = query.toLowerCase();
    return allTz.filter((tz) => tz.toLowerCase().includes(q));
  }, [allTz, query]);

  const displayValue = value
    ? `${value} (${getTimezoneOffset(value)})`
    : "Select timezone";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`${inputClass} text-left truncate`}
      >
        {displayValue}
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-lg shadow-xl max-h-48 overflow-hidden">
          <div className="p-1.5 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search timezones..."
                className="w-full pl-7 pr-2 py-1.5 text-xs bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-36">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-[10px] text-muted-foreground">
                No match
              </p>
            ) : (
              filtered.map((tz) => (
                <button
                  key={tz}
                  type="button"
                  onClick={() => {
                    onChange(tz);
                    setIsOpen(false);
                    setQuery("");
                  }}
                  className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-muted transition-colors ${
                    tz === value
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground"
                  }`}
                >
                  {tz}{" "}
                  <span className="text-muted-foreground">
                    ({getTimezoneOffset(tz)})
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function isComposioType(type: string): boolean {
  return type in COMPOSIO_DELIVERY_TYPES;
}

function isTypeConnected(
  type: string,
  accounts: ComposioConnectedAccount[],
): boolean {
  const slug = COMPOSIO_DELIVERY_TYPES[type];
  if (!slug) return true;
  return accounts.some(
    (a) =>
      a.appName?.toLowerCase() === slug.toLowerCase() &&
      a.status === "ACTIVE",
  );
}

const DELIVERY_INPUT_CONFIG: Record<
  string,
  { label: string; placeholder: string; hint?: string }
> = {
  telegram: {
    label: "Your Telegram Chat ID",
    placeholder: "e.g. 123456789",
    hint: "Send /start to @userinfobot on Telegram to get your Chat ID",
  },
  discord: {
    label: "Your Discord User ID",
    placeholder: "e.g. 812345678901234567",
    hint: "Enable Developer Mode in Discord settings, then right-click your name → Copy User ID",
  },
  slack: {
    label: "Your Slack Member ID",
    placeholder: "e.g. U01AB2CDE3F",
    hint: "Click your profile in Slack → ⋮ → Copy Member ID",
  },
  whatsapp: {
    label: "Your WhatsApp Number",
    placeholder: "+1234567890",
    hint: "Include country code",
  },
  gmail: {
    label: "Your Email Address",
    placeholder: "you@example.com",
  },
};

function DeliveryChannelPicker({
  dest,
  onChange,
  connectedAccounts,
}: {
  dest: DeliveryDestination;
  onChange: (d: DeliveryDestination) => void;
  connectedAccounts: ComposioConnectedAccount[];
}) {
  const composioSlug = COMPOSIO_DELIVERY_TYPES[dest.type] ?? "";
  const connected = isTypeConnected(dest.type, connectedAccounts);
  const hasComposio = isComposioType(dest.type);
  const initiateConnection = useInitiateComposioConnection();

  if (!dest.type) return null;

  if (hasComposio && !connected) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-warning/10 border border-warning/20">
        <AlertCircle className="h-3 w-3 text-warning shrink-0" />
        <p className="text-[10px] text-warning flex-1">
          Connect {dest.type} via Connected Apps so Isaac can deliver reports to
          your account.
        </p>
        <button
          type="button"
          onClick={() =>
            initiateConnection.mutate({ appSlug: composioSlug })
          }
          disabled={initiateConnection.isPending}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-warning text-warning-foreground hover:bg-warning/90 transition-colors disabled:opacity-50"
        >
          {initiateConnection.isPending ? (
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
          ) : (
            <ExternalLink className="h-2.5 w-2.5" />
          )}
          Connect
        </button>
      </div>
    );
  }

  const config = DELIVERY_INPUT_CONFIG[dest.type];
  if (!config) return null;

  return (
    <div>
      <label className={labelClass}>{config.label}</label>
      <input
        type="text"
        value={dest.channelId}
        onChange={(e) =>
          onChange({ ...dest, channelId: e.target.value, channelName: "" })
        }
        className={inputClass}
        placeholder={config.placeholder}
      />
      {config.hint && (
        <p className="text-[10px] text-muted-foreground mt-1">{config.hint}</p>
      )}
    </div>
  );
}

export function TaskFormDialog({
  open,
  onOpenChange,
  editingTask,
  form,
  setForm,
  onSubmit,
  onSaveDraft,
  draftPending,
  createPending,
  updatePending,
  channels,
  connectedAccounts,
}: TaskFormDialogProps) {
  const aiFill = useAiFillTask();
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiExpanded, setAiExpanded] = useState(false);
  const formDirtyRef = useRef(false);
  const submittedRef = useRef(false);

  const showScheduledTimes =
    form.recurrenceType === "DAILY" || form.recurrenceType === "WEEKLY";
  const showInterval = form.recurrenceType === "CUSTOM";

  const dest = form.deliveryDestination;
  const destNeedsComposio =
    isComposioType(dest.type) &&
    !isTypeConnected(dest.type, connectedAccounts);

  useEffect(() => {
    formDirtyRef.current = form.name.trim().length > 0;
  }, [form]);

  useEffect(() => {
    if (open) {
      submittedRef.current = false;
    }
  }, [open]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (
        !nextOpen &&
        !submittedRef.current &&
        formDirtyRef.current &&
        !editingTask
      ) {
        try {
          localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(form));
          toast.info("Draft saved — you can pick up where you left off");
        } catch {}
      }
      onOpenChange(nextOpen);
    },
    [form, editingTask, onOpenChange],
  );

  function handleFormSubmit(e: React.FormEvent) {
    submittedRef.current = true;
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}
    onSubmit(e);
  }

  function handleDraftSave() {
    submittedRef.current = true;
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}
    onSaveDraft();
  }

  async function handleAiFill() {
    if (!aiPrompt.trim()) return;
    const result = await aiFill.mutateAsync({ prompt: aiPrompt.trim() });
    if (result.fields && Object.keys(result.fields).length > 0) {
      setForm((f) => {
        const merged = { ...f };
        const fields = result.fields as Record<string, unknown>;
        if (typeof fields.name === "string") merged.name = fields.name;
        if (typeof fields.description === "string")
          merged.description = fields.description;
        if (typeof fields.evidenceType === "string")
          merged.evidenceType = fields.evidenceType;
        if (typeof fields.recurrenceType === "string")
          merged.recurrenceType = fields.recurrenceType;
        if (typeof fields.recurrenceInterval === "number")
          merged.recurrenceInterval = fields.recurrenceInterval;
        if (Array.isArray(fields.scheduledTimes))
          merged.scheduledTimes = (fields.scheduledTimes as string[]).join(
            ", ",
          );
        if (typeof fields.timezone === "string")
          merged.timezone = fields.timezone;
        if (Array.isArray(fields.acceptanceRules))
          merged.acceptanceRules =
            (fields.acceptanceRules as string[]).length > 0
              ? (fields.acceptanceRules as string[])
              : [""];
        if (typeof fields.scoringEnabled === "boolean")
          merged.scoringEnabled = fields.scoringEnabled;
        if (typeof fields.passingScore === "number")
          merged.passingScore = fields.passingScore;
        if (typeof fields.graceMinutes === "number")
          merged.graceMinutes = fields.graceMinutes;
        if (typeof fields.resubmissionAllowed === "boolean")
          merged.resubmissionAllowed = fields.resubmissionAllowed;
        if (typeof fields.reportTime === "string")
          merged.reportTime = fields.reportTime;
        if (typeof fields.reportDocType === "string")
          merged.reportDocType = fields.reportDocType;
        return merged;
      });
      setAiExpanded(false);
    }
  }

  function addAcceptanceRule() {
    setForm((f) => ({ ...f, acceptanceRules: [...f.acceptanceRules, ""] }));
  }

  function removeAcceptanceRule(index: number) {
    setForm((f) => ({
      ...f,
      acceptanceRules: f.acceptanceRules.filter((_, i) => i !== index),
    }));
  }

  function updateAcceptanceRule(index: number, value: string) {
    setForm((f) => ({
      ...f,
      acceptanceRules: f.acceptanceRules.map((r, i) =>
        i === index ? value : r,
      ),
    }));
  }

  function setDeliveryType(type: string) {
    setForm((f) => ({
      ...f,
      deliveryDestination: { ...emptyDestination, type },
    }));
  }

  function setDeliveryDestination(d: DeliveryDestination) {
    setForm((f) => ({ ...f, deliveryDestination: d }));
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-xl shadow-2xl w-[calc(100%-2rem)] max-w-lg max-h-[85vh] overflow-y-auto p-5 z-50"
        >
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-sm font-semibold text-foreground">
              {editingTask
                ? editingTask.status === "DRAFT"
                  ? "Complete Draft"
                  : "Edit Task"
                : "Create Task"}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1 rounded-md hover:bg-muted text-muted-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </Dialog.Close>
          </div>

          {/* ── Isaac prefill ── */}
          {!editingTask && (
            <div className="mb-4 border border-border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setAiExpanded(!aiExpanded)}
                className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-medium text-foreground hover:bg-muted/50 transition-colors"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-primary" />
                  Let Isaac help you prefill the form
                </span>
                <ChevronDown
                  className={`h-3 w-3 text-muted-foreground transition-transform ${
                    aiExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>
              {aiExpanded && (
                <div className="px-3 pb-3 space-y-2">
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    Describe what you want to Isaac — he will prefill the fields
                    below. You can still edit everything before saving.
                  </p>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className={`${inputClass} resize-none`}
                    rows={2}
                    placeholder="e.g. Daily warehouse photo check-ins at 9am and 5pm, with rules about visible timestamps..."
                  />
                  <button
                    type="button"
                    onClick={handleAiFill}
                    disabled={aiFill.isPending || !aiPrompt.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-[11px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {aiFill.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    Prefill with Isaac
                  </button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-3.5">
            {/* ── Section 1: Basics ── */}
            <div>
              <label className={labelClass}>Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className={labelClass}>Description</label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                className={`${inputClass} resize-none`}
                rows={2}
              />
            </div>

            {/* ── Section 2: Channel ── */}
            <div>
              <label className={labelClass}>Notification Channel *</label>
              <select
                value={form.taskChannelId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, taskChannelId: e.target.value }))
                }
                className={inputClass}
                required
              >
                <option value="">Select a channel...</option>
                {channels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.label || ch.id} ({ch.platform})
                  </option>
                ))}
              </select>
              {channels.length === 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  No channels configured. Add one in Channels first.
                </p>
              )}
            </div>

            {/* ── Section 3: Evidence & Schedule ── */}
            <div className={sectionClass}>
              <p className={sectionTitle}>Evidence & Schedule</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Evidence Type</label>
                  <select
                    value={form.evidenceType}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        evidenceType: e.target.value,
                      }))
                    }
                    className={inputClass}
                  >
                    {EVIDENCE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Recurrence</label>
                  <select
                    value={form.recurrenceType}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        recurrenceType: e.target.value,
                      }))
                    }
                    className={inputClass}
                  >
                    {RECURRENCE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {showInterval && (
                <div className="mt-3">
                  <label className={labelClass}>Interval (minutes) *</label>
                  <input
                    type="number"
                    min={1}
                    value={form.recurrenceInterval}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        recurrenceInterval: Number(e.target.value),
                      }))
                    }
                    className={inputClass}
                  />
                </div>
              )}

              {showScheduledTimes && (
                <div className="mt-3">
                  <label className={labelClass}>
                    Scheduled Times * (comma-separated HH:MM)
                  </label>
                  <input
                    type="text"
                    value={form.scheduledTimes}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        scheduledTimes: e.target.value,
                      }))
                    }
                    className={inputClass}
                    placeholder="09:00, 17:00"
                  />
                </div>
              )}

              <div className="mt-3">
                <label className={labelClass}>Timezone</label>
                <TimezoneSelect
                  value={form.timezone}
                  onChange={(tz) =>
                    setForm((f) => ({ ...f, timezone: tz }))
                  }
                />
              </div>
            </div>

            {/* ── Section 4: Acceptance Rules ── */}
            <div className={sectionClass}>
              <div className="flex items-center justify-between mb-2.5">
                <p className={sectionTitle}>Acceptance Rules *</p>
                <button
                  type="button"
                  onClick={addAcceptanceRule}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  <Plus className="h-2.5 w-2.5" /> Add
                </button>
              </div>
              <div className="space-y-2">
                {form.acceptanceRules.map((rule, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={rule}
                      onChange={(e) =>
                        updateAcceptanceRule(i, e.target.value)
                      }
                      className={`${inputClass} flex-1`}
                      placeholder={`Rule ${i + 1}: e.g. "Photo must show timestamp"`}
                    />
                    {form.acceptanceRules.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAcceptanceRule(i)}
                        className="p-2 rounded-md text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Section 5: Scoring ── */}
            <div className={sectionClass}>
              <p className={sectionTitle}>Scoring</p>

              <div className="flex items-center justify-between py-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Scoring Enabled
                </label>
                <SwitchPrimitive.Root
                  checked={form.scoringEnabled}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, scoringEnabled: v }))
                  }
                  className="w-9 h-5 bg-muted rounded-full relative data-[state=checked]:bg-primary transition-colors"
                >
                  <SwitchPrimitive.Thumb className="block w-3.5 h-3.5 bg-white rounded-full transition-transform translate-x-0.5 data-[state=checked]:translate-x-[18px]" />
                </SwitchPrimitive.Root>
              </div>

              {form.scoringEnabled && (
                <div className="space-y-3 mt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>
                        Passing Score (0-100)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={form.passingScore}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            passingScore: Number(e.target.value),
                          }))
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Grace Minutes</label>
                      <input
                        type="number"
                        min={0}
                        value={form.graceMinutes}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            graceMinutes: Number(e.target.value),
                          }))
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <label className="text-[11px] font-medium text-muted-foreground">
                      Resubmission Allowed
                    </label>
                    <SwitchPrimitive.Root
                      checked={form.resubmissionAllowed}
                      onCheckedChange={(v) =>
                        setForm((f) => ({ ...f, resubmissionAllowed: v }))
                      }
                      className="w-9 h-5 bg-muted rounded-full relative data-[state=checked]:bg-primary transition-colors"
                    >
                      <SwitchPrimitive.Thumb className="block w-3.5 h-3.5 bg-white rounded-full transition-transform translate-x-0.5 data-[state=checked]:translate-x-[18px]" />
                    </SwitchPrimitive.Root>
                  </div>
                </div>
              )}
            </div>

            {/* ── Section 6: Report & Delivery ── */}
            <div className={sectionClass}>
              <p className={sectionTitle}>Report & Delivery</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Report Time (HH:MM)</label>
                  <input
                    type="text"
                    value={form.reportTime}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, reportTime: e.target.value }))
                    }
                    className={inputClass}
                    placeholder="18:00"
                  />
                </div>
                <div>
                  <label className={labelClass}>Document Type</label>
                  <select
                    value={form.reportDocType}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        reportDocType: e.target.value,
                      }))
                    }
                    className={inputClass}
                  >
                    {REPORT_DOC_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t === "googledocs" ? "Google Docs" : "Notion"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3">
                <label className={labelClass}>Folder ID (optional)</label>
                <input
                  type="text"
                  value={form.reportFolderId}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      reportFolderId: e.target.value,
                    }))
                  }
                  className={inputClass}
                  placeholder="Drive or Notion folder ID"
                />
              </div>

              {/* ── Delivery Destination ── */}
              <div className="mt-4">
                <p className="text-[11px] font-medium text-foreground mb-2">
                  Delivery Destination
                </p>
                <p className="text-[10px] text-muted-foreground mb-2.5">
                  Reports will be delivered directly to your personal account
                  — not to any group or channel.
                </p>

                <div>
                  <label className={labelClass}>Platform</label>
                  <select
                    value={dest.type}
                    onChange={(e) => setDeliveryType(e.target.value)}
                    className={inputClass}
                  >
                    {DELIVERY_TYPES.map((dt) => (
                      <option key={dt.value} value={dt.value}>
                        {dt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {dest.type && (
                  <div className="mt-2.5">
                    <DeliveryChannelPicker
                      dest={dest}
                      onChange={setDeliveryDestination}
                      connectedAccounts={connectedAccounts}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ── Connection blocker ── */}
            {destNeedsComposio && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="h-3 w-3 text-destructive shrink-0" />
                <p className="text-[10px] text-destructive">
                  Connect the delivery platform before creating this task. You
                  can save it as a draft in the meantime.
                </p>
              </div>
            )}

            {/* ── Submit ── */}
            <div className="flex justify-end gap-2 pt-3">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </Dialog.Close>
              {!editingTask && (
                <button
                  type="button"
                  onClick={handleDraftSave}
                  disabled={
                    draftPending ||
                    createPending ||
                    updatePending ||
                    !form.name.trim()
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                >
                  {draftPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3" />
                  )}
                  Save as Draft
                </button>
              )}
              <button
                type="submit"
                disabled={
                  createPending || updatePending || destNeedsComposio
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {(createPending || updatePending) && (
                  <Loader2 className="h-3 w-3 animate-spin" />
                )}
                {editingTask
                  ? editingTask.status === "DRAFT"
                    ? "Activate"
                    : "Update"
                  : "Create"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
