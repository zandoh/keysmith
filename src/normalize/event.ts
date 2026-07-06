/**
 * KeyboardEvent normalization: the single place raw events become matchable
 * descriptors, and the single place events that must never match are
 * filtered out (IME composition, dead keys, bare modifier presses).
 */

export interface NormalizedKey {
  /** KeyboardEvent.key, lowercased for single characters. */
  key: string;
  /** KeyboardEvent.code: the physical key, for position-mode matching. */
  code: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
  /**
   * AltGr state. On Windows layouts AltGr reports as ctrl+alt, which is
   * text entry, not a chord; the matcher uses this to avoid stealing it.
   */
  altGraph: boolean;
  repeat: boolean;
}

/** Keys that are modifiers themselves and never match as a chord base. */
const MODIFIER_KEYS = new Set([
  "Control",
  "Alt",
  "Shift",
  "Meta",
  "AltGraph",
  "Fn",
  "FnLock",
  "Hyper",
  "Super",
  "Symbol",
  "SymbolLock",
]);

/**
 * Returns a matchable descriptor, or null for events that must never match:
 * IME composition traffic, dead keys, unidentified keys, and modifier-only
 * presses (so holding shift mid-sequence doesn't clear the buffer).
 */
export function normalizeEvent(event: KeyboardEvent): NormalizedKey | null {
  // Some browsers report IME traffic with keyCode 229 without setting
  // isComposing; both checks are required in practice.
  if (event.isComposing || event.keyCode === 229) return null;

  const key = event.key;
  if (key === "Dead" || key === "Unidentified" || MODIFIER_KEYS.has(key)) return null;

  return {
    key: key.length === 1 ? key.toLowerCase() : key,
    code: event.code,
    ctrl: event.ctrlKey,
    alt: event.altKey,
    shift: event.shiftKey,
    meta: event.metaKey,
    altGraph: event.getModifierState?.("AltGraph") ?? false,
    repeat: event.repeat,
  };
}
