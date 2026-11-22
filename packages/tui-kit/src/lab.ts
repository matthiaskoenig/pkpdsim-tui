/**
 * Whose laboratory the models come from, and the square a visitor points a phone at. It stands
 * in the far bottom corner of every page of the application, the landing page and each table
 * alike: a visitor who walks up to a table in the middle of a room has to be able to read whose
 * work it is and take the address with them without finding their way back to the first page.
 *
 * It is furniture, like the gear in the other corner: the same block in the same place, drawn
 * over the white of the table rather than in its scene, so a table draws its own thing and
 * keeps clear of the room this takes (`LAB_ROOM`).
 */

import type {Voice} from "./voice.ts";

/** How much room the block takes at the bottom edge, which the scene of a table keeps clear. */
export const LAB_ROOM = 104;

export interface LabOptions {
  /** The laboratory, in the language of the visitor. */
  readonly name: string;
  readonly place: string;
  /** The address the square points at, with its scheme, which is not shown. */
  readonly url: string;
  /** The square itself: the path of its dark modules in a box of `size` by `size`. */
  readonly qr: {readonly path: string; readonly size: number};
  /** What pressing the block opens, and the sentence behind it. */
  readonly more: string;
  readonly info: string;
  readonly onOpen: () => void;
}

export interface Lab {
  /** Says the block again, in the language a visitor has just chosen. */
  update(options: LabOptions): void;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  }[character] ?? character));
}

function labHtml(options: LabOptions): string {
  return `<div class="lab-lines">`
    + `<span class="lab-name">${escapeHtml(options.name)}</span>`
    + `<span class="lab-line">${escapeHtml(options.place)}</span>`
    + `<span class="lab-link">${escapeHtml(options.url.replace(/^https?:\/\//, ""))}</span>`
    + `<span class="lab-more">${escapeHtml(options.more)}</span>`
    + `</div>`
    + `<svg class="lab-qr" viewBox="-2 -2 ${options.qr.size + 4} ${options.qr.size + 4}"`
    + ` aria-hidden="true">`
    + `<rect class="lab-qr-plate" x="-2" y="-2" width="${options.qr.size + 4}"`
    + ` height="${options.qr.size + 4}" rx="1.5"></rect>`
    + `<path class="lab-qr-code" d="${escapeHtml(options.qr.path)}"></path></svg>`;
}

/** Puts the block in the corner of the page it is given, and keeps it there. */
export function createLab(container: HTMLElement, voice: Voice, options: LabOptions): Lab {
  void voice;
  const block = document.createElement("div");
  block.className = "lab";
  block.setAttribute("role", "button");
  block.tabIndex = 0;
  // A table has no click: a finger which rests on the block opens the page behind it.
  block.dataset["dwell"] = "about";
  let open = options.onOpen;
  const draw = (next: LabOptions): void => {
    open = next.onOpen;
    block.dataset["info"] = `${next.info} ${next.url}`;
    block.innerHTML = labHtml(next);
  };
  draw(options);
  block.addEventListener("click", () => open());
  block.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    open();
  });
  container.appendChild(block);
  return {update: draw};
}
