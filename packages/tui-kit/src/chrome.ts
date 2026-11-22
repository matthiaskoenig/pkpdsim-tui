/**
 * The panel at the edge of the table: what the table is showing, what to try, which object does
 * what, and what the table is currently unable to do. There is one panel and it stands upright,
 * because a table is read from the side its panel is on. Everything that is not needed at a
 * glance sits behind a note instead: hovering an element, or resting a finger on it, opens it.
 */

import type {TableStatus, TokenRole} from "@pkpdsim-tui/tuio-input";
import type {TableMark} from "./host.ts";
import {ICONS} from "./icons.mjs";
import type {Pictogram} from "./settings.ts";
import {sayHtml} from "./say.ts";
import {pictogram, reportStatus} from "./settings.ts";
import type {Voice} from "./voice.ts";
import {markerSpan, words} from "./words.ts";

/** One choice of a group, which a finger picks. */
export interface ChoiceOption {
  readonly id: string;
  readonly label: string;
  /** Why it cannot be picked, empty when it can. A choice the export cannot serve says so. */
  readonly unavailable?: string;
  /**
   * The picture of this option, for a switch which is read rather than spelled: the object of a
   * table, the flag of a language, the audience of a level.
   */
  readonly picture?: Pictogram;
}

/**
 * A switch in the panel: something about the table that is not an object, because it is not a
 * value a dial carries but which of two tables this is. The body of the individual is one.
 */
export interface ChoiceGroup {
  readonly id: string;
  readonly label: string;
  readonly options: readonly ChoiceOption[];
  readonly selected: string;
}

export interface ChromeUpdate {
  /** What this table is, in two or three words. */
  readonly title: string;
  /**
   * What it shows, in one sentence a visitor who is not a clinician understands. It is the note
   * behind the title rather than a paragraph of its own: the table says it to whoever asks.
   */
  readonly about: string;
  /**
   * What the table is showing right now, in plain words. It changes with the objects, so a
   * visitor who moved something reads what they did rather than deducing it from the numbers.
   */
  readonly reading: string;
  /** Two or three things worth trying, for a visitor who does not know where to start. */
  readonly tries: readonly string[];
  readonly status: TableStatus;
  readonly roles: readonly TokenRole[];
  /** What the legend shows beside a role, which only the application knows. */
  readonly value: (role: TokenRole) => string;
  /** The roles an object is currently carrying. */
  readonly live: ReadonlySet<string>;
  /** The markers on the surface that no role claims. */
  readonly unassigned: readonly number[];
  /** What the table cannot do right now, empty when there is nothing to say. */
  readonly notice: string;
  /** How to drive the table without a tracker. */
  readonly hint: string;
  /** An attribution a licence of the application asks for; the about page carries them all. */
  readonly credit?: string;
  /** The switches of the table, which are touched rather than turned. */
  readonly choices?: readonly ChoiceGroup[];
  /** Whether this table carries the way out, which the page a table is left for does not. */
  readonly back?: boolean;
}

export interface ChromeOptions {
  /** The language and the level the panel says its own words in. */
  readonly voice: Voice;
  /**
   * The colour and the picture this table is known by, from the card which opened it. The
   * panel wears them over its title, and everything of the panel which was in the accent
   * colour takes the colour of the table, so that a table is recognised from across the room.
   */
  readonly mark?: TableMark | undefined;
  /** What a touch on a choice does, which only the application knows. */
  readonly onChoose?: (group: string, option: string) => void;
  /** What the way out does, which only the application knows. */
  readonly onBack?: () => void;
  /** What putting the figure back the way it opened does, which only the application knows. */
  readonly onReset?: () => void;
}

export interface Chrome {
  update(state: ChromeUpdate): void;
  /** Puts the page a table opens with back up, which is what starting the table again does. */
  brief(): void;
}

/**
 * The row in the near corner a table's own buttons stand in: the quiz and the way to start
 * again. They are the furniture of the table rather than what it says, so they stand together
 * under the panel instead of one of them taking a line of the panel itself.
 */
export function tableFoot(container: HTMLElement): HTMLElement {
  const found = container.querySelector(".table-foot");
  if (found instanceof HTMLElement) return found;
  const row = document.createElement("div");
  row.className = "table-foot";
  container.appendChild(row);
  return row;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  }[character] ?? character));
}

function choicesHtml(groups: readonly ChoiceGroup[]): string {
  return groups.map(group => {
    const buttons = group.options.map(option => {
      const unavailable = option.unavailable ?? "";
      const attributes = [
        `class="choice"`,
        `type="button"`,
        `data-group="${escapeHtml(group.id)}"`,
        `data-choice="${escapeHtml(option.id)}"`,
        `aria-pressed="${option.id === group.selected}"`,
        // A table has no click: a finger which rests on a switch presses it.
        `data-dwell="${escapeHtml(group.id)}:${escapeHtml(option.id)}"`,
        unavailable === "" ? "" : `disabled title="${escapeHtml(unavailable)}"`,
      ].filter(attribute => attribute !== "").join(" ");
      // A switch whose options carry a picture is read rather than spelled: the body a table
      // is solved for and the species of a liver are the figure itself over its name.
      const art = option.picture === undefined ? "" : pictogram(option.picture);
      return `<button ${attributes}>${art}`
        + `<span class="choice-text">${escapeHtml(option.label)}</span></button>`;
    }).join("");
    return `<div class="choice-group"><span class="choice-label">${escapeHtml(group.label)}</span>`
      + `<span class="choice-options">${buttons}</span></div>`;
  }).join("");
}

/** The picture of the table over its title: a disc of its colour with its icon in white. */
function markHtml(mark: TableMark | undefined): string {
  if (mark === undefined) return "";
  const paths = (ICONS[mark.picture] ?? []).join(" ");
  return `<div class="edge-mark" aria-hidden="true">`
    + `<svg class="edge-mark-art" viewBox="-26 -18 52 36">`
    + `<path d="${escapeHtml(paths)}"></path></svg></div>`;
}

function panelHtml(state: ChromeUpdate, voice: Voice, mark?: TableMark): string {
  const copy = words(voice);
  // What an object does is the note behind its row: the legend stays a list of names and
  // values, and the sentence is there for the visitor who wants it.
  const items = state.roles.map(role => `<li data-live="${state.live.has(role.id)}"`
    + ` data-info="${escapeHtml(role.description)}">`
    + `<span class="marker">${role.markers.join("/")}</span>`
    + `<span>${escapeHtml(role.label)}</span>`
    + `<span class="value">${escapeHtml(state.value(role))}</span>`
    + "</li>").join("");
  // A marker no role claims is the usual first surprise at a table: the panel says which
  // objects this one reads rather than leaving the visitor with an inert puck.
  const reads = markerSpan(state.roles, voice);
  const unassigned = state.unassigned.length === 0
    ? ""
    : `<p class="hint">${escapeHtml(copy.unknownMarkers(state.unassigned, reads))}</p>`;
  const notice = state.notice === "" ? "" : `<p class="hint">${escapeHtml(state.notice)}</p>`;
  // The body of the application has no objects of its own, so it carries no legend either.
  const objects = state.roles.length === 0
    ? ""
    : `<h2>${escapeHtml(copy.objects)}</h2><ul class="legend">${items}</ul>`;
  const tries = state.tries.length === 0
    ? ""
    : `<ul class="tries">${state.tries.map(entry => `<li>${escapeHtml(entry)}</li>`).join("")}</ul>`;
  const back = state.back !== true ? "" : `<button class="back" type="button" data-dwell="back"`
    + ` data-info="${escapeHtml(voice.say(copy.backInfo))}">${escapeHtml(copy.back)}</button>`;
  // The picture of the table and the way out of it are one row: the way out used to take a
  // line of its own above the picture, which is a finger's worth of panel for two words.
  const head = mark === undefined && back === ""
    ? ""
    : `<div class="edge-head">${markHtml(mark)}${back}</div>`;
  return `
    ${head}
    <h1 data-info="${escapeHtml(state.about)}">${escapeHtml(state.title)}<!--
      The dot stays with the last word of the title: a title which wraps takes it along rather
      than leaving it alone on a line of its own.
    -->&#8239;<i class="info-dot" aria-hidden="true">i</i></h1>
    <p class="reading">${escapeHtml(state.reading)}`
    + `${state.reading === "" ? "" : sayHtml(state.reading, words(voice).readAloud)}</p>`
    + `
    ${tries}
    ${state.choices === undefined || state.choices.length === 0 ? "" : choicesHtml(state.choices)}
    ${objects}
    ${unassigned}
    ${notice}
    <p class="hint">${escapeHtml(state.hint)}</p>
    ${state.credit === undefined || state.credit === "" ? ""
      : `<p class="hint credit">${escapeHtml(state.credit)}</p>`}
  `;
}

export function createChrome(container: HTMLElement, options: ChromeOptions): Chrome {
  const copy = words(options.voice);
  const panel = document.createElement("aside");
  panel.className = "edge edge--near";
  // Start again stands beside the quiz in the corner rather than in the panel: both are the
  // furniture of the table, and the panel is what the table says.
  const reset = document.createElement("button");
  reset.className = "reset";
  reset.type = "button";
  reset.dataset["dwell"] = "reset";
  reset.dataset["info"] = options.voice.say(copy.resetInfo);
  reset.innerHTML = `
    <svg class="reset-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1"></path>
      <path d="M20.5 3.5v5.2h-5.2"></path>
    </svg>
    <span class="reset-label">${escapeHtml(copy.reset)}</span>
  `;
  reset.addEventListener("click", () => options.onReset?.());
  tableFoot(container).appendChild(reset);
  // The colour of the table, which the mark, the reading and the switches of the panel read.
  if (options.mark !== undefined) panel.style.setProperty("--table", options.mark.color);
  // The panel is redrawn as a whole, so the handler sits on the panel and not on a button.
  panel.addEventListener("click", event => {
    const target = event.target;
    // A picture inside a button is an SVG element and not an HTML one, so the press is
    // read from any element: a finger or a mouse lands on the flag, not on the button.
    if (!(target instanceof Element)) return;
    if (target.closest(".back") !== null) {
      options.onBack?.();
      return;
    }
    const choice = target.closest(".choice");
    if (!(choice instanceof HTMLButtonElement) || choice.disabled) return;
    const group = choice.dataset["group"];
    const option = choice.dataset["choice"];
    if (group === undefined || option === undefined) return;
    options.onChoose?.(group, option);
  });
  container.appendChild(panel);
  // Every table opens with its context rather than with a surface full of moving curves, so
  // the page belongs to the furniture of a table and not to any one of them.
  const briefing = createBriefing(container, options.voice, options.mark);
  let previous = "";
  return {
    update(state: ChromeUpdate): void {
      // What drives the surface belongs to the settings of the table and not to its words.
      reportStatus(state.status);
      briefing.update(state);
      const html = panelHtml(state, options.voice, options.mark);
      if (html === previous) return;
      previous = html;
      panel.innerHTML = html;
    },
    brief(): void {
      briefing.show();
    },
  };
}

/** The light bulb of the page a table opens with: the background of an object, on request. */
const BULB = [
  "M 12 2.6 a 6.4 6.4 0 0 0 -3.9 11.5 c 0.6 0.5 0.9 1.2 0.9 1.9 v 0.6 h 6 v -0.6"
  + " c 0 -0.7 0.3 -1.4 0.9 -1.9 A 6.4 6.4 0 0 0 12 2.6 Z",
  "M 9.6 19.2 h 4.8",
  "M 10.5 21.6 h 3",
];

/**
 * The page a table opens with: what this table is about, what its objects change, and a button
 * which starts it.
 *
 * A visitor who walks up to a surface full of moving curves has no idea what they are looking
 * at, and nothing on the table says it: the panel says what is happening, not what any of it
 * is for. So the table holds its context up first, on one page and in the words of the chosen
 * level, and the interaction starts when the visitor says it does. It is the same page on
 * every table, built out of what the table already tells the panel.
 *
 * It introduces the objects and nothing else. The things worth trying are the business of the
 * panel, which stands beside the surface while they are being tried; here they were a list of
 * instructions in front of a visitor who has not yet seen the table. Each object says what it
 * changes in a line, and carries a light bulb which opens what it is in the body, for the
 * visitor who wants to know more than how to turn it.
 */
function briefingHtml(state: ChromeUpdate, voice: Voice, mark: TableMark | undefined): string {
  const copy = words(voice);
  const picture = markHtml(mark);
  const bulb = `<svg class="brief-more-art" viewBox="0 0 24 24" aria-hidden="true">`
    + BULB.map(d => `<path d="${d}"></path>`).join("") + `</svg>`;
  const objects = state.roles.map(role => `
    <li class="brief-object">
      <span class="brief-object-mark">${escapeHtml(role.markers.join(", "))}</span>
      <span class="brief-object-words">
        <span class="brief-object-head">
          <span class="brief-object-name">${escapeHtml(role.label)}</span>
          ${(role.background ?? "") === "" ? "" : `<button class="brief-more" type="button"
            data-dwell="more:${escapeHtml(role.id)}" aria-expanded="false"
            data-more="${escapeHtml(role.id)}"
            aria-label="${escapeHtml(copy.brief.more)}" title="${escapeHtml(copy.brief.more)}"
            data-info="${escapeHtml(copy.brief.moreInfo)}">${bulb}</button>`}
        </span>
        <span class="brief-object-change">${escapeHtml(role.description)}</span>
      </span>
    </li>`).join("");
  // The background of an object stands where the list of objects stands, in its place rather
  // than over it: a table does not scroll, so the page keeps its head and its way in wherever
  // the reading goes.
  const backgrounds = state.roles.map(role => {
    const more = role.background ?? "";
    if (more === "") return "";
    return `
    <aside class="brief-object-more" data-more="${escapeHtml(role.id)}" hidden>
      <div class="brief-more-head">
        <span class="brief-more-title">${escapeHtml(role.label)}</span>
        ${sayHtml(more, copy.readAloud)}
        <button class="brief-more-close" type="button" data-dwell="more-close"
          aria-label="${escapeHtml(copy.brief.close)}">${escapeHtml(copy.brief.close)}</button>
      </div>
      <p class="brief-more-text">${escapeHtml(more)}</p>
    </aside>`;
  }).join("");
  return `
    <div class="brief-sheet">
      <header class="brief-head">
        ${picture}
        <h1 class="brief-title">${escapeHtml(state.title)}</h1>
      </header>
      <p class="brief-about">${escapeHtml(state.about)}
        ${sayHtml(state.about, copy.readAloud)}</p>
      ${objects === "" ? "" : `<section class="brief-part">
        <h2 class="brief-part-title">${escapeHtml(copy.brief.objects)}</h2>
        <ul class="brief-objects">${objects}</ul>
        ${backgrounds}
      </section>`}
      <button class="brief-start" type="button" data-dwell="start"
        data-info="${escapeHtml(voice.say(copy.brief.startInfo))}">
        ${escapeHtml(copy.brief.start)}
      </button>
    </div>`;
}

/**
 * The page a table opens with, over the surface of that table. It is built once the table has
 * said what it is and which objects it reads, which is the first update of the panel, and it
 * goes away when the visitor starts the table. `show` brings it back, which is what starting
 * the table again does.
 */
export function createBriefing(
  container: HTMLElement, voice: Voice, mark: TableMark | undefined,
): Briefing {
  const sheet = document.createElement("section");
  sheet.className = "brief";
  sheet.hidden = true;
  // The page wears the colour of the table it belongs to, as the panel of that table does: the
  // circulation opens red and the operations purple, so a visitor meets the colour they pressed.
  if (mark !== undefined) sheet.style.setProperty("--table", mark.color);
  let started = false;
  let drawn = false;
  sheet.addEventListener("click", event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    // The background of one object at a time, in the place of the list of objects. A visitor
    // who closes it, or who asks for the next one, gets the list back.
    const bulb = target.closest(".brief-more");
    const close = target.closest(".brief-more-close");
    if (bulb !== null || close !== null) {
      const wanted = bulb?.getAttribute("data-more") ?? "";
      const open = wanted !== "" && bulb?.getAttribute("aria-expanded") !== "true";
      for (const card of sheet.querySelectorAll(".brief-object-more")) {
        if (card instanceof HTMLElement) {
          card.hidden = !(open && card.getAttribute("data-more") === wanted);
        }
      }
      for (const other of sheet.querySelectorAll(".brief-more")) {
        other.setAttribute(
          "aria-expanded", String(open && other.getAttribute("data-more") === wanted));
      }
      const list = sheet.querySelector(".brief-objects");
      if (list instanceof HTMLElement) list.hidden = open;
      return;
    }
    if (target.closest(".brief-start") === null) return;
    started = true;
    sheet.hidden = true;
  });
  container.appendChild(sheet);
  return {
    update(state: ChromeUpdate): void {
      // The page is written once: it is what the table is, not what it is doing, and a page
      // which rewrote itself under the reading finger would be a different page every second.
      if (drawn || state.roles.length === 0) return;
      drawn = true;
      sheet.innerHTML = briefingHtml(state, voice, mark);
      sheet.hidden = started;
    },
    show(): void {
      started = false;
      if (drawn) sheet.hidden = false;
    },
    get open(): boolean {
      return !sheet.hidden;
    },
  };
}

export interface Briefing {
  /** Writes the page out of what the table says, the first time the table says it. */
  update(state: ChromeUpdate): void;
  /** Brings the page back, which is what starting the table again does. */
  show(): void;
  /** Whether the page is up, so the table knows whether the surface is being read or driven. */
  readonly open: boolean;
}
