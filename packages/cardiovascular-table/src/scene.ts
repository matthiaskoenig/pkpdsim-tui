/**
 * The circulation as a circuit, drawn over the anatomy. The silhouette and the organ anchors are
 * the ones pkpdsim exports for its physiology figures, so the table and the documentation show
 * the same body; the vessels on top of it are the topology of the pressure network, not the
 * anatomy of the vessels.
 *
 * It reads as one loop, which is the thing a visitor comes away with: the arterial trunk runs
 * down one side, every organ hangs between the two trunks, the venous trunk runs back up the
 * other side to the heart, and the heart sends the blood through the lungs before it starts
 * again. The gut, the spleen and the pancreas drain into the portal vein instead, which is why
 * the liver sees a meal first. Every vessel is as wide as the flow it carries, every organ as
 * large as the flow it gets, and the names are read at the edges rather than on top of the
 * organs, which sit on each other in the abdomen.
 */

import type {Body, PressureReference, PressureSolution} from "@pkpdsim-tui/cardio-sim";
import {
  attributes, line, organName, organRadius, perfusionColor, svg, vesselWidth,
} from "@pkpdsim-tui/tui-kit";

/**
 * How wide a vessel of this figure is. A vessel is as wide as the square root of its flow, so
 * that the area of the pipe is the flow: the scale is as generous as the body allows, because
 * the width is what a visitor reads a change off from across the table.
 */
function width(flow: number): number {
  return vesselWidth(flow, 0.95, 0.3, 3.6);
}

/** The disc of an organ, which is as large as the flow it gets. */
function radius(flow: number): number {
  return organRadius(flow, 0.8, 1.25, 3.2);
}
import type {Voice} from "@pkpdsim-tui/tui-kit";
import {CARDIO_TEXT} from "./text.ts";
import type {BeatCycle, BeatFrame} from "./beat.ts";

export interface Viewport {
  readonly width: number;
  readonly height: number;
}

/** The circuit, in the centimetres of the anatomy. */
const TRUNK = {arterial: -16, venous: 16, top: 34, bottom: 148} as const;
/** Where the portal organs meet before the portal vein carries them into the liver. */
const PORTAL_NODE = {x: 10.5, y: 66} as const;
/** The columns the names are read in, clear of the body. */
const NAME = {left: -31, right: 31} as const;
/** The share of the room under the band of numbers the body takes. */
const BODY_SHARE = 0.96;
/** What the figure keeps clear of: the panel, the plots, and the band of numbers above it. */
// The foot keeps the row of the corner free: the gear, who the tables are solved for, and the
// square of the laboratory stand there, and the feet of the figure are not drawn into them.
const EDGES = {panel: 404, plots: 468, band: 118, foot: 72} as const;
/** The ventricle on the anatomy, which empties and fills with the solved beat. */
const VENTRICLE_RADIUS = 3.1;

/**
 * Which organs are named, and on which side their name is read. The organs which drain into the
 * vena cava are read down the left, the ones which drain into the portal vein down the right,
 * with the liver under them, which is where their blood goes.
 */
const LEFT_COLUMN: readonly string[] = ["br", "lu", "he", "ki", "sk", "ad", "mu", "bo", "go"];
const RIGHT_COLUMN: readonly string[] = ["st", "pa", "sp", "si", "la", "li"];

interface OrganVisual {
  readonly id: string;
  readonly name: string;
  readonly portal: boolean;
  readonly referenceFlow: number;
  readonly side: number;
  readonly x: number;
  readonly y: number;
  readonly disc: SVGCircleElement;
  /** The circle a finger has to find, which is wider than the organ it belongs to. */
  readonly field: SVGCircleElement;
  readonly supply: SVGPathElement;
  readonly drain: SVGPathElement;
  readonly label: SVGTextElement | undefined;
  readonly value: SVGTextElement | undefined;
}

/**
 * What the beating heart is doing at this moment of the cycle. The rate and the pressures are
 * written at the edges of the table, so the body itself carries no text of the beat.
 */
export interface BeatView {
  readonly cycle: BeatCycle;
  readonly frame: BeatFrame;
}

export interface Scene {
  resize(viewport: Viewport): void;
  update(solution: PressureSolution, reference: PressureReference): void;
  /** The frame of the beat, or nothing while the heart has not been solved yet. */
  beat(view: BeatView | undefined): void;
}

function anchorOf(body: Body, id: string): {x: number; y: number} | undefined {
  const anchor = body.anchors[id];
  return anchor === undefined ? undefined : {x: anchor[0], y: anchor[1]};
}

/** A branch which leaves a trunk and bends into the organ it feeds. */
function branch(fromX: number, toX: number, y: number, organY: number): string {
  const middle = (fromX + toX) / 2;
  return `M${fromX.toFixed(2)} ${y.toFixed(2)} Q${middle.toFixed(2)} ${organY.toFixed(2)} `
    + `${toX.toFixed(2)} ${organY.toFixed(2)}`;
}

/** The arrow which says which way the blood in a vessel runs. */
function arrowDefs(parent: SVGElement): void {
  const defs = svg("defs", {}, parent);
  for (const kind of ["arterial", "venous", "portal"]) {
    const marker = svg("marker", {
      id: `cv-${kind}-arrow`, viewBox: "0 0 10 10", refX: 8, refY: 5,
      markerWidth: 3.4, markerHeight: 3.4, orient: "auto-start-reverse",
      markerUnits: "userSpaceOnUse",
    }, defs);
    svg("path", {d: "M0 0 L10 5 L0 10 z", class: `vessel-arrow vessel-arrow--${kind}`}, marker);
  }
}

export function createScene(
  parent: SVGSVGElement, body: Body, reference: PressureReference, voice: Voice,
): Scene {
  const copy = voice.pick(CARDIO_TEXT);
  const root = svg("g", {class: "scene-body"}, parent);
  arrowDefs(root);
  // The exported body is a set of coloured anatomogram paths, not a single outline, and carries
  // its own fills. It is generated by pkpdsim, so it is inserted as it comes.
  const art = svg("g", {class: "body-art"}, root);
  art.innerHTML = body.svg;

  const leaders = svg("g", {class: "layer layer--leaders"}, root);
  const drains = svg("g", {class: "layer layer--drains"}, root);
  const portals = svg("g", {class: "layer layer--portal"}, root);
  const supplies = svg("g", {class: "layer layer--supply"}, root);
  const discs = svg("g", {class: "layer layer--organs"}, root);
  const labels = svg("g", {class: "layer layer--labels"}, root);

  // Where each name is read, as a row of its column: the organs of the abdomen sit on each
  // other, so their names are spread out at the edges instead.
  const named = new Map<string, number>();
  const column = (ids: readonly string[]): void => {
    const top = 24;
    const step = (TRUNK.bottom - 4 - top) / Math.max(1, ids.length - 1);
    for (const [index, id] of ids.entries()) named.set(id, top + index * step);
  };
  column(LEFT_COLUMN);
  column(RIGHT_COLUMN);
  const rowOf = (id: string): number => named.get(id) ?? 24;

  const heart = anchorOf(body, "he") ?? {x: 0, y: 44};
  const lungs = anchorOf(body, "lu") ?? {x: -6, y: 42};
  const liver = anchorOf(body, "li") ?? {x: -1.6, y: 56};

  // The loop, in the order the blood runs it: out of the heart, down the arterial trunk, through
  // the organs, up the venous trunk, back to the heart and through the lungs.
  const aortaArch = svg("path", {
    class: "vessel vessel--arterial", "marker-end": "url(#cv-arterial-arrow)",
    d: `M${heart.x} ${heart.y} Q${TRUNK.arterial} ${heart.y} ${TRUNK.arterial} ${TRUNK.top}`,
  }, supplies);
  const aorta = svg("path", {
    class: "vessel vessel--arterial", "marker-end": "url(#cv-arterial-arrow)",
    d: line(TRUNK.arterial, TRUNK.top, TRUNK.arterial, TRUNK.bottom),
  }, supplies);
  const cava = svg("path", {
    class: "vessel vessel--venous", "marker-end": "url(#cv-venous-arrow)",
    d: line(TRUNK.venous, TRUNK.bottom, TRUNK.venous, TRUNK.top),
  }, drains);
  const cavaArch = svg("path", {
    class: "vessel vessel--venous", "marker-end": "url(#cv-venous-arrow)",
    d: `M${TRUNK.venous} ${TRUNK.top} Q${TRUNK.venous} ${heart.y} ${heart.x} ${heart.y}`,
  }, drains);
  const pulmonaryArtery = svg("path", {
    class: "vessel vessel--venous", "marker-end": "url(#cv-venous-arrow)",
    d: `M${heart.x} ${heart.y - 1.2} Q${(heart.x + lungs.x) / 2} ${lungs.y - 4} `
      + `${lungs.x} ${lungs.y}`,
  }, drains);
  const pulmonaryVein = svg("path", {
    class: "vessel vessel--arterial", "marker-end": "url(#cv-arterial-arrow)",
    d: `M${lungs.x} ${lungs.y + 1.4} Q${(heart.x + lungs.x) / 2} ${lungs.y + 5} `
      + `${heart.x} ${heart.y + 1.4}`,
  }, supplies);

  const lungDisc = svg("circle", {
    class: "organ", cx: lungs.x, cy: lungs.y, r: 3, "fill-opacity": 0.88,
  }, discs);
  const lungField = svg("circle", {class: "organ-field", cx: lungs.x, cy: lungs.y, r: 4.2}, discs);
  const lungRow = rowOf("lu");
  const lungLabel = svg("text", {
    class: "organ-label", x: NAME.left, y: lungRow, "text-anchor": "end",
  }, labels);
  lungLabel.textContent = organName(voice, "lu", "Lungs");
  const lungValue = svg("text", {
    class: "organ-value", x: NAME.left, y: lungRow + 3.4, "text-anchor": "end",
  }, labels);
  svg("path", {
    class: "organ-leader", d: line(NAME.left + 0.6, lungRow - 1, lungs.x - 1, lungs.y),
  }, leaders);

  // The liver hangs between three vessels: the artery, the portal vein and the hepatic vein.
  const hepaticArtery = svg("path", {
    class: "vessel vessel--arterial", "marker-end": "url(#cv-arterial-arrow)",
    d: branch(TRUNK.arterial, liver.x, liver.y - 2, liver.y - 1),
  }, supplies);
  const portalVein = svg("path", {
    class: "vessel vessel--portal", "marker-end": "url(#cv-portal-arrow)",
    d: `M${PORTAL_NODE.x} ${PORTAL_NODE.y} Q${(PORTAL_NODE.x + liver.x) / 2} ${liver.y + 3} `
      + `${liver.x + 1} ${liver.y + 1}`,
  }, portals);
  const hepaticVein = svg("path", {
    class: "vessel vessel--venous", "marker-end": "url(#cv-venous-arrow)",
    d: `M${liver.x} ${liver.y} Q${(liver.x + TRUNK.venous) / 2} ${liver.y - 4} `
      + `${TRUNK.venous} ${liver.y - 6}`,
  }, drains);

  const organs: OrganVisual[] = [];
  for (const organ of reference.organs) {
    const anchor = anchorOf(body, organ.id);
    if (anchor === undefined) continue;
    const supply = svg("path", {
      class: "vessel vessel--arterial", "marker-end": "url(#cv-arterial-arrow)",
      d: branch(TRUNK.arterial, anchor.x, anchor.y, anchor.y),
    }, supplies);
    const drain = organ.portal
      ? svg("path", {
        class: "vessel vessel--portal", "marker-end": "url(#cv-portal-arrow)",
        d: branch(anchor.x, PORTAL_NODE.x, anchor.y, PORTAL_NODE.y),
      }, portals)
      : svg("path", {
        class: "vessel vessel--venous", "marker-end": "url(#cv-venous-arrow)",
        d: branch(anchor.x, TRUNK.venous, anchor.y, anchor.y),
      }, drains);
    const disc = svg("circle", {
      class: "organ", cx: anchor.x, cy: anchor.y, r: 2, "fill-opacity": 0.88,
    }, discs);
    // A visitor who wants to know what an organ is doing hovers it, or rests a finger on it.
    const field = svg("circle", {
      class: "organ-field", cx: anchor.x, cy: anchor.y, r: 4.2,
    }, discs);
    const name = organName(voice, organ.id, organ.name);
    const row = organ.id === "li" ? undefined : named.get(organ.id);
    const right = RIGHT_COLUMN.includes(organ.id);
    const side = right ? 1 : -1;
    let label: SVGTextElement | undefined;
    let value: SVGTextElement | undefined;
    if (row !== undefined) {
      const x = right ? NAME.right : NAME.left;
      label = svg("text", {
        class: "organ-label", x, y: row, "text-anchor": right ? "start" : "end",
      }, labels);
      label.textContent = name;
      value = svg("text", {
        class: "organ-value", x, y: row + 3.4, "text-anchor": right ? "start" : "end",
      }, labels);
      // The thin line from the name to the organ it belongs to, which is how a figure is read.
      svg("path", {
        class: "organ-leader",
        d: `M${x + side * -0.6} ${row - 1} L${anchor.x + side * 2.4} ${anchor.y}`,
      }, leaders);
    }
    organs.push({
      id: organ.id, name, portal: organ.portal, referenceFlow: organ.flow,
      side, x: anchor.x, y: anchor.y, disc, field, supply, drain, label, value,
    });
  }

  // The liver is named at the foot of the right column: it is where that blood goes.
  const liverRow = rowOf("li");
  const liverLabel = svg("text", {
    class: "organ-label", x: NAME.right, y: liverRow, "text-anchor": "start",
  }, labels);
  liverLabel.textContent = organName(voice, "li", "Liver");
  const liverValue = svg("text", {
    class: "organ-value", x: NAME.right, y: liverRow + 3.4, "text-anchor": "start",
  }, labels);
  svg("path", {
    class: "organ-leader",
    d: `M${NAME.right - 0.6} ${liverRow - 1} L${liver.x + 2.4} ${liver.y}`,
  }, leaders);

  // The beating heart: the ventricle at the anchor of the heart. The ring is how full it is at
  // its fullest, so the eye sees the disc empty towards it and fill again.
  const beats = svg("g", {class: "layer layer--beat", opacity: 0}, root);
  svg("circle", {class: "ventricle-ring", cx: heart.x, cy: heart.y, r: VENTRICLE_RADIUS}, beats);
  const ventricle = svg("circle", {
    class: "ventricle", cx: heart.x, cy: heart.y, r: VENTRICLE_RADIUS,
  }, beats);

  return {
    resize(viewport: Viewport): void {
      // The body is as tall as the room under the band of numbers allows: the band is read
      // over it and not through it. On a narrow surface the two columns of names are what the
      // figure has to fit into, so the width has the last word.
      const room = viewport.height - EDGES.band - EDGES.foot;
      const between = viewport.width - EDGES.panel - EDGES.plots;
      const scale = Math.min(
        (room * BODY_SHARE) / body.height, between / (2 * Math.abs(NAME.left) + 24));
      // The circuit is as wide as its two name columns, and stands in the middle of what is
      // left between the panel and the plots rather than in the middle of the surface.
      const left = (EDGES.panel + (viewport.width - EDGES.plots)) / 2;
      const top = EDGES.band + (room - body.height * scale) / 2;
      root.setAttribute("transform", `translate(${left} ${top}) scale(${scale})`);
    },

    update(solution: PressureSolution, referenceState: PressureReference): void {
      const byId = new Map(solution.flows.map(organ => [organ.id, organ]));
      for (const organ of organs) {
        const solved = byId.get(organ.id);
        const flow = solved?.flow ?? 0;
        const ratio = organ.referenceFlow > 0 ? flow / organ.referenceFlow : 1;
        attributes(organ.disc, {r: radius(flow), fill: perfusionColor(ratio)});
        attributes(organ.supply, {"stroke-width": width(flow)});
        attributes(organ.drain, {"stroke-width": width(flow)});
        const share = solution.co > 0 ? (100 * flow) / solution.co : 0;
        const note = copy.organNote(
          organ.name, flow.toFixed(2), share.toFixed(0), organ.portal);
        organ.disc.setAttribute("data-info", note);
        organ.field.setAttribute("data-info", note);
        if (organ.value !== undefined) organ.value.textContent = `${flow.toFixed(2)} l/min`;
        organ.label?.setAttribute("data-info", note);
      }
      attributes(aorta, {"stroke-width": width(solution.co)});
      attributes(aortaArch, {"stroke-width": width(solution.co)});
      attributes(cava, {"stroke-width": width(solution.systemicFlow)});
      attributes(cavaArch, {"stroke-width": width(solution.co)});
      attributes(portalVein, {"stroke-width": width(solution.qpo)});
      attributes(hepaticVein, {"stroke-width": width(solution.qh)});
      attributes(hepaticArtery, {"stroke-width": width(Math.max(0, solution.qh - solution.qpo))});
      attributes(pulmonaryArtery, {"stroke-width": width(solution.co)});
      attributes(pulmonaryVein, {"stroke-width": width(solution.co)});
      attributes(lungDisc, {
        // The pulmonary flow is the whole cardiac output, so it gets a gentler scale than the
        // organs, or it would swallow the heart next to it.
        r: organRadius(solution.co, 0.9, 0.7, 3),
        fill: perfusionColor(solution.co / referenceState.cardiac_output),
      });
      lungValue.textContent = `${solution.co.toFixed(2)} l/min`;
      // The lungs take the whole output, which is the note behind them.
      const lungNote = copy.lungNote(solution.co.toFixed(2));
      lungDisc.setAttribute("data-info", lungNote);
      lungField.setAttribute("data-info", lungNote);
      lungLabel.setAttribute("data-info", lungNote);
      liverValue.textContent = `${solution.qh.toFixed(2)} l/min`;
      const liverFlow = byId.get("li");
      if (liverFlow !== undefined) {
        const share = solution.co > 0 ? (100 * solution.qh) / solution.co : 0;
        liverLabel.setAttribute(
          "data-info", copy.organNote(liverLabel.textContent ?? "", solution.qh.toFixed(2),
            share.toFixed(0), true));
      }
    },

    beat(view: BeatView | undefined): void {
      if (view === undefined) {
        beats.setAttribute("opacity", "0");
        return;
      }
      beats.setAttribute("opacity", "1");
      const {cycle, frame} = view;
      // The volume of a ventricle is a volume, so the radius follows its cube root: the disc
      // then grows the way the blood in it does.
      const filled = Math.max(0, Math.min(1, frame.volume / Math.max(cycle.maxVolume, 1e-9)));
      attributes(ventricle, {r: VENTRICLE_RADIUS * Math.cbrt(filled)});
    },
  };
}
