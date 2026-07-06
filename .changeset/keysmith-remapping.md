---
"@zandoh/keysmith": minor
---

User remapping, introspection, and the DOM event surface.

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
