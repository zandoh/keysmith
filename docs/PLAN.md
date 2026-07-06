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

- [x] Notation grammar and chord parser with parse errors
- [x] KeyboardEvent normalization: character vs position mode, `mod`
      canonicalization, AltGr/dead-key/IME/autorepeat handling
- [x] Sequence buffer with timeouts, chord-then-sequence support
- [x] Editable-context guard
- [x] Unit test matrix from published incumbent failure modes; CI (bun:
      check, test, build) mirroring the existing workflow setup

### M1: manager core (0.1.0)

- [ ] Command/binding registry, flat scopes with activate/deactivate
- [ ] Dispatch through @zandoh/tsbus; `on()` with unsubscribe + AbortSignal
- [ ] Conflict detection (`conflicts()`, dev warnings)
- [ ] `destroy()`, multiple instances, `target` option
- [ ] Publish 0.1.0, retiring the placeholder

### M2: remapping and the DOM surface (0.2.0)

- [x] `remap()`, disable-binding support, `exportKeymap()`/`importKeymap()`
- [x] Reserved-key warnings (browser/AT shortcuts)
- [x] Optional `domEvents` CustomEvent surface
- [x] `commands()` introspection with platform display strings
      (layout-aware display via KeyboardLayoutMap moves to M3)
- [x] Document the WCAG 2.1.4 story with a worked example (docs/remapping.md)

### M3: demo and cheatsheet decision (0.3.0)

- [x] `demo/` app: the docs site at zandoh.github.io/keysmith exercises
      sequences, remapping, and a help overlay built from `commands()`
- [x] Decide the cheatsheet-element open question: not shipping a UI
      element; the recipe lives in docs/cheatsheet.md (spec section 6)
- [x] Playwright layout matrix (AZERTY, QWERTZ AltGr, Dvorak, macOS alt
      composition, IME/dead keys) through the real browser event pipeline
- [x] Server rendering guide (docs/ssr.md) with the manifest seam, plus
      `addAll(manifest)` and layout-aware display via KeyboardLayoutMap
      (`getLayoutMap()`, `commands(layout)`)

### M4: docs and hardening (0.4.0)

- [x] Docs site live at zandoh.github.io/keysmith; README rewritten with
      badges and reference tables
- [x] Framework smoke tests: React 19 (act-driven under happy-dom), Vue 3,
      Svelte 5 (browser resolve condition), plus plain HTML via the browser
      fixture. Quirks documented in the test files themselves
- [x] Size budget enforcement in CI (scripts/size.ts against spec section 4)

### M5: toward 1.0

Criteria, each verifiable in the repo:

- [x] Layout matrix green in CI (Playwright browser job)
- [x] Size budgets green in CI (5.5 kB standalone / 7.5 kB with tsbus)
- [x] Framework smoke tests green (React, Vue, Svelte, plain HTML)
- [x] All spec open questions resolved (spec section 6)
- [x] WCAG 2.1.4 mechanism shipped and documented (docs/remapping.md)
- [x] Docs complete: spec, remapping, ssr, cheatsheet, changelog, live site
- [ ] API freeze: one full minor cycle (0.4.x) with no breaking API change
- [ ] Manual screen reader pass (VoiceOver) recorded against the demo site
- [ ] External signal: at least one real consumer or issue-driven iteration
      before calling the surface proven

When the three open boxes close, ship 1.0.0.

## Working agreements

- Conventional commits; changesets for version bumping, git-cliff for
  CHANGELOG.md and GitHub Release notes (tags: vX.Y.Z at each version commit)
- `bun run check` (oxlint, oxfmt, tsc, knip) green before every commit
- Runtime dependencies: `@zandoh/tsbus` and nothing else without a spec
  amendment
- Every normalization or recognition behavior change lands with a matching
  test in the same PR
