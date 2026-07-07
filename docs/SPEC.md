# keysmith design spec

A keyboard shortcut manager for the web. Fast, unstyled, accessible, framework
agnostic.

Status: shipped (0.x). This spec describes the implemented design; see
[PLAN.md](./PLAN.md) for the roadmap and current milestone.

## 1. Positioning

keysmith is a shortcut _manager_, not a key _binder_. The low-level binding lane
(map a key combo to a callback) is served well by tinykeys and hotkeys-js.
keysmith deliberately sits one level up, at the layer no maintained
framework-agnostic library covers:

- named commands with stable identity, decoupled from their key bindings
- scopes, so a binding only fires in the part of the app it belongs to
- sequences (`g` then `i`) alongside chords (`mod+k`)
- conflict detection when two bindings claim the same keys in the same scope
- user remapping with serializable keymaps
- introspection: enumerate every active binding, which feeds a help overlay
- correctness on international layouts, where the incumbent libraries fail

The reference points for what tends to go wrong in this space: the historical
managers (mousetrap, react-hotkeys, keymaster) are unmaintained; the live
libraries are binders or React-only; and published audits show nearly all of
them mishandle `key` vs `code` on non-US layouts.

### Accessibility as a feature, not a checkbox

WCAG 2.1.4 (Character Key Shortcuts) requires that single-character shortcuts
be remappable or disableable. Almost no app meets this because almost no
library makes it easy. keysmith's remapping layer is that mechanism: any
binding can be remapped or disabled by the user at runtime, and the keymap
serializes for persistence. This is a first-class selling point.

## 2. Architecture

Three layers plus a dispatch surface. Lower layers are pure and independently
testable.

```
input:      KeyboardEvent
              |
layer 0:    normalize     event -> canonical key descriptor (the correctness moat)
              |
layer 1:    recognize     descriptors -> chord / sequence matches
              |
layer 2:    manage        commands, scopes, conflicts, remapping, introspection
              |
dispatch:   tsbus         handlers via bus subscription
            DOM events    optional CustomEvent("keysmith:<command>") on document
```

### Layer 0: normalization

The hard, differentiating work. One module turns a raw `KeyboardEvent` into a
canonical descriptor, dealing with everything the incumbents get wrong:

- `key` vs `code`: bindings choose character mode (matches what the key types,
  follows the user's layout) or position mode (matches the physical key,
  `KeyW` is `w` on QWERTY and `z` on AZERTY). Character mode is the default;
  position mode is opt-in per binding for spatial patterns like WASD.
- modifier canonicalization: `mod` means Meta on macOS and Control elsewhere;
  Alt/Option and AltGr are distinguished; modifier-only events never match.
- layout awareness: `KeyboardLayoutMap` (`navigator.keyboard.getLayoutMap()`)
  is used where available to display bindings in the user's layout and to
  detect layouts where a declared binding is untypeable.
- IME safety: events with `isComposing` (and keyCode 229 traffic) never match.
- dead keys and autorepeat: dead-key events are ignored; `repeat` events only
  match when a binding opts in.
- typing guard: bindings do not fire while focus is in editable context
  (inputs, textarea, contenteditable) unless the binding opts in; modifier
  chords are exempt by default since they don't insert text.

### Layer 1: recognition

- Chords: parsed from a `mod+shift+k` notation string at registration time,
  with a strict grammar and helpful parse errors.
- Sequences: space-separated steps (`g i`), matched with a rolling buffer and
  a per-sequence timeout (default 1000 ms). A sequence in progress swallows
  matching prefixes only; a non-matching key clears the buffer.
- Chord-then-sequence combinations (`mod+k mod+s`, VS Code style) are
  supported by the same buffer.

### Layer 2: management

The product. A registry of commands and bindings with:

- **Commands as identity.** A command is a stable id plus metadata
  (`description`, `group`). Bindings attach keys to commands. Remapping
  changes bindings, never command ids, so handler code and analytics are
  unaffected by user customization.
- **Scopes.** Named activation contexts (`global`, `editor`, `modal`, ...).
  A binding belongs to one scope; scopes are activated and deactivated as a
  set, not a stack, since real UIs overlap (a modal over an editor). `global`
  is always active. Scope activation is explicit; an optional element-focus
  helper ties a scope to focus-within for the common case.
- **Conflict detection.** Registering a binding that collides with an active
  binding in an overlapping scope is reported synchronously (dev-mode warning
  plus a queryable `conflicts()` API). Collisions across non-overlapping
  scopes are legal.
- **Remapping.** `remap(commandId, keys | null)` overrides or disables a
  default binding at runtime. `exportKeymap()` / `importKeymap(json)` produce
  and consume a plain serializable object for persistence. Reserved-key
  warnings (browser and assistive-technology shortcuts like `ctrl+t`,
  `alt+f4`, screen-reader keys) are surfaced at registration and remap time.
- **Introspection.** `commands()` returns every command with its active
  binding (formatted for the user's layout and platform), description, group,
  and scope. This is the data source for any help overlay or settings screen;
  keysmith itself ships no UI in the core package.

### Dispatch

Internally, matches dispatch through a tsbus instance (`@zandoh/tsbus`):
command ids are event names, scopes give them a namespace prefix, bus
priorities order multiple handlers, and wildcard patterns (`editor:*`) come
free for cross-cutting listeners.

Two consumer surfaces, same dispatch:

- `keys.on("file.save", handler)` for direct subscription (returns an
  unsubscribe, accepts `AbortSignal`).
- Optional DOM mode: `createKeysmith({ domEvents: true })` additionally
  dispatches `CustomEvent("keysmith:file.save", { cancelable: true })` on
  `document`, so any framework, web component, or inline script consumes
  shortcuts through the platform's own event system with no import.

The triggering `KeyboardEvent` default action: `preventDefault` is applied
when a binding matches, unless the binding opts out.

## 3. API sketch

```ts
import { createKeysmith } from "@zandoh/keysmith";

const keys = createKeysmith({ domEvents: true });

keys.add({
  id: "file.save",
  keys: "mod+s",
  description: "Save the current file",
  group: "File",
  onTrigger: saveFile,
});

keys.add({
  id: "go.inbox",
  keys: "g i",
  scope: "list",
  description: "Go to inbox",
});
keys.on("go.inbox", () => router.push("/inbox"));

keys.activate("list");
keys.deactivate("list");

keys.remap("file.save", "ctrl+shift+s");
keys.remap("go.inbox", null); // user disables it (WCAG 2.1.4)
localStorage.setItem("keymap", JSON.stringify(keys.exportKeymap()));

keys.commands(); // -> data for a cheatsheet / settings UI
keys.conflicts(); // -> current collisions, if any

keys.destroy(); // removes listeners, clears registry
```

Multiple instances are allowed (e.g. an embedded widget with its own manager);
each instance owns its listeners. A `target` option scopes listening to an
element instead of `window`.

## 4. Package shape

```
@zandoh/keysmith           core: normalize + recognize + manage + dispatch
```

No subpath packages ship. A `@zandoh/keysmith/cheatsheet` element was
considered and deliberately rejected (see §6); the recipe for building one from
`commands()` lives in [cheatsheet.md](./cheatsheet.md).

- Runtime dependency: `@zandoh/tsbus` and nothing else. Adding another
  requires amending this spec.
- SSR-safe: importing is side-effect free; `createKeysmith` guards on
  `typeof window`.
- Size budget (min+gzip, CI-enforced): standalone at most 5.5 kB, tsbus
  included at most 7.5 kB. (Amended from the pre-implementation 4/6 kB
  guess after measuring the real 0.3.0 surface at 4.9/6.9 kB; the revised
  numbers leave working headroom while still failing the build on bloat.)
- Works in every framework by construction; adapters (a React hook wrapper)
  are documentation examples, not packages, until demand proves otherwise.

## 5. Testing strategy

- Unit (vitest): normalization matrix (layouts, dead keys, IME, AltGr,
  modifier canonicalization) with synthetic KeyboardEvent fixtures; recognizer
  timing with fake timers; registry/scope/conflict/remap logic; keymap
  round-tripping.
- Browser (Playwright): real typing against fixture pages, including
  simulated non-US layouts, editable-context guards, sequence timeouts, and
  the DOM event surface.
- The layout-correctness claims in section 2 are the test plan; each failure
  mode documented in published audits of incumbent libraries becomes a
  regression test.

## 6. Open questions

All resolved as of 0.3.x:

- **Notation:** plain `mod` (`mod+k`, `g i`), shipped in 0.1.0. tinykeys'
  `$mod` sigil bought nothing over the strict grammar.
- **Scope model:** flat sets, shipped. No hierarchy demand has appeared;
  revisit only with a concrete case.
- **`onTrigger` in `add()`:** kept. The demo site and every quick-start
  reads better with it, and it shares the dispatch path with `on()`.
- **Cheatsheet element: not shipping.** The demo site builds a complete
  overlay from `commands()` in ~25 lines of vanilla DOM (see
  docs/cheatsheet.md for the recipe). A shipped element would reintroduce
  exactly the styling and framework surface keysmith exists to avoid;
  "no UI" stays literal.
- **Sequence timeout:** per-instance only (default 1000 ms). Per-binding
  timeouts wait for a real use case.
