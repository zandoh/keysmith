import { describe, expect, it } from "vitest";
import { normalizeEvent } from "../../src/normalize/event";
import { detectPlatform } from "../../src/normalize/platform";

/** Duck-typed KeyboardEvent so every field is deterministic. */
function kbd(partial: Record<string, unknown>): KeyboardEvent {
  return {
    key: "",
    code: "",
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    repeat: false,
    isComposing: false,
    keyCode: 0,
    getModifierState: () => false,
    ...partial,
  } as unknown as KeyboardEvent;
}

describe("normalizeEvent", () => {
  it("normalizes a plain key press", () => {
    const k = normalizeEvent(kbd({ key: "k", code: "KeyK" }));
    expect(k).toMatchObject({ key: "k", code: "KeyK", ctrl: false, repeat: false });
  });

  it("lowercases single-character keys so shift+K and K compare equal", () => {
    const k = normalizeEvent(kbd({ key: "K", code: "KeyK", shiftKey: true }));
    expect(k).toMatchObject({ key: "k", shift: true });
  });

  it("leaves named keys and symbols untouched", () => {
    expect(normalizeEvent(kbd({ key: "Enter", code: "Enter" }))).toMatchObject({ key: "Enter" });
    expect(normalizeEvent(kbd({ key: "?", code: "Slash" }))).toMatchObject({ key: "?" });
  });

  it("filters IME composition traffic (incumbent failure mode)", () => {
    expect(normalizeEvent(kbd({ key: "a", isComposing: true }))).toBeNull();
    // Some browsers report keyCode 229 without setting isComposing.
    expect(normalizeEvent(kbd({ key: "Process", keyCode: 229 }))).toBeNull();
  });

  it("filters dead keys (incumbent failure mode)", () => {
    expect(normalizeEvent(kbd({ key: "Dead", code: "BracketLeft" }))).toBeNull();
    expect(normalizeEvent(kbd({ key: "Unidentified" }))).toBeNull();
  });

  it("filters bare modifier presses so they never clear a sequence", () => {
    for (const key of ["Control", "Alt", "Shift", "Meta", "AltGraph"]) {
      expect(normalizeEvent(kbd({ key }))).toBeNull();
    }
  });

  it("captures AltGr state via getModifierState", () => {
    const k = normalizeEvent(
      kbd({
        key: "€",
        code: "KeyE",
        ctrlKey: true,
        altKey: true,
        getModifierState: (name: string) => name === "AltGraph",
      }),
    );
    expect(k).toMatchObject({ key: "€", altGraph: true, ctrl: true, alt: true });
  });

  it("passes the repeat flag through", () => {
    expect(normalizeEvent(kbd({ key: "j", repeat: true }))).toMatchObject({ repeat: true });
  });
});

describe("detectPlatform", () => {
  it("detects mac-family platforms", () => {
    expect(detectPlatform({ platform: "MacIntel" } as Navigator)).toBe("mac");
    expect(detectPlatform({ platform: "iPhone" } as Navigator)).toBe("mac");
  });

  it("defaults to other", () => {
    expect(detectPlatform({ platform: "Win32" } as Navigator)).toBe("other");
    expect(detectPlatform(undefined)).toBe("other");
  });
});
