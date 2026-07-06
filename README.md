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
keys.destroy();
```

## What it handles for you

- Chords (`mod+s`) and sequences (`g i`, `mod+k mod+s`) with timeouts
- Scopes, so bindings only fire in the part of the app they belong to
- Conflict detection when two bindings collide
- A typing guard: unmodified bindings don't fire while the user is typing
- Layout correctness: IME and dead keys never match, AltGr text entry is
  never stolen by ctrl+alt chords, symbols match regardless of shift,
  alt chords survive macOS character composition, and position mode keeps
  WASD-style bindings on the same physical keys across layouts

Planned next: user remapping with serializable keymaps (the WCAG 2.1.4
mechanism), reserved-key warnings, DOM CustomEvent dispatch, and introspection
for help overlays. See [docs/PLAN.md](./docs/PLAN.md).

## License

MIT
