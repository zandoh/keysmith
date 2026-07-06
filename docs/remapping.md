# Remapping and WCAG 2.1.4

WCAG 2.1.4 (Character Key Shortcuts, Level A) requires that any shortcut
implemented with only letter, punctuation, number, or symbol keys can be
turned off or remapped by the user. Most apps fail this because their
shortcut layer has no remapping mechanism. keysmith's keymap layer is that
mechanism.

## Worked example

Register commands as usual. Single-character bindings like `j` or `?` are
exactly the ones WCAG 2.1.4 covers:

```ts
import { createKeysmith } from "@zandoh/keysmith";

const keys = createKeysmith();

keys.add({ id: "list.next", keys: "j", scope: "list", description: "Next item" });
keys.add({ id: "list.prev", keys: "k", scope: "list", description: "Previous item" });
keys.add({ id: "help.show", keys: "?", description: "Keyboard help" });
```

Load the user's saved keymap at startup:

```ts
const saved = localStorage.getItem("keymap");
if (saved) keys.importKeymap(JSON.parse(saved));
```

In a settings screen, let the user remap or disable any command, then
persist. `commands()` supplies everything the screen needs to render:

```ts
// User changes "Next item" to "n":
keys.remap("list.next", "n");

// User turns single-key shortcuts off entirely:
keys.remap("list.next", null);
keys.remap("list.prev", null);

localStorage.setItem("keymap", JSON.stringify(keys.exportKeymap()));
```

Handlers never change: they subscribe to the command id, not the keys.
`resetKeymap()` restores defaults; `exportKeymap()` returns only the
overrides, so an empty object means "all defaults".

## Notes

- Disabling is `remap(id, null)`; it also removes the binding from
  conflict detection.
- `importKeymap` skips unknown command ids (stale entries from older app
  versions) and invalid notation, with a console warning, rather than
  failing wholesale.
- Registration warns when a binding collides with combinations the
  browser or OS claims (`mod+w`, `f11`, and similar), which remapping UIs
  should surface to the user.
