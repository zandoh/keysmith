/**
 * @zandoh/keysmith
 *
 * Keyboard shortcut manager for the web. Fast, unstyled, accessible,
 * framework agnostic.
 *
 * Work in progress; see docs/SPEC.md for the design. Currently exposes the
 * M0 layers: notation parsing, event normalization, and recognition.
 */

export { chordIsModified, firesInEditable, isEditableTarget } from "./normalize/editable";
export type { NormalizedKey } from "./normalize/event";
export { normalizeEvent } from "./normalize/event";
export type { Platform } from "./normalize/platform";
export { detectPlatform } from "./normalize/platform";
export { matchChord } from "./recognize/match";
export type { FeedResult, Matcher, MatcherEntry, MatcherOptions } from "./recognize/matcher";
export { createMatcher } from "./recognize/matcher";
export type { BaseKind, ChordMode, ParsedBinding, ParsedChord } from "./recognize/parse";
export { BindingParseError, parseBinding } from "./recognize/parse";
