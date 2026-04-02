"use client";

const ISO_UTC_REGEX = /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z\b/g;

function formatIsoForTimezone(isoString: string, timeZone?: string | null) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  const resolvedTimeZone = timeZone || "UTC";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: resolvedTimeZone,
    timeZoneName: "short",
  }).format(date);
}

export function formatFlagDetails(details?: string | null, timeZone?: string | null) {
  if (!details) return details;
  return details.replace(ISO_UTC_REGEX, (match) => formatIsoForTimezone(match, timeZone));
}
