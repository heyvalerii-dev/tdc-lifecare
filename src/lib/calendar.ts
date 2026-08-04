import { parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { CLINIC_TIMEZONE } from "./datetime";

function formatIcsDate(date: Date): string {
  return formatInTimeZone(date, CLINIC_TIMEZONE, "yyyyMMdd'T'HHmmss");
}

export function generateIcsEvent({
  title,
  description,
  startAt,
  endAt,
  location,
}: {
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  location?: string;
}): string {
  const start = parseISO(startAt);
  const end = parseISO(endAt);
  const uid = `${startAt}@tdc-lifecare`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TDC LifeCare//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART;TZID=${CLINIC_TIMEZONE}:${formatIcsDate(start)}`,
    `DTEND;TZID=${CLINIC_TIMEZONE}:${formatIcsDate(end)}`,
    `SUMMARY:${title.replace(/\n/g, "\\n")}`,
  ];

  if (description) {
    lines.push(`DESCRIPTION:${description.replace(/\n/g, "\\n")}`);
  }
  if (location) {
    lines.push(`LOCATION:${location.replace(/\n/g, "\\n")}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcsFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
