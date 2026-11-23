/**
 * How a finger presses something on a table.
 *
 * A table has no mouse. What a visitor has is a finger on the glass, which the tracker reports
 * as a point and nothing else: no button, no click, no hover. Two gestures press an element
 * here, and both are what a person does without being told:
 *
 *   a tap    a finger which lands on an element and goes again presses it when it goes, the
 *            way a phone answers, as long as it went from where it landed
 *   a rest   a finger which stays on an element presses it after `PRESS`, and the element
 *            fills while the finger is there, so that holding is visibly doing something
 *
 * What a press does is send the click of a mouse, so an element is written once: the handler a
 * laptop needs is the handler a table needs, and `data-dwell` on the element is what says that
 * a finger may press it. The name in that attribute and not the element is the identity of a
 * target, because a panel is redrawn while a finger is on it.
 *
 * This is the press of the whole application: the first screen, the body and every table.
 */

import {surfaceScale} from "./surface.ts";

/** A finger of the table, in the pixels of the page. */
export interface PressPoint {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  /**
   * Whether this is the mouse of a laptop. The page sends the click of a mouse by itself, so a
   * press is not sent for it: an element of the machine an application is developed on would
   * otherwise be pressed twice, once by the page and once by the finger the mouse stands for.
   */
  readonly mouse?: boolean;
}

/** What a finger is on: the element, and the name which is its identity through a redraw. */
export interface PressTarget {
  readonly element: Element;
  readonly key: string;
}

/**
 * How long a finger rests on something that can be pressed before it is pressed, in
 * milliseconds. The fill of a switch runs for exactly as long, from this one number.
 */
export const PRESS = 620;

/** How long a finger has to be there before a tap is a tap and not a flicker of the tracker. */
const TAP_LEAST = 50;

/**
 * How far a tapping finger may travel on what it landed on, in the pixels of the drawing. A
 * finger which went further was going somewhere: a hand leaning on the glass, or a sleeve drawn
 * across it, and neither of them tapped the element it happened to leave from.
 *
 * A finger is measured in the pixels of the glass, of which the 4K table of the exhibition has
 * two for every pixel of the drawing, so the travel of a tap is read on the scale of the
 * surface: a tap crosses the same part of the switch it landed on wherever the table stands.
 */
const TAP_DRIFT = 48;

/** What a finger can press, and under which name. A button which is off presses nothing. */
export function pressTarget(element: Element | null | undefined): PressTarget | undefined {
  const found = element?.closest?.("[data-dwell]");
  if (found === null || found === undefined) return undefined;
  if (found instanceof HTMLButtonElement && found.disabled) return undefined;
  const key = found.getAttribute("data-dwell") ?? "";
  return key === "" ? undefined : {element: found, key};
}

export interface PressOptions {
  /**
   * The fingers of the table, read on the clock of the page. A layer which is given them runs
   * its own clock, because a finger which does not move sends nothing and a page which read the
   * fingers only when they changed would never see one resting.
   */
  readonly fingers?: () => readonly PressPoint[];
  /**
   * A finger which is something else than a press: the line of a dial, which is set by touching
   * it anywhere. True says that this finger has been dealt with.
   */
  readonly onPoint?: (point: PressPoint) => boolean;
  /**
   * What a finger is on. The `data-dwell` under the point of it by default, which is the page
   * itself; a test says where its elements are, because hit testing is of a browser.
   */
  readonly targetAt?: (point: PressPoint) => PressTarget | undefined;
  /** What a press does. The click of a mouse by default, which is what an element listens to. */
  readonly onPress?: (target: PressTarget) => void;
  /** The element of a name, where `targetAt` says where the elements of the page are. */
  readonly keyed?: (key: string) => PressTarget | undefined;
  /** How long a rest takes, for a test which has no patience. */
  readonly press?: number;
}

export interface PressLayer {
  /** The fingers of one frame, in the pixels of the page. */
  follow(points: readonly PressPoint[], now: number): void;
  /** The element a finger is filling, which is the only one that shows it. */
  readonly arming: Element | undefined;
  /** Stops the clock of the layer and lets go of what a finger was filling. */
  stop(): void;
}

function click(target: PressTarget): void {
  if (target.element instanceof HTMLElement || target.element instanceof SVGElement) {
    target.element.dispatchEvent(new MouseEvent("click", {bubbles: true}));
  }
}

/** The element of a name, for a press which outlived the drawing it started on. */
function byKey(key: string): Element | null {
  try {
    return document.querySelector(`[data-dwell="${CSS.escape(key)}"]`);
  } catch {
    return null;
  }
}

/** The presses of one page: every `data-dwell` of it, by a tap or by a rest. */
export function createPress(options: PressOptions = {}): PressLayer {
  const fire = options.onPress ?? click;
  const rest = options.press ?? PRESS;
  const targetAt = options.targetAt
    ?? ((point: PressPoint) => pressTarget(document.elementFromPoint(point.x, point.y)));
  const found = (key: string): PressTarget | undefined => options.targetAt === undefined
    ? pressTarget(byKey(key))
    // A layer which says where its elements are is asked for them by name as well: the element
    // a finger landed on may have been drawn again while it was there.
    : options.keyed?.(key);
  const holding = new Map<number, {
    key: string; since: number; from: PressPoint; at: PressPoint; fired: boolean;
  }>();
  let arming: Element | undefined;
  let running = true;

  /** The element a finger is filling. One at a time: it is the finger, not the element. */
  const arm = (element: Element | undefined): void => {
    if (arming === element) return;
    arming?.removeAttribute("data-arming");
    element?.setAttribute("data-arming", "true");
    arming = element;
  };

  /** Whether a finger which has gone tapped what it was on rather than travelled over it. */
  const tapped = (
    seen: {since: number; from: PressPoint; at: PressPoint}, now: number,
  ): boolean => {
    if (now - seen.since < TAP_LEAST) return false;
    const dx = seen.at.x - seen.from.x;
    const dy = seen.at.y - seen.from.y;
    return Math.sqrt(dx * dx + dy * dy) <= TAP_DRIFT * surfaceScale();
  };

  const layer: PressLayer = {
    get arming(): Element | undefined {
      return arming;
    },
    follow(points: readonly PressPoint[], now: number): void {
      const held = new Set<number>();
      // Which fingers are on the glass at all, which is what tells a finger that has gone from
      // one that has moved off the element it was on.
      const there = new Set(points.map(point => point.id));
      let filling: Element | undefined;
      for (const point of points) {
        if (point.mouse === true) continue;
        if (options.onPoint?.(point) === true) continue;
        const target = targetAt(point);
        if (target === undefined) continue;
        held.add(point.id);
        const seen = holding.get(point.id);
        if (seen === undefined || seen.key !== target.key) {
          holding.set(point.id, {key: target.key, since: now, from: point, at: point, fired: false});
          filling = target.element;
          continue;
        }
        seen.at = point;
        if (seen.fired) continue;
        if (now - seen.since >= rest) {
          seen.fired = true;
          fire(target);
        } else {
          filling = target.element;
        }
      }
      for (const [id, seen] of [...holding]) {
        if (held.has(id)) continue;
        holding.delete(id);
        // A finger which is still on the glass has moved off what it was on and presses
        // nothing. One which has gone pressed what it was on, as a tap: a visitor does not
        // have to be told which of the two gestures this table takes, because it takes both.
        if (seen.fired || there.has(id) || !tapped(seen, now)) continue;
        const target = found(seen.key);
        if (target !== undefined) fire(target);
      }
      arm(filling);
    },
    stop(): void {
      running = false;
      holding.clear();
      arm(undefined);
    },
  };

  const fingers = options.fingers;
  if (fingers !== undefined) {
    const watch = (now: number): void => {
      if (!running) return;
      // The next frame is asked for first, so that one frame which throws, on a table which is
      // still starting or a surface which went away, does not stop the clock for good.
      window.requestAnimationFrame(watch);
      layer.follow(fingers(), now);
    };
    window.requestAnimationFrame(watch);
  }
  return layer;
}
