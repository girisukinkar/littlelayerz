/**
 * Parses print time strings like "12m", "1.7h", "3h 25m" into decimal hours.
 * Examples:
 * - "12m" -> 0.2
 * - "1h 30m" -> 1.5
 * - "3h 25m" -> 3.42 (rounded to 2 decimal places)
 */
export function parsePrintTimeToHours(timeStr: string): number {
  const clean = timeStr.trim().toLowerCase().replace(/\s+/g, '');
  if (!clean) return 0;

  // 1. Matches pure minutes (e.g., "12m")
  const minutesOnly = clean.match(/^([0-9.]+)m$/);
  if (minutesOnly) {
    const mins = parseFloat(minutesOnly[1]);
    return Number((mins / 60).toFixed(4));
  }

  // 2. Matches pure hours (e.g., "1.7h", "3h")
  const hoursOnly = clean.match(/^([0-9.]+)h$/);
  if (hoursOnly) {
    return parseFloat(hoursOnly[1]) || 0;
  }

  // 3. Matches combined hours and minutes (e.g., "3h25m")
  const combined = clean.match(/^([0-9.]+)h([0-9.]+)m$/);
  if (combined) {
    const hours = parseFloat(combined[1]) || 0;
    const mins = parseFloat(combined[2]) || 0;
    return Number((hours + mins / 60).toFixed(4));
  }

  // 4. Fallback for raw numbers (treat as hours)
  const fallback = parseFloat(clean);
  return isNaN(fallback) ? 0 : fallback;
}

/**
 * Validates whether the print time string is in a correct format.
 */
export function isValidPrintTime(timeStr: string): boolean {
  const clean = timeStr.trim().toLowerCase().replace(/\s+/g, '');
  if (!clean) return false;
  
  // Format check: "12m", "1.7h", "3h25m"
  const isMins = /^([0-9.]+)m$/.test(clean);
  const isHours = /^([0-9.]+)h$/.test(clean);
  const isCombined = /^([0-9.]+)h([0-9.]+)m$/.test(clean);
  
  return isMins || isHours || isCombined;
}

/**
 * Formats a decimal hour number back to a standard string (e.g., 3.4166 -> "3h 25m")
 */
export function formatHoursToPrintTime(hours: number): string {
  if (hours <= 0) return '0m';
  
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
