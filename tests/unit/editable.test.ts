import { afterEach, describe, expect, it } from "vitest";
import { firesInEditable, isEditableTarget } from "../../src/normalize/editable";
import { parseBinding } from "../../src/recognize/parse";

afterEach(() => {
  document.body.innerHTML = "";
});

function make<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
  document.body.append(el);
  return el;
}

describe("isEditableTarget", () => {
  it("treats text-entry inputs as editable", () => {
    expect(isEditableTarget(make("input"))).toBe(true);
    expect(isEditableTarget(make("input", { type: "search" }))).toBe(true);
    expect(isEditableTarget(make("input", { type: "number" }))).toBe(true);
    expect(isEditableTarget(make("textarea"))).toBe(true);
    expect(isEditableTarget(make("select"))).toBe(true);
  });

  it("ignores non-text inputs", () => {
    expect(isEditableTarget(make("input", { type: "checkbox" }))).toBe(false);
    expect(isEditableTarget(make("input", { type: "radio" }))).toBe(false);
    expect(isEditableTarget(make("input", { type: "range" }))).toBe(false);
    expect(isEditableTarget(make("button"))).toBe(false);
  });

  it("ignores readonly and disabled fields", () => {
    expect(isEditableTarget(make("input", { readonly: "" }))).toBe(false);
    expect(isEditableTarget(make("input", { disabled: "" }))).toBe(false);
    expect(isEditableTarget(make("textarea", { readonly: "" }))).toBe(false);
  });

  it("treats contenteditable as editable", () => {
    expect(isEditableTarget(make("div", { contenteditable: "true" }))).toBe(true);
    expect(isEditableTarget(make("div", { contenteditable: "" }))).toBe(true);
    expect(isEditableTarget(make("div"))).toBe(false);
  });

  it("handles non-element targets", () => {
    expect(isEditableTarget(null)).toBe(false);
    expect(isEditableTarget(document)).toBe(false);
  });
});

describe("firesInEditable", () => {
  it("blocks unmodified bindings while typing", () => {
    expect(firesInEditable(parseBinding("g i"))).toBe(false);
    expect(firesInEditable(parseBinding("j"))).toBe(false);
    expect(firesInEditable(parseBinding("?"))).toBe(false);
  });

  it("shift alone doesn't exempt a binding", () => {
    expect(firesInEditable(parseBinding("shift+k"))).toBe(false);
  });

  it("modifier chords are exempt by default", () => {
    expect(firesInEditable(parseBinding("mod+s"))).toBe(true);
    expect(firesInEditable(parseBinding("ctrl+shift+p"))).toBe(true);
    expect(firesInEditable(parseBinding("mod+k mod+s"))).toBe(true);
  });

  it("a mixed sequence is blocked: its unmodified step would type text", () => {
    expect(firesInEditable(parseBinding("mod+k s"))).toBe(false);
  });

  it("an explicit override wins in both directions", () => {
    expect(firesInEditable(parseBinding("j"), true)).toBe(true);
    expect(firesInEditable(parseBinding("mod+s"), false)).toBe(false);
  });
});
