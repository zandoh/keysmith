/**
 * Registration-time conflict detection. Two bindings conflict when their
 * scopes can be active together (same scope, or either is global) and one's
 * key sequence duplicates or prefixes the other's. Prefix overlap matters
 * because the recognizer fires single-chord matches immediately: binding
 * both "g" and "g i" means "g" always fires.
 */

import type { Platform } from "../normalize/platform";
import type { ParsedBinding, ParsedChord } from "../recognize/parse";
import { resolveMod } from "../recognize/parse";

export interface ConflictCandidate {
  id: string;
  scope: string;
  keys: string;
  binding: ParsedBinding;
}

export interface Conflict {
  kind: "duplicate" | "prefix";
  commandIds: [string, string];
  scopes: [string, string];
  keys: [string, string];
}

function scopesOverlap(a: string, b: string): boolean {
  return a === b || a === "global" || b === "global";
}

function serializeChord(chord: ParsedChord, platform: Platform): string {
  // Resolve `mod` to concrete ctrl/meta before comparing, so "mod+s" and
  // "ctrl+s" (which fire on the same keystroke off macOS) serialize alike.
  const { ctrl, meta } = resolveMod(chord, platform);
  return `${+ctrl}${+chord.alt}${+chord.shift}${+meta}:${chord.key}`;
}

function serialize(binding: ParsedBinding, platform: Platform): string[] {
  return binding.chords.map((chord) => `${binding.mode}|${serializeChord(chord, platform)}`);
}

export function findConflict(
  a: ConflictCandidate,
  b: ConflictCandidate,
  platform: Platform,
): Conflict | null {
  if (!scopesOverlap(a.scope, b.scope)) return null;

  const sa = serialize(a.binding, platform);
  const sb = serialize(b.binding, platform);
  const shared = Math.min(sa.length, sb.length);
  for (let i = 0; i < shared; i++) {
    if (sa[i] !== sb[i]) return null;
  }

  return {
    kind: sa.length === sb.length ? "duplicate" : "prefix",
    commandIds: [a.id, b.id],
    scopes: [a.scope, b.scope],
    keys: [a.keys, b.keys],
  };
}

export function findConflicts(
  candidates: readonly ConflictCandidate[],
  platform: Platform,
): Conflict[] {
  const conflicts: Conflict[] = [];
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i];
      const b = candidates[j];
      if (!a || !b) continue;
      const conflict = findConflict(a, b, platform);
      if (conflict) conflicts.push(conflict);
    }
  }
  return conflicts;
}
