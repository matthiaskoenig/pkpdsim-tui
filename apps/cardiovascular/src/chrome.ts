/**
 * The panels at the edge of the table: what is connected, which object does what, and what the
 * table is currently unable to do. One panel sits at each of two opposite edges, the second one
 * turned around, so nobody has to walk around the table to read it.
 */

import type {PressureControls} from "@pkpdsim-tui/cardio-sim";
import type {TableStatus, TokenRole} from "@pkpdsim-tui/tuio-input";
import {formatFactor} from "./format.ts";

export interface ChromeUpdate {
  readonly status: TableStatus;
  readonly roles: readonly TokenRole[];
  readonly controls: PressureControls;
  /** The roles an object is currently carrying. */
  readonly live: ReadonlySet<string>;
  /** The markers on the surface that no role claims. */
  readonly unassigned: readonly number[];
  /** What the table cannot do right now, empty when there is nothing to say. */
  readonly notice: string;
  /** How to drive the table without a tracker. */
  readonly hint: string;
  /** The attribution the anatomy is published under, which its licence asks for. */
  readonly credit: string;
}

export interface Chrome {
  update(state: ChromeUpdate): void;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  }[character] ?? character));
}

function controlOf(controls: PressureControls, id: string): number | undefined {
  const values: Record<string, number> = {
    hepatic: controls.hepatic, systemic: controls.systemic,
    portal: controls.portal, renal: controls.renal,
  };
  return values[id];
}

function panelHtml(state: ChromeUpdate): string {
  const items = state.roles.map(role => {
    const value = controlOf(state.controls, role.id);
    return `<li data-live="${state.live.has(role.id)}">`
      + `<span class="marker">${role.markers[0] ?? "?"}</span>`
      + `<span>${escapeHtml(role.label)}</span>`
      + `<span class="value">${value === undefined ? "-" : escapeHtml(formatFactor(value))}</span>`
      + "</li>";
  }).join("");
  const unassigned = state.unassigned.length === 0
    ? ""
    : `<p class="hint">Unknown ${state.unassigned.length === 1 ? "marker" : "markers"} `
      + `${state.unassigned.join(", ")} on the table.</p>`;
  const notice = state.notice === "" ? "" : `<p class="hint">${escapeHtml(state.notice)}</p>`;
  const detail = state.status.detail === ""
    ? ""
    : `<p class="hint detail">${escapeHtml(state.status.detail)}</p>`;
  return `
    <div class="status" data-state="${state.status.state}">
      <span class="dot"></span>
      <span>${escapeHtml(state.status.source)}</span>
    </div>
    ${detail}
    <h2>Objects</h2>
    <ul class="legend">${items}</ul>
    ${unassigned}
    ${notice}
    <p class="hint">${escapeHtml(state.hint)}</p>
    <p class="hint credit">${escapeHtml(state.credit)}</p>
  `;
}

export function createChrome(container: HTMLElement): Chrome {
  const panels = ["edge edge--top-left", "edge edge--bottom-right"].map(className => {
    const panel = document.createElement("aside");
    panel.className = className;
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
