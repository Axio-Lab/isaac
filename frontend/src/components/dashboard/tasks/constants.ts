export const EVIDENCE_TYPES = [
  "PHOTO",
  "VIDEO",
  "TEXT",
  "DOCUMENT",
  "LOCATION",
  "AUDIO",
  "ANY",
] as const;

export const RECURRENCE_TYPES = [
  "ONCE",
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "CUSTOM",
] as const;

export const REPORT_DOC_TYPES = ["googledocs", "notion"] as const;

export const DELIVERY_TYPES = [
  { value: "", label: "None" },
  { value: "slack", label: "Slack" },
  { value: "discord", label: "Discord" },
  { value: "telegram", label: "Telegram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "gmail", label: "Gmail" },
] as const;

export const COMPOSIO_DELIVERY_TYPES: Record<string, string> = {
  slack: "slack",
  discord: "discord",
  telegram: "telegram",
};

export const DRAFT_STORAGE_KEY = "isaac_task_draft";

export const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "America/Toronto",
  "America/Vancouver",
  "America/Mexico_City",
  "America/Bogota",
  "America/Lima",
  "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires",
  "America/Santiago",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Amsterdam",
  "Europe/Zurich",
  "Europe/Stockholm",
  "Europe/Warsaw",
  "Europe/Moscow",
  "Europe/Istanbul",
  "Africa/Cairo",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "Africa/Nairobi",
  "Africa/Casablanca",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Asia/Kolkata",
  "Asia/Colombo",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Jakarta",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Shanghai",
  "Asia/Seoul",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Perth",
  "Pacific/Auckland",
  "Pacific/Honolulu",
] as const;

export function getAllTimezones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return [...COMMON_TIMEZONES];
  }
}

export function getTimezoneOffset(tz: string): string {
  try {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    });
    const parts = fmt.formatToParts(now);
    const offsetPart = parts.find((p) => p.type === "timeZoneName");
    return offsetPart?.value ?? "";
  } catch {
    return "";
  }
}

export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export interface DeliveryDestination {
  type: string;
  channelId: string;
  channelName: string;
}

export type TaskFormType = "HUMAN" | "AUTOMATED";

export interface TaskFormData {
  taskType: TaskFormType;
  name: string;
  description: string;
  // Human task fields
  evidenceType: string;
  recurrenceType: string;
  recurrenceInterval: number;
  scheduledTimes: string;
  timezone: string;
  taskChannelId: string;
  acceptanceRules: string[];
  scoringEnabled: boolean;
  passingScore: number;
  graceMinutes: number;
  resubmissionAllowed: boolean;
  reportTime: string;
  reportDocType: string;
  reportFolderId: string;
  deliveryDestination: DeliveryDestination;
  // Automated task fields
  prompt: string;
  composioApps: string[];
}

export const emptyDestination: DeliveryDestination = {
  type: "",
  channelId: "",
  channelName: "",
};

export const defaultForm: TaskFormData = {
  taskType: "HUMAN",
  name: "",
  description: "",
  evidenceType: "PHOTO",
  recurrenceType: "DAILY",
  recurrenceInterval: 60,
  scheduledTimes: "",
  timezone: getBrowserTimezone(),
  taskChannelId: "",
  acceptanceRules: [""],
  scoringEnabled: true,
  passingScore: 70,
  graceMinutes: 15,
  resubmissionAllowed: true,
  reportTime: "18:00",
  reportDocType: "googledocs",
  reportFolderId: "",
  deliveryDestination: { ...emptyDestination },
  prompt: "",
  composioApps: [],
};
