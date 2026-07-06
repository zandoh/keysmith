/**
 * Display formatting for bindings: platform-aware strings for cheatsheets,
 * settings screens, and menus. macOS gets symbol runs (⌘⇧S); everywhere
 * else gets plus-joined names (Ctrl+Shift+S). Sequence steps join with a
 * space.
 */

import type { Platform } from "../normalize/platform";
import type { ParsedBinding, ParsedChord } from "../recognize/parse";

const KEY_LABELS: Record<string, string> = {
  " ": "Space",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  Escape: "Esc",
  Backspace: "⌫",
};

function keyLabel(chord: ParsedChord): string {
  const label = KEY_LABELS[chord.key];
  if (label) return label;
  if (chord.key.length === 1) return chord.key.toUpperCase();
  // Position-mode codes read better without their prefixes: KeyW -> W.
  if (chord.key.startsWith("Key") && chord.key.length === 4) return chord.key.slice(3);
  if (chord.key.startsWith("Digit") && chord.key.length === 6) return chord.key.slice(5);
  return chord.key;
}

function formatChord(chord: ParsedChord, platform: Platform): string {
  if (platform === "mac") {
    let out = "";
    if (chord.ctrl) out += "⌃";
    if (chord.alt) out += "⌥";
    if (chord.shift) out += "⇧";
    if (chord.mod || chord.meta) out += "⌘";
    return out + keyLabel(chord);
  }

  const parts: string[] = [];
  if (chord.mod || chord.ctrl) parts.push("Ctrl");
  if (chord.alt) parts.push("Alt");
  if (chord.shift) parts.push("Shift");
  if (chord.meta) parts.push("Meta");
  parts.push(keyLabel(chord));
  return parts.join("+");
}

export function formatBinding(binding: ParsedBinding, platform: Platform): string {
  return binding.chords.map((chord) => formatChord(chord, platform)).join(" ");
}
