/**
 * The machine: a reservoir, a pump, an oxygenator and the organ hanging in the circuit. The
 * organ is drawn as the chain of zones the model solves, from the inflow to the outflow, each
 * one as alive and as well supplied with oxygen as the model says it is.
 *
 * The drawing is in a box of a hundred by a hundred, which is scaled into the room it is given.
 */

import {attributes, mixHex, svg} from "@pkpdsim-tui/tui-kit";
import type {Box} from "@pkpdsim-tui/tui-kit";
import type {PerfusionReadout} from "./cards.ts";

/** The colour of a zone: from the blue of a starved zone to the warm tone of a supplied one. */
const STARVED = "#2f6fd0";
const SUPPLIED = "#e8a33d";
const DEAD = "#6b4a4a";

const TUBE = "M 16 70 L 16 48 L 16 30 L 30 20 L 52 20";
const RETURN_TUBE = "M 86 62 L 92 78 L 26 84 L 16 78";

export interface Circuit {
  resize(box: Box): void;
  update(readout: PerfusionReadout, flow: number): void;
}

export function createCircuit(parent: SVGSVGElement): Circuit {
  const root = svg("g", {class: "circuit"}, parent);
  const inner = svg("g", {class: "circuit-inner"}, root);

  svg("path", {
    class: "circuit-tube", d: TUBE,
    "data-info": "The tubing. The perfusate is pumped out of the reservoir, through the "
      + "oxygenator, and into the organ.",
  }, inner);
  const back = svg("path", {
    class: "circuit-tube circuit-tube--return", d: RETURN_TUBE,
    "data-info": "What has been through the organ goes back to the reservoir, and round again.",
  }, inner);

  svg("rect", {
    class: "circuit-part circuit-part--reservoir", x: 6, y: 68, width: 20, height: 18, rx: 3,
    "data-info": "The reservoir, which holds the fluid the organ is perfused with. It carries "
      + "no red blood cells: all of its oxygen is dissolved.",
  }, inner);
  const pump = svg("g", {
    class: "circuit-pump",
    "data-info": "The pump. It sets how much fluid goes through the organ every minute.",
  }, inner);
  svg("circle", {class: "circuit-part", cx: 16, cy: 48, r: 7}, pump);
  const blades = svg("path", {
    class: "circuit-blades", d: "M 16 42 L 16 54 M 10.8 45 L 21.2 51 M 10.8 51 L 21.2 45",
  }, pump);
  svg("rect", {
    class: "circuit-part circuit-part--oxygenator", x: 30, y: 10, width: 24, height: 14, rx: 3,
    "data-info": "The oxygenator, where the fluid meets the gas and takes its oxygen up. It is "
      + "the lung of the circuit.",
  }, inner);

  const label = (text: string, x: number, y: number, extra = ""): SVGTextElement => {
    const element = svg("text", {class: `circuit-label ${extra}`, x, y}, inner);
    element.textContent = text;
    return element;
  };
  label("Reservoir", 16, 93);
  label("Pump", 16, 62);
  label("Oxygenator", 42, 8);
  label("Liver", 69, 14);
  label("Bile", 92, 48);

  // The organ: the chain of zones from the inflow to the outflow.
  const zones = Array.from({length: 4}, (_unused, index) => {
    const group = svg("g", {
      class: "circuit-zone",
      "data-info": index === 0
        ? "Zone 1, where the fluid arrives. These cells see the oxygen first."
        : index === 3
          ? "Zone 4, the far end of the sinusoid. Whatever is left of the oxygen reaches here, "
            + "which is why these cells die first."
          : `Zone ${index + 1}, between the inflow and the outflow.`,
    }, inner);
    const plate = svg("rect", {
      class: "circuit-zone-plate", x: 56 + index * 8, y: 26, width: 7, height: 30, rx: 2,
    }, group);
    const number = svg("text", {
      class: "circuit-zone-number", x: 59.5 + index * 8, y: 61,
    }, group);
    number.textContent = String(index + 1);
    const value = svg("text", {class: "circuit-zone-value", x: 59.5 + index * 8, y: 23}, group);
    return {plate, value};
  });
  svg("path", {
    class: "circuit-organ",
    d: "M 52 20 C 48 36, 50 58, 60 64 L 84 64 C 94 56, 92 30, 86 20 Z",
    "data-info": "The organ on the machine: a rat liver, the model of the perfusion library of "
      + "pkpdsim. The same machines keep human livers alive on the way to a transplant.",
  }, inner);
  const bile = svg("path", {
    class: "circuit-bile", d: "M 86 42 L 94 42",
    "data-info": "The bile duct. What drips out of it is the surest sign that the organ is "
      + "still doing its work.",
  }, inner);

  return {
    resize(box: Box): void {
      const scale = Math.min(box.width / 100, box.height / 100);
      const left = box.x + (box.width - 100 * scale) / 2;
      const top = box.y + (box.height - 100 * scale) / 2;
      inner.setAttribute("transform", `translate(${left} ${top}) scale(${scale})`);
    },

    update(readout: PerfusionReadout, flow: number): void {
      // The blades turn at the rate the pump is set to, so the machine itself shows the setting.
      blades.style.setProperty("--spin", `${(2.4 / Math.max(flow, 0.2)).toFixed(2)}s`);
      const width = Math.max(0.8, Math.min(4, 1.1 * Math.sqrt(flow)));
      inner.querySelectorAll(".circuit-tube").forEach(tube => {
        tube.setAttribute("stroke-width", width.toFixed(2));
      });
      back.setAttribute("stroke-width", width.toFixed(2));
      const inflow = Math.max(readout.inflow, 1e-6);
      for (const [index, zone] of zones.entries()) {
        const state = readout.zones[index];
        if (state === undefined) continue;
        const supply = Math.max(0, Math.min(1, state.oxygen / inflow));
        const colour = mixHex(mixHex(STARVED, SUPPLIED, supply), DEAD, 1 - state.alive);
        zone.plate.setAttribute("fill", colour);
        zone.value.textContent = `${state.oxygen.toFixed(0)}`;
      }
      bile.setAttribute("stroke-width", Math.max(0.5, Math.min(3, readout.bile / 1.6)).toFixed(2));
    },
  };
}
