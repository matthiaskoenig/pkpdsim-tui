/**
 * The settings of the table: which table this is, which language it speaks and how much it
 * says. They are not what a table is about, so they do not stand in the panel next to what it
 * is showing: they wait behind one button in the far corner, as the settings of a device do,
 * and they are pictures rather than words, because a visitor who cannot read the language the
 * table is in is exactly the visitor who needs the language switch.
 *
 * Every switch is an either/or: one option of a group is filled and carries a tick, the others
 * are hollow. There is no state in which none of them is on.
 */

import type {TableStatus} from "@pkpdsim-tui/tuio-input";
import type {ChoiceGroup} from "./chrome.ts";
import {ICONS} from "./icons.mjs";
import type {GlyphKind} from "./icons.mjs";
import type {Voice} from "./voice.ts";
import {words} from "./words.ts";

/** The picture of an option: an object of a table, a flag, or one of the three audiences. */
export type Pictogram = GlyphKind | "flag-en" | "flag-de" | "flag-es"
  | "child" | "adult" | "expert";

/** The three audiences, drawn rather than named: a child, a grown up, somebody of the field. */
const AUDIENCE: Readonly<Record<"child" | "adult" | "expert", readonly string[]>> = {
  // A big head on a small body, which is how a child is drawn and how a child is built.
  child: [
    "M 0 -18 a 11 11 0 1 1 0 22 a 11 11 0 0 1 0 -22 z",
    "M -8 18 v -3 a 8 8 0 0 1 16 0 v 3 z",
  ],
  adult: [
    "M 0 -18 a 7.5 7.5 0 1 1 0 15 a 7.5 7.5 0 0 1 0 -15 z",
    "M -12 18 v -5 a 12 12 0 0 1 24 0 v 5 z",
  ],
  // The same grown up under the flat cap of somebody who studied the thing for years.
  expert: [
    "M 0 -9 a 7 7 0 1 1 0 14 a 7 7 0 0 1 0 -14 z",
    "M -12 18 v -4 a 12 12 0 0 1 24 0 v 4 z",
    "M -18 -14 L 0 -20 L 18 -14 L 0 -8 Z",
    "M 12.5 -13 h 2 v 8 h -2 z",
  ],
};

/** A flag, in the bands and the colours it is actually made of. */
const FLAGS: Readonly<Record<"en" | "de" | "es", string>> = {
  de: `<rect x="-26" y="-16" width="52" height="10.7" fill="#111"></rect>`
    + `<rect x="-26" y="-5.3" width="52" height="10.7" fill="#d7141a"></rect>`
    + `<rect x="-26" y="5.3" width="52" height="10.7" fill="#f2c500"></rect>`,
  es: `<rect x="-26" y="-16" width="52" height="8" fill="#c60b1e"></rect>`
    + `<rect x="-26" y="-8" width="52" height="16" fill="#ffc400"></rect>`
    + `<rect x="-26" y="8" width="52" height="8" fill="#c60b1e"></rect>`,
  en: `<rect x="-26" y="-16" width="52" height="32" fill="#012169"></rect>`
    + `<path d="M -26 -16 L 26 16 M 26 -16 L -26 16" stroke="#fff" stroke-width="7"></path>`
    + `<path d="M -26 -16 L 26 16 M 26 -16 L -26 16" stroke="#c8102e" stroke-width="3.5"></path>`
    + `<path d="M 0 -16 V 16 M -26 0 H 26" stroke="#fff" stroke-width="11"></path>`
    + `<path d="M 0 -16 V 16 M -26 0 H 26" stroke="#c8102e" stroke-width="6.5"></path>`,
};

/** The picture of one option, as the markup of an SVG which is as wide as it is tall. */
export function pictogram(picture: Pictogram): string {
  const open = `<svg class="pick-art" viewBox="-26 -18 52 36" aria-hidden="true">`;
  if (picture === "flag-en" || picture === "flag-de" || picture === "flag-es") {
    const flag = FLAGS[picture.slice(5) as "en" | "de" | "es"];
    return `${open}<g class="pick-flag">${flag}</g>`
      + `<rect x="-26" y="-16" width="52" height="32" rx="3" class="pick-flag-edge"></rect></svg>`;
  }
  const paths = picture === "child" || picture === "adult" || picture === "expert"
    ? AUDIENCE[picture]
    : ICONS[picture];
  // One path, so that the inner shapes of an icon cut the outer one open.
  return `${open}<path class="pick-path" d="${paths.join(" ")}"></path></svg>`;
}

export interface Settings {
  /** What the tracker of this page is, which waits behind the button rather than on the table. */
  status(status: TableStatus): void;
}

export interface SettingsOptions {
  readonly voice: Voice;
  /** The groups, in the order they are shown. Every option carries its picture. */
  readonly groups: readonly ChoiceGroup[];
  readonly onChoose: (group: string, option: string) => void;
  /**
   * Shown open, as a column of the page rather than behind the button. The landing page does
   * this, so that a visitor sees what can be changed before they walk to the next table, where
   * the same switches wait behind the button in the corner.
   */
  readonly pinned?: boolean;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  }[character] ?? character));
}

function groupHtml(group: ChoiceGroup): string {
  const options = group.options.map(option => {
    const chosen = option.id === group.selected;
    const unavailable = option.unavailable ?? "";
    return `<button class="pick" type="button" role="radio"`
      + ` data-group="${escapeHtml(group.id)}" data-choice="${escapeHtml(option.id)}"`
      + ` aria-checked="${chosen}" aria-pressed="${chosen}"`
      + ` data-dwell="set:${escapeHtml(group.id)}:${escapeHtml(option.id)}"`
      + (unavailable === "" ? "" : ` disabled title="${escapeHtml(unavailable)}"`)
      + `>${option.picture === undefined ? "" : pictogram(option.picture)}`
      + `<span class="pick-label">${escapeHtml(option.label)}</span>`
      + `<span class="pick-tick" aria-hidden="true"></span></button>`;
  }).join("");
  return `<section class="setting">`
    + `<h3 class="setting-name">${escapeHtml(group.label)}</h3>`
    + `<div class="setting-options" role="radiogroup"`
    + ` aria-label="${escapeHtml(group.label)}">${options}</div></section>`;
}

/** The one settings menu of the page, which the panel of a table reports its tracker to. */
let current: Settings | undefined;

/** What the panel of a table knows and the menu shows: which tracker is driving the surface. */
export function reportStatus(status: TableStatus): void {
  current?.status(status);
}

export function createSettings(container: HTMLElement, options: SettingsOptions): Settings {
  const copy = words(options.voice);
  const pinned = options.pinned === true;
  const root = document.createElement("div");
  root.className = pinned ? "settings settings--pinned" : "settings";
  root.innerHTML = `
    <button class="settings-button" type="button" data-dwell="settings"
      aria-expanded="false" aria-label="${escapeHtml(copy.settings)}"
      title="${escapeHtml(copy.settings)}">
      <svg viewBox="-26 -26 52 52" aria-hidden="true">
        <path class="pick-path" d="M -4 -24 h 8 l 1.4 7.2 a 18 18 0 0 1 5 2.9 l 6.9 -2.4 l 4 6.9 l -5.5 4.8 a 18 18 0 0 1 0 5.8 l 5.5 4.8 l -4 6.9 l -6.9 -2.4 a 18 18 0 0 1 -5 2.9 L 4 24 h -8 l -1.4 -7.2 a 18 18 0 0 1 -5 -2.9 l -6.9 2.4 l -4 -6.9 l 5.5 -4.8 a 18 18 0 0 1 0 -5.8 l -5.5 -4.8 l 4 -6.9 l 6.9 2.4 a 18 18 0 0 1 5 -2.9 z"></path>
        <circle class="settings-eye" cx="0" cy="0" r="6.5"></circle>
      </svg>
      <span class="settings-dot" data-state="idle"></span>
    </button>
    <div class="settings-card"${pinned ? "" : " hidden"}>
      <h2 class="settings-title">${escapeHtml(copy.settings)}</h2>
      <div class="settings-groups"></div>
      ${pinned ? "" : `<p class="settings-tracker"><span class="dot"></span>`
        + `<span class="settings-source"></span></p>`}
    </div>
  `;
  const button = root.querySelector(".settings-button") as HTMLButtonElement;
  const card = root.querySelector(".settings-card") as HTMLElement;
  const groups = root.querySelector(".settings-groups") as HTMLElement;
  const dot = root.querySelector(".settings-dot") as HTMLElement;
  const tracker = root.querySelector(".settings-tracker");
  const source = root.querySelector(".settings-source");
  groups.innerHTML = options.groups.map(groupHtml).join("");

  const show = (open: boolean): void => {
    if (pinned) return;
    card.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
    root.dataset["open"] = String(open);
  };
  root.addEventListener("click", event => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest(".settings-button") !== null) {
      show(card.hidden === true);
      return;
    }
    const pick = target.closest(".pick");
    if (!(pick instanceof HTMLButtonElement) || pick.disabled) return;
    const group = pick.dataset["group"];
    const option = pick.dataset["choice"];
    if (group === undefined || option === undefined) return;
    options.onChoose(group, option);
  });
  // A press anywhere else closes the menu, so that the table is never left behind a card.
  document.addEventListener("pointerdown", event => {
    const target = event.target;
    if (pinned || card.hidden) return;
    if (target instanceof Node && root.contains(target)) return;
    show(false);
  });
  container.appendChild(root);
  const settings: Settings = {
    status(state: TableStatus): void {
      dot.dataset["state"] = state.state;
      if (tracker instanceof HTMLElement) tracker.dataset["state"] = state.state;
      if (source instanceof HTMLElement) source.textContent = state.source;
      const detail = state.detail === "" ? state.source : state.detail;
      button.title = `${copy.settings}: ${detail}`;
    },
  };
  current = settings;
  return settings;
}
