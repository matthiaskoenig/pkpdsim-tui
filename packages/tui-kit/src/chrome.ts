/**
 * The panels at the edge of the table: what is connected, which object does what, and what the
 * table is currently unable to do. One panel sits at each of two opposite edges, the second one
 * turned around, so nobody has to walk around the table to read it.
 */

import type {TableStatus, TokenRole} from "@pkpdsim-tui/tuio-input";

/** One choice of a group, which a finger picks. */
export interface ChoiceOption {
  readonly id: string;
  readonly label: string;
  /** Why it cannot be picked, empty when it can. A choice the export cannot serve says so. */
  readonly unavailable?: string;
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
  /** What it shows, in one sentence a visitor who is not a clinician understands. */
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
}

export interface ChromeOptions {
  /** What a touch on a choice does, which only the application knows. */
  readonly onChoose?: (group: string, option: string) => void;
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
        unavailable === "" ? "" : `disabled title="${escapeHtml(unavailable)}"`,
      ].filter(attribute => attribute !== "").join(" ");
      return `<button ${attributes}>${escapeHtml(option.label)}</button>`;
    }).join("");
    return `<div class="choice-group"><span class="choice-label">${escapeHtml(group.label)}</span>`
      + `<span class="choice-options">${buttons}</span></div>`;
  }).join("");
}

function panelHtml(state: ChromeUpdate): string {
  const items = state.roles.map(role => `<li data-live="${state.live.has(role.id)}">`
    + `<span class="marker">${role.markers.join("/")}</span>`
    + `<span>${escapeHtml(role.label)}</span>`
    + `<span class="value">${escapeHtml(state.value(role))}</span>`
    + "</li>").join("");
  const unassigned = state.unassigned.length === 0
    ? ""
    : `<p class="hint">Unknown ${state.unassigned.length === 1 ? "marker" : "markers"} `
      + `${state.unassigned.join(", ")} on the table.</p>`;
  const notice = state.notice === "" ? "" : `<p class="hint">${escapeHtml(state.notice)}</p>`;
  const detail = state.status.detail === ""
    ? ""
    : `<p class="hint detail">${escapeHtml(state.status.detail)}</p>`;
  const tries = state.tries.length === 0
    ? ""
    : `<ul class="tries">${state.tries.map(entry => `<li>${escapeHtml(entry)}</li>`).join("")}</ul>`;
  return `
    <h1>${escapeHtml(state.title)}</h1>
    <p class="about">${escapeHtml(state.about)}</p>
    <p class="reading">${escapeHtml(state.reading)}</p>
    ${tries}
    <div class="status" data-state="${state.status.state}">
      <span class="dot"></span>
      <span>${escapeHtml(state.status.source)}</span>
    </div>
    ${detail}
    ${state.choices === undefined || state.choices.length === 0 ? "" : choicesHtml(state.choices)}
    <h2>Objects</h2>
    <ul class="legend">${items}</ul>
    ${unassigned}
    ${notice}
    <p class="hint">${escapeHtml(state.hint)}</p>
    ${state.credit === "" ? "" : `<p class="hint credit">${escapeHtml(state.credit)}</p>`}
  `;
}

export function createChrome(container: HTMLElement, options: ChromeOptions = {}): Chrome {
  const panels = ["edge edge--top-left", "edge edge--bottom-right"].map(className => {
    const panel = document.createElement("aside");
    panel.className = className;
    // The panel is redrawn as a whole, so the handler sits on the panel and not on a button.
    panel.addEventListener("click", event => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const choice = target.closest(".choice");
      if (!(choice instanceof HTMLButtonElement) || choice.disabled) return;
      const group = choice.dataset["group"];
      const option = choice.dataset["choice"];
      if (group === undefined || option === undefined) return;
      options.onChoose?.(group, option);
    });
    container.appendChild(panel);
    return panel;
  });
  let previous = "";
  return {
    update(state: ChromeUpdate): void {
      const html = panelHtml(state);
      if (html === previous) return;
      previous = html;
      for (const panel of panels) panel.innerHTML = html;
    },
  };
}
