import type { Page } from "@playwright/test";

declare global {
  interface Window {
    __fired: string[];
    __prevented: [string, boolean][];
    __ready: boolean;
  }
}

export async function openFixture(page: Page, platform: "mac" | "other" = "other"): Promise<void> {
  await page.goto(`/tests/browser/fixtures/index.html?platform=${platform}`);
  await page.waitForFunction(() => window.__ready);
}

export function fired(page: Page): Promise<string[]> {
  return page.evaluate(() => window.__fired);
}

interface SyntheticKey {
  key: string;
  code?: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  isComposing?: boolean;
  modifierAltGraph?: boolean;
}

/**
 * Dispatches a constructed KeyboardEvent in the page. Used for the layout
 * matrix, where real key presses can't produce non-US (code, key) pairs.
 */
export function dispatchKey(page: Page, init: SyntheticKey): Promise<void> {
  return page.evaluate((eventInit) => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...eventInit }),
    );
  }, init);
}
