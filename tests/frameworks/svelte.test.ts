/**
 * Svelte 5 smoke test: keysmith created in onMount, destroyed in
 * onDestroy.
 */

import { mount, unmount } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import KeysmithHost from "./KeysmithHost.svelte";

function press(key: string, init: KeyboardEventInit = {}): void {
  window.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init }),
  );
}

async function tick(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("svelte", () => {
  it("mounts, fires, and cleans up through the component lifecycle", async () => {
    const onFire = vi.fn();

    const container = document.createElement("div");
    document.body.append(container);
    const app = mount(KeysmithHost, { target: container, props: { onFire } });
    await tick(); // onMount flush

    press("s", { ctrlKey: true });
    await tick();
    expect(onFire).toHaveBeenCalledOnce();

    await unmount(app);
    press("s", { ctrlKey: true });
    await tick();
    expect(onFire).toHaveBeenCalledOnce();
  });
});
