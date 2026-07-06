# @zandoh/keysmith

## 0.2.0

### Minor Changes

- 64e6c8a: User remapping, introspection, and the DOM event surface.

  - `remap(commandId, keys | null)` with per-command disable, `resetKeymap()`,
    and `exportKeymap()`/`importKeymap()` for persistence — the WCAG 2.1.4
    mechanism (see docs/remapping.md)
  - Reserved-combination warnings at add and remap time (`mod+w`, `f11`, and
    friends)
  - `commands()` introspection: metadata, active vs default keys, and
    platform display strings ("⌘S" / "Ctrl+S")
  - `createKeysmith({ domEvents: true })` dispatches each trigger as
    `CustomEvent("keysmith:<id>")` on document before handlers run;
    preventDefault on it vetoes them
  - `formatBinding()` exported for custom cheatsheet rendering

## 0.1.0

### Minor Changes

- 6bf35e5: First functional release: the manager core on top of the M0 recognition stack.

  - `createKeysmith()` with command registry, flat scopes, and `destroy()`
  - Chord and sequence notation (`mod+s`, `g i`, `mod+k mod+s`) with strict
    parse errors
  - `on()` subscription with unsubscribe, `AbortSignal`, and priority;
    wildcard patterns via `onPattern()`
  - Registration-time conflict detection (`conflicts()`) for duplicate and
    prefix collisions
  - Typing guard, autorepeat opt-in, per-binding `preventDefault` control
  - Layout correctness: IME/dead-key filtering, AltGr protection, macOS alt
    composition fallback, shift-agnostic symbols, position mode
