import { expect, test } from "@playwright/test";
import { fired, openFixture } from "./helpers";

test("chords fire from real key presses", async ({ page }) => {
  await openFixture(page);
  await page.keyboard.press("Control+s");
  expect(await fired(page)).toContain("save");
});

test("plain keys without modifiers don't match chords", async ({ page }) => {
  await openFixture(page);
  await page.keyboard.press("s");
  expect(await fired(page)).not.toContain("save");
});

test("sequences fire from real typing", async ({ page }) => {
  await openFixture(page);
  await page.keyboard.press("g");
  await page.keyboard.press("i");
  expect(await fired(page)).toContain("inbox");
});

test("sequences time out between steps", async ({ page }) => {
  await openFixture(page);
  await page.keyboard.press("g");
  await page.waitForTimeout(1300);
  await page.keyboard.press("i");
  expect(await fired(page)).not.toContain("inbox");
});

test("holding shift mid-sequence doesn't clear progress", async ({ page }) => {
  await openFixture(page);
  await page.keyboard.press("g");
  await page.keyboard.down("Shift");
  await page.keyboard.up("Shift");
  await page.keyboard.press("i");
  expect(await fired(page)).toContain("inbox");
});

test("typing guard blocks plain bindings in inputs, allows opted-in ones", async ({ page }) => {
  await openFixture(page);
  const input = page.locator("#text-input");
  await input.focus();

  await page.keyboard.press("j");
  await page.keyboard.press("Escape");

  const events = await fired(page);
  expect(events).not.toContain("down");
  expect(events).toContain("escape.ok");
  await expect(input).toHaveValue("j"); // the keystroke actually typed
});

test("matching keydowns are defaultPrevented, others aren't", async ({ page }) => {
  await openFixture(page);
  await page.keyboard.press("Control+s");
  await page.keyboard.press("x");

  const prevented = await page.evaluate(() => window.__prevented);
  expect(prevented).toContainEqual(["s", true]);
  expect(prevented).toContainEqual(["x", false]);
});

test("mod resolves to Meta on mac", async ({ page }) => {
  await openFixture(page, "mac");
  await page.keyboard.press("Meta+s");
  expect(await fired(page)).toContain("save");

  await page.keyboard.press("Control+s");
  expect(await fired(page)).toHaveLength(1); // ctrl+s is not mod+s on mac
});
