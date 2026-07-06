import { describe, expect, it } from "vitest";
import type { NormalizedKey } from "../../src/normalize/event";
import type { MatcherEntry } from "../../src/recognize/matcher";
import { createMatcher } from "../../src/recognize/matcher";
import { parseBinding } from "../../src/recognize/parse";

function key(partial: Partial<NormalizedKey> & { key: string }): NormalizedKey {
  return {
    code: "",
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
    altGraph: false,
    repeat: false,
    ...partial,
  };
}

function entry(notation: string, data: string, allowRepeat = false): MatcherEntry<string> {
  return { binding: parseBinding(notation), data, allowRepeat };
}

describe("single chords", () => {
  it("matches immediately", () => {
    const m = createMatcher([entry("mod+s", "save")], { platform: "other" });
    const result = m.feed(key({ key: "s", ctrl: true }), 0);
    expect(result.matched).toEqual(["save"]);
    expect(result.pending).toBe(false);
  });

  it("reports every binding the chord satisfies", () => {
    const m = createMatcher([entry("mod+s", "a"), entry("mod+s", "b")], { platform: "other" });
    expect(m.feed(key({ key: "s", ctrl: true }), 0).matched).toEqual(["a", "b"]);
  });
});

describe("sequences", () => {
  it("matches a two-step sequence", () => {
    const m = createMatcher([entry("g i", "inbox")], { platform: "other" });
    const first = m.feed(key({ key: "g" }), 0);
    expect(first.matched).toEqual([]);
    expect(first.pending).toBe(true);

    const second = m.feed(key({ key: "i" }), 100);
    expect(second.matched).toEqual(["inbox"]);
    expect(second.pending).toBe(false);
  });

  it("matches chord sequences", () => {
    const m = createMatcher([entry("mod+k mod+s", "keyboard settings")], { platform: "other" });
    m.feed(key({ key: "k", ctrl: true }), 0);
    expect(m.feed(key({ key: "s", ctrl: true }), 200).matched).toEqual(["keyboard settings"]);
  });

  it("a non-matching key clears progress", () => {
    const m = createMatcher([entry("g i", "inbox")], { platform: "other" });
    m.feed(key({ key: "g" }), 0);
    const wrong = m.feed(key({ key: "x" }), 100);
    expect(wrong.pending).toBe(false);
    expect(m.feed(key({ key: "i" }), 200).matched).toEqual([]);
  });

  it("times out between steps", () => {
    const m = createMatcher([entry("g i", "inbox")], { platform: "other" });
    m.feed(key({ key: "g" }), 0);
    expect(m.feed(key({ key: "i" }), 1500).matched).toEqual([]);
  });

  it("honors a custom timeout", () => {
    const m = createMatcher([entry("g i", "inbox")], { platform: "other", timeout: 3000 });
    m.feed(key({ key: "g" }), 0);
    expect(m.feed(key({ key: "i" }), 2500).matched).toEqual(["inbox"]);
  });

  it("tracks sequences sharing a prefix independently", () => {
    const m = createMatcher([entry("g i", "inbox"), entry("g h", "home")], { platform: "other" });
    const first = m.feed(key({ key: "g" }), 0);
    expect(first.pending).toBe(true);
    expect(m.feed(key({ key: "h" }), 100).matched).toEqual(["home"]);
  });

  it("restarts a prefix mid-sequence", () => {
    const m = createMatcher([entry("g i", "inbox")], { platform: "other" });
    m.feed(key({ key: "g" }), 0);
    m.feed(key({ key: "g" }), 100); // failed step, but starts a fresh prefix
    expect(m.feed(key({ key: "i" }), 200).matched).toEqual(["inbox"]);
  });

  it("resets on demand", () => {
    const m = createMatcher([entry("g i", "inbox")], { platform: "other" });
    m.feed(key({ key: "g" }), 0);
    m.reset();
    expect(m.feed(key({ key: "i" }), 100).matched).toEqual([]);
  });
});

describe("autorepeat", () => {
  it("ignores repeats unless a binding opts in", () => {
    const m = createMatcher([entry("j", "down"), entry("k", "up", true)], { platform: "other" });
    expect(m.feed(key({ key: "j", repeat: true }), 0).matched).toEqual([]);
    expect(m.feed(key({ key: "k", repeat: true }), 100).matched).toEqual(["up"]);
  });

  it("a held key neither advances nor clears a pending sequence", () => {
    const m = createMatcher([entry("g i", "inbox")], { platform: "other" });
    m.feed(key({ key: "g" }), 0);
    const held = m.feed(key({ key: "g", repeat: true }), 100);
    expect(held.pending).toBe(true);
    expect(m.feed(key({ key: "i" }), 200).matched).toEqual(["inbox"]);
  });
});
