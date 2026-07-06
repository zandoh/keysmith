/**
 * Vue 3 smoke test: keysmith created in onMounted, destroyed in
 * onBeforeUnmount.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, onBeforeUnmount, onMounted } from "vue";
import type { Keysmith } from "../../src";
import { createKeysmith } from "../../src";

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

describe("vue", () => {
  it("mounts, fires, and cleans up through the component lifecycle", async () => {
    const onFire = vi.fn();

    const App = defineComponent({
      setup() {
        let keys: Keysmith | undefined;
        onMounted(() => {
          keys = createKeysmith({ platform: "other" });
          keys.add({ id: "save", keys: "mod+s", onTrigger: onFire });
        });
        onBeforeUnmount(() => keys?.destroy());
        return () => null;
      },
    });

    const container = document.createElement("div");
    document.body.append(container);
    const app = createApp(App);
    app.mount(container);

    press("s", { ctrlKey: true });
    await tick();
    expect(onFire).toHaveBeenCalledOnce();

    app.unmount();
    press("s", { ctrlKey: true });
    await tick();
    expect(onFire).toHaveBeenCalledOnce();
  });
});
