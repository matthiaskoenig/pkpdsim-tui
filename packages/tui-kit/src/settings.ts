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

/**
 * The picture of an option: an object of a table, a flag, one of the three audiences, or one of
 * the bodies a model is built on - a woman, a man, and the three species of the liver.
 */
export type Pictogram = GlyphKind | "flag-en" | "flag-de" | "flag-es"
  | "child" | "adult" | "expert" | FigureKind;

/** The bodies a table is solved for, drawn rather than named. */
export type FigureKind = "woman" | "man" | "human" | "rat" | "mouse";

/**
 * The three audiences, drawn rather than named: a child, a grown up, somebody of the field.
 * All three stand on the same floor, at `y = 17`, because what tells them apart at a glance is
 * how tall they are: three figures of the same height with different hats are three of the same
 * figure. The child is short with a big head and has a ball beside it, the grown up is a head
 * taller, and the one of the field wears the flat cap of somebody who studied this for years.
 */
const AUDIENCE: Readonly<Record<"child" | "adult" | "expert", readonly string[]>> = {
  child: [
    // A big head on a short body, which is how a child is drawn and how a child is built.
    "M -6.5 -7 a 6.5 6.5 0 1 1 13 0 a 6.5 6.5 0 1 1 -13 0 z",
    "M -8 17 v -5 a 8 8 0 0 1 16 0 v 5 z",
    // The ball it brought, which no grown up in this row has.
    "M 14.5 12.5 a 4.5 4.5 0 1 1 9 0 a 4.5 4.5 0 1 1 -9 0 z",
  ],
  adult: [
    "M -6 -12 a 6 6 0 1 1 12 0 a 6 6 0 1 1 -12 0 z",
    "M -11 17 v -10 a 11 11 0 0 1 22 0 v 10 z",
  ],
  expert: [
    "M -5 -6 a 5 5 0 1 1 10 0 a 5 5 0 1 1 -10 0 z",
    "M -10 17 v -7 a 10 10 0 0 1 20 0 v 7 z",
    // The cap, with the tassel hanging off its corner.
    "M -17 -13 L 0 -17.5 L 17 -13 L 0 -8.5 Z",
    "M 14 -12 h 1.8 v 6.5 h -1.8 z",
    "M 13.2 -6 h 3.4 v 2.8 h -3.4 z",
  ],
};
/**
 * The bodies, as silhouettes. Which body a table is solved for is a thing a visitor sees from
 * across the room: a woman and a man stand side by side at the same height, and the three
 * species are the animal itself, because "rat" in a language somebody does not read is nothing
 * at all while a rat with its tail is a rat.
 *
 * Every figure is a set of parts which touch but never overlap: the icons are drawn as one path
 * with the even-odd rule, where an overlap is a hole.
 */
const FIGURES: Readonly<Record<FigureKind, readonly string[]>> = {
  woman: [
    "M -4.8 -11.4 a 4.8 4.8 0 1 1 9.6 0 a 4.8 4.8 0 1 1 -9.6 0 z",
    // The dress, from the shoulders to the hem.
    "M -7.2 -6.6 h 14.4 l 4.2 14.4 h -22.8 z",
    "M -5.4 8.2 h 4.2 v 8.8 h -4.2 z",
    "M 1.2 8.2 h 4.2 v 8.8 h -4.2 z",
  ],
  man: [
    "M -4.8 -11.4 a 4.8 4.8 0 1 1 9.6 0 a 4.8 4.8 0 1 1 -9.6 0 z",
    // The square shoulders, which is what tells the two figures apart at a glance.
    "M -9.5 -5.4 q 0 -1.2 1.2 -1.2 h 16.6 q 1.2 0 1.2 1.2 v 9.6 h -19 z",
    "M -7.4 4.8 h 5.8 v 12.2 h -5.8 z",
    "M 1.6 4.8 h 5.8 v 12.2 h -5.8 z",
  ],
  // The species of a liver: a person, and the two animals the library carries a physiology of.
  // The person stands, as the two bodies above do; the animals are seen from the side, which is
  // the only way a rat is a rat.
  human: [
    "M -4.8 -11.4 a 4.8 4.8 0 1 1 9.6 0 a 4.8 4.8 0 1 1 -9.6 0 z",
    "M -8.4 -5.4 q 0 -1.2 1.2 -1.2 h 14.4 q 1.2 0 1.2 1.2 v 9.6 h -16.8 z",
    "M -6.6 4.8 h 5.2 v 12.2 h -5.2 z",
    "M 1.4 4.8 h 5.2 v 12.2 h -5.2 z",
  ],
  rat: [
    "M -11.5 3 a 9.5 6 0 1 1 19 0 a 9.5 6 0 1 1 -19 0 z",
    "M 6.9 0 a 4.6 4.6 0 1 1 9.2 0 a 4.6 4.6 0 1 1 -9.2 0 z",
    "M 16.1 -1.4 l 5 1.4 l -5 1.4 z",
    "M 7.1 -7.2 a 2.9 2.9 0 1 1 5.8 0 a 2.9 2.9 0 1 1 -5.8 0 z",
    // The long bare tail of a rat, which is the half of it a mouse does not have.
    "M -11.2 1.4 c -6.5 -1.2 -9.4 -5.6 -7.6 -9.6 l 2 0.9 c -1.4 3.1 0.9 6.4 6 7.4 z",
    "M -8.6 8.4 h 2.8 v 3.4 h -2.8 z",
    "M 0.4 8.4 h 2.8 v 3.4 h -2.8 z",
  ],
  // A mouse is the same animal two thirds of the size, with a rounder ear and half the tail,
  // which is what tells it from the rat beside it.
  mouse: [
    "M -8.3 5.5 a 6.8 4.6 0 1 1 13.6 0 a 6.8 4.6 0 1 1 -13.6 0 z",
    "M 5.4 4.2 a 3.6 3.6 0 1 1 7.2 0 a 3.6 3.6 0 1 1 -7.2 0 z",
    "M 12.5 3.2 l 3.6 1 l -3.6 1 z",
    "M 4.6 -2.3 a 3 3 0 1 1 6 0 a 3 3 0 1 1 -6 0 z",
    "M -8.1 4.4 c -3.2 -0.6 -4.4 -2.6 -3.6 -4.4 l 1.6 0.7 c -0.5 1.2 0.5 2.4 2.6 2.9 z",
    "M -5.6 10 h 2.2 v 2.2 h -2.2 z",
    "M 0.8 10 h 2.2 v 2.2 h -2.2 z",
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
    : picture in FIGURES ? FIGURES[picture as FigureKind] : ICONS[picture as GlyphKind];
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
   * Who the tables are solved for, and the way back into that question. It stands at the top of
   * the card of every table, because the age, the body and the weight are of the visitor and
   * not of the table they happen to be standing at.
   */
  readonly person?: {
    readonly label: string;
    readonly line: string;
    readonly info: string;
    readonly picture: Pictogram;
    readonly onOpen: () => void;
  };
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
  const root = document.createElement("div");
  root.className = "settings";
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
    <div class="settings-card" hidden>
      <h2 class="settings-title">${escapeHtml(copy.settings)}</h2>
      ${options.person === undefined ? "" : `<section class="setting">
        <h3 class="setting-name">${escapeHtml(options.person.label)}</h3>
        <button class="settings-person" type="button" data-dwell="settings:person"
          data-info="${escapeHtml(options.person.info)}">
          ${pictogram(options.person.picture)}
          <span class="settings-person-line">${escapeHtml(options.person.line)}</span>
        </button>
      </section>`}
      <div class="settings-groups"></div>
      <p class="settings-tracker"><span class="dot"></span>
        <span class="settings-source"></span></p>
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
    card.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
    root.dataset["open"] = String(open);
  };
  root.addEventListener("click", event => {
    const target = event.target;
    // A picture inside a button is an SVG element and not an HTML one, so the press is
    // read from any element: a finger or a mouse lands on the flag, not on the button.
    if (!(target instanceof Element)) return;
    if (target.closest(".settings-button") !== null) {
      show(card.hidden === true);
      return;
    }
    if (target.closest(".settings-person") !== null) {
      show(false);
      options.person?.onOpen();
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
    if (card.hidden) return;
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
