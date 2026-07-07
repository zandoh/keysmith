import { afterEach, describe, expect, it, vi } from "vitest";
import type { Keysmith } from "../../src/manage/keysmith";
import { createKeysmith } from "../../src/manage/keysmith";

const instances: Keysmith[] = [];

function make(options: Parameters<typeof createKeysmith>[0] = {}) {
  const keys = createKeysmith({ platform: "other", ...options });
  instances.push(keys);
  return keys;
}

function press(
  key: string,
  init: KeyboardEventInit = {},
  target: EventTarget = window,
): KeyboardEvent {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

afterEach(() => {
  for (const keys of instances.splice(0)) keys.destroy();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("commands and dispatch", () => {
  it("fires onTrigger for a matching chord", async () => {
    const onTrigger = vi.fn();
    make().add({ id: "file.save", keys: "mod+s", onTrigger });

    press("s", { ctrlKey: true });
    await flush();

    expect(onTrigger).toHaveBeenCalledOnce();
    expect(onTrigger.mock.calls[0]?.[0]).toMatchObject({ commandId: "file.save", scope: "global" });
  });

  it("does not fire without the right modifiers", async () => {
    const onTrigger = vi.fn();
    make().add({ id: "file.save", keys: "mod+s", onTrigger });

    press("s");
    await flush();
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it("fires sequences", async () => {
    const onTrigger = vi.fn();
    make().add({ id: "go.inbox", keys: "g i", onTrigger });

    press("g");
    press("i");
    await flush();
    expect(onTrigger).toHaveBeenCalledOnce();
  });

  it("supports on() subscription with unsubscribe", async () => {
    const keys = make();
    keys.add({ id: "file.save", keys: "mod+s" });
    const handler = vi.fn();
    const unsubscribe = keys.on("file.save", handler);

    press("s", { ctrlKey: true });
    await flush();
    expect(handler).toHaveBeenCalledOnce();

    unsubscribe();
    press("s", { ctrlKey: true });
    await flush();
    expect(handler).toHaveBeenCalledOnce();
  });

  it("supports AbortSignal unsubscription", async () => {
    const keys = make();
    keys.add({ id: "file.save", keys: "mod+s" });
    const handler = vi.fn();
    const controller = new AbortController();
    keys.on("file.save", handler, { signal: controller.signal });

    controller.abort();
    press("s", { ctrlKey: true });
    await flush();
    expect(handler).not.toHaveBeenCalled();
  });

  it("supports wildcard patterns across a scope", async () => {
    const keys = make();
    keys.add({ id: "indent", keys: "mod+]", scope: "editor" });
    keys.activate("editor");
    const handler = vi.fn();
    keys.onPattern("editor:*", handler);

    press("]", { ctrlKey: true });
    await flush();
    expect(handler).toHaveBeenCalledOnce();
  });

  it("rejects subscribing to unknown commands", () => {
    expect(() => make().on("nope", vi.fn())).toThrow(/unknown command/);
  });

  it("rejects duplicate ids and invalid names", () => {
    const keys = make();
    keys.add({ id: "a", keys: "x" });
    expect(() => keys.add({ id: "a", keys: "y" })).toThrow(/already registered/);
    expect(() => keys.add({ id: "bad:id", keys: "z" })).toThrow(/invalid command id/);
    expect(() => keys.add({ id: "b", keys: "z", scope: "has space" })).toThrow(/invalid scope/);
  });

  it("add() returns a remover", async () => {
    const keys = make();
    const onTrigger = vi.fn();
    const remove = keys.add({ id: "file.save", keys: "mod+s", onTrigger });

    remove();
    press("s", { ctrlKey: true });
    await flush();
    expect(onTrigger).not.toHaveBeenCalled();
  });
});

describe("scopes", () => {
  it("scoped bindings fire only while their scope is active", async () => {
    const keys = make();
    const onTrigger = vi.fn();
    keys.add({ id: "list.next", keys: "j", scope: "list", onTrigger });

    press("j");
    await flush();
    expect(onTrigger).not.toHaveBeenCalled();

    keys.activate("list");
    press("j");
    await flush();
    expect(onTrigger).toHaveBeenCalledOnce();

    keys.deactivate("list");
    press("j");
    await flush();
    expect(onTrigger).toHaveBeenCalledOnce();
  });

  it("global cannot be deactivated", () => {
    expect(() => make().deactivate("global")).toThrow(/cannot be deactivated/);
  });
});

describe("typing guard", () => {
  it("blocks unmodified bindings while typing, allows modifier chords", async () => {
    const keys = make();
    const plain = vi.fn();
    const chord = vi.fn();
    keys.add({ id: "down", keys: "j", onTrigger: plain });
    keys.add({ id: "save", keys: "mod+s", onTrigger: chord });

    const input = document.createElement("input");
    document.body.append(input);

    press("j", {}, input);
    press("s", { ctrlKey: true }, input);
    await flush();

    expect(plain).not.toHaveBeenCalled();
    expect(chord).toHaveBeenCalledOnce();
  });

  it("allowInEditable opts a binding in", async () => {
    const keys = make();
    const onTrigger = vi.fn();
    keys.add({ id: "esc", keys: "escape", allowInEditable: true, onTrigger });

    const input = document.createElement("input");
    document.body.append(input);
    press("Escape", {}, input);
    await flush();
    expect(onTrigger).toHaveBeenCalledOnce();
  });
});

describe("preventDefault", () => {
  it("prevents the default of a completing keydown by default", () => {
    make().add({ id: "save", keys: "mod+s" });
    const event = press("s", { ctrlKey: true });
    expect(event.defaultPrevented).toBe(true);
  });

  it("respects preventDefault: false", () => {
    make().add({ id: "save", keys: "mod+s", preventDefault: false });
    const event = press("s", { ctrlKey: true });
    expect(event.defaultPrevented).toBe(false);
  });

  it("prevents mid-sequence modifier chords but not plain steps", () => {
    make().add({ id: "settings", keys: "mod+k mod+s" });
    const first = press("k", { ctrlKey: true });
    expect(first.defaultPrevented).toBe(true);

    make().add({ id: "inbox", keys: "g i" });
    const g = press("g");
    expect(g.defaultPrevented).toBe(false);
  });

  it("does not preventDefault when a modifier binding is opted out in editable", () => {
    const keys = make();
    keys.add({ id: "bold", keys: "mod+b", allowInEditable: false });
    const input = document.createElement("input");
    document.body.append(input);

    const event = press("b", { ctrlKey: true }, input);
    expect(event.defaultPrevented).toBe(false); // native editing key preserved
  });

  it("still preventDefaults a modifier binding that fires in editable", () => {
    const keys = make();
    keys.add({ id: "save", keys: "mod+s" }); // modifier chords fire in editable by default
    const input = document.createElement("input");
    document.body.append(input);

    const event = press("s", { ctrlKey: true }, input);
    expect(event.defaultPrevented).toBe(true);
  });
});

describe("conflicts", () => {
  it("reports duplicates and prefixes in overlapping scopes", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const keys = make();
    keys.add({ id: "a", keys: "g i" });
    keys.add({ id: "b", keys: "g i" });
    keys.add({ id: "c", keys: "g" });

    const found = keys.conflicts();
    expect(found).toHaveLength(3); // a/b duplicate, a/c prefix, b/c prefix
    expect(found.map((c) => c.kind).toSorted()).toEqual(["duplicate", "prefix", "prefix"]);
    expect(warn).toHaveBeenCalled();
  });

  it("ignores collisions across non-overlapping scopes", () => {
    const keys = make();
    keys.add({ id: "a", keys: "j", scope: "list" });
    keys.add({ id: "b", keys: "j", scope: "editor" });
    expect(keys.conflicts()).toHaveLength(0);
  });

  it("reports mod vs explicit-modifier duplicates on non-mac", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const keys = make({ platform: "other" }); // mod -> ctrl
    keys.add({ id: "save.mod", keys: "mod+s" });
    keys.add({ id: "save.ctrl", keys: "ctrl+s" });
    const found = keys.conflicts();
    expect(found).toHaveLength(1);
    expect(found[0]?.kind).toBe("duplicate");
  });

  it("reports mod vs meta duplicates on mac", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const keys = make({ platform: "mac" }); // mod -> meta
    keys.add({ id: "save.mod", keys: "mod+s" });
    keys.add({ id: "save.meta", keys: "meta+s" });
    expect(keys.conflicts()).toHaveLength(1);
  });

  it("does not conflate mod with the wrong modifier per platform", () => {
    const keys = make({ platform: "mac" }); // mod -> meta, so ctrl+s is distinct
    keys.add({ id: "save.mod", keys: "mod+s" });
    keys.add({ id: "save.ctrl", keys: "ctrl+s" });
    expect(keys.conflicts()).toHaveLength(0);
  });
});

describe("lifecycle", () => {
  it("destroy() stops everything and further calls throw", async () => {
    const keys = make();
    const onTrigger = vi.fn();
    keys.add({ id: "save", keys: "mod+s", onTrigger });

    keys.destroy();
    press("s", { ctrlKey: true });
    await flush();
    expect(onTrigger).not.toHaveBeenCalled();
    expect(() => keys.add({ id: "x", keys: "y" })).toThrow(/destroyed/);
  });

  it("scopes listening to a target element", async () => {
    const box = document.createElement("div");
    document.body.append(box);
    const keys = make({ target: box });
    const onTrigger = vi.fn();
    keys.add({ id: "save", keys: "mod+s", onTrigger });

    press("s", { ctrlKey: true }, box);
    await flush();
    expect(onTrigger).toHaveBeenCalledOnce();

    press("s", { ctrlKey: true }, document.body);
    await flush();
    expect(onTrigger).toHaveBeenCalledOnce(); // events outside the box don't reach it
  });

  it("routes handler errors to onError", async () => {
    const onError = vi.fn();
    const keys = make({ onError });
    keys.add({
      id: "boom",
      keys: "mod+b",
      onTrigger: () => {
        throw new Error("boom");
      },
    });

    press("b", { ctrlKey: true });
    await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce());
  });

  it("routes async handler rejections to onError", async () => {
    const onError = vi.fn();
    const keys = make({ onError });
    keys.add({
      id: "boom.async",
      keys: "mod+b",
      onTrigger: async () => {
        throw new Error("async boom");
      },
    });

    press("b", { ctrlKey: true });
    await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce());
  });
});
