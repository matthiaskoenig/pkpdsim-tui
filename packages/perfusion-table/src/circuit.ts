/**
 * The machine, as the diagram of one: a reservoir, a roller pump, a heater, an oxygenator with
 * its gas line, and the organ hanging in the circuit, with the fluid running round the loop in
 * the direction the arrows point. Every part carries the setting it is at, so that the three
 * objects of the table are read on the machine itself and not only in the panel.
 *
 * The organ is drawn as what the model solves: one sinusoid from the portal inlet to the
 * central vein, with the hepatocytes along it in four zones. The oxygen falls from the first
 * zone to the last, which is why the far end of a sinusoid is the end which dies first, and the
 * zones carry that fall as their colour and as the number above each of them.
 *
 * The drawing is in a box of a hundred by a hundred, which is scaled into the room it is given.
 */

import {attributes, mixHex, svg} from "@pkpdsim-tui/tui-kit";
import type {Box, Voice} from "@pkpdsim-tui/tui-kit";
import {PERFUSION_TEXT} from "./text.ts";
import type {PerfusionReadout} from "./cards.ts";

/** The colour of a zone: from the blue of a starved zone to the warm tone of a supplied one. */
const STARVED = "#2f6fd0";
const SUPPLIED = "#e8a33d";
const DEAD = "#6b4a4a";

/** The way round the loop: out of the reservoir, through the pump, the heater and the gas. */
const TUBE = "M 10 64 L 10 44 M 10 36 L 10 26 L 16 20 L 30 20 L 44 20 L 50 20 L 50 34";
/** And back from the organ to the reservoir. */
const RETURN_TUBE = "M 94 62 L 94 86 L 20 86 L 20 78";

/** Where the sinusoid lies inside the organ, and how long each of its zones is. */
const SINUSOID = {x: 61, y: 49, width: 30, height: 3.4} as const;

export interface CircuitSettings {
  /** The pump, in millilitres a minute. */
  readonly flow: number;
  /** The oxygen of the gas, in kPa. */
  readonly oxygen: number;
  /** The bath, in degrees. */
  readonly temperature: number;
}

export interface Circuit {
  resize(box: Box): void;
  update(readout: PerfusionReadout, settings: CircuitSettings): void;
}

export function createCircuit(parent: SVGSVGElement, voice: Voice): Circuit {
  const copy = voice.pick(PERFUSION_TEXT);
  const root = svg("g", {class: "circuit"}, parent);
  // Why a liver is put on a machine at all. It stands over the drawing, in the type of the
  // table rather than in the hundred by hundred of the schematic.
  const motivation = svg("text", {class: "circuit-motivation"}, root);
  motivation.textContent = voice.say(copy.motivation);
  const inner = svg("g", {class: "circuit-inner"}, root);

  /** One arrowhead on a tube, which says which way the fluid runs. */
  const arrow = (x: number, y: number, turn: number): void => {
    svg("path", {
      class: "circuit-arrow", d: "M -2 -2.4 L 2.6 0 L -2 2.4 Z",
      transform: `translate(${x} ${y}) rotate(${turn})`,
    }, inner);
  };

  svg("path", {
    class: "circuit-tube", d: TUBE,
    "data-info": voice.say(copy.partInfo.tube),
  }, inner);
  const back = svg("path", {
    class: "circuit-tube circuit-tube--return", d: RETURN_TUBE,
    "data-info": voice.say(copy.partInfo.return),
  }, inner);

  // The reservoir: a vessel with what is in it and a vent, open to the air.
  const reservoir = svg("g", {
    class: "circuit-group", "data-info": voice.say(copy.partInfo.reservoir),
  }, inner);
  svg("rect", {
    class: "circuit-part circuit-part--reservoir", x: 4, y: 64, width: 22, height: 20, rx: 3,
  }, reservoir);
  svg("path", {class: "circuit-fluid", d: "M 6 72 h 18 v 10 a 2 2 0 0 1 -2 2 h -14 a 2 2 0 0 1 -2 -2 z"}, reservoir);
  svg("path", {class: "circuit-thin", d: "M 22 64 L 22 60"}, reservoir);

  // The pump: a roller head, which turns at the rate it is set to.
  const pump = svg("g", {
    class: "circuit-pump", "data-info": voice.say(copy.partInfo.pump),
  }, inner);
  svg("path", {
    class: "circuit-housing", d: "M 10 36 A 8 8 0 1 0 10 44",
  }, pump);
  svg("circle", {class: "circuit-part", cx: 16, cy: 40, r: 5.6}, pump);
  const blades = svg("g", {class: "circuit-blades"}, pump);
  svg("circle", {class: "circuit-roller", cx: 16, cy: 35.4, r: 1.5}, blades);
  svg("circle", {class: "circuit-roller", cx: 20, cy: 42.3, r: 1.5}, blades);
  svg("circle", {class: "circuit-roller", cx: 12, cy: 42.3, r: 1.5}, blades);

  // The heater, which holds the perfusate at the temperature of the bath.
  const heater = svg("g", {
    class: "circuit-group", "data-info": voice.say(copy.partInfo.heater),
  }, inner);
  svg("rect", {
    class: "circuit-part circuit-part--heater", x: 24, y: 15, width: 12, height: 10, rx: 2,
  }, heater);
  svg("path", {
    class: "circuit-thin circuit-wave",
    d: "M 26.5 20 q 1.5 -3 3 0 t 3 0 t 3 0",
  }, heater);

  // The oxygenator: a membrane module with the gas line into it and its vent.
  const oxygenator = svg("g", {
    class: "circuit-group", "data-info": voice.say(copy.partInfo.oxygenator),
  }, inner);
  svg("rect", {
    class: "circuit-part circuit-part--oxygenator", x: 36, y: 13, width: 18, height: 14, rx: 2,
  }, oxygenator);
  for (let index = 1; index < 6; index += 1) {
    svg("path", {
      class: "circuit-membrane", d: `M ${36 + index * 3} 14.5 L ${36 + index * 3} 25.5`,
    }, oxygenator);
  }
  svg("path", {class: "circuit-gas", d: "M 45 6 L 45 13"}, oxygenator);
  arrow(45, 11.5, 90);

  const label = (text: string, x: number, y: number, extra = ""): SVGTextElement => {
    const element = svg("text", {class: `circuit-label ${extra}`, x, y}, inner);
    element.textContent = text;
    return element;
  };
  const value = (x: number, y: number, extra = ""): SVGTextElement =>
    svg("text", {class: `circuit-value ${extra}`, x, y}, inner);

  label(copy.parts.reservoir, 15, 92);
  label(copy.parts.pump, 16, 52);
  label(copy.parts.heater, 30, 31);
  label(copy.parts.oxygenator, 45, 10, "circuit-label--gas");
  label(copy.parts.liver, 75, 32);
  label(copy.parts.bile, 72, 76, "circuit-label--left");
  const flowValue = value(16, 56);
  const heatValue = value(30, 35);
  const oxygenValue = value(58, 11, "circuit-label--gas-value");
  const bileValue = value(72, 80, "circuit-label--left");

  // The fluid runs round the loop: out of the reservoir, up through the pump and the gas, into
  // the organ, and back along the floor of the drawing.
  arrow(10, 52, -90);
  arrow(10, 24, -90);
  arrow(33, 20, 0);
  arrow(50, 31, 90);
  arrow(94, 76, 90);
  arrow(60, 86, 180);

  // The organ, and the one sinusoid the model solves inside it.
  svg("path", {
    class: "circuit-organ",
    // A liver seen from the front, which the sinusoid of the model is drawn inside.
    d: "M 57 46 C 57 38 63 34 73 34 L 88 35 C 94 36 96 41 95 49"
      + " C 94 57 90 64 82 67 C 73 70 62 68 58 60 C 56.5 56 57 50 57 46 Z",
    "data-info": voice.say(copy.partInfo.organ),
  }, inner);
  const sinusoid = svg("g", {class: "circuit-sinusoid"}, inner);
  // The portal inlet at one end and the central vein at the other, which is what the zones run
  // between: the names of the two ends of the zonation.
  svg("path", {
    class: "circuit-vessel circuit-vessel--portal", d: "M 50 34 L 50 50.5 L 61 50.5",
  }, sinusoid);
  svg("path", {
    class: "circuit-vessel circuit-vessel--central", d: "M 91 50.5 L 94 50.5 L 94 62",
  }, sinusoid);
  svg("circle", {class: "circuit-vessel-end", cx: 94, cy: 50.5, r: 2.2}, sinusoid);
  const zones = Array.from({length: 4}, (_unused, index) => {
    const width = SINUSOID.width / 4;
    const x = SINUSOID.x + index * width;
    const group = svg("g", {
      class: "circuit-zone",
      "data-info": index === 0
        ? voice.say(copy.zoneInfo.first)
        : index === 3
          ? voice.say(copy.zoneInfo.last)
          : copy.zoneInfo.middle(index + 1),
    }, sinusoid);
    // The hepatocytes along the sinusoid, above it and below it, and the lumen between them.
    const above = svg("rect", {
      class: "circuit-cells", x: x + 0.4, y: SINUSOID.y - 7, width: width - 0.8, height: 6,
      rx: 1.2,
    }, group);
    const below = svg("rect", {
      class: "circuit-cells", x: x + 0.4, y: SINUSOID.y + SINUSOID.height + 1,
      width: width - 0.8, height: 6, rx: 1.2,
    }, group);
    const lumen = svg("rect", {
      class: "circuit-lumen", x, y: SINUSOID.y, width, height: SINUSOID.height,
    }, group);
    const number = svg("text", {
      class: "circuit-zone-value", x: x + width / 2, y: SINUSOID.y - 8.5,
    }, group);
    // Which zone of the four this is, under the cells of it.
    const name = svg("text", {
      class: "circuit-zone-number", x: x + width / 2, y: SINUSOID.y + 14,
    }, group);
    name.textContent = String(index + 1);
    return {above, below, lumen, number};
  });
  // Which end is which, which is the whole point of a zonation.
  const ends = svg("g", {class: "circuit-ends"}, inner);
  const periportal = svg("text", {
    class: "circuit-zone-name", x: SINUSOID.x - 2, y: SINUSOID.y + 21, "text-anchor": "start",
  }, ends);
  periportal.textContent = copy.zones.periportal;
  const pericentral = svg("text", {
    class: "circuit-zone-name", x: SINUSOID.x + SINUSOID.width + 2, y: SINUSOID.y + 21,
    "text-anchor": "end",
  }, ends);
  pericentral.textContent = copy.zones.pericentral;

  // The bile, which the organ makes and which runs into a vial of its own.
  const bile = svg("path", {
    class: "circuit-bile", d: "M 78 66 L 78 72",
    "data-info": voice.say(copy.partInfo.bile),
  }, inner);
  svg("path", {
    class: "circuit-part circuit-part--vial", d: "M 74 72 h 8 v 3 a 4 4 0 0 1 -8 0 z",
    "data-info": voice.say(copy.partInfo.bile),
  }, inner);

  return {
    resize(box: Box): void {
      const scale = Math.min(box.width / 100, box.height / 100);
      const left = box.x + (box.width - 100 * scale) / 2;
      const top = box.y + (box.height - 100 * scale) / 2;
      inner.setAttribute("transform", `translate(${left} ${top}) scale(${scale})`);
      attributes(motivation, {x: left, y: Math.max(top - 14, 24), "text-anchor": "start"});
    },

    update(readout: PerfusionReadout, settings: CircuitSettings): void {
      const flow = settings.flow;
      // The rollers turn at the rate the pump is set to, so the machine shows its own setting.
      blades.style.setProperty("--spin", `${(2.4 / Math.max(flow, 0.2)).toFixed(2)}s`);
      const width = Math.max(0.8, Math.min(4, 1.1 * Math.sqrt(flow)));
      inner.querySelectorAll(".circuit-tube").forEach(tube => {
        tube.setAttribute("stroke-width", width.toFixed(2));
      });
      back.setAttribute("stroke-width", width.toFixed(2));
      flowValue.textContent = `${flow.toFixed(1)} ${copy.units.flow}`;
      heatValue.textContent = `${settings.temperature.toFixed(0)} ${copy.units.temperature}`;
      oxygenValue.textContent = `${settings.oxygen.toFixed(0)} ${copy.units.oxygen}`;
      bileValue.textContent = `${readout.bile.toFixed(1)} ${copy.units.bile}`;

      const inflow = Math.max(readout.inflow, 1e-6);
      for (const [index, zone] of zones.entries()) {
        const state = readout.zones[index];
        if (state === undefined) continue;
        const supply = Math.max(0, Math.min(1, state.oxygen / inflow));
        const colour = mixHex(mixHex(STARVED, SUPPLIED, supply), DEAD, 1 - state.alive);
        attributes(zone.above, {fill: colour});
        attributes(zone.below, {fill: colour});
        // The lumen carries the oxygen of the fluid at that point, which is what the cells
        // beside it are living on.
        attributes(zone.lumen, {fill: mixHex(STARVED, SUPPLIED, supply)});
        zone.number.textContent = `${state.oxygen.toFixed(0)}`;
      }
      bile.setAttribute("stroke-width", Math.max(0.5, Math.min(3, readout.bile / 1.6)).toFixed(2));
    },
  };
}
