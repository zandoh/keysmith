# @zandoh/keysmith

> Fast, unstyled, accessible hotkey & shortcut manager — framework-agnostic web components.

🚧 **Work in progress.** This is an early `0.0.0` placeholder to reserve the name while the real API is being forged. Not ready for use yet.

## The idea

A keyboard-shortcut engine in the [`cmdk`](https://github.com/pacocoursey/cmdk) spirit — **fast, unstyled, accessible** — but shipped as framework-agnostic web components so it drops into React, Vue, Svelte, or plain HTML alike.

Planned:

- **Chords & sequences** — `mod+k`, or Gmail-style `g` then `i`
- **Scopes / contexts** — shortcuts that only fire in the right place
- **Conflict detection** — catch two bindings fighting over the same keys
- **Auto-generated cheatsheet** — a `?` overlay of every active shortcut, for free
- **Respects typing** — never hijacks keys while an input is focused

## Install

```sh
bun add @zandoh/keysmith
```

---

Part of the `@zandoh` workbench. Built with a wrench and a bit of gnomish engineering. 🔧
