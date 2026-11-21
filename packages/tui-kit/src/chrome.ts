/**
 * The panels at the edge of the table: what is connected, which object does what, and what the
 * table is currently unable to do. One panel sits at each of two opposite edges, the second one
 * turned around, so nobody has to walk around the table to read it.
 */

import type {TableStatus, TokenRole} from "@pkpdsim-tui/tuio-input";

export interface ChromeUpdate {
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
}

export interface Chrome {
  update(state: ChromeUpdate): void;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  }[character] ?? character));
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
    ${state.credit === "" ? "" : `<p class="hint credit">${escapeHtml(state.credit)}</p>`}
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
