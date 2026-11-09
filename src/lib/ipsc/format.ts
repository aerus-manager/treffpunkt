const NB = "nb-NO";

const hfFormat = new Intl.NumberFormat(NB, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const timeFormat = new Intl.NumberFormat(NB, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const pointsFormat = new Intl.NumberFormat(NB, { maximumFractionDigits: 0 });
const dayFormat = new Intl.DateTimeFormat(NB, { day: "numeric", month: "short" });
const dayYearFormat = new Intl.DateTimeFormat(NB, {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const clockFormat = new Intl.DateTimeFormat(NB, { hour: "2-digit", minute: "2-digit" });

export function formatHf(value: number): string {
  return hfFormat.format(Number.isFinite(value) ? value : 0);
}

export function formatTime(seconds: number): string {
  return timeFormat.format(Number.isFinite(seconds) ? seconds : 0);
}

export function formatPoints(points: number): string {
  // Typographic minus reads better than a hyphen next to tabular digits.
  return pointsFormat.format(points).replace("-", "−");
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function dayLabel(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days === 0) return "I dag";
  if (days === 1) return "I går";
  return date.getFullYear() === now.getFullYear()
    ? dayFormat.format(date)
    : dayYearFormat.format(date);
}

export function clockLabel(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : clockFormat.format(date);
}

/** Parse "12,34" or "12.34" into seconds; null when not a positive number. */
export function parseSeconds(text: string): number | null {
  const value = Number(text.trim().replace(",", "."));
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : null;
}
