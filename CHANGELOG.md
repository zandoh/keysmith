# Changelog

Generated from [Conventional Commits](https://www.conventionalcommits.org)
by [git-cliff](https://git-cliff.org).

## [0.3.2] - 2026-07-07

### Bug fixes

- **conflicts:** Resolve mod to ctrl/meta before comparing bindings
- **keysmith:** Do not preventDefault when an editable-opted-out binding matches

### Performance

- **keysmith:** Rebuild the matcher once per addAll/importKeymap batch

### Documentation

- Add AGENTS.md with build, size-budget, and release invariants
- **spec:** Mark spec as shipped and drop the retired cheatsheet subpath

### CI

- **release:** Create GitHub Release as part of `bun run release`
- Cache bun store and playwright browser to speed up runs

## [0.3.1] - 2026-07-07

### Bug fixes

- **ci:** Grant contents:read so tonk can fetch discord.yml

### Refactoring

- Migrate Discord notifications to shared tonk layer

### Documentation

- Resolve all spec open questions
- Update discord.yml comment for tonk v2.1.0 brand defaults

### Testing

- Add framework smoke tests for react, vue, and svelte

### CI

- Enforce size budgets
- Notify discord of failures, recoveries, and releases
- Namespace Discord webhook secrets with TONK\_ prefix
- Migrate to tonk v2
- Run checks and tests before pages deploy and npm publish

### Maintenance

- **ci:** Add temporary encrypted secret export for tonk re-keying
- **ci:** Remove temporary secret export workflow
- **build:** Exclude sourcemaps from published package

## [0.3.0] - 2026-07-06

### Features

- Add docs site with live keysmith demo
- Add layout-aware display, addAll, ssr guide, and browser tests

### Bug fixes

- Allow @zandoh/tsbus 0.1.x

### Refactoring

- Route handler errors through the bus onError hook

### Documentation

- Professional readme pass and accurate package metadata
- **changelog:** Regenerate for 0.3.0

### Maintenance

- Generate release notes with git-cliff
- Drop redundant knip ignore for git-cliff

## [0.2.0] - 2026-07-06

### Features

- Add remapping, reserved warnings, dom events, and introspection

## [0.1.0] - 2026-07-06

### Features

- Add binding notation parser
- Add event normalization, chord matching, and sequence recognition
- Add the manager core

### Documentation

- Add design spec and build plan

### CI

- Run check, tests, and build on push and pull request

### Maintenance

- Neutralize placeholder copy
- Add test runner, changesets, and git hooks

## [0.0.0] - 2026-07-05

### Maintenance

- Scaffold @zandoh/keysmith placeholder
