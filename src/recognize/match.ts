/**
 * Chord matching: one normalized event against one parsed chord. This is
 * where the layout-correctness rules live.
 */

import type { NormalizedKey } from "../normalize/event";
import type { Platform } from "../normalize/platform";
import type { ChordMode, ParsedChord } from "./parse";

export function matchChord(
  chord: ParsedChord,
  mode: ChordMode,
  k: NormalizedKey,
  platform: Platform,
): boolean {
  const wantCtrl = chord.ctrl || (chord.mod && platform !== "mac");
  const wantMeta = chord.meta || (chord.mod && platform === "mac");

  // AltGr reports as ctrl+alt on Windows layouts. A chord requiring both is
  // indistinguishable from text entry there, so it never matches while
  // AltGr is down; the user is typing, not chording.
  if (k.altGraph && wantCtrl && chord.alt) return false;

  if (!keyMatches(chord, mode, k)) return false;

  if (chord.kind === "symbol") {
    // A symbol character encodes its own shift state, and under AltGr the
    // ctrl/alt flags were consumed producing it. Only the remaining
    // modifiers are compared.
    if (k.altGraph) return k.meta === wantMeta;
    return k.ctrl === wantCtrl && k.alt === chord.alt && k.meta === wantMeta;
  }

  return (
    k.ctrl === wantCtrl && k.alt === chord.alt && k.shift === chord.shift && k.meta === wantMeta
  );
}

function keyMatches(chord: ParsedChord, mode: ChordMode, k: NormalizedKey): boolean {
  if (mode === "position") return k.code === chord.key;

  if (k.key === chord.key) return true;

  // macOS composes alt+letter into a different character (alt+k types "˚"),
  // so alt chords over letters and digits fall back to the physical key.
  if (chord.alt && (chord.kind === "letter" || chord.kind === "digit")) {
    return k.code === positionOf(chord);
  }
  return false;
}

function positionOf(chord: ParsedChord): string {
  return chord.kind === "digit" ? `Digit${chord.key}` : `Key${chord.key.toUpperCase()}`;
}
