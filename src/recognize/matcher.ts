/**
 * The recognizer: feeds normalized events through a set of bindings and
 * reports matches, tracking multi-chord sequence progress with a timeout.
 *
 * Overlap note: a single-chord binding fires immediately even if the same
 * key starts a longer sequence ("g" fires while "g i" is pending). That
 * overlap is reported as a conflict at registration time by the manager
 * rather than resolved with matching delays here.
 */

import type { NormalizedKey } from "../normalize/event";
import type { Platform } from "../normalize/platform";
import { matchChord } from "./match";
import type { ParsedBinding } from "./parse";

export interface MatcherEntry<T> {
  binding: ParsedBinding;
  data: T;
  /** Match autorepeat keydowns (default false). */
  allowRepeat?: boolean;
}

export interface FeedResult<T> {
  matched: T[];
  /** True while at least one multi-chord sequence is partially entered. */
  pending: boolean;
}

export interface MatcherOptions {
  platform: Platform;
  /** Milliseconds allowed between sequence steps (default 1000). */
  timeout?: number;
}

export interface Matcher<T> {
  /** Feed one normalized event; `now` is a millisecond timestamp. */
  feed: (k: NormalizedKey, now: number) => FeedResult<T>;
  reset: () => void;
}

interface Progress<T> {
  entry: MatcherEntry<T>;
  index: number;
}

export function createMatcher<T>(
  entries: readonly MatcherEntry<T>[],
  options: MatcherOptions,
): Matcher<T> {
  const timeout = options.timeout ?? 1000;
  let progress: Progress<T>[] = [];
  let lastAt = 0;

  function feed(k: NormalizedKey, now: number): FeedResult<T> {
    if (progress.length > 0 && now - lastAt > timeout) progress = [];
    lastAt = now;

    const matched: T[] = [];
    const next: Progress<T>[] = [];

    // Advance in-flight sequences.
    for (const p of progress) {
      if (k.repeat && !p.entry.allowRepeat) {
        // Autorepeat neither advances nor clears a pending sequence.
        next.push(p);
        continue;
      }
      const chord = p.entry.binding.chords[p.index];
      if (chord && matchChord(chord, p.entry.binding.mode, k, options.platform)) {
        if (p.index === p.entry.binding.chords.length - 1) {
          matched.push(p.entry.data);
        } else {
          next.push({ entry: p.entry, index: p.index + 1 });
        }
      }
      // A non-matching step drops the candidate: the buffer only holds
      // sequences the typed keys still prefix.
    }

    // Start fresh candidates from the first chord of every binding.
    for (const entry of entries) {
      if (k.repeat && !entry.allowRepeat) continue;
      const first = entry.binding.chords[0];
      if (!first || !matchChord(first, entry.binding.mode, k, options.platform)) continue;
      if (entry.binding.chords.length === 1) {
        matched.push(entry.data);
      } else {
        next.push({ entry, index: 1 });
      }
    }

    progress = next;
    return { matched, pending: progress.length > 0 };
  }

  function reset(): void {
    progress = [];
  }

  return { feed, reset };
}
