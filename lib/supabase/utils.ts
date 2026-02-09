/**
 * Normalizes Supabase join results that may be returned as arrays or single objects.
 *
 * Due to TypeScript's inference with Supabase queries, joined relations can sometimes
 * be typed as arrays when they should be single objects. This helper safely extracts
 * the first item if an array is provided, or returns the object as-is.
 *
 * @param data - The join result from Supabase (may be T, T[], null, or undefined)
 * @returns The normalized single object or null
 *
 * @example
 * const chapter = normalizeJoin(meeting.chapters);
 * const user = normalizeJoin(attendance.users);
 */
export function normalizeJoin<T>(data: T | T[] | null | undefined): T | null {
  if (!data) return null;
  return Array.isArray(data) ? data[0] : data;
}
