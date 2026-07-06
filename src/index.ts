/**
 * @zandoh/keysmith
 *
 * Keyboard shortcut manager for the web. Fast, unstyled, accessible,
 * framework agnostic.
 *
 * Work in progress; see docs/SPEC.md for the design. Currently exposes the
 * binding notation parser (M0).
 */

export type { BaseKind, ChordMode, ParsedBinding, ParsedChord } from "./recognize/parse";
export { BindingParseError, parseBinding } from "./recognize/parse";
