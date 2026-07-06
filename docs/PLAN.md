# keysmith build plan

Companion to [SPEC.md](./SPEC.md). Milestones are vertical slices; each ships
something demoable and keeps `main` green (build, lint, tests, size budget).

## Target repo layout

```
src/
  normalize/    keyboard-event -> canonical descriptor; layout map handling
  recognize/    chord parser, sequence buffer, notation grammar
  manage/       registry, scopes, conflicts, remapping, introspection
  dispatch/     tsbus wiring, DOM CustomEvent surface
  index.ts      createKeysmith + public types
tests/
  unit/         vitest: normalization matrix, recognizer, registry
  browser/      playwright: real typing, layouts, editable guards
demo/           vite app dogfooding the manager; becomes the docs site
docs/           SPEC.md, PLAN.md, API docs as they land
```

## Milestones

### M0: normalization and recognition (0.0.x)

The correctness moat, proven before any manager exists.

- [ ] Notation grammar and chord parser with parse errors
- [ ] KeyboardEvent normalization: character vs position mode, `mod`
      canonicalization, AltGr/dead-key/IME/autorepeat handling
- [ ] Sequence buffer with timeouts, chord-then-sequence support
- [ ] Editable-context guard
- [ ] Unit test matrix from published incumbent failure modes; CI (bun:
      check, test, build) mirroring the existing workflow setup

### M1: manager core (0.1.0)

- [ ] Command/binding registry, flat scopes with activate/deactivate
- [ ] Dispatch through @zandoh/tsbus; `on()` with unsubscribe + AbortSignal
- [ ] Conflict detection (`conflicts()`, dev warnings)
- [ ] `destroy()`, multiple instances, `target` option
- [ ] Publish 0.1.0, retiring the placeholder

### M2: remapping and the DOM surface (0.2.0)

- [ ] `remap()`, disable-binding support, `exportKeymap()`/`importKeymap()`
- [ ] Reserved-key warnings (browser/AT shortcuts)
- [ ] Optional `domEvents` CustomEvent surface
- [ ] `commands()` introspection with layout-aware display strings
- [ ] Document the WCAG 2.1.4 story with a worked example

### M3: demo and cheatsheet decision (0.3.0)

- [ ] `demo/` app: a small keyboard-driven UI exercising scopes, sequences,
      remapping, and a help overlay built from `commands()`
- [ ] Decide the cheatsheet-element open question with that experience
- [ ] Playwright layout matrix (QWERTY, AZERTY, QWERTZ, Dvorak samples)

### M4: docs and hardening (0.4.0)

- [ ] Docs site from the demo; README rewrite with live examples
- [ ] Framework smoke tests (React, Vue, Svelte, plain HTML)
- [ ] Size budget enforcement in CI

### M5: toward 1.0

- [ ] API freeze; 1.0 criteria: layout matrix green, zero known a11y issues,
      budgets green, docs complete

## Working agreements

- Conventional commits; changesets for versioning and publishing
- `bun run check` (oxlint, oxfmt, tsc, knip) green before every commit
- Runtime dependencies: `@zandoh/tsbus` and nothing else without a spec
  amendment
- Every normalization or recognition behavior change lands with a matching
  test in the same PR
