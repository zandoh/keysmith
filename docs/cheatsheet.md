# Building a cheatsheet

keysmith ships no UI. `commands()` returns everything a help overlay or
settings screen needs, and building one is small enough that a component
would cost more in styling and framework questions than it saves. This is
the pattern the [demo site](https://zandoh.github.io/keysmith/) uses
(press `?` there to see it).

## The data

```ts
keys.commands();
// [
//   {
//     id: "file.save",
//     scope: "global",
//     description: "Save the current file",
//     group: "File",
//     keys: "mod+s",
//     defaultKeys: "mod+s",
//     isCustomized: false,
//     display: "⌘S",          // or "Ctrl+S"; null while disabled
//   },
//   ...
// ]
```

Pass a layout map to show position-mode bindings with the user's real key
labels: `keys.commands(await getLayoutMap())`.

## A complete overlay

Native `<dialog>`, no dependencies:

```html
<dialog id="cheatsheet">
  <h2>Keyboard shortcuts</h2>
  <ul id="cheatsheet-list"></ul>
</dialog>
```

```ts
import { createKeysmith, getLayoutMap } from "@zandoh/keysmith";

const keys = createKeysmith();
const dialog = document.querySelector<HTMLDialogElement>("#cheatsheet")!;
const list = document.querySelector("#cheatsheet-list")!;

keys.add({
  id: "help.show",
  keys: "?",
  description: "Keyboard shortcuts",
  onTrigger: async () => {
    const layout = await getLayoutMap();
    list.innerHTML = "";
    for (const command of keys.commands(layout)) {
      const item = document.createElement("li");
      const label = document.createElement("span");
      label.textContent = command.description ?? command.id;
      const binding = document.createElement("kbd");
      binding.textContent = command.display ?? "disabled";
      item.append(label, binding);
      list.append(item);
    }
    dialog.showModal();
  },
});
```

Group by `command.group` for sections, filter by `scope` for context-aware
sheets, and read `isCustomized` to badge remapped bindings in a settings
screen.
