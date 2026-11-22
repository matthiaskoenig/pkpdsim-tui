/**
 * The beats of the last minute: the pressure in the aorta as the table has drawn it, second by
 * second, with every beat in it.
 *
 * The panel above this one draws two and a half seconds of the solved heart, which is where the
 * shape of a beat is read. This one is the other half of the question a visitor asks when they
 * turn the rate up: how many beats that is. Sixty seconds of the same pressure fit on one line
 * as a comb, and a hand on the first object makes the comb visibly finer.
 */

import {formatNumber, svg} from "@pkpdsim-tui/tui-kit";
import type {Viewport, Voice} from "@pkpdsim-tui/tui-kit";
import {COLUMN, placePanel} from "./layout.ts";
import {CARDIO_TEXT} from "./text.ts";
import type {CardioCopy} from "./text.ts";

const PANEL = {width: COLUMN.width, height: COLUMN.height.beats} as const;
const PAD = {left: 56, right: 18} as const;
const PLOT = {top: 92, height: 70} as const;
/** How much of the table's past the panel holds, in seconds. */
const WINDOW = 60;
/** How often the pressure is kept, in milliseconds: fine enough for a beat at 180 a minute. */
const EVERY = 36;
/** The floor of the scale, in mmHg, so that a resting heart is not drawn as a mountain. */
const FLOOR = 160;

/**
 * The ceiling of a scale, which only ever rises.
 *
 * A scale which followed what the last minute happened to hold redrew itself under the reader:
 * the curve kept the same shape and the numbers at its side changed, which is the opposite of
 * what a visitor turning an object wants to see. The ceiling is a round number above everything
 * the table has shown, and it stays there.
 */
export function ceilingOf(previous: number, needed: number): number {
  if (needed <= previous) return previous;
  const step = 10 ** Math.floor(Math.log10(needed));
  const nice = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]
    .map(one => one * step)
    .find(one => one >= needed);
  return nice ?? needed;
}

interface Sample {
  readonly at: number;
  readonly arterial: number;
}

export interface Beats {
  resize(viewport: Viewport): void;
  /**
   * The aortic pressure of this frame and the rate the heart is beating at, or `undefined`
   * while the heart is still being compiled.
   */
  update(beat: {arterial: number; heartRate: number} | undefined, now: number): void;
}

export function createBeats(parent: SVGSVGElement, voice: Voice): Beats {
  const copy: CardioCopy["beats"] = voice.pick(CARDIO_TEXT).beats;
  const root = svg("g", {class: "layer layer--beats"}, parent);
  const group = svg("g", {class: "beats"}, root);
  svg("rect", {
    class: "beats-frame", x: 0, y: 0, width: PANEL.width, height: PANEL.height, rx: 14,
  }, group);
  const title = svg("text", {class: "beats-title", x: PAD.left - 24, y: 30}, group);
  title.textContent = copy.title;
  const count = svg("text", {class: "beats-number", x: PAD.left - 24, y: 66}, group);
  const rate = svg("text", {
    class: "beats-rate", x: PANEL.width - PAD.right, y: 66, "text-anchor": "end",
  }, group);
  svg("path", {
    class: "beats-axis",
    d: `M${PAD.left} ${PLOT.top} L${PAD.left} ${PLOT.top + PLOT.height} `
      + `L${PANEL.width - PAD.right} ${PLOT.top + PLOT.height}`,
  }, group);
  const trace = svg("path", {class: "beats-trace", d: ""}, group);
  const high = svg("text", {
    class: "beats-tick", x: PAD.left - 8, y: PLOT.top + 4, "text-anchor": "end",
  }, group);
  const middle = svg("text", {
    class: "beats-tick", x: PAD.left - 8, y: PLOT.top + PLOT.height / 2 + 4,
    "text-anchor": "end",
  }, group);
  const low = svg("text", {
    class: "beats-tick", x: PAD.left - 8, y: PLOT.top + PLOT.height, "text-anchor": "end",
  }, group);
  low.textContent = "0";
  const unit = svg("text", {
    class: "beats-tick", x: PAD.left - 8, y: PLOT.top - 10, "text-anchor": "end",
  }, group);
  unit.textContent = "mmHg";
  const span = svg("text", {
    class: "beats-tick", x: PANEL.width - PAD.right, y: PLOT.top + PLOT.height + 18,
    "text-anchor": "end",
  }, group);
  span.textContent = `${WINDOW} s`;

  const history: Sample[] = [];
  /** The beats the table has counted in the window, from the rate it was beating at. */
  let beats = 0;
  let kept = 0;
  let last = 0;
  // The ceiling of the scale, which rises with what the table has shown and never falls, and
  // the largest sample it is held above. The sample is kept as it arrives rather than looked
  // for in the whole window: a scale which never falls reads the same either way.
  let top = FLOOR;
  let seen = 0;

  const across = (at: number, now: number): number => {
    const age = Math.min(WINDOW, Math.max(0, (now - at) / 1000));
    return PANEL.width - PAD.right
      - (age / WINDOW) * (PANEL.width - PAD.left - PAD.right);
  };

  return {
    resize(viewport: Viewport): void {
      group.setAttribute("transform", placePanel(viewport, "beats"));
    },

    update(beat: {arterial: number; heartRate: number} | undefined, now: number): void {
      if (beat === undefined) {
        last = now;
        return;
      }
      // The beats of the window are counted from the rate, which is what the heart was doing
      // between this frame and the one before it.
      const elapsed = last === 0 ? 0 : Math.min((now - last) / 1000, 0.25);
      last = now;
      beats += elapsed * (beat.heartRate / 60);
      if (now - kept < EVERY) return;
      kept = now;
      history.push({at: now, arterial: beat.arterial});
      seen = Math.max(seen, beat.arterial);
      while (history.length > 0 && now - (history[0]?.at ?? now) > WINDOW * 1000) {
        const gone = history.shift();
        if (gone !== undefined) beats -= EVERY / 1000 * (beat.heartRate / 60);
      }
      top = ceilingOf(top, Math.max(FLOOR, seen * 1.05));
      high.textContent = formatNumber(top, 0);
      middle.textContent = formatNumber(top / 2, 0);
      count.textContent = copy.count(formatNumber(Math.max(0, beats), 0));
      rate.textContent = `${formatNumber(beat.heartRate, 0)} /min`;
      trace.setAttribute("d", history.map((sample, index) =>
        `${index === 0 ? "M" : "L"}${across(sample.at, now).toFixed(1)} `
        + `${(PLOT.top + PLOT.height
          - PLOT.height * Math.min(1, Math.max(0, sample.arterial / top))).toFixed(1)}`)
        .join(" "));
    },
  };
}
