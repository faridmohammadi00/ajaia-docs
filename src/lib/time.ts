const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const full = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["second", 60],
  ["minute", 60],
  ["hour", 24],
  ["day", 7],
];

export function timeAgo(iso: string, now = Date.now()): string {
  let delta = (new Date(iso).getTime() - now) / 1000;
  if (Math.abs(delta) < 45) return "just now";
  for (const [unit, size] of STEPS) {
    if (Math.abs(delta) < size) return rtf.format(Math.round(delta), unit);
    delta /= size;
  }
  return full.format(new Date(iso));
}

export const formatDate = (iso: string) => full.format(new Date(iso));
