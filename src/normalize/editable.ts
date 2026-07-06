/**
 * Editable-context detection and the default typing-guard policy: bindings
 * without real modifiers do not fire while the user is typing.
 */

import type { ParsedBinding, ParsedChord } from "../recognize/parse";

/** Input types that don't accept text and therefore don't block shortcuts. */
const NON_TEXT_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;

  if (target instanceof HTMLInputElement) {
    return !NON_TEXT_INPUT_TYPES.has(target.type) && !target.readOnly && !target.disabled;
  }
  if (target instanceof HTMLTextAreaElement) {
    return !target.readOnly && !target.disabled;
  }
  if (target instanceof HTMLSelectElement) {
    return !target.disabled;
  }
  if (target instanceof HTMLElement) {
    const attr = target.getAttribute("contenteditable");
    return target.isContentEditable || attr === "" || attr === "true";
  }
  return false;
}

/**
 * Shift alone doesn't count as a modifier here: shift+letter still types
 * text, so only ctrl/alt/meta/mod chords are exempt from the typing guard.
 */
export function chordIsModified(chord: ParsedChord): boolean {
  return chord.mod || chord.ctrl || chord.alt || chord.meta;
}

/**
 * Default policy for whether a binding fires while focus is in an editable
 * element: an explicit per-binding override wins, otherwise every step of
 * the binding must carry a real modifier.
 */
export function firesInEditable(binding: ParsedBinding, override?: boolean): boolean {
  return override ?? binding.chords.every(chordIsModified);
}
