---
"@zandoh/keysmith": patch
---

fix: `conflicts()` now detects collisions between `mod` bindings and their
resolved equivalents (`mod+s` vs `ctrl+s` on non-mac, `mod+s` vs `meta+s` on
mac), matching the runtime matcher's `mod` resolution.
