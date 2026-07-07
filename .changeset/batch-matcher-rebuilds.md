---
"@zandoh/keysmith": patch
---

perf: `addAll` and `importKeymap` now rebuild the internal matcher once per
batch instead of once per entry, cutting startup cost for large command
manifests. Behavior is unchanged.
