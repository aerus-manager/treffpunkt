const pointsFormat = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 0 });

export function formatPoints(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return pointsFormat.format(Math.trunc(n));
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "—";
  return seconds.toFixed(2).replace(".", ",");
}

export function formatHf(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(4).replace(".", ",");
}

export function parseTime(raw: string): number | null {
  const trimmed = raw.trim().replace(",", ".");
  if (!trimmed || trimmed === ".") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0 || n > 600) return null;
  return Math.round(n * 100) / 100;
}

export function parseDistance(raw: string): number | null {
  const trimmed = raw.trim().replace(",", ".");
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0 || n > 300) return null;
  return Math.round(n * 10) / 10;
}

export function dayLabel(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const start = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const diff = Math.round((start(now) - start(date)) / 86_400_000);
  if (diff === 0) return "I dag";
  if (diff === 1) return "I går";
  return new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "short" }).format(date);
}

export function clockLabel(iso: string): string {
  return new Intl.DateTimeFormat("nb-NO", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
