/**
 * The landing page: the two reference bodies of pkpdsim, the tables arranged around them, and a
 * heading which says what the whole thing is for. It carries no panel; what a card or a body is
 * waits behind it as a note, for the visitor who asks.
 *
 * A card is opened by holding a finger on it, by touching the organ it points at, or with the
 * mouse. The body a visitor touches is the body every table is then solved for.
 */

import {loadAnatomy} from "@pkpdsim-tui/cardio-sim";
import type {Body} from "@pkpdsim-tui/cardio-sim";
import {openTableInput} from "@pkpdsim-tui/tuio-input";
import type {TableSnapshot, TableStatus, TrackerOptions} from "@pkpdsim-tui/tuio-input";
import {attributes, chooseQuery, createInfo, pointerPoints, svg, tokenPoints} from "@pkpdsim-tui/tui-kit";
import type {TableApp, TableHost, Viewport} from "@pkpdsim-tui/tui-kit";
import {OVERVIEW, TABLES} from "./tables.ts";
import type {TableEntry} from "./tables.ts";
import {wrapText} from "./wrap.ts";

/** What the table is for, in the two lines under the heading. */
const HEADING = "The body on the table";
const MOTIVATION = [
  "Five working models of the human body, solved while you move the objects on the glass.",
  "How the blood reaches every organ, what the liver does with it, and where a tablet goes.",
];
/** The card of a table, in pixels. */
const CARD = {height: 132, gap: 22, margin: 28, minWidth: 250, maxWidth: 360} as const;
/** The room the heading takes at the top. */
const HEAD = {top: 78, line: 34, bottom: 34} as const;
const PADDING: number = 20;
/** How much of a sentence a card holds: characters on a line, and lines. */
const COLUMNS = 32;
const LINES = 2;
/** How far the bodies stay away from the cards. */
const BODY_GAP = 34;
/** Between the two bodies, in pixels. */
const BODY_SPLIT = 90;
/** How much of the room between the heading and the cards a body takes. */
const BODY_SHARE = 0.96;
/**
 * How close to the organ of a table a finger has to be to open it, in pixels. The organs of the
 * body are a few centimetres apart, so a mark never reaches further than halfway to its
 * neighbour: the heart, the liver and the gut stay three targets.
 */
const ORGAN_HIT = {max: 30, min: 13} as const;

interface CardBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** One card: the elements which move when the surface is resized. */
interface CardView {
  readonly entry: TableEntry;
  readonly group: SVGGElement;
  readonly plate: SVGRectElement;
  readonly badge: SVGCircleElement;
  readonly number: SVGTextElement;
  readonly title: SVGTextElement;
  readonly lines: readonly SVGTextElement[];
  readonly call: SVGTextElement;
  readonly arm: SVGRectElement;
  box: CardBox;
}

/** One of the two bodies on the surface, which is also the switch of the reference body. */
interface BodyView {
  readonly sex: "male" | "female";
  readonly body: Body;
  readonly group: SVGGElement;
  readonly art: SVGGElement;
  readonly label: SVGTextElement;
  readonly halo: SVGRectElement;
  layout: {scale: number; left: number; top: number};
}

/**
 * Where the cards sit: two at each side of the bodies and one below them, so that the tables
 * surround the people rather than lining up at one edge.
 */
function cardBoxes(viewport: Viewport, count: number): readonly CardBox[] {
  const width = Math.min(
    CARD.maxWidth, Math.max(CARD.minWidth, Math.round(viewport.width * 0.19)));
  const height = CARD.height;
  const left = CARD.margin;
  const right = viewport.width - CARD.margin - width;
  const top = HEAD.top + HEAD.line * MOTIVATION.length + HEAD.bottom;
  const second = top + height + CARD.gap;
  const bottom = viewport.height - CARD.margin - height;
  const slots: readonly {x: number; y: number}[] = [
    {x: left, y: top}, {x: right, y: top},
    {x: right, y: second}, {x: left, y: second},
    {x: Math.round((viewport.width - width) / 2), y: bottom},
  ];
  return Array.from({length: count}, (_unused, index) => {
    const slot = slots[index % slots.length] ?? {x: left, y: top};
    return {x: slot.x, y: slot.y, width, height};
  });
}

/** The room the bodies have: between the columns of cards, under the heading. */
function bodyBox(viewport: Viewport, boxes: readonly CardBox[]): CardBox {
  const width = boxes[0]?.width ?? CARD.minWidth;
  const top = HEAD.top + HEAD.line * MOTIVATION.length + HEAD.bottom;
  const bottom = viewport.height - CARD.margin - CARD.height - BODY_GAP;
  return {
    x: CARD.margin + width + BODY_GAP,
    y: top,
    width: viewport.width - 2 * (CARD.margin + width + BODY_GAP),
    height: Math.max(200, bottom - top),
  };
}

function anchorOf(body: Body, id: string): {x: number; y: number} {
  const anchor = body.anchors[id];
  return anchor === undefined ? {x: 0, y: body.height / 2} : {x: anchor[0], y: anchor[1]};
}

/** What a person at the table should do, which depends on what the page is driven by. */
function hintFor(tracker: TrackerOptions, state: TableStatus["state"]): string {
  if (!tracker.tracker) return "Click a card to open its table.";
  if (state === "connected") {
    return tracker.discovered
      ? "Hold a finger on a card, or click it, to open its table."
      : "Hold a finger on a card to open its table.";
  }
  return `Start a TUIO ${tracker.version} tracker on ${tracker.address}, or drop "?tuio" from `
    + "the address to drive the table with the mouse.";
}

function createCard(
  parent: SVGGElement, entry: TableEntry, index: number, call: string,
  open: (entry: TableEntry) => void,
): CardView {
  const group = svg("g", {
    class: "hub-card", role: "button", tabindex: 0,
    // A finger has no click: it opens the card it rests on, and the card fills while it does.
    "data-dwell": `app:${entry.id}`,
    // What the table is, for the visitor who wants more than the card says.
    "data-info": entry.about,
  }, parent);
  const plate = svg("rect", {class: "hub-card-plate", rx: 18}, group);
  const badge = svg("circle", {class: "hub-card-badge", r: 17}, group);
  const number = svg("text", {class: "hub-card-number", "text-anchor": "middle"}, group);
  number.textContent = String(index + 1);
  const title = svg("text", {class: "hub-card-title"}, group);
  title.textContent = entry.title;
  const lines = wrapText(entry.blurb, COLUMNS, LINES).map(text => {
    const element = svg("text", {class: "hub-card-line"}, group);
    element.textContent = text;
    return element;
  });
  const opener = svg("text", {class: "hub-card-call"}, group);
  opener.textContent = call;
  const arm = svg("rect", {class: "hub-card-arm", height: 4}, group);
  group.addEventListener("click", () => open(entry));
  group.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    open(entry);
  });
  return {
    entry, group, plate, badge, number, title, lines, call: opener, arm,
    box: {x: 0, y: 0, width: 0, height: 0},
  };
}

function placeCard(card: CardView, box: CardBox): void {
  card.box = box;
  attributes(card.plate, {x: box.x, y: box.y, width: box.width, height: box.height});
  attributes(card.badge, {cx: box.x + PADDING + 17, cy: box.y + PADDING + 17});
  attributes(card.number, {x: box.x + PADDING + 17, y: box.y + PADDING + 23});
  attributes(card.title, {x: box.x + PADDING + 46, y: box.y + PADDING + 24});
  for (const [index, line] of card.lines.entries()) {
    attributes(line, {x: box.x + PADDING, y: box.y + PADDING + 50 + index * 20});
  }
  attributes(card.call, {x: box.x + PADDING, y: box.y + box.height - PADDING + 4});
  attributes(card.arm, {x: box.x, y: box.y + box.height - 4, width: box.width});
}

export const startOverview: TableApp = async (host: TableHost): Promise<void> => {
  host.progress("Loading the bodies...");
  // The figures are the ones the circulation is drawn on: the bodies of the pkpdsim physiology,
  // and they come with that export.
  const anatomy = await loadAnatomy(
    new URL("cardiovascular/cardiovascular-anatomy.json", host.assets));
  const chosen = host.parameters.get("sex") === "female" ? "female" : "male";

  const root = host.scene;
  const scene = svg("g", {class: "hub"}, root);
  const head = svg("g", {class: "hub-head"}, scene);
  const heading = svg("text", {
    class: "hub-heading", "text-anchor": "middle",
    "data-info": "Every table here is one model of the human body of pkpdsim. The objects on "
      + "the glass are its parameters, and the model is solved again while you turn them.",
  }, head);
  heading.textContent = HEADING;
  const motivation = MOTIVATION.map(text => {
    const line = svg("text", {class: "hub-motivation", "text-anchor": "middle"}, head);
    line.textContent = text;
    return line;
  });
  const figures = svg("g", {class: "hub-bodies"}, scene);
  const links = svg("g", {class: "hub-links"}, scene);
  const organs = svg("g", {class: "hub-organs"}, scene);
  const row = svg("g", {class: "hub-row"}, scene);
  const foot = svg("g", {class: "hub-foot"}, scene);
  const statusDot = svg("circle", {class: "hub-status-dot", r: 4}, foot);
  const statusText = svg("text", {class: "hub-status"}, foot);
  const credit = svg("text", {class: "hub-credit"}, foot);
  credit.textContent = anatomy.attribution;

  const open = (entry: TableEntry): void => {
    chooseQuery("app", entry.id, OVERVIEW);
  };

  const {input, tracker} = await openTableInput({
    parameters: host.parameters, element: host.surface, markers: [],
  });
  // What a visitor is invited to do, which depends on what the page is driven by.
  const call = !tracker.tracker
    ? "Click to open"
    : tracker.discovered ? "Touch or click to open" : "Touch to open";
  const cards: CardView[] = TABLES.map(
    (entry, index) => createCard(row, entry, index, call, open));
  const leaders = TABLES.map(() => svg("path", {class: "hub-link"}, links));

  const bodies: readonly BodyView[] = (["male", "female"] as const).flatMap(sex => {
    const body = anatomy.bodies[sex];
    if (body === undefined) return [];
    const group = svg("g", {
      class: "hub-body", "data-selected": String(sex === chosen), "data-dwell": `sex:${sex}`,
      role: "button", tabindex: 0,
      "data-info": sex === "male"
        ? "The male reference body of pkpdsim. Touch it, and every table is solved for him."
        : "The female reference body of pkpdsim. Touch it, and every table is solved for her.",
    }, figures);
    const halo = svg("rect", {class: "hub-body-halo", rx: 26}, group);
    const art = svg("g", {class: "body-art"}, group);
    // The exported body carries its own fills and is generated by pkpdsim, so it is inserted
    // as it comes.
    art.innerHTML = body.svg;
    const label = svg("text", {class: "hub-body-label", "text-anchor": "middle"}, group);
    label.textContent = sex === "male" ? "Man" : "Woman";
    group.addEventListener("click", () => chooseQuery("sex", sex, "male"));
    group.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      chooseQuery("sex", sex, "male");
    });
    return [{sex, body, group, art, label, halo, layout: {scale: 1, left: 0, top: 0}}];
  });
  if (bodies.length === 0) throw new Error("The anatomy holds no body.");

  /** One disc per organ a table is about, on each body: the organ is the table it belongs to. */
  const marks = bodies.flatMap(view => {
    const seen = new Set<string>();
    return TABLES.flatMap(entry => {
      if (seen.has(entry.organ)) return [];
      seen.add(entry.organ);
      const hit = svg("circle", {
        class: "hub-organ-hit", r: ORGAN_HIT.min, "data-dwell": `app:${entry.id}`,
        "data-info": entry.about,
      }, organs);
      hit.addEventListener("click", () => open(entry));
      return [{
        entry, view, organ: entry.organ,
        disc: svg("circle", {class: "hub-organ", r: 15, "data-info": entry.about}, organs),
        hit, centre: {x: 0, y: 0}, reach: ORGAN_HIT.min as number,
      }];
    });
  });

  let viewport: Viewport = {width: window.innerWidth, height: window.innerHeight};
  let status: TableStatus = input.status;
  let snapshot: TableSnapshot = input.snapshot;
  // What a card, a body or an organ is, and the hold which opens it: both are the one layer.
  createInfo(host.surface, () => [
    ...pointerPoints(snapshot, viewport), ...tokenPoints(snapshot, viewport),
  ]);

  const draw = (): void => {
    const boxes = cardBoxes(viewport, TABLES.length);
    for (const [index, card] of cards.entries()) {
      const box = boxes[index];
      if (box !== undefined) placeCard(card, box);
    }
    // The two bodies share the room between the columns of cards, side by side.
    const room = bodyBox(viewport, boxes);
    const tallest = Math.max(...bodies.map(view => view.body.height));
    const scale = (room.height * BODY_SHARE) / tallest;
    const widths = bodies.map(view => view.art.getBBox().width * scale);
    const total = widths.reduce((sum, width) => sum + width, 0) + (bodies.length - 1) * BODY_SPLIT;
    let cursor = room.x + (room.width - total) / 2;
    for (const [index, view] of bodies.entries()) {
      const width = widths[index] ?? 0;
      const bounds = view.art.getBBox();
      const left = cursor - bounds.x * scale;
      const top = room.y + (room.height - view.body.height * scale) / 2;
      view.layout = {scale, left, top};
      view.art.setAttribute("transform", `translate(${left} ${top}) scale(${scale})`);
      attributes(view.halo, {
        x: cursor - 18, y: top - 14, width: width + 36, height: view.body.height * scale + 48,
      });
      attributes(view.label, {x: cursor + width / 2, y: top + view.body.height * scale + 34});
      cursor += width + BODY_SPLIT;
    }

    for (const mark of marks) {
      const anchor = anchorOf(mark.view.body, mark.organ);
      const {scale: s, left, top} = mark.view.layout;
      mark.centre = {x: left + anchor.x * s, y: top + anchor.y * s};
      attributes(mark.disc, {cx: mark.centre.x, cy: mark.centre.y});
      attributes(mark.hit, {cx: mark.centre.x, cy: mark.centre.y});
    }
    for (const mark of marks) {
      const gaps = marks
        .filter(other => other !== mark && other.view === mark.view)
        .map(other => Math.hypot(other.centre.x - mark.centre.x, other.centre.y - mark.centre.y));
      mark.reach = Math.max(
        ORGAN_HIT.min, Math.min(ORGAN_HIT.max, gaps.length === 0 ? ORGAN_HIT.max : Math.min(...gaps) / 2));
      mark.hit.setAttribute("r", String(mark.reach));
    }
    // A card points at its organ in the body it is nearest to, so that no line crosses a figure.
    // The organ itself is marked in both of them.
    for (const [index, card] of cards.entries()) {
      const leader = leaders[index];
      if (leader === undefined) continue;
      const from = {
        x: card.box.x + card.box.width / 2, y: card.box.y + card.box.height / 2,
      };
      const target = marks
        .filter(mark => mark.organ === card.entry.organ)
        .map(mark => ({mark, gap: Math.hypot(mark.centre.x - from.x, mark.centre.y - from.y)}))
        .sort((a, b) => a.gap - b.gap)[0]?.mark;
      if (target === undefined) {
        leader.removeAttribute("d");
        continue;
      }
      const edge = target.centre.x < from.x ? card.box.x : card.box.x + card.box.width;
      const start = card.box.y > target.centre.y + 60
        ? {x: card.box.x + card.box.width / 2, y: card.box.y}
        : {x: edge, y: card.box.y + card.box.height / 2};
      leader.setAttribute("d", `M ${start.x} ${start.y} L ${target.centre.x} ${target.centre.y}`);
    }

    attributes(heading, {x: viewport.width / 2, y: HEAD.top});
    for (const [index, line] of motivation.entries()) {
      attributes(line, {x: viewport.width / 2, y: HEAD.top + 44 + index * HEAD.line});
    }
    attributes(statusDot, {cx: CARD.margin + 6, cy: viewport.height - 44});
    attributes(statusText, {x: CARD.margin + 18, y: viewport.height - 40});
    attributes(credit, {x: CARD.margin + 18, y: viewport.height - 22});
  };

  const update = (): void => {
    for (const view of bodies) {
      view.group.setAttribute("data-selected", String(view.sex === chosen));
    }
    const hint = hintFor(tracker, status.state);
    statusText.textContent = status.source;
    statusText.setAttribute("data-info", status.detail === "" ? hint : status.detail);
    foot.setAttribute("data-state", status.state);
  };

  const resize = (): void => {
    viewport = {width: window.innerWidth, height: window.innerHeight};
    root.setAttribute("viewBox", `0 0 ${viewport.width} ${viewport.height}`);
    draw();
  };

  input.subscribe((next, nextStatus) => {
    snapshot = next;
    status = nextStatus;
    update();
  });
  window.addEventListener("resize", resize, {passive: true});
  window.addEventListener("pagehide", () => input.disconnect());
  resize();
  update();
  input.connect();
};
