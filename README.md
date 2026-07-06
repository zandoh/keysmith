# keysmith

Keyboard shortcut manager for the web. Fast, unstyled, accessible, and framework
agnostic.

keysmith is a shortcut manager, not a key binder: commands have stable identity,
bindings attach keys to them, and scopes decide where they fire. Design notes in
[docs/SPEC.md](./docs/SPEC.md).

## Install

```sh
bun add @zandoh/keysmith
```

## Usage

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
keys.conflicts(); // duplicate and prefix collisions, if any

// User remapping (the WCAG 2.1.4 mechanism; see docs/remapping.md)
keys.remap("go.inbox", "g m");
keys.remap("go.inbox", null); // or disable it
localStorage.setItem("keymap", JSON.stringify(keys.exportKeymap()));

keys.commands(); // metadata + display strings ("⌘S" / "Ctrl+S") for a cheatsheet
keys.destroy();
```

Prefer no imports at the consumption site? `createKeysmith({ domEvents: true })`
also dispatches every trigger as `CustomEvent("keysmith:<id>")` on `document`.

## What it handles for you

- Chords (`mod+s`) and sequences (`g i`, `mod+k mod+s`) with timeouts
- Scopes, so bindings only fire in the part of the app they belong to
- Conflict detection when two bindings collide
- User remapping with serializable keymaps, including per-command disable —
  the WCAG 2.1.4 mechanism ([docs/remapping.md](./docs/remapping.md))
- Warnings when a binding collides with combinations the browser or OS claims
- `commands()` introspection with platform display strings, for help overlays
  and settings screens
- A typing guard: unmodified bindings don't fire while the user is typing
- Layout correctness: IME and dead keys never match, AltGr text entry is
  never stolen by ctrl+alt chords, symbols match regardless of shift,
  alt chords survive macOS character composition, and position mode keeps
  WASD-style bindings on the same physical keys across layouts

Planned next: a demo/docs site, Playwright layout matrix, and layout-aware
display strings via KeyboardLayoutMap. See [docs/PLAN.md](./docs/PLAN.md).

## License

MIT
