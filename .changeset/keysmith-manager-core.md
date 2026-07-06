---
"@zandoh/keysmith": minor
---

First functional release: the manager core on top of the M0 recognition stack.

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
