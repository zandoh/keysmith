# Server rendering

keysmith is safe to import and construct without a DOM, and its data flows
are designed to cross the server/client boundary as plain JSON. This guide
covers what runs where, and the pattern for isomorphic apps.

## What is safe on the server

- **Importing** has no side effects.
- **`createKeysmith()`** attaches no listener when `window` is missing; the
  instance still works as a data structure.
- **Data APIs** run anywhere: `add`/`addAll` (registration and validation),
  `commands()`, `conflicts()`, `exportKeymap()`/`importKeymap()`,
  `formatBinding()`.
- Generated ids are counter-based, not random, so output is deterministic.

What can never cross the wire is the live instance itself: it holds handler
functions and, on the client, a listener. That is true of any event-emitting
object, and it is why the boundary below is data, not the instance.

## The pattern: manifest + handlers by id + keymap

Command definitions minus their handlers are plain JSON. Ship them as data
and attach behavior on the client, keyed by command id — which is how
keysmith handlers work anyway.

**Shared or server module** — the manifest:

```ts
// commands.ts — safe to import anywhere, no handlers
import type { AddCommandOptions } from "@zandoh/keysmith";

export const COMMANDS: AddCommandOptions[] = [
  { id: "file.save", keys: "mod+s", description: "Save", group: "File" },
  { id: "go.inbox", keys: "g i", scope: "list", description: "Go to inbox" },
];
```

**Server** — validate, render, and load per-user state:

```ts
import { createKeysmith } from "@zandoh/keysmith";
import { COMMANDS } from "./commands";

// Platform from a client hint so display strings are right ("⌘S" vs "Ctrl+S")
const platform = request.headers.get("sec-ch-ua-platform")?.includes("macOS") ? "mac" : "other";

const keys = createKeysmith({ platform });
keys.addAll(COMMANDS);
keys.importKeymap(await loadUserKeymap(userId)); // per-user overrides from the DB

const cheatsheet = keys.commands(); // JSON-safe: render it statically
```

**Client** — same manifest, live handlers:

```ts
import { createKeysmith } from "@zandoh/keysmith";
import { COMMANDS } from "./commands";

const keys = createKeysmith();
keys.addAll(COMMANDS);
keys.importKeymap(serverProvidedKeymap);

keys.on("file.save", () => save());
keys.on("go.inbox", () => router.push("/inbox"));
```

Handlers subscribe to ids, so the client wiring never mentions keys, and
user remaps applied on either side change nothing in application code.

## Notes

- **Platform is captured at construction.** A server-constructed instance
  without an explicit `platform` reports `"other"`. Pass the
  `Sec-CH-UA-Platform` hint (as above) when server-rendering display
  strings; on the client, detection is automatic.
- **Layout-aware display is client-only.** `getLayoutMap()` resolves the
  user's real layout in Chromium and returns null elsewhere, including on
  servers; `commands(layout)` falls back to code-derived labels.
- **Keymaps are the user-state channel.** `exportKeymap()` output is a flat
  JSON object, equally at home in localStorage, a cookie, or a database
  row. `importKeymap` skips stale ids from older manifests, so old saved
  keymaps stay loadable across deployments.
- **Passing the instance around on the client** (module singleton, context,
  DI) is fine; instances are plain objects with `destroy()` for teardown.
