/**
 * The two supplies of the liver, as a schematic: the hepatic artery from the heart, the portal
 * vein from the gut, and the hepatic vein which takes the blood back. Every vessel is as wide as
 * the blood it carries, so the picture changes while an object is turned.
 *
 * The drawing is in a box of a hundred by a hundred, which is scaled into the room it is given.
 */

import type {PressureSolution} from "@pkpdsim-tui/cardio-sim";
import {attributes, svg} from "@pkpdsim-tui/tui-kit";
import type {Box} from "@pkpdsim-tui/tui-kit";

const LIVER_PATH = "M 44 22 C 58 12, 88 14, 93 31 C 98 48, 85 62, 64 62 C 50 62, 42 46, 44 22 Z";
const GUT_PATH = "M 8 66 C 8 58, 30 56, 30 66 C 30 72, 26 74, 26 80 C 26 88, 10 90, 8 82 "
  + "C 6 74, 8 72, 8 66 Z";
const HEART_PATH = "M 16 6 C 20 1, 28 3, 28 9 C 28 15, 20 19, 16 23 C 12 19, 4 15, 4 9 "
  + "C 4 3, 12 1, 16 6 Z";

/** The width of a vessel which carries this flow, in the units of the drawing. */
function width(flow: number): number {
  return Math.min(9, Math.max(0.9, 5.4 * Math.sqrt(Math.max(flow, 0) / 1.5)));
}

export interface Supply {
  resize(box: Box): void;
  update(solution: PressureSolution): void;
}

export function createSupply(parent: SVGSVGElement): Supply {
  const root = svg("g", {class: "supply"}, parent);
  const inner = svg("g", {class: "supply-inner"}, root);

  const artery = svg("path", {
    class: "supply-vessel supply-vessel--artery",
    d: "M 22 22 C 24 34, 32 30, 44 32",
    "data-info": "The hepatic artery, straight from the aorta: a quarter of the blood of the "
      + "liver, and the oxygen it works with.",
  }, inner);
  const portal = svg("path", {
    class: "supply-vessel supply-vessel--portal",
    d: "M 27 68 C 40 68, 40 54, 50 50",
    "data-info": "The portal vein. Everything the stomach, the gut and the spleen absorb goes "
      + "to the liver first, before any of it reaches the rest of the body.",
  }, inner);
  const hepatic = svg("path", {
    class: "supply-vessel supply-vessel--hepatic",
    d: "M 90 28 C 94 18, 70 14, 46 12",
    "data-info": "The hepatic vein, which takes the blood on to the vena cava and the heart.",
  }, inner);

  svg("path", {
    class: "supply-organ supply-organ--heart", d: HEART_PATH,
    "data-info": "The heart, which sends the blood of the aorta to every organ.",
  }, inner);
  svg("path", {
    class: "supply-organ supply-organ--gut", d: GUT_PATH,
    "data-info": "The stomach and the gut. What is absorbed here, food and drugs alike, is "
      + "handed to the liver before the body ever sees it.",
  }, inner);
  svg("path", {
    class: "supply-organ supply-organ--liver", d: LIVER_PATH,
    "data-info": "The liver. It is the only organ with two supplies: one of oxygen from the "
      + "artery, one of everything that was eaten from the gut.",
  }, inner);

  const name = (text: string, x: number, y: number, extra = ""): SVGTextElement => {
    const element = svg("text", {class: `supply-name ${extra}`, x, y}, inner);
    element.textContent = text;
    return element;
  };
  name("Heart", 16, 30, "supply-name--centre");
  name("Gut", 17, 95, "supply-name--centre");
  name("Liver", 68, 40, "supply-name--organ");

  const value = (x: number, y: number, extra = ""): SVGTextElement =>
    svg("text", {class: `supply-value ${extra}`, x, y}, inner);
  const arteryValue = value(31, 26);
  const portalValue = value(31, 59);
  const hepaticValue = value(66, 9, "supply-value--end");
  const share = svg("text", {class: "supply-share", x: 68, y: 50}, inner);

  return {
    resize(box: Box): void {
      // The drawing keeps its proportions and sits in the middle of the room it is given.
      const scale = Math.min(box.width / 100, box.height / 100);
      const left = box.x + (box.width - 100 * scale) / 2;
      const top = box.y + (box.height - 100 * scale) / 2;
      inner.setAttribute("transform", `translate(${left} ${top}) scale(${scale})`);
    },

    update(solution: PressureSolution): void {
      attributes(artery, {"stroke-width": width(solution.qha)});
      attributes(portal, {"stroke-width": width(solution.qpo)});
      attributes(hepatic, {"stroke-width": width(solution.qh)});
      arteryValue.textContent = `${solution.qha.toFixed(2)} l/min`;
      portalValue.textContent = `${solution.qpo.toFixed(2)} l/min`;
      hepaticValue.textContent = `${solution.qh.toFixed(2)} l/min`;
      share.textContent = solution.co === 0
        ? ""
        : `${Math.round(100 * solution.qh / solution.co)}% of the heart`;
    },
  };
}
