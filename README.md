# keysmith

Hotkey and shortcut manager for the web. Fast, unstyled, accessible, and framework
agnostic.

This is a name-reservation release. There is no usable API yet. Design notes
live in [docs/SPEC.md](./docs/SPEC.md).

## Planned

- Chords and sequences: `mod+k`, or Gmail-style `g` then `i`
- Scopes, so a shortcut only fires in the part of the app it belongs to
- Conflict detection when two bindings claim the same keys
- A generated cheatsheet overlay listing every active shortcut
- Sane behavior while text inputs are focused

Ships as web components, so it works the same in React, Vue, Svelte, or plain HTML.

## Install

```sh
bun add @zandoh/keysmith
```

## License

MIT
