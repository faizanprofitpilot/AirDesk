/**
 * Utility functions for Vapi API interactions
 */

/**
 * Remove undefined and null values from an object
 * This is critical for Vapi PATCH requests which validate all fields
 * @param obj Object to clean
 * @returns Object with only defined, non-null values
 */
export function cleanVapiPayload<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: Partial<T> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      // Recursively clean nested objects
      if (typeof value === 'object' && !Array.isArray(value) && value.constructor === Object) {
        const cleanedNested = cleanVapiPayload(value);
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key as keyof T] = cleanedNested as T[keyof T];
        }
      } else {
        cleaned[key as keyof T] = value;
      }
    }
  }

  return cleaned;
}

/**
 * Vapi constraint: assistant name must be <= 40 characters.
 * Builds a readable name and truncates the business name portion if needed.
 */
export function buildVapiAssistantName(
  businessName: string | null | undefined,
  suffix: string
): string {
  const base = (businessName || 'AirDesk').trim();
  const sfx = suffix.trim();
  const raw = `${base} ${sfx}`.trim();
  if (raw.length <= 40) return raw;

  // Leave room for "..." plus suffix.
  const suffixWithSpace = ` ${sfx}`;
  const maxBaseLen = Math.max(0, 40 - suffixWithSpace.length - 3);
  const truncatedBase = base.slice(0, maxBaseLen).trim();
  return `${truncatedBase}...${suffixWithSpace}`.slice(0, 40);
}

