import { describe, expect, it } from "vitest";
import { BindingParseError, parseBinding } from "../../src/recognize/parse";

describe("chords", () => {
  it("parses a plain key", () => {
    const { chords } = parseBinding("k");
    expect(chords).toEqual([
      { key: "k", kind: "letter", mod: false, ctrl: false, alt: false, shift: false, meta: false },
    ]);
  });

  it("parses modifiers", () => {
    const { chords } = parseBinding("mod+shift+k");
    expect(chords[0]).toMatchObject({ key: "k", mod: true, shift: true, ctrl: false, meta: false });
  });

  it("accepts modifier aliases", () => {
    expect(parseBinding("control+a").chords[0]).toMatchObject({ ctrl: true });
    expect(parseBinding("option+a").chords[0]).toMatchObject({ alt: true });
    expect(parseBinding("cmd+a").chords[0]).toMatchObject({ meta: true });
    expect(parseBinding("super+a").chords[0]).toMatchObject({ meta: true });
  });

  it("is case-insensitive for modifiers and letters", () => {
    const { chords } = parseBinding("MOD+K");
    expect(chords[0]).toMatchObject({ key: "k", mod: true });
  });

  it("parses digits and symbols", () => {
    expect(parseBinding("mod+1").chords[0]).toMatchObject({ key: "1", kind: "digit" });
    expect(parseBinding("?").chords[0]).toMatchObject({ key: "?", kind: "symbol" });
    expect(parseBinding("[").chords[0]).toMatchObject({ key: "[", kind: "symbol" });
  });

  it("parses named keys and their aliases", () => {
    expect(parseBinding("enter").chords[0]).toMatchObject({ key: "Enter", kind: "named" });
    expect(parseBinding("return").chords[0]).toMatchObject({ key: "Enter" });
    expect(parseBinding("esc").chords[0]).toMatchObject({ key: "Escape" });
    expect(parseBinding("space").chords[0]).toMatchObject({ key: " " });
    expect(parseBinding("up").chords[0]).toMatchObject({ key: "ArrowUp" });
    expect(parseBinding("pagedown").chords[0]).toMatchObject({ key: "PageDown" });
  });

  it("parses function keys", () => {
    expect(parseBinding("f1").chords[0]).toMatchObject({ key: "F1", kind: "named" });
    expect(parseBinding("mod+F12").chords[0]).toMatchObject({ key: "F12", mod: true });
    expect(parseBinding("f24").chords[0]).toMatchObject({ key: "F24" });
    expect(() => parseBinding("f25")).toThrow(BindingParseError);
  });

  it("handles the plus key as a symbol via the plus alias", () => {
    expect(parseBinding("+").chords[0]).toMatchObject({ key: "+", kind: "symbol" });
    expect(parseBinding("mod+plus").chords[0]).toMatchObject({
      key: "+",
      kind: "symbol",
      mod: true,
    });
  });
});

describe("sequences", () => {
  it("parses space-separated steps", () => {
    const { chords } = parseBinding("g i");
    expect(chords).toHaveLength(2);
    expect(chords[0]).toMatchObject({ key: "g" });
    expect(chords[1]).toMatchObject({ key: "i" });
  });

  it("parses chord sequences", () => {
    const { chords } = parseBinding("mod+k mod+s");
    expect(chords[0]).toMatchObject({ key: "k", mod: true });
    expect(chords[1]).toMatchObject({ key: "s", mod: true });
  });

  it("tolerates extra whitespace", () => {
    expect(parseBinding("  g   i  ").chords).toHaveLength(2);
  });
});

describe("position mode", () => {
  it("maps letters and digits to codes", () => {
    expect(parseBinding("w", "position").chords[0]).toMatchObject({ key: "KeyW" });
    expect(parseBinding("shift+2", "position").chords[0]).toMatchObject({
      key: "Digit2",
      shift: true,
    });
  });

  it("maps named keys to codes", () => {
    expect(parseBinding("space", "position").chords[0]).toMatchObject({ key: "Space" });
    expect(parseBinding("enter", "position").chords[0]).toMatchObject({ key: "Enter" });
    expect(parseBinding("up", "position").chords[0]).toMatchObject({ key: "ArrowUp" });
  });

  it("rejects symbols, which are layout-dependent", () => {
    expect(() => parseBinding("?", "position")).toThrow(/position mode/);
  });
});

describe("parse errors", () => {
  it("rejects empty bindings", () => {
    expect(() => parseBinding("")).toThrow(/empty/);
    expect(() => parseBinding("   ")).toThrow(/empty/);
  });

  it("rejects unknown modifiers", () => {
    expect(() => parseBinding("hyper+k")).toThrow(/unknown modifier "hyper"/);
  });

  it("rejects duplicate modifiers", () => {
    expect(() => parseBinding("shift+shift+k")).toThrow(/duplicate/);
  });

  it("rejects mixing mod with ctrl or meta", () => {
    expect(() => parseBinding("mod+ctrl+k")).toThrow(/ambiguous/);
    expect(() => parseBinding("mod+cmd+k")).toThrow(/ambiguous/);
  });

  it("allows mod with alt and shift", () => {
    expect(parseBinding("mod+alt+shift+k").chords[0]).toMatchObject({
      mod: true,
      alt: true,
      shift: true,
    });
  });

  it("rejects modifier-only chords", () => {
    expect(() => parseBinding("mod")).toThrow(/needs a key/);
    expect(() => parseBinding("ctrl+shift")).toThrow(/needs a key/);
  });

  it("rejects trailing or doubled separators", () => {
    expect(() => parseBinding("mod+")).toThrow(/empty segment/);
    expect(() => parseBinding("ctrl++")).toThrow(/empty segment/);
  });

  it("rejects shift plus a symbol, pointing at the produced character", () => {
    expect(() => parseBinding("shift+/")).toThrow(/layout-dependent/);
  });

  it("rejects unknown multi-character keys", () => {
    expect(() => parseBinding("bogus")).toThrow(/unknown key "bogus"/);
  });

  it("names the offending binding in the message", () => {
    expect(() => parseBinding("mod+k hyper+j")).toThrow(/mod\+k hyper\+j/);
  });
});
