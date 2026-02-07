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
