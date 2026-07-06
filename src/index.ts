/**
 * @zandoh/keysmith
 *
 * Keyboard shortcut manager for the web. Fast, unstyled, accessible,
 * framework agnostic.
 *
 * See docs/SPEC.md for the design.
 */

export type { Conflict } from "./manage/conflicts";
export type {
  AddCommandOptions,
  Keysmith,
  KeysmithOptions,
  SubscribeOptions,
  TriggerHandler,
  TriggerPayload,
} from "./manage/keysmith";
export { createKeysmith } from "./manage/keysmith";
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
