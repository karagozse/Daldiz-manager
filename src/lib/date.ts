/**
 * Date formatting utilities
 */

/**
 * Format a date value to dd.MM.yyyy format (e.g., 15.01.2026)
 * @param value - Date string, Date object, or null/undefined
 * @returns Formatted date string or "-" if invalid
 */
export function formatDateDisplay(value?: string | Date | null): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "-";
  
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  
  return `${day}.${month}.${year}`;
}

/** Format time as HH:mm from a Date (e.g. 14:35). */
export function formatTime(value?: string | Date | null): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "";
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

/** Format as "dd.MM.yyyy HH:mm" for draft card title (date from entry.date, time from entry.createdAt). */
export function formatDateWithTime(date?: string | Date | null, timeSource?: string | Date | null): string {
  const datePart = formatDateDisplay(date);
  const timePart = formatTime(timeSource);
  if (datePart === "-" && !timePart) return "-";
  return timePart ? `${datePart} ${timePart}` : datePart;
}

/**
 * Format a date value to dd.MM.yyyy format for Turkish locale (e.g., 20.01.2026)
 * Returns empty string if value is null/undefined, otherwise returns formatted date
 * @param value - Date string, Date object, or null/undefined
 * @returns Formatted date string or empty string if invalid/null
 */
export function formatDateForTR(value?: string | Date | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "";
  
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  
  return `${day}.${month}.${year}`;
}

/**
 * Format a date value to dd.MM.yyyy format for Turkish locale (e.g., 20.01.2026)
 * Returns empty string if value is null/undefined, otherwise returns formatted date
 * @param value - Date string, Date object, or null/undefined
 * @returns Formatted date string or empty string if invalid/null
 */
export function formatDateTR(value?: string | Date | null): string {
  if (!value) return "";
  
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  
  return `${day}.${month}.${year}`;
}
