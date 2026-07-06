/**
 * Binding notation parser. Turns strings like "mod+s", "g i", or
 * "mod+k mod+s" into parsed chords the recognizer matches against
 * normalized keyboard events.
 *
 * The grammar is strict on purpose: notation errors are programmer errors,
 * caught at registration time with messages that say how to fix them.
 */

export type ChordMode = "character" | "position";
export type BaseKind = "letter" | "digit" | "symbol" | "named";

export interface ParsedChord {
  /**
   * Canonical match value: a KeyboardEvent.key value in character mode
   * (lowercase for letters), a KeyboardEvent.code value in position mode.
   */
  key: string;
  kind: BaseKind;
  /** Platform primary modifier: Meta on macOS, Control elsewhere. */
  mod: boolean;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
}

export interface ParsedBinding {
  chords: ParsedChord[];
  mode: ChordMode;
}

export class BindingParseError extends Error {
  constructor(notation: string, problem: string) {
    super(`Cannot parse binding "${notation}": ${problem}`);
    this.name = "BindingParseError";
  }
}

const MODIFIER_ALIASES: Record<string, keyof ModifierFlags> = {
  mod: "mod",
  ctrl: "ctrl",
  control: "ctrl",
  alt: "alt",
  option: "alt",
  opt: "alt",
  shift: "shift",
  meta: "meta",
  cmd: "meta",
  command: "meta",
  super: "meta",
  win: "meta",
};

interface ModifierFlags {
  mod: boolean;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
}

/** Named keys, mapped to their KeyboardEvent.key values. */
const NAMED_KEYS: Record<string, string> = {
  enter: "Enter",
  return: "Enter",
  escape: "Escape",
  esc: "Escape",
  space: " ",
  tab: "Tab",
  backspace: "Backspace",
  delete: "Delete",
  del: "Delete",
  insert: "Insert",
  up: "ArrowUp",
  arrowup: "ArrowUp",
  down: "ArrowDown",
  arrowdown: "ArrowDown",
  left: "ArrowLeft",
  arrowleft: "ArrowLeft",
  right: "ArrowRight",
  arrowright: "ArrowRight",
  home: "Home",
  end: "End",
  pageup: "PageUp",
  pagedown: "PageDown",
  capslock: "CapsLock",
};

/** Named keys whose KeyboardEvent.code differs from their key value. */
const NAMED_CODES: Record<string, string> = {
  " ": "Space",
};

const FUNCTION_KEY = /^f([1-9]|1\d|2[0-4])$/;

export function parseBinding(notation: string, mode: ChordMode = "character"): ParsedBinding {
  const tokens = notation.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    throw new BindingParseError(notation, "the binding is empty");
  }
  return { chords: tokens.map((token) => parseChord(notation, token, mode)), mode };
}

function parseChord(notation: string, token: string, mode: ChordMode): ParsedChord {
  // A bare "+" is the plus key itself; anything else splits on "+".
  const parts = token === "+" ? ["+"] : token.split("+");
  if (parts.some((part) => part === "")) {
    throw new BindingParseError(
      notation,
      `"${token}" has an empty segment (for the plus key itself, write "plus")`,
    );
  }

  const flags: ModifierFlags = { mod: false, ctrl: false, alt: false, shift: false, meta: false };
  const base = parts[parts.length - 1] ?? "";

  for (const part of parts.slice(0, -1)) {
    const flag = MODIFIER_ALIASES[part.toLowerCase()];
    if (!flag) {
      throw new BindingParseError(
        notation,
        `unknown modifier "${part}" (valid: mod, ctrl, alt, shift, meta)`,
      );
    }
    if (flags[flag]) {
      throw new BindingParseError(notation, `duplicate modifier "${part}" in "${token}"`);
    }
    flags[flag] = true;
  }

  if (flags.mod && (flags.ctrl || flags.meta)) {
    throw new BindingParseError(
      notation,
      `"mod" already means Meta on macOS and Control elsewhere; combining it with ctrl or meta is ambiguous across platforms`,
    );
  }

  const lower = base.toLowerCase();
  if (MODIFIER_ALIASES[lower]) {
    throw new BindingParseError(
      notation,
      `"${token}" is only modifiers; every chord needs a key (e.g. "${token}+k")`,
    );
  }

  const resolved = resolveBase(notation, base, lower);

  if (resolved.kind === "symbol" && flags.shift) {
    throw new BindingParseError(
      notation,
      `"shift+${resolved.key}" is layout-dependent; bind the character the keystroke produces instead (e.g. "?" rather than "shift+/")`,
    );
  }

  const key = mode === "position" ? toCode(notation, resolved) : resolved.key;
  return { key, kind: resolved.kind, ...flags };
}

interface ResolvedBase {
  key: string;
  kind: BaseKind;
}

function resolveBase(notation: string, base: string, lower: string): ResolvedBase {
  // "+" is the chord separator, so the plus key needs a name. It stays a
  // symbol (not a named key): its position and shift state vary by layout.
  if (lower === "plus") return { key: "+", kind: "symbol" };

  const named = NAMED_KEYS[lower];
  if (named !== undefined) return { key: named, kind: "named" };

  if (FUNCTION_KEY.test(lower)) return { key: lower.toUpperCase(), kind: "named" };

  if (base.length === 1) {
    if (/[a-z]/.test(lower)) return { key: lower, kind: "letter" };
    if (/\d/.test(base)) return { key: base, kind: "digit" };
    return { key: base, kind: "symbol" };
  }

  throw new BindingParseError(notation, `unknown key "${base}"`);
}

function toCode(notation: string, resolved: ResolvedBase): string {
  switch (resolved.kind) {
    case "letter":
      return `Key${resolved.key.toUpperCase()}`;
    case "digit":
      return `Digit${resolved.key}`;
    case "named":
      return NAMED_CODES[resolved.key] ?? resolved.key;
    case "symbol":
      throw new BindingParseError(
        notation,
        `"${resolved.key}" cannot be used in position mode; symbol positions vary by layout, use character mode`,
      );
  }
}
