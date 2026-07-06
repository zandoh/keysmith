import { describe, expect, it } from "vitest";
import type { NormalizedKey } from "../../src/normalize/event";
import { matchChord } from "../../src/recognize/match";
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

function chordOf(notation: string, mode: "character" | "position" = "character") {
  const binding = parseBinding(notation, mode);
  const chord = binding.chords[0];
  if (!chord) throw new Error("no chord");
  return chord;
}

describe("mod resolution", () => {
  it("mod means meta on mac", () => {
    const chord = chordOf("mod+s");
    expect(matchChord(chord, "character", key({ key: "s", meta: true }), "mac")).toBe(true);
    expect(matchChord(chord, "character", key({ key: "s", ctrl: true }), "mac")).toBe(false);
  });

  it("mod means ctrl elsewhere", () => {
    const chord = chordOf("mod+s");
    expect(matchChord(chord, "character", key({ key: "s", ctrl: true }), "other")).toBe(true);
    expect(matchChord(chord, "character", key({ key: "s", meta: true }), "other")).toBe(false);
  });
});

describe("modifier strictness", () => {
  it("extra modifiers prevent a match", () => {
    const chord = chordOf("ctrl+s");
    expect(
      matchChord(chord, "character", key({ key: "s", ctrl: true, shift: true }), "other"),
    ).toBe(false);
  });

  it("missing modifiers prevent a match", () => {
    const chord = chordOf("ctrl+shift+s");
    expect(matchChord(chord, "character", key({ key: "s", ctrl: true }), "other")).toBe(false);
  });
});

describe("symbols and layouts (incumbent failure modes)", () => {
  it("symbols ignore shift: '?' needs shift on US but not on all layouts", () => {
    const chord = chordOf("?");
    expect(matchChord(chord, "character", key({ key: "?", shift: true }), "other")).toBe(true);
    expect(matchChord(chord, "character", key({ key: "?", shift: false }), "other")).toBe(true);
  });

  it("symbols produced with AltGr match despite ctrl+alt being reported", () => {
    // German layout: AltGr+7 produces "{", reported as ctrl+alt on Windows.
    const chord = chordOf("{");
    const k = key({ key: "{", ctrl: true, alt: true, altGraph: true });
    expect(matchChord(chord, "character", k, "other")).toBe(true);
  });

  it("ctrl+alt chords never steal AltGr text entry", () => {
    // European layouts: AltGr+E types "€"; a ctrl+alt+e binding must not fire.
    const chord = chordOf("ctrl+alt+e");
    const k = key({ key: "€", code: "KeyE", ctrl: true, alt: true, altGraph: true });
    expect(matchChord(chord, "character", k, "other")).toBe(false);
  });

  it("alt+letter matches by physical key where alt composes characters", () => {
    // macOS: alt+k types "˚"; the chord still matches via the code.
    const chord = chordOf("alt+k");
    expect(matchChord(chord, "character", key({ key: "˚", code: "KeyK", alt: true }), "mac")).toBe(
      true,
    );
  });

  it("position mode matches the physical key across layouts", () => {
    // AZERTY: the physical KeyW position types "z".
    const chord = chordOf("w", "position");
    expect(matchChord(chord, "position", key({ key: "z", code: "KeyW" }), "other")).toBe(true);
    expect(matchChord(chord, "position", key({ key: "w", code: "KeyZ" }), "other")).toBe(false);
  });
});

describe("named keys", () => {
  it("matches named keys with exact modifiers", () => {
    const chord = chordOf("mod+enter");
    expect(matchChord(chord, "character", key({ key: "Enter", meta: true }), "mac")).toBe(true);
    expect(matchChord(chord, "character", key({ key: "Enter" }), "mac")).toBe(false);
  });

  it("matches space via its key value", () => {
    const chord = chordOf("space");
    expect(matchChord(chord, "character", key({ key: " ", code: "Space" }), "other")).toBe(true);
  });
});
