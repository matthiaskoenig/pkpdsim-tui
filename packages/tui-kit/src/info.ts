/**
 * The note behind an element: one or two sentences that appear when a visitor hovers an element
 * with the mouse or rests a finger on it at the table. It is what keeps the panels short. The
 * sentence which explains a number, an object or an organ lives on the element itself, in a
 * `data-info` attribute, and is shown only to the person who asks for it.
 */

import type {TableSnapshot} from "@pkpdsim-tui/tuio-input";
import type {Viewport} from "./types.ts";

/** A finger of the tracker, in pixels of the surface. */
export interface InfoPoint {
  readonly id: number;
  readonly x: number;
  readonly y: number;
}

export interface InfoLayer {
  /** The fingers on the surface. A finger which rests on an element opens its note. */
  follow(points: readonly InfoPoint[], now: number): void;
  hide(): void;
}

/** The fingers of a snapshot, in the pixels of the surface. */
export function pointerPoints(
  snapshot: TableSnapshot, viewport: Viewport,
): readonly InfoPoint[] {
  return [...snapshot.pointers.values()].map(pointer => ({
    id: pointer.sessionId, x: pointer.x * viewport.width, y: pointer.y * viewport.height,
  }));
}

/** How long a finger rests on an element before its note opens, in milliseconds. */
const DWELL = 260;
/** Between the element and its note, and between the note and the edge of the surface. */
const GAP = 12;
const EDGE = 14;
const WIDTH = 290;

function noteOf(element: Element | null | undefined): {element: Element; text: string} | undefined {
  const found = element?.closest?.("[data-info]");
  if (found === null || found === undefined) return undefined;
  const text = found.getAttribute("data-info") ?? "";
  return text === "" ? undefined : {element: found, text};
}

/**
 * The notes of one surface. The listener sits on the surface rather than on every element,
 * because the panels and the scene are redrawn while a visitor is reading them.
 */
export function createInfo(
  surface: HTMLElement, fingers?: () => readonly InfoPoint[],
): InfoLayer {
  const note = document.createElement("div");
  note.className = "info-note";
  note.hidden = true;
  surface.appendChild(note);
  let open: Element | undefined;
  const dwelling = new Map<number, {element: Element; since: number}>();

  const place = (element: Element, text: string): void => {
    if (open !== element || note.textContent !== text) {
      note.textContent = text;
      note.hidden = false;
      open = element;
    }
    const box = element.getBoundingClientRect();
    const size = note.getBoundingClientRect();
    const width = Math.min(WIDTH, window.innerWidth - 2 * EDGE);
    // Under the element where there is room for it, above it where there is not.
    const below = box.bottom + GAP;
    const top = below + size.height + EDGE < window.innerHeight
      ? below
      : Math.max(EDGE, box.top - GAP - size.height);
    const left = Math.min(
      Math.max(EDGE, box.left + box.width / 2 - width / 2), window.innerWidth - width - EDGE);
    note.style.left = `${Math.round(left)}px`;
    note.style.top = `${Math.round(top)}px`;
    note.style.width = `${Math.round(width)}px`;
  };

  const hide = (): void => {
    if (open === undefined) return;
    open = undefined;
    note.hidden = true;
  };

  const over = (event: PointerEvent | MouseEvent): void => {
    const target = event.target;
    const found = target instanceof Element ? noteOf(target) : undefined;
    if (found === undefined) hide();
    else place(found.element, found.text);
  };

  // A finger which does not move sends nothing, so the fingers are read on the clock of the
  // page rather than when the surface reports a change.
  if (fingers !== undefined) {
    const watch = (now: number): void => {
      layer.follow(fingers(), now);
      window.requestAnimationFrame(watch);
    };
    window.requestAnimationFrame(watch);
  }

  surface.addEventListener("pointermove", over);
  surface.addEventListener("pointerdown", over);
  surface.addEventListener("pointerleave", hide);
  // A note which belongs to an element that went away with a redraw is not left behind.
  window.addEventListener("resize", hide);

  const layer: InfoLayer = {
    follow(points: readonly InfoPoint[], now: number): void {
      const live = new Set<number>();
      let found: {element: Element; text: string} | undefined;
      for (const point of points) {
        const under = noteOf(document.elementFromPoint(point.x, point.y));
        if (under === undefined) continue;
        live.add(point.id);
        const seen = dwelling.get(point.id);
        if (seen === undefined || seen.element !== under.element) {
          dwelling.set(point.id, {element: under.element, since: now});
        } else if (now - seen.since >= DWELL) {
          found = under;
        }
      }
      for (const id of [...dwelling.keys()]) {
        if (!live.has(id)) dwelling.delete(id);
      }
      if (found !== undefined) place(found.element, found.text);
      else if (points.length > 0 && live.size === 0) hide();
    },
    hide,
  };
  return layer;
}
