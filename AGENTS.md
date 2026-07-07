# AGENTS.md

Operational guide for agents and contributors working in this repo. keysmith is
a headless, framework-agnostic keyboard-shortcut manager for the web. The design
is documented in [docs/SPEC.md](./docs/SPEC.md); the roadmap in
[docs/PLAN.md](./docs/PLAN.md).

The source is layered `normalize/` → `recognize/` → `manage/`
([docs/SPEC.md §2](./docs/SPEC.md)); lower layers are pure and must not import
upward. Every normalization or recognition behavior change ships with a matching
test in the same change.

## Commands

| Purpose                                | Command                         |
| -------------------------------------- | ------------------------------- |
| Install                                | `bun install --frozen-lockfile` |
| Lint + format check + typecheck + knip | `bun run check`                 |
| Unit tests (vitest)                    | `bun run test`                  |
| Browser tests (Playwright)             | `bun run test:browser`          |
| Build (tsup)                           | `bun run build`                 |
| Size budget                            | `bun run size`                  |

The pre-commit hook runs `bun run check && bun run test`; both must pass before a
commit lands.

## Invariants that fail CI

- **Size budget** (min+gzip, enforced in CI via `bun run size` — see
  [docs/SPEC.md §4](./docs/SPEC.md)): standalone (tsbus external) ≤ **5.5 kB**;
  with tsbus bundled ≤ **7.5 kB**. Measure with `bun run size` before pushing any
  change that adds code.
- **One runtime dependency**: only `@zandoh/tsbus`. Adding another runtime
  dependency requires amending [docs/SPEC.md](./docs/SPEC.md) first
  ([docs/PLAN.md](./docs/PLAN.md), Working agreements). devDependencies are
  unrestricted.

## Commits & releases

- **Conventional Commits** for every commit (`type(scope): subject`).
- **Changesets** gate versioning, but only for **consumer-facing** changes (a fix,
  feature, or perf change in shipped `src/`). Docs-only, CI, and chore changes get
  **no changeset**. Add one with `bunx changeset` (or a file under `.changeset/`).
- **Release** runs locally: `bun run bump` (`changeset version`) to roll pending
  changesets into a version bump, then `bun run release` — which runs
  `changeset publish` (npm) and creates the `vX.Y.Z` GitHub Release
  (`scripts/release-github.ts`), the event that fires the Discord announcement.
  git-cliff generates `CHANGELOG.md` and the release notes (`bun run changelog`).

## Where things live

- `src/normalize/` — KeyboardEvent → canonical key descriptor (layout correctness).
- `src/recognize/` — notation parser, chord/sequence matcher.
- `src/manage/` — registry, scopes, conflicts, remapping, dispatch (`keysmith.ts`).
- `src/index.ts` — `createKeysmith` and public exports.
- `tests/unit/` (vitest), `tests/browser/` (Playwright), `tests/frameworks/`
  (React/Vue/Svelte smoke).
- `docs/` — SPEC, PLAN, remapping, ssr, cheatsheet.
