export function statusColor(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-success/10 text-success border-success/20";
    case "PAUSED":
      return "bg-warning/10 text-warning border-warning/20";
    case "COMPLETED":
      return "bg-primary/10 text-primary border-primary/20";
    case "DRAFT":
      return "bg-muted text-muted-foreground border-border/60";
    case "ARCHIVED":
      return "bg-primary/10 text-primary border-primary/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

const EVIDENCE_LABELS: Record<string, string> = {
  PHOTO: "Photo",
  VIDEO: "Video",
  TEXT: "Text",
  DOCUMENT: "Document",
  LOCATION: "Location",
  AUDIO: "Audio",
  ANY: "Any format",
};

export function formatEvidenceTypeLabel(code: string): string {
  return EVIDENCE_LABELS[code] ?? code;
}

/** "09:00" / "17:30" → locale 12h string */
export function formatTimeHm(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm).trim());
  if (!m) return hhmm;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (Number.isNaN(h) || Number.isNaN(min)) return hhmm;
  const d = new Date();
  d.setHours(h, min, 0, 0);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
