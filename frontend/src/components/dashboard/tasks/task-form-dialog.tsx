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
  Users,
  Check,
  ImagePlus,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { API_URL } from "@/lib/api-client";
import type { HumanTask } from "@/hooks/useHumanTasks";
import { useAiFillTask } from "@/hooks/useHumanTasks";
import type { AutomatedTask } from "@/hooks/useAutomatedTasks";
import type { TaskChannel } from "@/hooks/useTaskChannels";
import type { ComposioApp, ComposioConnectedAccount } from "@/hooks/useComposioConnections";
import { useInitiateComposioConnection } from "@/hooks/useComposioConnections";
import type { TaskFormData, DeliveryDestination, RequiredItemEntry } from "./constants";
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
import { TaskSelectDropdown, type TaskSelectOption } from "./task-select-dropdown";

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTask: HumanTask | null;
  editingAutoTask?: AutomatedTask | null;
  form: TaskFormData;
  setForm: React.Dispatch<React.SetStateAction<TaskFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  onSaveDraft: () => void;
  draftPending: boolean;
  createPending: boolean;
  updatePending: boolean;
  channels: TaskChannel[];
  channelUsageById?: Record<string, string>;
  connectedAccounts: ComposioConnectedAccount[];
  /** From `useComposioApps()` — used to show app logos like on Connected Apps */
  composioAppCatalog?: ComposioApp[];
}

const EVIDENCE_SELECT_OPTIONS: TaskSelectOption[] = EVIDENCE_TYPES.map((t) => ({
  value: t,
  label: t,
}));

const RECURRENCE_SELECT_OPTIONS: TaskSelectOption[] = RECURRENCE_TYPES.map((t) => ({
  value: t,
  label: t,
}));

const REPORT_DOC_SELECT_OPTIONS: TaskSelectOption[] = REPORT_DOC_TYPES.map((t) => ({
  value: t,
  label: t === "none" ? "None (report page only)" : t === "googledocs" ? "Google Docs" : "Notion",
}));

const DELIVERY_TYPE_SELECT_OPTIONS: TaskSelectOption[] = DELIVERY_TYPES.map((dt) => ({
  value: dt.value,
  label: dt.label,
}));

const inputClass =
  "w-full px-3 py-2 border border-input rounded-lg text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring";
const selectTriggerClass = cn(
  inputClass,
  "flex items-center justify-between gap-1.5 text-left font-normal"
);
const labelClass = "block text-[11px] font-medium text-muted-foreground mb-1";
const sectionClass = "border-t border-border pt-3.5";
const sectionTitle = "text-[11px] font-medium text-foreground mb-2.5";

function TimezoneSelect({ value, onChange }: { value: string; onChange: (tz: string) => void }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const allTz = useMemo(() => getAllTimezones(), []);
  const filtered = useMemo(() => {
    if (!query) return allTz;
    const q = query.toLowerCase();
    return allTz.filter((tz) => tz.toLowerCase().includes(q));
  }, [allTz, query]);

  const displayValue = value ? `${value} (${getTimezoneOffset(value)})` : "Select timezone";

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
              <p className="px-3 py-2 text-[10px] text-muted-foreground">No match</p>
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
                    tz === value ? "bg-primary/10 text-primary font-medium" : "text-foreground"
                  }`}
                >
                  {tz} <span className="text-muted-foreground">({getTimezoneOffset(tz)})</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ConnectedAppsMultiSelect({
  accounts,
  composioAppCatalog,
  selected,
  onChange,
}: {
  accounts: ComposioConnectedAccount[];
  composioAppCatalog: ComposioApp[];
  selected: string[];
  onChange: (apps: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    return accounts.map((a) => {
      const slug = a.appName?.toLowerCase() ?? "";
      const meta = composioAppCatalog.find((c) => c.slug.toLowerCase() === slug);
      const label = meta?.name ?? a.appName?.trim() ?? "Unknown";
      return {
        id: a.id,
        key: a.appName?.toUpperCase().trim() || "UNKNOWN",
        label,
        logo: meta?.logo,
      };
    });
  }, [accounts, composioAppCatalog]);

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) => r.label.toLowerCase().includes(q) || r.key.toLowerCase().includes(q));
  }, [rows, query]);

  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  function toggle(key: string) {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange([...next]);
  }

  const summary = useMemo(() => {
    if (selected.length === 0) return "Select apps (optional)";
    const labels = selected.map((key) => {
      const row = rows.find((x) => x.key === key);
      return row?.label ?? key;
    });
    if (labels.length <= 2) return labels.join(", ");
    return `${labels.slice(0, 2).join(", ")} +${labels.length - 2} more`;
  }, [selected, rows]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className={`${inputClass} text-left flex items-center justify-between gap-2`}
      >
        <span className="truncate min-w-0">{summary}</span>
        <ChevronDown
          className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && (
        <div className="absolute z-100 mt-1 w-full bg-popover border border-border rounded-lg shadow-xl max-h-52 overflow-hidden flex flex-col">
          <div className="p-1.5 border-b border-border shrink-0">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search connected apps..."
                className="w-full pl-7 pr-2 py-1.5 text-xs bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-40 min-h-0">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-[10px] text-muted-foreground">No match</p>
            ) : (
              filtered.map((r) => {
                const isOn = selected.includes(r.key);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggle(r.key)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-[11px] hover:bg-muted transition-colors ${
                      isOn ? "bg-primary/10 text-primary" : "text-foreground"
                    }`}
                  >
                    <span
                      className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                        isOn
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background"
                      }`}
                    >
                      {isOn && <Check className="h-2 w-2" strokeWidth={3} />}
                    </span>
                    {r.logo ? (
                      <img
                        src={r.logo}
                        alt=""
                        className="h-4 w-4 rounded-lg object-contain shrink-0 bg-muted/40"
                      />
                    ) : (
                      <div className="h-4 w-4 rounded-lg bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground shrink-0">
                        {r.label.charAt(0)}
                      </div>
                    )}
                    <span className="truncate">{r.label}</span>
                  </button>
                );
              })
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

function isTypeConnected(type: string, accounts: ComposioConnectedAccount[]): boolean {
  const slug = COMPOSIO_DELIVERY_TYPES[type];
  if (!slug) return true;
  return accounts.some(
    (a) => a.appName?.toLowerCase() === slug.toLowerCase() && a.status === "ACTIVE"
  );
}

const DELIVERY_INPUT_CONFIG: Record<string, { label: string; placeholder: string; hint?: string }> =
  {
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
          Connect {dest.type} via Connected Apps so Isaac can deliver reports to your account.
        </p>
        <button
          type="button"
          onClick={() => initiateConnection.mutate({ appSlug: composioSlug })}
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
        onChange={(e) => onChange({ ...dest, channelId: e.target.value, channelName: "" })}
        className={inputClass}
        placeholder={config.placeholder}
      />
      {config.hint && <p className="text-[10px] text-muted-foreground mt-1">{config.hint}</p>}
    </div>
  );
}

export function TaskFormDialog({
  open,
  onOpenChange,
  editingTask,
  editingAutoTask,
  form,
  setForm,
  onSubmit,
  onSaveDraft,
  draftPending,
  createPending,
  updatePending,
  channels,
  channelUsageById = {},
  connectedAccounts,
  composioAppCatalog = [],
}: TaskFormDialogProps) {
  const isAutomated = form.taskType === "AUTOMATED";
  const isEditing = !!(editingTask || editingAutoTask);
  const aiFill = useAiFillTask();
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiExpanded, setAiExpanded] = useState(false);
  const [aiConnectSuggestions, setAiConnectSuggestions] = useState<
    { app: string; reason: string }[]
  >([]);
  const formDirtyRef = useRef(false);
  const submittedRef = useRef(false);

  const showScheduledTimes = form.recurrenceType === "DAILY" || form.recurrenceType === "WEEKLY";
  const showInterval = form.recurrenceType === "CUSTOM";

  const DOC_TYPE_COMPOSIO_SLUG: Record<string, string> = {
    googledocs: "googledocs",
    notion: "notion",
  };

  const docTypeConnected = useMemo(() => {
    const slug = DOC_TYPE_COMPOSIO_SLUG[form.reportDocType];
    if (!slug) return true;
    return connectedAccounts.some(
      (a) => a.appName?.toLowerCase() === slug.toLowerCase() && a.status === "ACTIVE"
    );
  }, [form.reportDocType, connectedAccounts]);

  const notificationChannelOptions = useMemo<TaskSelectOption[]>(
    () => [
      { value: "", label: "Select a channel..." },
      ...channels.map((ch) => ({
        value: ch.id,
        label:
          channelUsageById[ch.id] && channelUsageById[ch.id] !== (editingTask?.name || "")
            ? `${ch.label || ch.id} (${ch.platform}) — in use by ${channelUsageById[ch.id]}`
            : `${ch.label || ch.id} (${ch.platform})`,
        disabled:
          !!channelUsageById[ch.id] &&
          channelUsageById[ch.id] !== (editingTask?.name || "") &&
          ch.id !== form.taskChannelId,
      })),
    ],
    [channelUsageById, channels, editingTask?.name, form.taskChannelId]
  );

  const dest = form.deliveryDestination;
  const destNeedsComposio =
    !isAutomated && isComposioType(dest.type) && !isTypeConnected(dest.type, connectedAccounts);

  useEffect(() => {
    formDirtyRef.current = form.name.trim().length > 0;
  }, [form]);

  useEffect(() => {
    if (open) {
      submittedRef.current = false;
      setAiConnectSuggestions([]);
    }
  }, [open]);

  useEffect(() => {
    if (!isAutomated) setAiConnectSuggestions([]);
  }, [isAutomated]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && !submittedRef.current && formDirtyRef.current && !isEditing) {
        try {
          localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(form));
          toast.info("Draft saved — you can pick up where you left off");
        } catch {}
      }
      onOpenChange(nextOpen);
    },
    [form, isEditing, onOpenChange]
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
    const result = await aiFill.mutateAsync({
      prompt: aiPrompt.trim(),
      taskType: isAutomated ? "AUTOMATED" : "HUMAN",
      connectedAppNames: isAutomated
        ? connectedAccounts.map((a) => a.appName?.toUpperCase()).filter(Boolean)
        : undefined,
    });
    if (result.fields && Object.keys(result.fields).length > 0) {
      const fields = result.fields as Record<string, unknown>;
      if (isAutomated && Array.isArray(fields.connectSuggestions)) {
        const parsed = (fields.connectSuggestions as unknown[])
          .filter((x): x is Record<string, unknown> => x != null && typeof x === "object")
          .map((x) => ({
            app: typeof x.app === "string" ? x.app.toUpperCase().trim() : "",
            reason: typeof x.reason === "string" ? x.reason.trim() : "",
          }))
          .filter((x) => x.app.length > 0);
        setAiConnectSuggestions(parsed);
        if (parsed.length > 0) {
          toast.message("Isaac suggested apps to connect", {
            description:
              "See the note under Connected Apps — you can add them in Connected Apps, then re-run prefill if you like.",
          });
        }
      } else {
        setAiConnectSuggestions([]);
      }

      setForm((f) => {
        const merged = { ...f };
        if (isAutomated) {
          if (typeof fields.name === "string") merged.name = fields.name;
          if (typeof fields.description === "string") merged.description = fields.description;
          if (typeof fields.prompt === "string") merged.prompt = fields.prompt;
          if (Array.isArray(fields.composioApps)) {
            const allowed = new Set(
              connectedAccounts.map((a) => a.appName?.toUpperCase()).filter(Boolean) as string[]
            );
            const picked = (fields.composioApps as string[])
              .map((a) => String(a).toUpperCase())
              .filter((a) => allowed.has(a));
            merged.composioApps = picked;
          }
          if (typeof fields.recurrenceType === "string")
            merged.recurrenceType = fields.recurrenceType;
          if (typeof fields.recurrenceInterval === "number")
            merged.recurrenceInterval = fields.recurrenceInterval;
          if (Array.isArray(fields.scheduledTimes))
            merged.scheduledTimes = (fields.scheduledTimes as string[]).join(", ");
          if (typeof fields.timezone === "string") merged.timezone = fields.timezone;
        } else {
          if (typeof fields.name === "string") merged.name = fields.name;
          if (typeof fields.description === "string") merged.description = fields.description;
          if (typeof fields.evidenceType === "string") merged.evidenceType = fields.evidenceType;
          if (typeof fields.recurrenceType === "string")
            merged.recurrenceType = fields.recurrenceType;
          if (typeof fields.recurrenceInterval === "number")
            merged.recurrenceInterval = fields.recurrenceInterval;
          if (Array.isArray(fields.scheduledTimes))
            merged.scheduledTimes = (fields.scheduledTimes as string[]).join(", ");
          if (typeof fields.timezone === "string") merged.timezone = fields.timezone;
          if (Array.isArray(fields.acceptanceRules))
            merged.acceptanceRules =
              (fields.acceptanceRules as string[]).length > 0
                ? (fields.acceptanceRules as string[])
                : [""];
          if (Array.isArray(fields.requiredItems))
            merged.requiredItems = fields.requiredItems as RequiredItemEntry[];
          if (typeof fields.scoringEnabled === "boolean")
            merged.scoringEnabled = fields.scoringEnabled;
          if (typeof fields.passingScore === "number") merged.passingScore = fields.passingScore;
          if (typeof fields.graceMinutes === "number") merged.graceMinutes = fields.graceMinutes;
          if (typeof fields.resubmissionAllowed === "boolean")
            merged.resubmissionAllowed = fields.resubmissionAllowed;
          if (typeof fields.reportTime === "string") merged.reportTime = fields.reportTime;
          if (typeof fields.reportDocType === "string") merged.reportDocType = fields.reportDocType;
        }
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
      acceptanceRules: f.acceptanceRules.map((r, i) => (i === index ? value : r)),
    }));
  }

  function addRequiredItem() {
    setForm((f) => ({
      ...f,
      requiredItems: [...f.requiredItems, { label: "", evidenceType: f.evidenceType || "PHOTO" }],
    }));
  }

  function removeRequiredItem(index: number) {
    setForm((f) => ({
      ...f,
      requiredItems: f.requiredItems.filter((_, i) => i !== index),
    }));
  }

  function updateRequiredItem(index: number, patch: Partial<RequiredItemEntry>) {
    setForm((f) => ({
      ...f,
      requiredItems: f.requiredItems.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    }));
  }

  async function uploadFile(file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`${API_URL}/api/uploads`, { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      return `${API_URL}${data.url}`;
    } catch {
      toast.error("Failed to upload file");
      return null;
    }
  }

  async function uploadReferenceFile(index: number, file: File) {
    const url = await uploadFile(file);
    if (url) {
      updateRequiredItem(index, { referenceUrl: url });
    }
  }

  async function uploadSingleReference(file: File) {
    const url = await uploadFile(file);
    if (url) {
      setForm((f) => ({ ...f, sampleEvidenceUrl: url }));
    }
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
              {isEditing
                ? editingTask?.status === "DRAFT"
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

          {/* ── Task type toggle ── */}
          {!isEditing && (
            <div className="flex gap-1 p-0.5 bg-muted rounded-lg mb-4">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, taskType: "HUMAN" }))}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                  !isAutomated
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users className="h-3 w-3" />
                Human Task
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, taskType: "AUTOMATED" }))}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                  isAutomated
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles className="h-3 w-3" />
                Automated Task
              </button>
            </div>
          )}

          {/* ── Isaac prefill ── */}
          {!isEditing && (
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
                    {isAutomated
                      ? "Describe the automation — Isaac will propose name, prompt, and schedule. He will preselect apps you already use; if something else is needed, he lists apps to connect below. Tasks that need no integrations are fine — app chips can stay empty."
                      : "Describe what you want to Isaac — he will prefill the fields below. You can still edit everything before saving."}
                  </p>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className={`${inputClass} resize-none`}
                    rows={2}
                    placeholder={
                      isAutomated
                        ? "e.g. Every morning, summarize unread Gmail from my team; or: weekly digest of Slack mentions — no apps needed for pure reminders…"
                        : "e.g. Daily warehouse photo check-ins at 9am and 5pm, with rules about visible timestamps..."
                    }
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
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className={labelClass}>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className={`${inputClass} resize-none`}
                rows={2}
              />
            </div>

            {/* ── Automated: Prompt + Apps ── */}
            {isAutomated && (
              <>
                <div>
                  <label className={labelClass}>Prompt *</label>
                  <textarea
                    value={form.prompt}
                    onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
                    className={`${inputClass} resize-none`}
                    rows={4}
                    placeholder="e.g. Check my Gmail inbox and summarize all emails from yesterday"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Tell Isaac what to do. Use integrations only when the task needs them; many
                    automations need no connected apps.
                  </p>
                </div>

                <div>
                  <label className={labelClass}>Connected Apps (optional)</label>
                  <div className="mt-1">
                    {connectedAccounts.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground">
                        None connected yet. Use prefill above — Isaac can suggest which to add in
                        Connected Apps, or leave empty if the task doesn&apos;t need tools.
                      </p>
                    ) : (
                      <ConnectedAppsMultiSelect
                        accounts={connectedAccounts}
                        composioAppCatalog={composioAppCatalog}
                        selected={form.composioApps}
                        onChange={(apps) => setForm((f) => ({ ...f, composioApps: apps }))}
                      />
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Select only apps this run should call. Leave none selected if the prompt
                    doesn&apos;t need external APIs.
                  </p>
                  {aiConnectSuggestions.length > 0 && (
                    <div className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2.5">
                      <p className="text-[10px] font-medium text-foreground mb-1.5">
                        Isaac suggests connecting these
                      </p>
                      <ul className="space-y-1 mb-2">
                        {aiConnectSuggestions.map(({ app, reason }) => (
                          <li key={app} className="text-[10px] text-muted-foreground leading-snug">
                            <span className="font-medium text-foreground">{app}</span>
                            {reason ? ` — ${reason}` : null}
                          </li>
                        ))}
                      </ul>
                      <Link
                        href="/connected-apps"
                        className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                      >
                        Open Connected Apps
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── Section 2: Channel (human only) ── */}
            {!isAutomated && (
              <div>
                <TaskSelectDropdown
                  label="Notification Channel"
                  value={form.taskChannelId}
                  onChange={(v) => setForm((f) => ({ ...f, taskChannelId: v }))}
                  options={notificationChannelOptions}
                  ariaLabel="Select notification channel"
                  labelClassName={labelClass}
                  buttonClassName={selectTriggerClass}
                  required
                  disabled={channels.length === 0}
                  contentZIndexClass="z-[200]"
                />
                {channels.length === 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    No channels configured. Add one in Channels first.
                  </p>
                )}
                {channels.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Channels already assigned to another task are shown as in use and cannot be
                    selected.
                  </p>
                )}
              </div>
            )}

            {/* ── Section 3: Evidence & Schedule (human) / Schedule (automated) ── */}
            {!isAutomated ? (
              <div className={sectionClass}>
                <p className={sectionTitle}>Evidence & Schedule</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <TaskSelectDropdown
                      label="Evidence Type"
                      value={form.evidenceType}
                      onChange={(v) => setForm((f) => ({ ...f, evidenceType: v }))}
                      options={EVIDENCE_SELECT_OPTIONS}
                      ariaLabel="Evidence type"
                      labelClassName={labelClass}
                      buttonClassName={selectTriggerClass}
                      contentZIndexClass="z-[200]"
                    />
                  </div>
                  <div>
                    <TaskSelectDropdown
                      label="Recurrence"
                      value={form.recurrenceType}
                      onChange={(v) => setForm((f) => ({ ...f, recurrenceType: v }))}
                      options={RECURRENCE_SELECT_OPTIONS}
                      ariaLabel="Recurrence"
                      labelClassName={labelClass}
                      buttonClassName={selectTriggerClass}
                      contentZIndexClass="z-[200]"
                    />
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
                    <label className={labelClass}>Scheduled Times * (comma-separated HH:MM)</label>
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
                    onChange={(tz) => setForm((f) => ({ ...f, timezone: tz }))}
                  />
                </div>
              </div>
            ) : (
              <div className={sectionClass}>
                <p className={sectionTitle}>Schedule</p>
                <div>
                  <label className={labelClass}>Scheduled Times (comma-separated HH:MM)</label>
                  <input
                    type="text"
                    value={form.scheduledTimes}
                    onChange={(e) => setForm((f) => ({ ...f, scheduledTimes: e.target.value }))}
                    className={inputClass}
                    placeholder="07:00, 18:00"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Isaac will run this task at these times. Leave empty for on-demand only.
                  </p>
                </div>
                <div className="mt-3">
                  <label className={labelClass}>Timezone</label>
                  <TimezoneSelect
                    value={form.timezone}
                    onChange={(tz) => setForm((f) => ({ ...f, timezone: tz }))}
                  />
                </div>
              </div>
            )}

            {/* ── Section 4: Acceptance Rules (human only) ── */}
            {!isAutomated && (
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
                        onChange={(e) => updateAcceptanceRule(i, e.target.value)}
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
            )}

            {/* ── Section 4b: Submission Mode + Reference Evidence ── */}
            {!isAutomated && (
              <div className={sectionClass}>
                <p className={sectionTitle}>Submission Mode</p>
                <div className="flex gap-2 mt-1.5 mb-3">
                  {(["single", "multi"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, submissionMode: mode }))}
                      className={cn(
                        "flex-1 rounded-lg border px-3 py-2 text-[11px] font-medium transition-colors",
                        form.submissionMode === mode
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted/40"
                      )}
                    >
                      {mode === "single" ? "Single submission" : "Multi-item submission"}
                    </button>
                  ))}
                </div>

                {form.submissionMode === "single" && (
                  <div>
                    <label className={labelClass}>Reference sample (optional)</label>
                    <p className="text-[10px] text-muted-foreground mb-1.5">
                      Upload a sample of what a correct submission looks like. Isaac uses this to
                      compare against worker evidence.
                    </p>
                    {form.sampleEvidenceUrl ? (
                      <div className="flex items-center gap-3">
                        <img
                          src={form.sampleEvidenceUrl}
                          alt="Reference sample"
                          className="h-16 w-16 rounded-lg object-cover border border-border"
                        />
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, sampleEvidenceUrl: "" }))}
                          className="text-[10px] text-destructive hover:underline"
                        >
                          Remove reference
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2.5">
                        <p className="text-[10px] text-muted-foreground mb-2 leading-relaxed">
                          Choose an image or video file from your device — not a name field. This
                          becomes the visual example Isaac compares to worker uploads.
                        </p>
                        <label className="inline-flex cursor-pointer">
                          <input
                            type="file"
                            accept="image/*,video/*"
                            className="sr-only"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) uploadSingleReference(file);
                              e.target.value = "";
                            }}
                          />
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-[10px] font-medium text-foreground shadow-sm hover:bg-muted/60 transition-colors">
                            <ImagePlus className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                            Upload reference file
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {form.submissionMode === "multi" && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-[11px] font-medium text-foreground">
                          Required evidence items
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Workers submit each item sequentially. Isaac guides them through the list.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={addRequiredItem}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Plus className="h-2.5 w-2.5" /> Add
                      </button>
                    </div>
                    {form.requiredItems.length > 0 ? (
                      <div className="space-y-2.5">
                        {form.requiredItems.map((item, i) => {
                          const itemLabelId = `required-item-name-${i}`;
                          const itemTypeId = `required-item-type-${i}`;
                          const displayName = item.label.trim() || `Item ${i + 1}`;
                          return (
                            <div
                              key={i}
                              className="rounded-lg border border-border p-3 space-y-3 bg-card/30"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  Step {i + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeRequiredItem(i)}
                                  className="p-1.5 rounded-md text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                                  aria-label={`Remove ${displayName}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              <div className="space-y-1.5">
                                <label htmlFor={itemLabelId} className={labelClass}>
                                  Name this item (reference name)
                                </label>
                                <p className="text-[10px] text-muted-foreground leading-relaxed">
                                  This is the label workers see in chat and how this step is
                                  identified. The optional file you add below is tied to this name —
                                  edit it anytime to rename what this reference represents.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                                  <input
                                    id={itemLabelId}
                                    type="text"
                                    value={item.label}
                                    onChange={(e) =>
                                      updateRequiredItem(i, { label: e.target.value })
                                    }
                                    className={`${inputClass} flex-1 min-w-0`}
                                    placeholder='e.g. "Kitchen", "Front entrance photo"'
                                    autoComplete="off"
                                  />
                                  <div className="flex flex-col gap-1 shrink-0 sm:w-30">
                                    <label
                                      htmlFor={itemTypeId}
                                      className="text-[10px] font-medium text-muted-foreground"
                                    >
                                      Type
                                    </label>
                                    <select
                                      id={itemTypeId}
                                      value={item.evidenceType}
                                      onChange={(e) =>
                                        updateRequiredItem(i, { evidenceType: e.target.value })
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
                                </div>
                              </div>

                              <div className="rounded-md border border-dashed border-border bg-muted/15 px-2.5 py-2.5 space-y-2">
                                <p className="text-[10px] font-medium text-foreground">
                                  Reference sample file (optional)
                                </p>
                                {item.referenceUrl ? (
                                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                    <img
                                      src={item.referenceUrl}
                                      alt={`Sample for ${displayName}`}
                                      className="h-10 w-10 rounded-md object-cover border border-border"
                                    />
                                    <span className="text-[10px] text-muted-foreground">
                                      Sample linked to{" "}
                                      <span className="font-medium text-foreground">
                                        {displayName}
                                      </span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateRequiredItem(i, { referenceUrl: undefined })
                                      }
                                      className="text-[10px] text-destructive hover:underline"
                                    >
                                      Remove file
                                    </button>
                                  </div>
                                ) : (
                                  <label className="inline-flex cursor-pointer">
                                    <input
                                      type="file"
                                      accept="image/*,video/*"
                                      className="sr-only"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) uploadReferenceFile(i, file);
                                        e.target.value = "";
                                      }}
                                    />
                                    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-[10px] font-medium text-foreground shadow-sm hover:bg-muted/60 transition-colors">
                                      <ImagePlus
                                        className="h-3.5 w-3.5 text-muted-foreground"
                                        aria-hidden
                                      />
                                      Add sample for {displayName}
                                    </span>
                                  </label>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground italic py-2">
                        No items added yet. Click &quot;Add&quot; to define what workers need to
                        submit.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Section 5: Scoring (human only) ── */}
            {!isAutomated && (
              <div className={sectionClass}>
                <p className={sectionTitle}>Scoring</p>

                <div className="flex items-center justify-between py-1">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Scoring Enabled
                  </label>
                  <SwitchPrimitive.Root
                    checked={form.scoringEnabled}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, scoringEnabled: v }))}
                    className="w-9 h-5 bg-muted rounded-full relative data-[state=checked]:bg-primary transition-colors"
                  >
                    <SwitchPrimitive.Thumb className="block w-3.5 h-3.5 bg-white rounded-full transition-transform translate-x-0.5 data-[state=checked]:translate-x-[18px]" />
                  </SwitchPrimitive.Root>
                </div>

                {form.scoringEnabled && (
                  <div className="space-y-3 mt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Passing Score (0-100)</label>
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
                        onCheckedChange={(v) => setForm((f) => ({ ...f, resubmissionAllowed: v }))}
                        className="w-9 h-5 bg-muted rounded-full relative data-[state=checked]:bg-primary transition-colors"
                      >
                        <SwitchPrimitive.Thumb className="block w-3.5 h-3.5 bg-white rounded-full transition-transform translate-x-0.5 data-[state=checked]:translate-x-[18px]" />
                      </SwitchPrimitive.Root>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Section 6: Report & Delivery ── */}
            <div className={sectionClass}>
              <p className={sectionTitle}>{isAutomated ? "Delivery" : "Report & Delivery"}</p>

              {!isAutomated && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Report Time (HH:MM)</label>
                      <input
                        type="text"
                        value={form.reportTime}
                        onChange={(e) => setForm((f) => ({ ...f, reportTime: e.target.value }))}
                        className={inputClass}
                        placeholder="18:00"
                      />
                    </div>
                    <div>
                      <TaskSelectDropdown
                        label="Document Type"
                        value={form.reportDocType}
                        onChange={(v) => setForm((f) => ({ ...f, reportDocType: v }))}
                        options={REPORT_DOC_SELECT_OPTIONS}
                        ariaLabel="Report document type"
                        labelClassName={labelClass}
                        buttonClassName={selectTriggerClass}
                        contentZIndexClass="z-[200]"
                      />
                      {form.reportDocType &&
                        form.reportDocType !== "none" &&
                        (() => {
                          const slug =
                            form.reportDocType === "googledocs" ? "googledocs" : "notion";
                          const connected = connectedAccounts.some(
                            (a) =>
                              a.appName?.toLowerCase() === slug.toLowerCase() &&
                              a.status === "ACTIVE"
                          );
                          if (!connected) {
                            return (
                              <p className="text-[10px] text-destructive mt-1">
                                Connect{" "}
                                {form.reportDocType === "googledocs" ? "Google Docs" : "Notion"} in{" "}
                                <Link href="/connected-apps" className="underline">
                                  Connected Apps
                                </Link>{" "}
                                before generating reports.
                              </p>
                            );
                          }
                          return null;
                        })()}
                    </div>
                  </div>

                  {form.reportDocType !== "none" && (
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
                  )}
                </>
              )}

              {/* ── Delivery Destination ── */}
              <div className={isAutomated ? "" : "mt-4"}>
                <p className="text-[11px] font-medium text-foreground mb-2">Delivery Destination</p>
                <p className="text-[10px] text-muted-foreground mb-2.5">
                  Where Isaac sends a report summary when generated. Leave as None for report page
                  only.
                </p>

                <div>
                  <TaskSelectDropdown
                    label="Platform"
                    value={dest.type}
                    onChange={setDeliveryType}
                    options={DELIVERY_TYPE_SELECT_OPTIONS}
                    ariaLabel="Delivery platform"
                    labelClassName={labelClass}
                    buttonClassName={selectTriggerClass}
                    contentZIndexClass="z-[200]"
                  />
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
                  Connect the delivery platform before creating this task. You can save it as a
                  draft in the meantime.
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
                  disabled={draftPending || createPending || updatePending || !form.name.trim()}
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
                  createPending ||
                  updatePending ||
                  destNeedsComposio ||
                  (!isAutomated && !docTypeConnected)
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {(createPending || updatePending) && <Loader2 className="h-3 w-3 animate-spin" />}
                {editingTask ? (editingTask.status === "DRAFT" ? "Activate" : "Update") : "Create"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
