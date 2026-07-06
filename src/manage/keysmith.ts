/**
 * The manager: commands, scopes, conflicts, and dispatch. Keyboard input is
 * normalized and recognized by the M0 layers; matches dispatch through a
 * tsbus instance where command ids are event names namespaced by scope
 * ("editor:indent"), bus priorities order handlers, and wildcard patterns
 * ("editor:*") serve cross-cutting listeners.
 */

import { createEventBus } from "@zandoh/tsbus";
import { firesInEditable, isEditableTarget } from "../normalize/editable";
import { normalizeEvent } from "../normalize/event";
import type { Platform } from "../normalize/platform";
import { detectPlatform } from "../normalize/platform";
import type { Matcher, MatcherEntry } from "../recognize/matcher";
import { createMatcher } from "../recognize/matcher";
import type { ChordMode, ParsedBinding } from "../recognize/parse";
import { parseBinding } from "../recognize/parse";
import type { Conflict, ConflictCandidate } from "./conflicts";
import { findConflict, findConflicts } from "./conflicts";
import { formatBinding } from "./format";
import { findReserved } from "./reserved";

export interface TriggerPayload {
  commandId: string;
  scope: string;
  /** The keydown that completed the binding. */
  event: KeyboardEvent;
}

export type TriggerHandler = (payload: TriggerPayload) => void | Promise<void>;

export interface AddCommandOptions {
  /** Stable command identity, e.g. "file.save". No colons or whitespace. */
  id: string;
  /** Binding notation: "mod+s", "g i", "mod+k mod+s". */
  keys: string;
  /** Activation scope; "global" is always active. */
  scope?: string;
  /** "character" (default) matches what keys type; "position" matches physical keys. */
  mode?: ChordMode;
  description?: string;
  group?: string;
  /** Fire on autorepeat keydowns (default false). */
  allowRepeat?: boolean;
  /** Override the typing guard (default: modifier chords only). */
  allowInEditable?: boolean;
  /** Call preventDefault on the completing keydown (default true). */
  preventDefault?: boolean;
  /** Convenience handler, equivalent to on(id, handler). */
  onTrigger?: TriggerHandler;
}

export interface SubscribeOptions {
  /** Higher runs earlier among handlers of the same command. */
  priority?: number;
  signal?: AbortSignal;
}

export interface KeysmithOptions {
  /** Overrides platform detection for `mod` resolution. */
  platform?: Platform;
  /** Event target to listen on (default window). */
  target?: Window | Document | HTMLElement;
  /** Milliseconds allowed between sequence steps (default 1000). */
  sequenceTimeout?: number;
  /** Receives handler errors (default console.error). */
  onError?: (error: unknown) => void;
  /**
   * Also dispatch each trigger as CustomEvent("keysmith:<id>") on document,
   * before bus handlers run; calling preventDefault on it vetoes them.
   */
  domEvents?: boolean;
}

/** A keymap: command ids mapped to override notation, or null for disabled. */
export type Keymap = Record<string, string | null>;

export interface CommandInfo {
  id: string;
  scope: string;
  description: string | undefined;
  group: string | undefined;
  /** Active notation, null while disabled by the user. */
  keys: string | null;
  defaultKeys: string;
  /** True when a remap or disable is in effect. */
  isCustomized: boolean;
  /** Platform-formatted active binding ("⌘S" / "Ctrl+S"), null if disabled. */
  display: string | null;
}

export interface Keysmith {
  /** Register a command binding. Returns a function that removes it. */
  add: (options: AddCommandOptions) => () => void;
  /** Subscribe to a registered command. Returns an unsubscribe function. */
  on: (commandId: string, handler: TriggerHandler, options?: SubscribeOptions) => () => void;
  /** Subscribe across commands with a wildcard, e.g. "editor:*" or "*". */
  onPattern: (pattern: string, handler: TriggerHandler, options?: SubscribeOptions) => () => void;
  activate: (scope: string) => void;
  deactivate: (scope: string) => void;
  /**
   * Override a command's keys at runtime, or disable it with null — the
   * WCAG 2.1.4 mechanism. Command identity and handlers are unaffected.
   */
  remap: (commandId: string, keys: string | null) => void;
  /** Clear one command's override, or every override. */
  resetKeymap: (commandId?: string) => void;
  /** Current overrides as a plain serializable object. */
  exportKeymap: () => Keymap;
  /** Apply a saved keymap; unknown ids and invalid notation are skipped. */
  importKeymap: (keymap: Keymap) => void;
  /** Every command with its active binding, for cheatsheets and settings. */
  commands: () => CommandInfo[];
  /** Current duplicate/prefix collisions among registered bindings. */
  conflicts: () => Conflict[];
  /** Remove all listeners and registrations. */
  destroy: () => void;
}

interface Registration {
  id: string;
  scope: string;
  /** The default (registered) notation and binding; overrides sit beside them. */
  keys: string;
  binding: ParsedBinding;
  override: { keys: string | null; binding: ParsedBinding | null } | null;
  mode: ChordMode;
  description: string | undefined;
  group: string | undefined;
  scopedEvent: string;
  allowRepeat: boolean;
  allowInEditable: boolean | undefined;
  preventDefault: boolean;
  removeTrigger?: () => void;
}

function activeKeys(reg: Registration): string | null {
  return reg.override ? reg.override.keys : reg.keys;
}

function activeBinding(reg: Registration): ParsedBinding | null {
  return reg.override ? reg.override.binding : reg.binding;
}

const ID_PATTERN = /^[^\s:]+$/;

function validateName(kind: "command id" | "scope", value: string): void {
  if (!ID_PATTERN.test(value)) {
    throw new Error(`keysmith: invalid ${kind} "${value}" (no colons or whitespace)`);
  }
}

/** Conflict candidate from a registration's ACTIVE binding; null if disabled. */
function candidateOf(reg: Registration): ConflictCandidate | null {
  const binding = activeBinding(reg);
  const keys = activeKeys(reg);
  if (!binding || keys === null) return null;
  return { id: reg.id, scope: reg.scope, keys, binding };
}

function subscribe(unsubscribe: () => void, signal?: AbortSignal): () => void {
  if (signal) {
    if (signal.aborted) {
      unsubscribe();
      return () => {};
    }
    signal.addEventListener("abort", unsubscribe, { once: true });
  }
  return unsubscribe;
}

export function createKeysmith(options: KeysmithOptions = {}): Keysmith {
  const platform = options.platform ?? detectPlatform();
  const reportError = options.onError ?? ((error: unknown) => console.error(error));
  const bus = createEventBus<Record<string, TriggerPayload>>();

  // Every handler crosses the bus wrapped, so sync throws and async
  // rejections reach onError regardless of the bus's own error policy.
  function guard(handler: TriggerHandler): (payload: TriggerPayload) => void {
    return (payload) => {
      try {
        const result = handler(payload);
        if (result instanceof Promise) result.catch(reportError);
      } catch (error) {
        reportError(error);
      }
    };
  }
  const registrations = new Map<string, Registration>();
  const activeScopes = new Set<string>(["global"]);

  let matcher: Matcher<Registration> = createMatcher([], { platform });
  let destroyed = false;

  const target = options.target ?? (typeof window === "undefined" ? undefined : (window as Window));

  function rebuildMatcher(): void {
    const entries: MatcherEntry<Registration>[] = [];
    for (const reg of registrations.values()) {
      if (!activeScopes.has(reg.scope)) continue;
      const binding = activeBinding(reg);
      if (!binding) continue; // disabled via remap(id, null)
      entries.push({ binding, data: reg, allowRepeat: reg.allowRepeat });
    }
    matcher = createMatcher(entries, { platform, timeout: options.sequenceTimeout });
  }

  function warnReserved(id: string, binding: ParsedBinding): void {
    const reserved = findReserved(binding, platform);
    if (reserved) {
      console.warn(
        `keysmith: "${id}" binds "${reserved}", which the browser or OS may claim before the page sees it`,
      );
    }
  }

  function warnConflictsWith(reg: Registration): void {
    const candidate = candidateOf(reg);
    if (!candidate) return;
    for (const existing of registrations.values()) {
      if (existing === reg) continue;
      const other = candidateOf(existing);
      if (!other) continue;
      const conflict = findConflict(other, candidate);
      if (conflict) {
        console.warn(
          `keysmith: "${conflict.commandIds[0]}" (${conflict.keys[0]}) and ` +
            `"${conflict.commandIds[1]}" (${conflict.keys[1]}) collide (${conflict.kind}); ` +
            `see conflicts()`,
        );
      }
    }
  }

  function onKeydown(event: Event): void {
    if (!(event instanceof KeyboardEvent)) return;
    const k = normalizeEvent(event);
    if (!k) return;

    const result = matcher.feed(k, Date.now());
    const editable = isEditableTarget(event.target);
    const fired = editable
      ? result.matched.filter((reg) => firesInEditable(reg.binding, reg.allowInEditable))
      : result.matched;

    // Mid-sequence modifier chords ("mod+k" of "mod+k mod+s") also suppress
    // the browser default; unmodified sequence steps like "g" stay typeable.
    const prevent =
      fired.some((reg) => reg.preventDefault) ||
      (fired.length === 0 && result.advanced && (k.ctrl || k.alt || k.meta));
    if (prevent) event.preventDefault();

    for (const reg of fired) {
      const payload: TriggerPayload = { commandId: reg.id, scope: reg.scope, event };

      // The DOM surface fires first; preventDefault on it vetoes handlers.
      if (options.domEvents && typeof document !== "undefined") {
        const domEvent = new CustomEvent(`keysmith:${reg.id}`, {
          detail: payload,
          bubbles: true,
          cancelable: true,
        });
        if (!document.dispatchEvent(domEvent)) continue;
      }

      void bus.emit(reg.scopedEvent, payload);
    }
  }

  target?.addEventListener("keydown", onKeydown);

  function assertAlive(): void {
    if (destroyed) throw new Error("keysmith: this instance has been destroyed");
  }

  function add(commandOptions: AddCommandOptions): () => void {
    assertAlive();
    const { id, scope = "global" } = commandOptions;
    validateName("command id", id);
    validateName("scope", scope);
    if (registrations.has(id)) {
      throw new Error(`keysmith: command "${id}" is already registered`);
    }

    const mode = commandOptions.mode ?? "character";
    const binding = parseBinding(commandOptions.keys, mode);
    const reg: Registration = {
      id,
      scope,
      keys: commandOptions.keys,
      binding,
      override: null,
      mode,
      description: commandOptions.description,
      group: commandOptions.group,
      scopedEvent: `${scope}:${id}`,
      allowRepeat: commandOptions.allowRepeat ?? false,
      allowInEditable: commandOptions.allowInEditable,
      preventDefault: commandOptions.preventDefault ?? true,
    };

    warnReserved(id, binding);

    if (commandOptions.onTrigger) {
      reg.removeTrigger = bus.on(reg.scopedEvent, guard(commandOptions.onTrigger));
    }

    registrations.set(id, reg);
    warnConflictsWith(reg);
    rebuildMatcher();

    return () => {
      const current = registrations.get(id);
      if (current !== reg) return;
      reg.removeTrigger?.();
      registrations.delete(id);
      rebuildMatcher();
    };
  }

  function on(
    commandId: string,
    handler: TriggerHandler,
    subscribeOptions?: SubscribeOptions,
  ): () => void {
    assertAlive();
    const reg = registrations.get(commandId);
    if (!reg) {
      throw new Error(`keysmith: unknown command "${commandId}" (add it before subscribing)`);
    }
    const unsubscribe = bus.on(reg.scopedEvent, guard(handler), {
      priority: subscribeOptions?.priority,
    });
    return subscribe(unsubscribe, subscribeOptions?.signal);
  }

  function onPattern(
    pattern: string,
    handler: TriggerHandler,
    subscribeOptions?: SubscribeOptions,
  ): () => void {
    assertAlive();
    const guarded = guard(handler);
    const unsubscribe = bus.onPattern(pattern, (payload) => guarded(payload as TriggerPayload), {
      priority: subscribeOptions?.priority,
    });
    return subscribe(unsubscribe, subscribeOptions?.signal);
  }

  function activate(scope: string): void {
    assertAlive();
    validateName("scope", scope);
    activeScopes.add(scope);
    rebuildMatcher();
  }

  function deactivate(scope: string): void {
    assertAlive();
    if (scope === "global") throw new Error('keysmith: the "global" scope cannot be deactivated');
    activeScopes.delete(scope);
    rebuildMatcher();
  }

  function remap(commandId: string, keys: string | null): void {
    assertAlive();
    const reg = registrations.get(commandId);
    if (!reg) throw new Error(`keysmith: unknown command "${commandId}"`);

    if (keys === null) {
      reg.override = { keys: null, binding: null };
    } else {
      const binding = parseBinding(keys, reg.mode);
      reg.override = { keys, binding };
      warnReserved(commandId, binding);
      warnConflictsWith(reg);
    }
    rebuildMatcher();
  }

  function resetKeymap(commandId?: string): void {
    assertAlive();
    if (commandId !== undefined) {
      const reg = registrations.get(commandId);
      if (!reg) throw new Error(`keysmith: unknown command "${commandId}"`);
      reg.override = null;
    } else {
      for (const reg of registrations.values()) reg.override = null;
    }
    rebuildMatcher();
  }

  function exportKeymap(): Keymap {
    const keymap: Keymap = {};
    for (const reg of registrations.values()) {
      if (reg.override) keymap[reg.id] = reg.override.keys;
    }
    return keymap;
  }

  function importKeymap(keymap: Keymap): void {
    assertAlive();
    for (const [id, keys] of Object.entries(keymap)) {
      if (!registrations.has(id)) continue; // stale entry from an older app version
      try {
        remap(id, keys);
      } catch (error) {
        console.warn(`keysmith: skipping keymap entry for "${id}"`, error);
      }
    }
  }

  function commands(): CommandInfo[] {
    return [...registrations.values()].map((reg) => {
      const binding = activeBinding(reg);
      return {
        id: reg.id,
        scope: reg.scope,
        description: reg.description,
        group: reg.group,
        keys: activeKeys(reg),
        defaultKeys: reg.keys,
        isCustomized: reg.override !== null,
        display: binding ? formatBinding(binding, platform) : null,
      };
    });
  }

  function conflicts(): Conflict[] {
    return findConflicts([...registrations.values()].map(candidateOf).filter((c) => c !== null));
  }

  function destroy(): void {
    if (destroyed) return;
    destroyed = true;
    target?.removeEventListener("keydown", onKeydown);
    for (const reg of registrations.values()) reg.removeTrigger?.();
    registrations.clear();
    bus.offAll();
    matcher.reset();
  }

  return {
    add,
    on,
    onPattern,
    activate,
    deactivate,
    remap,
    resetKeymap,
    exportKeymap,
    importKeymap,
    commands,
    conflicts,
    destroy,
  };
}
