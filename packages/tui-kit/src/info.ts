/**
 * The note behind an element: one or two sentences that appear when a visitor hovers an element
 * with the mouse or rests a finger on it at the table. It is what keeps the panels short. The
 * sentence which explains a number, an object or an organ lives on the element itself, in a
 * `data-info` attribute, and is shown only to the person who asks for it.
 */

import type {TableSnapshot} from "@pkpdsim-tui/tuio-input";
import {createPress, PRESS} from "./press.ts";
import {surfaceScale} from "./surface.ts";
import {sayHtml, sayLabel} from "./say.ts";
import type {Viewport} from "./types.ts";
import type {Voice} from "./voice.ts";

/** A finger of the tracker, in pixels of the surface. */
export interface InfoPoint {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  /** Whether this is the mouse of a laptop, which the page clicks for by itself. */
  readonly mouse?: boolean;
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
    mouse: pointer.mouse,
  }));
}

/** The objects of a snapshot, in the pixels of the surface. An object chooses as a finger does. */
export function tokenPoints(
  snapshot: TableSnapshot, viewport: Viewport,
): readonly InfoPoint[] {
  return [...snapshot.tokens.values()].map(token => ({
    id: token.sessionId, x: token.x * viewport.width, y: token.y * viewport.height,
  }));
}

/** How long a finger rests on an element before its note opens, in milliseconds. */
const DWELL = 260;
/**
 * Between the element and its note, and between the note and the edge of the surface, in the
 * pixels of the drawing: a note on the 4K table of the exhibition is as wide beside the number
 * it belongs to as it is on the laptop, which `surfaceScale` is what says.
 */
const GAP = 12;
const EDGE = 14;
const WIDTH = 340;
/**
 * How long a note stays after the finger has left what it belongs to, in milliseconds.
 *
 * A note carries a speaker, and a speaker has to be reachable: a note which went the moment
 * the finger moved off the number could never be pressed, because the way to it leads over the
 * glass between them. It stays long enough to be walked to, and goes on its own after that.
 */
const LINGER = 2600;

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
  surface: HTMLElement, fingers?: () => readonly InfoPoint[], voice?: Voice,
): InfoLayer {
  const note = document.createElement("div");
  note.className = "info-note";
  note.hidden = true;
  const sentence = document.createElement("p");
  sentence.className = "info-text";
  // The note is read aloud by the speaker beside it, for a visitor who is not reading it.
  const speaker = document.createElement("span");
  speaker.className = "info-say";
  note.append(sentence, speaker);
  surface.appendChild(note);
  // The fill of a switch runs for as long as the press behind it takes, from the one constant.
  document.documentElement.style.setProperty("--dwell", `${PRESS}ms`);
  let open: Element | undefined;
  const dwelling = new Map<number, {element: Element; since: number}>();
  // What a finger presses is not of the notes: the one press of the application reads the same
  // fingers, so a tap and a rest do the same thing here as they do on the first screen.
  const press = createPress();

  const place = (element: Element, text: string): void => {
    hold();
    if (open !== element || sentence.textContent !== text) {
      sentence.textContent = text;
      speaker.innerHTML = voice === undefined ? "" : sayHtml(text, sayLabel(voice));
      note.hidden = false;
      open = element;
    }
    const box = element.getBoundingClientRect();
    const size = note.getBoundingClientRect();
    // The box of an element is measured in the pixels of the glass, so the room around the note
    // is taken in those as well: the drawing of a larger surface is larger.
    const scale = surfaceScale();
    const gap = GAP * scale;
    const edge = EDGE * scale;
    const width = Math.min(WIDTH * scale, window.innerWidth - 2 * edge);
    // Under the element where there is room for it, above it where there is not.
    const below = box.bottom + gap;
    const top = below + size.height + edge < window.innerHeight
      ? below
      : Math.max(edge, box.top - gap - size.height);
    const left = Math.min(
      Math.max(edge, box.left + box.width / 2 - width / 2), window.innerWidth - width - edge);
    note.style.left = `${Math.round(left)}px`;
    note.style.top = `${Math.round(top)}px`;
    note.style.width = `${Math.round(width)}px`;
  };

  let fading: number | undefined;

  const hide = (): void => {
    if (fading !== undefined) {
      window.clearTimeout(fading);
      fading = undefined;
    }
    if (open === undefined) return;
    open = undefined;
    note.hidden = true;
  };

  /** Leaves the note standing for a moment, so that its speaker can be walked to and pressed. */
  const fade = (): void => {
    if (open === undefined || fading !== undefined) return;
    fading = window.setTimeout(() => {
      fading = undefined;
      hide();
    }, LINGER);
  };

  /** A note which is being read, or walked to, does not go. */
  const hold = (): void => {
    if (fading === undefined) return;
    window.clearTimeout(fading);
    fading = undefined;
  };

  // The note holds itself open while a visitor is on it, and starts to go as they leave it, so
  // that it never stands in front of the thing they moved on to for long.
  note.addEventListener("pointerenter", hold);
  note.addEventListener("pointerleave", () => fade());

  const over = (event: PointerEvent | MouseEvent): void => {
    const target = event.target;
    // A visitor whose pointer is on the note itself is reading it: it holds itself open.
    if (target instanceof Element && note.contains(target)) return;
    const found = target instanceof Element ? noteOf(target) : undefined;
    if (found === undefined) fade();
    else place(found.element, found.text);
  };

  // A finger which does not move sends nothing, so the fingers are read on the clock of the
  // page rather than when the surface reports a change.
  if (fingers !== undefined) {
    const watch = (now: number): void => {
      // The next frame is asked for first, so that one frame which throws, on a table which
      // is still starting or a surface which went away, does not stop the clock for good.
      window.requestAnimationFrame(watch);
      layer.follow(fingers(), now);
    };
    window.requestAnimationFrame(watch);
  }

  surface.addEventListener("pointermove", over);
  surface.addEventListener("pointerdown", over);
  surface.addEventListener("pointerleave", () => fade());
  // A note which belongs to an element that went away with a redraw is not left behind.
  window.addEventListener("resize", hide);

  const layer: InfoLayer = {
    follow(points: readonly InfoPoint[], now: number): void {
      const live = new Set<number>();
      let found: {element: Element; text: string} | undefined;
      press.follow(points, now);
      for (const point of points) {
        const target = document.elementFromPoint(point.x, point.y);
        // A finger which is on the note itself is reading it, or on its way to the speaker.
        if (target instanceof Element && note.contains(target)) {
          live.add(point.id);
          hold();
          continue;
        }
        const under = noteOf(target);
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
      // A table has no pointer which could leave the note: the fingers are all there is, so a
      // note starts to go as soon as none of them is on it, the empty surface of a visitor who
      // has walked away included.
      else if (live.size === 0) fade();
    },
    hide,
  };
  return layer;
}
