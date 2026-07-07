import { afterEach, describe, expect, it, vi } from "vitest";
import type { LayoutMap } from "../../src/manage/format";
import { formatBinding } from "../../src/manage/format";
import type { Keysmith } from "../../src/manage/keysmith";
import { createKeysmith } from "../../src/manage/keysmith";
import { getLayoutMap } from "../../src/manage/layout";
import { parseBinding } from "../../src/recognize/parse";

const instances: Keysmith[] = [];

function make() {
  const keys = createKeysmith({ platform: "other" });
  instances.push(keys);
  return keys;
}

afterEach(() => {
  for (const keys of instances.splice(0)) keys.destroy();
});

/** A fake AZERTY-ish layout map: physical KeyW prints "z". */
const azerty: LayoutMap = {
  get: (code) => ({ KeyW: "z", KeyA: "q", Digit2: "é" })[code],
};

describe("layout-aware display", () => {
  it("shows position-mode bindings in the user's layout", () => {
    const binding = parseBinding("w", "position");
    expect(formatBinding(binding, "other")).toBe("W");
    expect(formatBinding(binding, "other", azerty)).toBe("Z");
  });

  it("leaves character-mode bindings alone", () => {
    const binding = parseBinding("mod+w");
    expect(formatBinding(binding, "other", azerty)).toBe("Ctrl+W");
  });

  it("falls back to the code label for unmapped codes", () => {
    const binding = parseBinding("x", "position");
    expect(formatBinding(binding, "other", azerty)).toBe("X");
  });

  it("commands() accepts a layout map", () => {
    const keys = make();
    keys.add({ id: "move.up", keys: "w", mode: "position" });
    expect(keys.commands()[0]?.display).toBe("W");
    expect(keys.commands(azerty)[0]?.display).toBe("Z");
  });
});

describe("getLayoutMap", () => {
  it("returns null where the API is missing", async () => {
    await expect(getLayoutMap()).resolves.toBeNull();
  });

  it("resolves the map where the API exists", async () => {
    const nav = navigator as Navigator & { keyboard?: unknown };
    nav.keyboard = { getLayoutMap: () => Promise.resolve(azerty) };
    await expect(getLayoutMap()).resolves.toBe(azerty);
    delete nav.keyboard;
  });

  it("returns null when the API throws", async () => {
    const nav = navigator as Navigator & { keyboard?: unknown };
    nav.keyboard = { getLayoutMap: () => Promise.reject(new Error("denied")) };
    await expect(getLayoutMap()).resolves.toBeNull();
    delete nav.keyboard;
  });
});

describe("addAll", () => {
  it("registers a manifest and returns a remover for all of it", async () => {
    const keys = make();
    const fired = vi.fn();
    const removeAll = keys.addAll([
      { id: "a", keys: "mod+1" },
      { id: "b", keys: "mod+2" },
    ]);
    keys.on("a", fired);
    expect(keys.commands()).toHaveLength(2);

    removeAll();
    expect(keys.commands()).toHaveLength(0);
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "1", ctrlKey: true, bubbles: true, cancelable: true }),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fired).not.toHaveBeenCalled();
  });

  it("is atomic: one bad entry rolls the whole manifest back", () => {
    const keys = make();
    expect(() =>
      keys.addAll([
        { id: "good", keys: "mod+1" },
        { id: "bad", keys: "hyper+x" },
      ]),
    ).toThrow(/unknown modifier/);
    expect(keys.commands()).toHaveLength(0);
  });

  it("every command in a batch fires after the single rebuild", async () => {
    const keys = make();
    const a = vi.fn();
    const b = vi.fn();
    keys.addAll([
      { id: "one", keys: "mod+1", onTrigger: a },
      { id: "two", keys: "mod+2", onTrigger: b },
    ]);

    for (const key of ["1", "2"]) {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key, ctrlKey: true, bubbles: true, cancelable: true }),
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
  });
});
