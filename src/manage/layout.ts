/**
 * Access to the browser's KeyboardLayoutMap (Chromium only). Used to
 * display position-mode bindings in the user's actual layout; everything
 * degrades to code-derived labels where the API is missing.
 */

import type { LayoutMap } from "./format";

interface KeyboardApi {
  keyboard?: { getLayoutMap?: () => Promise<LayoutMap> };
}

/**
 * Resolves the current keyboard layout map, or null where the API doesn't
 * exist (Firefox, Safari, servers). Never throws.
 */
export async function getLayoutMap(): Promise<LayoutMap | null> {
  if (typeof navigator === "undefined") return null;
  const keyboard = (navigator as Navigator & KeyboardApi).keyboard;
  if (!keyboard?.getLayoutMap) return null;
  try {
    return await keyboard.getLayoutMap();
  } catch {
    return null;
  }
}
