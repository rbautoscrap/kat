/** Korea Standard Time offset (no DST). */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** Display timestamps in Korea Standard Time (UTC+9). */
export function formatKoreaDateTime(
  value: string | Date | number | null | undefined,
): string {
  if (value == null || value === "") return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")} KST`;
}

/**
 * Parse Live Auction deadline from the admin form.
 * - ISO with `Z` / offset → absolute instant
 * - `datetime-local` (`YYYY-MM-DDTHH:mm`) → Asia/Seoul wall clock
 *
 * Node treats bare `YYYY-MM-DDTHH:mm` as UTC, which shifts Korea admins +9h.
 */
export function parseAuctionEndsAtInput(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;

  if (/[zZ]$/.test(s) || /[+-]\d{2}:?\d{2}$/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const m = s.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/,
  );
  if (!m) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  const second = Number(m[6] ?? "0");
  if (
    [year, month, day, hour, minute, second].some((n) => !Number.isFinite(n))
  ) {
    return null;
  }

  // Components are KST wall time → convert to UTC instant.
  const utcMs =
    Date.UTC(year, month - 1, day, hour, minute, second) - KST_OFFSET_MS;
  const date = new Date(utcMs);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Format an instant for `<input type="datetime-local">` in Asia/Seoul. */
export function toKoreaDatetimeLocalValue(
  value: Date | string | null | undefined,
): string {
  if (value == null || value === "") return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  let hour = get("hour");
  if (hour === "24") hour = "00";
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}
