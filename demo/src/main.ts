/**
 * The keysmith site runs keysmith. Commands on this page are registered
 * through the real library (imported from source), the cheatsheet is built
 * from commands(), and the forge strip visualizes the normalize layer.
 */

import { createKeysmith, detectPlatform, normalizeEvent } from "../../src";

const platform = detectPlatform();
const keys = createKeysmith({ domEvents: true });

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

const cheatsheet = document.querySelector<HTMLDialogElement>("#cheatsheet");

keys.add({
  id: "help.show",
  keys: "?",
  description: "Open this cheatsheet",
  group: "Help",
  onTrigger: () => {
    if (!cheatsheet) return;
    renderCheatsheet();
    if (!cheatsheet.open) cheatsheet.showModal();
  },
});

keys.add({
  id: "go.docs",
  keys: "g d",
  description: "Jump to quick start",
  group: "Navigate",
  onTrigger: () => document.querySelector("#docs")?.scrollIntoView({ behavior: "smooth" }),
});

keys.add({
  id: "go.remap",
  keys: "g r",
  description: "Jump to the remap demo",
  group: "Navigate",
  onTrigger: () => document.querySelector("#remap")?.scrollIntoView({ behavior: "smooth" }),
});

keys.add({
  id: "go.top",
  keys: "g t",
  description: "Back to the top",
  group: "Navigate",
  onTrigger: () => document.querySelector("#top")?.scrollIntoView({ behavior: "smooth" }),
});

let pingCount = 0;
const pingCountEl = document.querySelector("#ping-count");
keys.add({
  id: "forge.ping",
  keys: "mod+j",
  description: "The remappable demo command",
  group: "Demo",
  onTrigger: () => {
    pingCount += 1;
    if (pingCountEl) {
      pingCountEl.textContent = `forge.ping has fired ${pingCount} ${pingCount === 1 ? "time" : "times"}.`;
    }
  },
});

// ---------------------------------------------------------------------------
// Cheatsheet (dogfoods commands())
// ---------------------------------------------------------------------------

const cheatsheetList = document.querySelector("#cheatsheet-list");

function renderCheatsheet(): void {
  if (!cheatsheetList) return;
  cheatsheetList.innerHTML = "";
  for (const command of keys.commands()) {
    const li = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = command.description ?? command.id;
    const binding = document.createElement("kbd");
    binding.textContent = command.display ?? "disabled";
    if (!command.display) binding.classList.add("is-disabled");
    li.append(label, binding);
    cheatsheetList.append(li);
  }
}

document.querySelector("#cheatsheet-close")?.addEventListener("click", () => cheatsheet?.close());
cheatsheet?.addEventListener("click", (event) => {
  if (event.target === cheatsheet) cheatsheet.close();
});

// ---------------------------------------------------------------------------
// Remap demo (dogfoods remap/exportKeymap)
// ---------------------------------------------------------------------------

const pingKeysEl = document.querySelector("#ping-keys");
const keymapJsonEl = document.querySelector("#keymap-json");

function refreshRemapPanel(): void {
  const info = keys.commands().find((c) => c.id === "forge.ping");
  if (pingKeysEl) pingKeysEl.textContent = info?.display ?? "disabled";
  if (keymapJsonEl) keymapJsonEl.textContent = JSON.stringify(keys.exportKeymap(), null, 2);
}

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-remap]")) {
  button.addEventListener("click", () => {
    const value = button.dataset["remap"];
    if (value === "reset") keys.resetKeymap("forge.ping");
    else if (value === "null") keys.remap("forge.ping", null);
    else if (value) keys.remap("forge.ping", value);
    refreshRemapPanel();
  });
}
refreshRemapPanel();

// ---------------------------------------------------------------------------
// Forge strip: keystrokes as cooling metal
// ---------------------------------------------------------------------------

const strip = document.querySelector("#forge-strip");
const MAX_PIECES = 12;

const KEY_FACES: Record<string, string> = {
  " ": "space",
  Enter: "↵",
  Escape: "esc",
  Backspace: "⌫",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  Tab: "tab",
};

function pushPiece(el: HTMLElement): void {
  if (!strip) return;
  strip.append(el);
  while (strip.childElementCount > MAX_PIECES) strip.firstElementChild?.remove();
}

function filteredReason(event: KeyboardEvent): string | null {
  if (event.isComposing) return "IME";
  if (event.key === "Dead") return "dead key";
  if (["Control", "Alt", "Shift", "Meta", "AltGraph"].includes(event.key)) return "modifier";
  return null;
}

window.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  // Keys typed into the demo controls stay out of the strip.
  if (event.target instanceof HTMLElement && event.target.closest("dialog, button, a, input")) {
    return;
  }

  const normalized = normalizeEvent(event);

  if (!normalized) {
    const reason = filteredReason(event);
    if (!reason) return;
    const ghost = document.createElement("span");
    ghost.className = "piece ghost";
    ghost.innerHTML = `<span class="piece-face">${event.key === " " ? "space" : event.key}</span><span class="piece-why">${reason}</span>`;
    pushPiece(ghost);
    return;
  }

  const piece = document.createElement("span");
  piece.className = "piece hot";
  const mods = [
    normalized.ctrl ? (platform === "mac" ? "⌃" : "ctrl") : "",
    normalized.alt ? (platform === "mac" ? "⌥" : "alt") : "",
    normalized.meta ? (platform === "mac" ? "⌘" : "meta") : "",
  ]
    .filter(Boolean)
    .join(platform === "mac" ? "" : "+");
  const face = KEY_FACES[normalized.key] ?? normalized.key;
  piece.innerHTML = `<span class="piece-face">${mods ? `${mods}${platform === "mac" ? "" : "+"}` : ""}${face}</span>`;
  pushPiece(piece);
});

// A completed command stamps a plate into the strip.
keys.onPattern("*", (payload) => {
  const plate = document.createElement("span");
  plate.className = "piece plate";
  plate.innerHTML = `<span class="piece-face">⚒ ${payload.commandId}</span>`;
  pushPiece(plate);
});

// ---------------------------------------------------------------------------
// Odds and ends
// ---------------------------------------------------------------------------

document.querySelector("#copy-install")?.addEventListener("click", async (event) => {
  const button = event.currentTarget as HTMLButtonElement;
  await navigator.clipboard.writeText("bun add @zandoh/keysmith");
  button.textContent = "copied";
  setTimeout(() => {
    button.textContent = "copy";
  }, 1200);
});
