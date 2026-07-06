/**
 * Reserved-combination warnings. These chords belong to the browser, the
 * OS, or assistive technology; most cannot be intercepted at all (the
 * browser acts before or instead of the page), and binding them harms
 * users even where interception works. Registration warns, it doesn't
 * block: kiosk-style apps legitimately rebind some of these.
 */

import type { Platform } from "../normalize/platform";
import type { ParsedBinding, ParsedChord } from "../recognize/parse";
import { parseBinding } from "../recognize/parse";

/** Notation for combinations the browser or OS claims. */
const RESERVED_NOTATION = [
  "mod+w", // close tab (uninterceptable in most browsers)
  "mod+shift+w", // close window
  "mod+t", // new tab
  "mod+shift+t", // reopen tab
  "mod+n", // new window
  "mod+shift+n", // incognito/private window
  "mod+q", // quit (macOS)
  "mod+l", // focus address bar
  "alt+f4", // close window (Windows)
  "f11", // fullscreen
  "ctrl+pageup", // previous tab
  "ctrl+pagedown", // next tab
];

const tables = new Map<Platform, Map<string, string>>();

function resolveChord(chord: ParsedChord, platform: Platform): string {
  const ctrl = chord.ctrl || (chord.mod && platform !== "mac");
  const meta = chord.meta || (chord.mod && platform === "mac");
  return `${+ctrl}${+chord.alt}${+chord.shift}${+meta}:${chord.key}`;
}

function tableFor(platform: Platform): Map<string, string> {
  let table = tables.get(platform);
  if (!table) {
    table = new Map();
    for (const notation of RESERVED_NOTATION) {
      const chord = parseBinding(notation).chords[0];
      if (chord) table.set(resolveChord(chord, platform), notation);
    }
    tables.set(platform, table);
  }
  return table;
}

/**
 * Returns the reserved notation a binding collides with, or null. Only the
 * first chord matters: a reserved first step triggers the browser action
 * before any second step can arrive.
 */
export function findReserved(binding: ParsedBinding, platform: Platform): string | null {
  const first = binding.chords[0];
  if (!first) return null;
  return tableFor(platform).get(resolveChord(first, platform)) ?? null;
}
