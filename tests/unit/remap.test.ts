import { afterEach, describe, expect, it, vi } from "vitest";
import type { Keysmith } from "../../src/manage/keysmith";
import { createKeysmith } from "../../src/manage/keysmith";

const instances: Keysmith[] = [];

function make(options: Parameters<typeof createKeysmith>[0] = {}) {
  const keys = createKeysmith({ platform: "other", ...options });
  instances.push(keys);
  return keys;
}

function press(key: string, init: KeyboardEventInit = {}): void {
  window.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init }),
  );
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

afterEach(() => {
  for (const keys of instances.splice(0)) keys.destroy();
  vi.restoreAllMocks();
});

describe("remap", () => {
  it("moves a command to new keys", async () => {
    const keys = make();
    const onTrigger = vi.fn();
    keys.add({ id: "save", keys: "mod+s", onTrigger });

    keys.remap("save", "mod+shift+x");
    press("s", { ctrlKey: true });
    press("x", { ctrlKey: true, shiftKey: true });
    await flush();

    expect(onTrigger).toHaveBeenCalledOnce();
  });

  it("disables a command with null (WCAG 2.1.4)", async () => {
    const keys = make();
    const onTrigger = vi.fn();
    keys.add({ id: "down", keys: "j", onTrigger });

    keys.remap("down", null);
    press("j");
    await flush();
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it("keeps handlers attached across remaps", async () => {
    const keys = make();
    keys.add({ id: "save", keys: "mod+s" });
    const handler = vi.fn();
    keys.on("save", handler);

    keys.remap("save", "mod+p");
    press("p", { ctrlKey: true });
    await flush();
    expect(handler).toHaveBeenCalledOnce();
  });

  it("throws on unknown commands and bad notation", () => {
    const keys = make();
    keys.add({ id: "save", keys: "mod+s" });
    expect(() => keys.remap("nope", "x")).toThrow(/unknown command/);
    expect(() => keys.remap("save", "hyper+x")).toThrow(/unknown modifier/);
  });

  it("resetKeymap restores one or all defaults", async () => {
    const keys = make();
    const save = vi.fn();
    const open = vi.fn();
    keys.add({ id: "save", keys: "mod+s", onTrigger: save });
    keys.add({ id: "open", keys: "mod+o", onTrigger: open });

    keys.remap("save", null);
    keys.remap("open", null);
    keys.resetKeymap("save");

    press("s", { ctrlKey: true });
    press("o", { ctrlKey: true });
    await flush();
    expect(save).toHaveBeenCalledOnce();
    expect(open).not.toHaveBeenCalled();

    keys.resetKeymap();
    press("o", { ctrlKey: true });
    await flush();
    expect(open).toHaveBeenCalledOnce();
  });
});

describe("keymap persistence", () => {
  it("round-trips overrides through export and import", async () => {
    const first = make();
    first.add({ id: "save", keys: "mod+s" });
    first.add({ id: "down", keys: "j" });
    first.remap("save", "mod+shift+x");
    first.remap("down", null);

    const saved = JSON.parse(JSON.stringify(first.exportKeymap()));
    expect(saved).toEqual({ save: "mod+shift+x", down: null });
    first.destroy();

    const second = make();
    const onTrigger = vi.fn();
    second.add({ id: "save", keys: "mod+s", onTrigger });
    second.add({ id: "down", keys: "j" });
    second.importKeymap(saved);

    press("x", { ctrlKey: true, shiftKey: true });
    await flush();
    expect(onTrigger).toHaveBeenCalledOnce();
    expect(second.commands().find((c) => c.id === "down")?.keys).toBeNull();
  });

  it("skips unknown ids and invalid notation without failing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const keys = make();
    keys.add({ id: "save", keys: "mod+s" });

    keys.importKeymap({ ghost: "mod+g", save: "not a+++binding" });
    expect(keys.commands().find((c) => c.id === "save")?.keys).toBe("mod+s");
    expect(warn).toHaveBeenCalled();
  });
});

describe("reserved-key warnings", () => {
  it("warns when a binding collides with a browser combination", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    make().add({ id: "close", keys: "mod+w" });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("mod+w"));
  });

  it("warns on remap into a reserved combination", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const keys = make();
    keys.add({ id: "save", keys: "mod+s" });
    expect(warn).not.toHaveBeenCalled();

    keys.remap("save", "f11");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("f11"));
  });

  it("stays quiet for ordinary bindings", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const keys = make();
    keys.add({ id: "save", keys: "mod+s" });
    keys.add({ id: "inbox", keys: "g i" });
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("commands()", () => {
  it("reports metadata, active keys, and display strings", () => {
    const keys = make();
    keys.add({ id: "save", keys: "mod+s", description: "Save", group: "File" });
    keys.add({ id: "inbox", keys: "g i", scope: "list" });

    const infos = keys.commands();
    expect(infos).toHaveLength(2);
    expect(infos[0]).toMatchObject({
      id: "save",
      description: "Save",
      group: "File",
      keys: "mod+s",
      defaultKeys: "mod+s",
      isCustomized: false,
      display: "Ctrl+S",
    });
    expect(infos[1]).toMatchObject({ scope: "list", display: "G I" });
  });

  it("uses mac symbols on mac", () => {
    const keys = make({ platform: "mac" });
    keys.add({ id: "save", keys: "mod+shift+s" });
    expect(keys.commands()[0]?.display).toBe("⇧⌘S");
  });

  it("reflects remaps and disables", () => {
    const keys = make();
    keys.add({ id: "save", keys: "mod+s" });
    keys.remap("save", "mod+p");

    expect(keys.commands()[0]).toMatchObject({
      keys: "mod+p",
      defaultKeys: "mod+s",
      isCustomized: true,
      display: "Ctrl+P",
    });

    keys.remap("save", null);
    expect(keys.commands()[0]).toMatchObject({ keys: null, display: null, isCustomized: true });
  });

  it("disabled bindings drop out of conflicts", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const keys = make();
    keys.add({ id: "a", keys: "g" });
    keys.add({ id: "b", keys: "g i" });
    expect(keys.conflicts()).toHaveLength(1);

    keys.remap("a", null);
    expect(keys.conflicts()).toHaveLength(0);
  });
});

describe("domEvents surface", () => {
  it("dispatches keysmith:<id> on document with the payload", async () => {
    make({ domEvents: true }).add({ id: "save", keys: "mod+s" });
    const seen = vi.fn();
    document.addEventListener("keysmith:save", seen as EventListener, { once: true });

    press("s", { ctrlKey: true });
    await flush();

    expect(seen).toHaveBeenCalledOnce();
    const event = seen.mock.calls[0]?.[0] as CustomEvent;
    expect(event.detail).toMatchObject({ commandId: "save", scope: "global" });
  });

  it("preventDefault on the DOM event vetoes bus handlers", async () => {
    const keys = make({ domEvents: true });
    const onTrigger = vi.fn();
    keys.add({ id: "save", keys: "mod+s", onTrigger });
    document.addEventListener(
      "keysmith:save",
      (event) => {
        event.preventDefault();
      },
      { once: true },
    );

    press("s", { ctrlKey: true });
    await flush();
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it("stays silent when domEvents is off", async () => {
    make().add({ id: "save", keys: "mod+s" });
    const seen = vi.fn();
    document.addEventListener("keysmith:save", seen as EventListener, { once: true });

    press("s", { ctrlKey: true });
    await flush();
    expect(seen).not.toHaveBeenCalled();
    document.removeEventListener("keysmith:save", seen as EventListener);
  });
});
