/**
 * Date/time formatting utilities for SSR-safe rendering.
 *
 * Prevents hydration mismatches by providing deterministic server-rendered
 * output that matches initial client hydration, then allows client-side
 * dynamic updates via useEffect.
 */

/**
 * Format date as ISO string for SSR-safe display.
 * Use in components during SSR/initial render, then optionally
 * re-format on client with locale-specific display.
 */
export function formatDateForSSR(date: Date | string | number): string {
  const d = new Date(date);
  return d.toISOString();
}

/**
 * Format date as YYYY-MM-DD for consistent SSR display.
 */
export function formatDateOnly(date: Date | string | number): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format time as HH:MM:SS for consistent SSR display.
 */
export function formatTimeOnly(date: Date | string | number): string {
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Format date and time as YYYY-MM-DD HH:MM:SS for consistent SSR display.
 */
export function formatDateTime(date: Date | string | number): string {
  return `${formatDateOnly(date)} ${formatTimeOnly(date)}`;
}

/**
 * Format relative time in a deterministic way.
 * Pass a reference timestamp to ensure server/client produce same output.
 *
 * @param date - The date to format
 * @param now - Reference "now" timestamp (use same value on server and client)
 */
export function formatRelativeTime(date: Date | string | number, now: Date | string | number): string {
  const d = new Date(date);
  const n = new Date(now);
  const diffMs = n.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
