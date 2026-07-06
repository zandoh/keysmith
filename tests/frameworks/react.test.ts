/**
 * React 19 smoke test: keysmith created in an effect, destroyed on
 * unmount, no framework-specific code needed in between.
 */

import { act, createElement, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createKeysmith } from "../../src";

// React's scheduler flushes via MessageChannel, which never fires under
// happy-dom; act() drives the work queue synchronously instead.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

describe("react", () => {
  it("mounts, fires, and cleans up through the component lifecycle", async () => {
    const onFire = vi.fn();

    function App(): null {
      useEffect(() => {
        const keys = createKeysmith({ platform: "other" });
        keys.add({ id: "save", keys: "mod+s", onTrigger: onFire });
        return () => keys.destroy();
      }, []);
      return null;
    }

    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(App));
    });

    press("s", { ctrlKey: true });
    await tick();
    expect(onFire).toHaveBeenCalledOnce();

    await act(async () => {
      root.unmount();
    });
    press("s", { ctrlKey: true });
    await tick();
    expect(onFire).toHaveBeenCalledOnce(); // destroyed with the component
  });
});
