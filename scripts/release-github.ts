/**
 * Publish the GitHub Release for the current package version.
 *
 * This is the step that fires the npm-publish announcement in Discord: the
 * `release` job in .github/workflows/tonk.yml listens for `release: published`,
 * and npm/tag operations alone never emit that event. `changeset publish` only
 * pushes the package to npm, so this runs right after it as the final step of
 * `bun run release`, creating the `vX.Y.Z` tag and the Release together.
 *
 * Idempotent: if the release already exists it exits without changes, so it is
 * safe to re-run — or to run standalone (`bun scripts/release-github.ts`) to
 * backfill a release whose tag/announcement was missed.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  version: string;
};
const tag = `v${pkg.version}`;

// `gh release view` exits non-zero when the release is absent. Any success
// means it already exists, so there is nothing to publish.
try {
  execFileSync("gh", ["release", "view", tag], { stdio: "ignore" });
  console.log(`${tag} already released; nothing to do.`);
  process.exit(0);
} catch {
  // absent → fall through and create it
}

// Notes for the version being released are the commits since the previous tag,
// labelled as this tag (which does not exist yet, so `--latest` cannot be used).
const notes = execFileSync(
  "bunx",
  ["git-cliff", "--unreleased", "--tag", tag, "--strip", "header"],
  {
    encoding: "utf8",
  },
);

// Pin the tag to the exact release commit, then publish the Release — tonk.yml
// turns the resulting `release: published` event into the Discord announcement.
const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
execFileSync("gh", ["release", "create", tag, "--target", head, "--title", tag, "--notes", notes], {
  stdio: "inherit",
});

console.log(`Published GitHub release ${tag}.`);
