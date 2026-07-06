# keysmith

Keyboard shortcut manager for the web. Fast, headless, accessible, framework
agnostic.

[![npm](https://img.shields.io/npm/v/%40zandoh%2Fkeysmith)](https://www.npmjs.com/package/@zandoh/keysmith)
[![ci](https://github.com/zandoh/keysmith/actions/workflows/ci.yml/badge.svg)](https://github.com/zandoh/keysmith/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/%40zandoh%2Fkeysmith)](./LICENSE)

**[Documentation and live demo](https://zandoh.github.io/keysmith/)** · [Design spec](./docs/SPEC.md) · [Roadmap](./docs/PLAN.md)

## Why keysmith

keysmith is a shortcut manager, not a key binder. Commands have stable
identity; keys attach to commands, and scopes decide where they fire.
Handlers subscribe to `file.save`, never to `mod+s`, so user remapping,
persistence, and help overlays come from the architecture instead of being
bolted on.

- Chords (`mod+s`) and sequences (`g i`, `mod+k mod+s`) in one recognizer,
  with timeouts
- Scopes with explicit activation; collisions reported at registration via
  `conflicts()`
- User remapping with serializable keymaps, including per-command disable,
  satisfying [WCAG 2.1.4](./docs/remapping.md)
- Warnings when a binding collides with combinations the browser or OS claims
- `commands()` introspection with platform display strings (`⌘S` / `Ctrl+S`)
  for cheatsheets and settings screens
- A typing guard: unmodified bindings do not fire while the user is typing
- Layout correctness (see below)
- One dependency ([`@zandoh/tsbus`](https://github.com/zandoh/tsbus)), no UI,
  works with any framework or none

## Install

```sh
npm install @zandoh/keysmith
# or: bun add / pnpm add / yarn add @zandoh/keysmith
```

## Quick start

```ts
import { createKeysmith } from "@zandoh/keysmith";

const keys = createKeysmith();

keys.add({
  id: "file.save",
  keys: "mod+s", // Meta on macOS, Control elsewhere
  description: "Save the current file",
  onTrigger: () => save(),
});

keys.add({ id: "go.inbox", keys: "g i", scope: "list" });
keys.on("go.inbox", () => router.push("/inbox"));
keys.activate("list");

// User remapping, persisted anywhere JSON goes
keys.remap("go.inbox", "g m");
localStorage.setItem("keymap", JSON.stringify(keys.exportKeymap()));

// Data for a cheatsheet: descriptions, groups, "⌘S" / "Ctrl+S"
keys.commands();
```

## Notation

| Notation                    | Meaning                                                     |
| --------------------------- | ----------------------------------------------------------- |
| `mod+s`                     | `mod` is Meta on macOS and Control elsewhere                |
| `ctrl+alt+p`                | Explicit modifiers: `ctrl`, `alt`, `shift`, `meta`          |
| `g i`                       | Sequence: `g` then `i`, within the sequence timeout         |
| `mod+k mod+s`               | Chord sequence                                              |
| `?`                         | Symbols match the produced character, with or without shift |
| `enter`, `esc`, `up`, `f5`  | Named keys                                                  |
| `w` with `mode: "position"` | Physical key (`KeyW`): stays put on AZERTY, Dvorak, etc.    |

Invalid notation throws at registration with a message that says how to fix
it, including cross-platform ambiguities like `mod+ctrl` and layout traps
like `shift+/`.

## API

| Method                                  | Purpose                                            |
| --------------------------------------- | -------------------------------------------------- |
| `add(options)`                          | Register a command binding; returns a remover      |
| `on(id, handler, opts?)`                | Subscribe to a command (`priority`, `AbortSignal`) |
| `onPattern(pattern, handler)`           | Wildcard subscription, e.g. `"editor:*"`           |
| `activate(scope)` / `deactivate(scope)` | Control where bindings fire                        |
| `remap(id, keys \| null)`               | Override or disable a binding at runtime           |
| `resetKeymap(id?)`                      | Clear one override, or all of them                 |
| `exportKeymap()` / `importKeymap(map)`  | Serialize and restore user overrides               |
| `commands()`                            | Metadata and display strings for every command     |
| `conflicts()`                           | Current duplicate and prefix collisions            |
| `destroy()`                             | Remove listeners and registrations                 |

Options on `createKeysmith`: `platform`, `target`, `sequenceTimeout`,
`onError`, and `domEvents` (dispatch each trigger as
`CustomEvent("keysmith:<id>")` on `document`, no import required at the
consumption site).

## Layout correctness

Most shortcut libraries mishandle non-US layouts. keysmith treats these as
core requirements, each covered by regression tests:

- IME composition and dead keys never match
- AltGr text entry (reported as ctrl+alt on Windows) is never stolen by
  ctrl+alt chords, and AltGr-produced symbols still match symbol bindings
- Alt chords survive macOS character composition (alt+k types "˚"; the
  binding still fires)
- Symbols match the produced character regardless of shift state
- Position mode targets physical keys for spatial layouts like WASD

## Server rendering

Importing and constructing are safe without a DOM: no listener attaches, and
the data APIs (`commands()`, `conflicts()`, keymap import/export) work
anywhere. Handlers cannot be serialized; ship command definitions as data and
attach handlers by id on the client. When rendering display strings on the
server, pass `platform` explicitly. A worked guide is planned in the
[roadmap](./docs/PLAN.md).

## Status

Pre-1.0. The API surface above is stable in shape but may still change in
detail; see the [roadmap](./docs/PLAN.md) and
[changelog](./CHANGELOG.md).

## License

[MIT](./LICENSE)
