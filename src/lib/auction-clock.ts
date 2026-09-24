import {
  parseAuctionEndsAtInput,
  toKoreaDatetimeLocalValue,
} from "@/lib/format-korea-time";

export type AuctionPreset = {
  id: string;
  dayLabel: string;
  timeLabel: string;
  dayOffset: number;
  hour: number;
  minute: number;
};

export const AUCTION_CLOCK_PRESETS: AuctionPreset[] = [
  { id: "today10", dayLabel: "오늘", timeLabel: "10시", dayOffset: 0, hour: 10, minute: 0 },
  { id: "today14", dayLabel: "오늘", timeLabel: "2시", dayOffset: 0, hour: 14, minute: 0 },
  { id: "today18", dayLabel: "오늘", timeLabel: "6시", dayOffset: 0, hour: 18, minute: 0 },
  { id: "tomorrow10", dayLabel: "내일", timeLabel: "10시", dayOffset: 1, hour: 10, minute: 0 },
  { id: "tomorrow14", dayLabel: "내일", timeLabel: "2시", dayOffset: 1, hour: 14, minute: 0 },
  { id: "tomorrow18", dayLabel: "내일", timeLabel: "6시", dayOffset: 1, hour: 18, minute: 0 },
];

export const AUCTION_TODAY_PRESETS = AUCTION_CLOCK_PRESETS.filter(
  (p) => p.dayOffset === 0,
);
export const AUCTION_TOMORROW_PRESETS = AUCTION_CLOCK_PRESETS.filter(
  (p) => p.dayOffset === 1,
);

export function auctionPresetWallTime(
  preset: AuctionPreset,
  now = new Date(),
): string {
  const seoulStamp = toKoreaDatetimeLocalValue(now);
  const [datePart] = seoulStamp.split("T");
  const [y, mo, d] = (datePart ?? "").split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = new Date(Date.UTC(y, mo - 1, d + preset.dayOffset));
  return `${day.getUTCFullYear()}-${pad(day.getUTCMonth() + 1)}-${pad(day.getUTCDate())}T${pad(preset.hour)}:${pad(preset.minute)}`;
}

export function resolveAuctionPreset(
  preset: AuctionPreset,
  now = new Date(),
): Date {
  return (
    parseAuctionEndsAtInput(auctionPresetWallTime(preset, now)) ??
    new Date(now.getTime() + 60 * 60 * 1000)
  );
}

export function isAuctionPresetPast(preset: AuctionPreset, now = new Date()) {
  return resolveAuctionPreset(preset, now).getTime() <= now.getTime();
}

export function nextAuctionPreset(now = new Date()): AuctionPreset {
  return (
    AUCTION_CLOCK_PRESETS.find((preset) => !isAuctionPresetPast(preset, now)) ??
    AUCTION_TOMORROW_PRESETS[0]!
  );
}

export function formatAuctionEndsSummary(localValue: string): string {
  if (!localValue) return "";
  const d = parseAuctionEndsAtInput(localValue);
  if (!d) return "";
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function defaultAuctionEndsLocal(existing?: Date | string | null) {
  if (existing) {
    const formatted = toKoreaDatetimeLocalValue(existing);
    if (formatted) return formatted;
  }
  return toKoreaDatetimeLocalValue(resolveAuctionPreset(nextAuctionPreset()));
}
