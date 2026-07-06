/**
 * The layout matrix: synthetic (code, key) pairs as real international
 * layouts produce them, dispatched through the browser's event pipeline.
 * Each case is a documented failure mode of incumbent shortcut libraries.
 */

import { expect, test } from "@playwright/test";
import { dispatchKey, fired, openFixture } from "./helpers";

test("AZERTY: position mode fires on the physical key (KeyW prints z)", async ({ page }) => {
  await openFixture(page);
  await dispatchKey(page, { key: "z", code: "KeyW" });
  expect(await fired(page)).toContain("pos.w");
});

test("AZERTY: position mode ignores the character's new location", async ({ page }) => {
  await openFixture(page);
  // The character "w" lives on KeyZ for AZERTY users; pos.w must not fire.
  await dispatchKey(page, { key: "w", code: "KeyZ" });
  expect(await fired(page)).not.toContain("pos.w");
});

test("Dvorak: position mode fires where the finger is, not the letter", async ({ page }) => {
  await openFixture(page);
  await dispatchKey(page, { key: ",", code: "KeyW" }); // Dvorak KeyW prints ","
  expect(await fired(page)).toContain("pos.w");
});

test("QWERTZ: AltGr symbols match despite reported ctrl+alt", async ({ page }) => {
  await openFixture(page);
  // AltGr+7 prints "{" on German layouts; Windows reports ctrl+alt down.
  await dispatchKey(page, {
    key: "{",
    code: "Digit7",
    ctrlKey: true,
    altKey: true,
    modifierAltGraph: true,
  });
  expect(await fired(page)).toContain("brace");
});

test("AltGr text entry is never stolen by ctrl+alt chords", async ({ page }) => {
  await openFixture(page);
  // AltGr+E prints "€" on many European layouts; the ctrl+alt+e binding
  // must not swallow it.
  await dispatchKey(page, {
    key: "€",
    code: "KeyE",
    ctrlKey: true,
    altKey: true,
    modifierAltGraph: true,
  });
  expect(await fired(page)).not.toContain("combo");
});

test("real ctrl+alt chords still fire without AltGr", async ({ page }) => {
  await openFixture(page);
  await dispatchKey(page, { key: "e", code: "KeyE", ctrlKey: true, altKey: true });
  expect(await fired(page)).toContain("combo");
});

test("macOS: alt chords survive character composition (alt+k prints ˚)", async ({ page }) => {
  await openFixture(page, "mac");
  await dispatchKey(page, { key: "˚", code: "KeyK", altKey: true });
  expect(await fired(page)).toContain("alt.k");
});

test("IME composition never matches", async ({ page }) => {
  await openFixture(page);
  await dispatchKey(page, { key: "s", code: "KeyS", ctrlKey: true, isComposing: true });
  expect(await fired(page)).not.toContain("save");
});

test("dead keys never match", async ({ page }) => {
  await openFixture(page);
  await dispatchKey(page, { key: "Dead", code: "BracketLeft" });
  expect(await fired(page)).toHaveLength(0);
});
