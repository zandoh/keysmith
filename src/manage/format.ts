/**
 * Display formatting for bindings: platform-aware strings for cheatsheets,
 * settings screens, and menus. macOS gets symbol runs (⌘⇧S); everywhere
 * else gets plus-joined names (Ctrl+Shift+S). Sequence steps join with a
 * space.
 *
 * Passing a layout map (see layout.ts) makes position-mode bindings show
 * what the physical key actually prints on the user's layout: a binding on
 * KeyW displays as "Z" for an AZERTY user.
 */

import type { Platform } from "../normalize/platform";
import type { ChordMode, ParsedBinding, ParsedChord } from "../recognize/parse";

/** The subset of KeyboardLayoutMap the formatter needs. */
export interface LayoutMap {
  get(code: string): string | undefined;
}

const KEY_LABELS: Record<string, string> = {
  " ": "Space",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  Escape: "Esc",
  Backspace: "⌫",
};

function keyLabel(chord: ParsedChord, mode: ChordMode, layout: LayoutMap | null): string {
  // Position-mode keys are codes; the layout map turns them back into what
  // the key prints for this user.
  if (mode === "position" && layout) {
    const printed = layout.get(chord.key);
    if (printed) return printed.length === 1 ? printed.toUpperCase() : printed;
  }

  const label = KEY_LABELS[chord.key];
  if (label) return label;
  if (chord.key.length === 1) return chord.key.toUpperCase();
  // Without a layout map, codes read better bare: KeyW -> W.
  if (chord.key.startsWith("Key") && chord.key.length === 4) return chord.key.slice(3);
  if (chord.key.startsWith("Digit") && chord.key.length === 6) return chord.key.slice(5);
  return chord.key;
}

function formatChord(
  chord: ParsedChord,
  mode: ChordMode,
  platform: Platform,
  layout: LayoutMap | null,
): string {
  if (platform === "mac") {
    let out = "";
    if (chord.ctrl) out += "⌃";
    if (chord.alt) out += "⌥";
    if (chord.shift) out += "⇧";
    if (chord.mod || chord.meta) out += "⌘";
    return out + keyLabel(chord, mode, layout);
  }

  const parts: string[] = [];
  if (chord.mod || chord.ctrl) parts.push("Ctrl");
  if (chord.alt) parts.push("Alt");
  if (chord.shift) parts.push("Shift");
  if (chord.meta) parts.push("Meta");
  parts.push(keyLabel(chord, mode, layout));
  return parts.join("+");
}

export function formatBinding(
  binding: ParsedBinding,
  platform: Platform,
  layout: LayoutMap | null = null,
): string {
  return binding.chords
    .map((chord) => formatChord(chord, binding.mode, platform, layout))
    .join(" ");
}
