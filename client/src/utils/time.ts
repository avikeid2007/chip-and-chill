/**
 * Formats a Date object as YYYY-MM-DD in the local browser timezone.
 * Avoids the UTC-shift bug of d.toISOString().slice(0, 10).
 */
export function toDateInput(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formats a date string (YYYY-MM-DD or ISO) as a human-friendly label (e.g. "Today", "Thu, Aug 27").
 */
export function formatDateLabel(dateStr: string): string {
  if (!dateStr) return "";
  const today = toDateInput(new Date());
  const dateOnly = dateStr.slice(0, 10);
  if (dateOnly === today) return "Today";
  const [y, m, d] = dateOnly.split("-").map(Number);
  const localDate = new Date(y, m - 1, d);
  return localDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

/**
 * Formats a date/time string (e.g. "2026-08-27T12:05:00" or "12:05") into 12-hour am/pm time (e.g. "12:05p").
 * Preserves the exact wall-clock hour and minute without unwanted timezone shifts.
 */
export function formatTime(isoOrTime: string): string {
  if (!isoOrTime) return "";

  // If string contains 'T', extract the wall-clock time portion (HH:mm) directly
  const tIndex = isoOrTime.indexOf("T");
  if (tIndex !== -1) {
    const timePart = isoOrTime.slice(tIndex + 1);
    const [hStr, mStr] = timePart.split(":");
    const h = parseInt(hStr, 10);
    const m = (mStr || "00").slice(0, 2);
    if (!isNaN(h)) {
      const ampm = h >= 12 ? "p" : "a";
      const h12 = h % 12 === 0 ? 12 : h % 12;
      return `${h12}:${m}${ampm}`;
    }
  }

  // Handle direct "HH:mm" or "HH:mm:ss" strings
  if (isoOrTime.includes(":") && isoOrTime.length <= 8) {
    const [hStr, mStr] = isoOrTime.split(":");
    const h = parseInt(hStr, 10);
    const m = (mStr || "00").slice(0, 2);
    if (!isNaN(h)) {
      const ampm = h >= 12 ? "p" : "a";
      const h12 = h % 12 === 0 ? 12 : h % 12;
      return `${h12}:${m}${ampm}`;
    }
  }

  const d = new Date(isoOrTime);
  if (isNaN(d.getTime())) return isoOrTime;
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "p" : "a";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m}${ampm}`;
}

/**
 * Builds a clean local wall-clock ISO string (e.g. "2026-08-27T12:05:00")
 * from a date (YYYY-MM-DD) and a time (HH:mm).
 */
export function toSlotIsoString(date: string, time: string): string {
  const cleanTime = time.length === 5 ? `${time}:00` : time;
  return `${date}T${cleanTime}`;
}
