/**
 * The body: what the application shows while no table is open. One figure of the pkpdsim
 * physiology in the middle, a card per table at each of the two long edges so that nobody has to
 * walk around the table to read them, and a line from every card to the organ its table is
 * about. A finger on a card, or on the organ it points at, opens that table.
 */

import {loadAnatomy} from "@pkpdsim-tui/cardio-sim";
import type {Body} from "@pkpdsim-tui/cardio-sim";
import {
  createMockTableInput, createTuioTableInput, trackerOptions,
} from "@pkpdsim-tui/tuio-input";
import type {
  TableInput, TableSnapshot, TableStatus, TrackerOptions,
} from "@pkpdsim-tui/tuio-input";
import {attributes, chooseQuery, createChrome, formatNumber, svg} from "@pkpdsim-tui/tui-kit";
import type {ChoiceGroup, TableApp, TableHost, Viewport} from "@pkpdsim-tui/tui-kit";
import {OVERVIEW, TABLES} from "./tables.ts";
import type {TableEntry} from "./tables.ts";
import {wrapText} from "./wrap.ts";

const MOUSE_HINT = "Click a card to open its table. Escape brings you back here.";
const TABLE_HINT = "Hold a finger on a card to open its table.";
/** How long a finger rests on a card before it opens, so that a hand passing over opens nothing. */
const DWELL = 320;
/** The card at the edge of the table, in pixels. */
const CARD = {height: 164, gap: 26, margin: 26, minWidth: 236, maxWidth: 352} as const;
const PADDING = 20;
/** How much of a sentence a card holds: characters on a line at its narrowest, and lines. */
const COLUMNS = 34;
const LINES = 4;
/** How far the body stays away from the cards. */
const BODY_GAP = 26;
/**
 * How close to the organ of a table a finger has to be to open it, in pixels. The organs of the
 * body are a few centimetres apart, so a mark never reaches further than halfway to its
 * neighbour: the heart, the liver and the gut stay three targets.
 */
const ORGAN_HIT = {max: 34, min: 13} as const;

interface CardBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** One card, in one of the two rows: the elements which move when the table is resized. */
interface CardView {
  readonly entry: TableEntry;
  readonly group: SVGGElement;
  readonly plate: SVGRectElement;
  readonly badge: SVGCircleElement;
  readonly number: SVGTextElement;
  readonly title: SVGTextElement;
  readonly lines: readonly SVGTextElement[];
  readonly call: SVGTextElement;
  /** Where the card is on the surface, which is where a finger of the tracker meets it. */
  box: CardBox;
}

/** The boxes of the near row, left to right, centred on the long edge. */
function cardBoxes(viewport: Viewport, count: number): readonly CardBox[] {
  const room = viewport.width - 2 * CARD.margin - (count - 1) * CARD.gap;
  const width = Math.min(CARD.maxWidth, Math.max(CARD.minWidth, room / count));
  const total = count * width + (count - 1) * CARD.gap;
  const left = (viewport.width - total) / 2;
  const y = viewport.height - CARD.margin - CARD.height;
  return Array.from({length: count}, (_unused, index) => ({
    x: left + index * (width + CARD.gap), y, width, height: CARD.height,
  }));
}

/** Where the body is drawn: the room between the two rows of cards. */
function bodyLayout(viewport: Viewport, body: Body): {scale: number; left: number; top: number} {
  const room = viewport.height - 2 * (CARD.margin + CARD.height + BODY_GAP);
  const scale = Math.max(room, 120) / body.height;
  return {scale, left: viewport.width / 2, top: (viewport.height - body.height * scale) / 2};
}

function anchorOf(body: Body, id: string): {x: number; y: number} {
  const anchor = body.anchors[id];
  return anchor === undefined ? {x: 0, y: body.height / 2} : {x: anchor[0], y: anchor[1]};
}

/** The same point of the body as the other row sees it, which is the surface turned around. */
function mirrored(box: CardBox, viewport: Viewport): CardBox {
  return {
    x: viewport.width - box.x - box.width, y: viewport.height - box.y - box.height,
    width: box.width, height: box.height,
  };
}

function inside(box: CardBox, x: number, y: number): boolean {
  return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;
}

function within(point: {x: number; y: number}, x: number, y: number, radius: number): boolean {
  return (point.x - x) ** 2 + (point.y - y) ** 2 <= radius ** 2;
}

/** What a person at the table should do, which depends on how the page was started. */
function hintFor(tracker: TrackerOptions, state: TableStatus["state"]): string {
  if (!tracker.tracker) return MOUSE_HINT;
  if (state === "connected") return TABLE_HINT;
  return `Start a TUIO ${tracker.version} tracker on ${tracker.address}, or drop "?tuio" from `
    + "the address to drive the table with the mouse.";
}

function createCard(
  parent: SVGGElement, entry: TableEntry, index: number, call: string,
  open: (entry: TableEntry) => void,
): CardView {
  const group = svg("g", {
    class: "hub-card", "data-active": "false", role: "button", tabindex: 0,
  }, parent);
  const plate = svg("rect", {class: "hub-card-plate", rx: 18}, group);
  const badge = svg("circle", {class: "hub-card-badge", r: 17}, group);
  const number = svg("text", {class: "hub-card-number", "text-anchor": "middle"}, group);
  number.textContent = String(index + 1);
  const title = svg("text", {class: "hub-card-title"}, group);
  title.textContent = entry.title;
  const lines = wrapText(entry.about, COLUMNS, LINES).map(text => {
    const element = svg("text", {class: "hub-card-line"}, group);
    element.textContent = text;
    return element;
  });
  const opener = svg("text", {class: "hub-card-call"}, group);
  opener.textContent = call;
  group.addEventListener("click", () => open(entry));
  group.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    open(entry);
  });
  return {
    entry, group, plate, badge, number, title, lines, call: opener,
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
}

export const startOverview: TableApp = async (host: TableHost): Promise<void> => {
  host.progress("Loading the body...");
  // The figure is the one the circulation is drawn on: it is the body of the pkpdsim physiology,
  // and it comes with that export.
  const anatomy = await loadAnatomy(
    new URL("cardiovascular/cardiovascular-anatomy.json", host.assets));
  const sex = host.parameters.get("sex") === "female" ? "female" : "male";
  const body = anatomy.bodies[sex] ?? Object.values(anatomy.bodies)[0];
  if (body === undefined) throw new Error("The anatomy holds no body.");

  const root = host.scene;
  const scene = svg("g", {class: "hub"}, root);
  const art = svg("g", {class: "body-art"}, scene);
  // The exported body carries its own fills and is generated by pkpdsim, so it is inserted as
  // it comes.
  art.innerHTML = body.svg;
  const links = svg("g", {class: "hub-links"}, scene);
  const organs = svg("g", {class: "hub-organs"}, scene);
  const rows = ["hub-row hub-row--near", "hub-row hub-row--far"]
    .map(className => svg("g", {class: className}, scene));

  const open = (entry: TableEntry): void => {
    chooseQuery("app", entry.id, OVERVIEW);
  };

  const tracker = trackerOptions(host.parameters);
  const call = tracker.tracker ? "Touch to open" : "Click to open";
  const cards: CardView[][] = rows.map(row =>
    TABLES.map((entry, index) => createCard(row, entry, index, call, open)));
  const leaders = TABLES.map(() => [
    svg("path", {class: "hub-link"}, links), svg("path", {class: "hub-link"}, links),
  ]);
  const subjects = new Set(TABLES.map(entry => entry.organ));
  const marks = TABLES.map(entry => {
    // An organ another table is about already carries that table's number, so it is marked once.
    const marked = entry.organs.filter(organ => organ === entry.organ || !subjects.has(organ));
    return {
      entry,
      organs: marked,
      discs: marked.map(organ => svg("circle", {
        class: "hub-organ", "data-primary": String(organ === entry.organ),
      }, organs)),
      number: svg("text", {class: "hub-organ-number", "text-anchor": "middle"}, organs),
      // A finger is wider than the dot it aims at, so the organ is opened from around it.
      hit: svg("circle", {class: "hub-organ-hit", r: ORGAN_HIT.min}, organs),
      centre: {x: 0, y: 0},
      reach: ORGAN_HIT.min,
    };
  });
  for (const mark of marks) {
    mark.hit.addEventListener("click", () => open(mark.entry));
  }
  for (const [index, mark] of marks.entries()) mark.number.textContent = String(index + 1);

  const input: TableInput = tracker.tracker
    ? createTuioTableInput(tracker)
    // The body has no objects of its own; the mouse drives the cards through the page itself.
    : createMockTableInput({element: host.surface, markers: []});

  const bodies: readonly ChoiceGroup[] = [{
    id: "sex", label: "Body", selected: sex,
    options: [{id: "male", label: "Male"}, {id: "female", label: "Female"}],
  }];
  const chrome = createChrome(host.chrome, {
    onChoose: (group, option) => {
      if (group === "sex") chooseQuery("sex", option, "male");
      else host.choose(group, option);
    },
  });

  let viewport: Viewport = {width: window.innerWidth, height: window.innerHeight};
  let status: TableStatus = input.status;
  let snapshot: TableSnapshot = input.snapshot;
  /** Which card each finger is on, and since when, so that a card opens on a rest and not a sweep. */
  const dwelling = new Map<number, {entry: TableEntry; since: number}>();
  let active = "";

  const describe = (): string => `The ${sex} reference body of pkpdsim, `
    + `${formatNumber(body.height, 0)} cm tall. Three tables sit on it: `
    + `${TABLES.map(entry => entry.label.toLowerCase()).join(", ")}.`;

  const draw = (): void => {
    const layout = bodyLayout(viewport, body);
    const placed: {centre: {x: number; y: number}; reach: number; hit: SVGCircleElement}[] = [];
    art.setAttribute("transform", `translate(${layout.left} ${layout.top}) scale(${layout.scale})`);
    const boxes = cardBoxes(viewport, TABLES.length);
    for (const [row, views] of cards.entries()) {
      for (const [index, card] of views.entries()) {
        const box = boxes[index];
        if (box === undefined) continue;
        placeCard(card, row === 0 ? box : mirrored(box, viewport));
      }
    }
    for (const [index, mark] of marks.entries()) {
      const box = boxes[index];
      if (box === undefined) continue;
      for (const [at, organ] of mark.organs.entries()) {
        const disc = mark.discs[at];
        if (disc === undefined) continue;
        const anchor = anchorOf(body, organ);
        const point = {
          x: layout.left + anchor.x * layout.scale, y: layout.top + anchor.y * layout.scale,
        };
        attributes(disc, {cx: point.x, cy: point.y, r: organ === mark.entry.organ ? 17 : 9});
        if (organ === mark.entry.organ) {
          mark.centre = point;
          attributes(mark.hit, {cx: point.x, cy: point.y});
          placed.push(mark);
          attributes(mark.number, {x: point.x, y: point.y + 6});
          const near = leaders[index]?.[0];
          const far = leaders[index]?.[1];
          const mirror = mirrored(box, viewport);
          if (near !== undefined) {
            near.setAttribute("d",
              `M ${box.x + box.width / 2} ${box.y} L ${point.x} ${point.y + 20}`);
          }
          if (far !== undefined) {
            far.setAttribute("d",
              `M ${mirror.x + mirror.width / 2} ${mirror.y + mirror.height} `
              + `L ${point.x} ${point.y - 20}`);
          }
        }
      }
    }
    for (const mark of placed) {
      const gap = placed
        .filter(other => other !== mark)
        .map(other => Math.hypot(other.centre.x - mark.centre.x, other.centre.y - mark.centre.y));
      const room = gap.length === 0 ? ORGAN_HIT.max : Math.min(...gap) / 2;
      mark.reach = Math.max(ORGAN_HIT.min, Math.min(ORGAN_HIT.max, room));
      mark.hit.setAttribute("r", String(mark.reach));
    }
  };

  const update = (): void => {
    for (const views of cards) {
      for (const card of views) {
        card.group.setAttribute("data-active", String(card.entry.id === active));
      }
    }
    for (const mark of marks) {
      for (const disc of mark.discs) {
        disc.setAttribute("data-active", String(mark.entry.id === active));
      }
    }
    chrome.update({
      title: "pkpdsim on the table",
      about: "Every table here is one model of the human body of pkpdsim, solved while you move "
        + "the objects on the table.",
      reading: describe(),
      tries: [
        "Hold a finger, or put an object, on a card or on the organ it points at: that opens "
          + "its table.",
        "The body switch holds for every table: the circulation, the liver and the drug are "
          + "solved for the same person.",
        "Every table carries this panel: the table switch in it moves between them and back "
          + "to the body.",
      ],
      status, roles: [], value: () => "", live: new Set<string>(), unassigned: [],
      notice: "", hint: hintFor(tracker, status.state), credit: anatomy.attribution,
      choices: [...host.choices, ...bodies],
    });
  };

  /**
   * A finger or an object which rests on a card, or on the organ the card points at, opens that
   * table; one which passes over only lights it up.
   */
  const follow = (now: number): void => {
    const live = new Set<number>();
    let hot = "";
    for (const touch of [...snapshot.pointers.values(), ...snapshot.tokens.values()]) {
      const x = touch.x * viewport.width;
      const y = touch.y * viewport.height;
      const found = cards.flat().find(card => inside(card.box, x, y))?.entry
        ?? marks.find(mark => within(mark.centre, x, y, mark.reach))?.entry;
      if (found === undefined) continue;
      live.add(touch.sessionId);
      const seen = dwelling.get(touch.sessionId);
      if (seen === undefined || seen.entry.id !== found.id) {
        dwelling.set(touch.sessionId, {entry: found, since: now});
      } else if (now - seen.since >= DWELL) {
        open(found);
        return;
      }
      hot = found.id;
    }
    for (const sessionId of [...dwelling.keys()]) {
      if (!live.has(sessionId)) dwelling.delete(sessionId);
    }
    if (hot !== active) {
      active = hot;
      update();
    }
    window.requestAnimationFrame(follow);
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
  window.requestAnimationFrame(follow);
};
