---
"@zandoh/keysmith": patch
---

fix: a binding with `allowInEditable: false` no longer calls `preventDefault`
when it matches in an editable element, so the browser's native editing key
(e.g. Cmd/Ctrl+B) is preserved as intended.
