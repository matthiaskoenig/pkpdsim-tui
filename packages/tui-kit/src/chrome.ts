/**
 * The panel at the edge of the table: what the table is showing, what to try, which object does
 * what, and what the table is currently unable to do. There is one panel and it stands upright,
 * because a table is read from the side its panel is on. Everything that is not needed at a
 * glance sits behind a note instead: hovering an element, or resting a finger on it, opens it.
 */

import type {TableStatus, TokenRole} from "@pkpdsim-tui/tuio-input";
import type {Pictogram} from "./settings.ts";
import {reportStatus} from "./settings.ts";
import {speechFor} from "./speech.ts";
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
  /** An attribution a licence of the application asks for, empty when there is none. */
  readonly credit: string;
  /** The switches of the table, which are touched rather than turned. */
  readonly choices?: readonly ChoiceGroup[];
  /** Whether this table carries the way out, which the page a table is left for does not. */
  readonly back?: boolean;
}

export interface ChromeOptions {
  /** The language and the level the panel says its own words in. */
  readonly voice: Voice;
  /** What a touch on a choice does, which only the application knows. */
  readonly onChoose?: (group: string, option: string) => void;
  /** What the way out does, which only the application knows. */
  readonly onBack?: () => void;
}

export interface Chrome {
  update(state: ChromeUpdate): void;
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
      return `<button ${attributes}>${escapeHtml(option.label)}</button>`;
    }).join("");
    return `<div class="choice-group"><span class="choice-label">${escapeHtml(group.label)}</span>`
      + `<span class="choice-options">${buttons}</span></div>`;
  }).join("");
}

function panelHtml(state: ChromeUpdate, voice: Voice): string {
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
  return `
    ${back}
    <h1 data-info="${escapeHtml(state.about)}">${escapeHtml(state.title)}<i class="info-dot" aria-hidden="true">i</i></h1>
    <p class="reading">${escapeHtml(state.reading)}</p>
    <button class="speak" type="button" data-dwell="speak"
      data-info="${escapeHtml(voice.say(copy.speakInfo))}">
      <span class="speak-icon" aria-hidden="true"></span>
      <span class="speak-label">${escapeHtml(copy.speak)}</span>
    </button>
    ${tries}
    ${state.choices === undefined || state.choices.length === 0 ? "" : choicesHtml(state.choices)}
    ${objects}
    ${unassigned}
    ${notice}
    <p class="hint">${escapeHtml(state.hint)}</p>
    ${state.credit === "" ? "" : `<p class="hint credit">${escapeHtml(state.credit)}</p>`}
  `;
}

export function createChrome(container: HTMLElement, options: ChromeOptions): Chrome {
  const panel = document.createElement("aside");
  panel.className = "edge edge--near";
  const copy = words(options.voice);
  const speech = speechFor(options.voice);
  // What the panel says, in the order a visitor reads it: what this table is, what it says
  // about what is on it right now, and what there is to try. Each sentence is read on its own,
  // so the recorded ones sound the same at every table.
  let spoken: readonly string[] = [];

  /** The button says what pressing it does now, which is stopping while it is reading. */
  const showSpeaking = (): void => {
    const button = panel.querySelector(".speak");
    if (!(button instanceof HTMLElement)) return;
    const reading = speech.speaking();
    button.dataset["speaking"] = String(reading);
    const label = button.querySelector(".speak-label");
    if (label !== null) label.textContent = reading ? copy.speakStop : copy.speak;
  };
  speech.listen(showSpeaking);
  // The panel is redrawn as a whole, so the handler sits on the panel and not on a button.
  panel.addEventListener("click", event => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest(".back") !== null) {
      options.onBack?.();
      return;
    }
    if (target.closest(".speak") !== null) {
      speech.toggle(spoken);
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
  let previous = "";
  return {
    update(state: ChromeUpdate): void {
      // What drives the surface belongs to the settings of the table and not to its words.
      reportStatus(state.status);
      spoken = [state.title, state.about, state.reading, ...state.tries];
      const html = panelHtml(state, options.voice);
      if (html === previous) return;
      previous = html;
      panel.innerHTML = html;
      showSpeaking();
    },
  };
}
