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
import {
  attributes, chooseQuery, createInfo, ICONS, pointerPoints, reportStatus, speechFor, svg,
  tokenPoints, words,
} from "@pkpdsim-tui/tui-kit";
import type {GlyphKind, TableApp, TableHost, Viewport, Voice} from "@pkpdsim-tui/tui-kit";
import {LAB_QR_PATH, LAB_QR_SIZE, LAB_URL} from "./qr.ts";
import {ABOUT, entryCopy, OVERVIEW, TABLES} from "./tables.ts";
import type {TableEntry} from "./tables.ts";
import {HUB_TEXT} from "./text.ts";
import {wrapText} from "./wrap.ts";

/** How many lines of motivation stand under the heading, which the layout keeps room for. */
const MOTIVATION_LINES = 2;
/** The card of a table, in pixels. */
const CARD = {height: 158, gap: 22, margin: 28, minWidth: 270, maxWidth: 380} as const;
/** The room the heading takes at the top. */
const HEAD = {top: 78, line: 34, bottom: 78} as const;
const PADDING: number = 20;
/** How much of a sentence a card holds: characters on a line, and lines. */
const COLUMNS = 32;
const LINES = 2;
/** The heading of a card, which is the name of a table and may need two lines. */
const TITLE_COLUMNS = 15;
const TITLE_LINES = 2;
/** How much of the room inside the ring of cards the figure takes. */
const BODY_SHARE = 0.62;
/** What the figure keeps clear of the cards above and below it, in pixels. */
const BODY_GAP = 54;
/** The column the settings of the landing page stand in, along the right edge. */
const SETTINGS_COLUMN = 470;
/**
 * Where the cards sit on the ring around the figure, in degrees, clockwise from the top. One
 * body in the middle and the tables around it says what the collection is: five ways of looking
 * at the same person.
 */
const RING: readonly number[] = [-90, -18, 54, 126, 198];
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
  readonly picture: SVGGElement;
  readonly title: readonly SVGTextElement[];
  readonly lines: readonly SVGTextElement[];
  readonly call: SVGTextElement;
  readonly arm: SVGRectElement;
  box: CardBox;
}

/** The one figure in the middle, which every table is about and which the switch changes. */
interface BodyView {
  readonly sex: "male" | "female";
  readonly body: Body;
  readonly art: SVGGElement;
  layout: {scale: number; left: number; top: number};
}

/** The room the figure and the ring of cards share: everything under the heading, left of the
 * settings. */
function stageOf(viewport: Viewport): CardBox {
  const top = HEAD.top + HEAD.line * MOTIVATION_LINES + HEAD.bottom;
  // The settings stand open at the right on the landing page, and the ring keeps clear of them.
  const column = viewport.width > 1180 ? SETTINGS_COLUMN : CARD.margin;
  return {
    x: CARD.margin,
    y: top,
    width: Math.max(420, viewport.width - column - CARD.margin),
    height: Math.max(360, viewport.height - CARD.margin - top),
  };
}

/** Where the cards sit: on a ring around the figure, evenly, starting at the top. */
function cardBoxes(stage: CardBox, count: number): readonly CardBox[] {
  const width = Math.min(CARD.maxWidth, Math.max(CARD.minWidth, Math.round(stage.width * 0.25)));
  const height = CARD.height;
  const centre = {x: stage.x + stage.width / 2, y: stage.y + stage.height / 2};
  const rx = stage.width / 2 - width / 2;
  const ry = stage.height / 2 - height / 2;
  return Array.from({length: count}, (_unused, index) => {
    const angle = (RING[index % RING.length] ?? 0) * Math.PI / 180;
    return {
      x: centre.x + rx * Math.cos(angle) - width / 2,
      y: centre.y + ry * Math.sin(angle) - height / 2,
      width, height,
    };
  });
}

/** The room inside the ring: what is left between the card above and the card below. */
function bodyBox(stage: CardBox): CardBox {
  const inner = stage.height - 2 * CARD.height - 2 * BODY_GAP;
  const height = Math.max(220, Math.min(stage.height * BODY_SHARE, inner));
  return {
    x: stage.x,
    y: stage.y + (stage.height - height) / 2,
    width: stage.width,
    height,
  };
}

function anchorOf(body: Body, id: string): {x: number; y: number} {
  const anchor = body.anchors[id];
  return anchor === undefined ? {x: 0, y: body.height / 2} : {x: anchor[0], y: anchor[1]};
}

/** What a person at the table should do, which depends on what the page is driven by. */
function hintFor(voice: Voice, tracker: TrackerOptions, state: TableStatus["state"]): string {
  const copy = voice.pick(HUB_TEXT);
  if (!tracker.tracker) return copy.clickHint;
  if (state === "connected") return tracker.discovered ? copy.bothHint : copy.touchHint;
  return words(voice).waitingHint(tracker.version, tracker.address);
}

/** One switch of the landing page, which has no panel to put it in. */
interface Pill {
  readonly group: SVGGElement;
  readonly plate: SVGRectElement;
  readonly text: SVGTextElement;
  /** The triangle of the pill which reads the page aloud, for the pills which have one. */
  readonly icon: SVGPathElement | undefined;
  readonly width: number;
}

/**
 * The language and the level, as two rows of pills in the corner. The landing page carries no
 * panel, and these are the two things a visitor has to be able to change before they have read
 * anything: the switches of a table are in its panel instead.
 */
function createPills(
  parent: SVGGElement,
  entries: readonly {id: string; label: string; info: string; play?: boolean}[],
  group: string, selected: string, choose: (id: string) => void,
): readonly Pill[] {
  return entries.map(entry => {
    const pill = svg("g", {
      class: "hub-pill", role: "button", tabindex: 0,
      "data-selected": String(entry.id === selected),
      "data-dwell": `${group}:${entry.id}`, "data-info": entry.info,
    }, parent);
    const plate = svg("rect", {class: "hub-pill-plate", rx: 15, height: 30}, pill);
    // A play button is a triangle wherever it is, so a visitor who cannot read the word knows it.
    const icon = entry.play !== true
      ? undefined
      : svg("path", {class: "hub-pill-icon", d: "M -4 -6 L 7 0 L -4 6 Z"}, pill);
    const text = svg("text", {class: "hub-pill-text", "text-anchor": "middle"}, pill);
    text.textContent = entry.label;
    pill.addEventListener("click", () => choose(entry.id));
    pill.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      choose(entry.id);
    });
    // A pill is as wide as its word, which differs in three languages.
    const width = Math.max(78, entry.label.length * 10 + 28) + (entry.play === true ? 24 : 0);
    return {group: pill, plate, text, icon, width};
  });
}

/** How wide a row of pills is, so that a row can be centred on something. */
function pillRun(pills: readonly Pill[]): number {
  return pills.reduce((sum, pill) => sum + pill.width, 0) + Math.max(0, pills.length - 1) * 8;
}

/** A column of pills, one under the other, which is how the body switch stands beside a body. */
function placeStack(pills: readonly Pill[], left: number, top: number): void {
  const width = Math.max(...pills.map(pill => pill.width));
  for (const [index, pill] of pills.entries()) {
    const y = top + index * 38;
    attributes(pill.plate, {x: left, y: y - 21, width});
    attributes(pill.text, {x: left + width / 2, y});
  }
}

function placePills(pills: readonly Pill[], right: number, y: number): void {
  const total = pills.reduce((sum, pill) => sum + pill.width, 0) + (pills.length - 1) * 8;
  let cursor = right - total;
  for (const pill of pills) {
    attributes(pill.plate, {x: cursor, y: y - 21, width: pill.width});
    const shift = pill.icon === undefined ? 0 : 11;
    attributes(pill.text, {x: cursor + pill.width / 2 + shift, y});
    pill.icon?.setAttribute("transform", `translate(${cursor + 20} ${y - 6})`);
    cursor += pill.width + 8;
  }
}

function createCard(
  parent: SVGGElement, entry: TableEntry, index: number, call: string, voice: Voice,
  open: (entry: TableEntry) => void,
): CardView {
  const copy = entryCopy(voice, entry.id);
  const group = svg("g", {
    class: "hub-card", role: "button", tabindex: 0,
    // A finger has no click: it opens the card it rests on, and the card fills while it does.
    "data-dwell": `app:${entry.id}`,
    // What the table is, for the visitor who wants more than the card says.
    "data-info": voice.say(copy.about),
  }, parent);
  const plate = svg("rect", {class: "hub-card-plate", rx: 18}, group);
  const badge = svg("circle", {class: "hub-card-badge", r: 22}, group);
  // The picture of the table, which is the object a visitor will have in their hand on it.
  const picture = svg("g", {class: "hub-card-picture"}, group);
  svg("path", {
    class: "hub-card-icon", d: (ICONS[entry.picture as GlyphKind] ?? []).join(" "),
  }, picture);
  const title = wrapText(copy.title, TITLE_COLUMNS, TITLE_LINES).map(text => {
    const element = svg("text", {class: "hub-card-title"}, group);
    element.textContent = text;
    return element;
  });
  const lines = wrapText(voice.say(copy.blurb), COLUMNS, LINES).map(text => {
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
    entry, group, plate, badge, picture, title, lines, call: opener, arm,
    box: {x: 0, y: 0, width: 0, height: 0},
  };
}

function placeCard(card: CardView, box: CardBox): void {
  card.box = box;
  attributes(card.plate, {x: box.x, y: box.y, width: box.width, height: box.height});
  const centre = {x: box.x + PADDING + 22, y: box.y + PADDING + 22};
  attributes(card.badge, {cx: centre.x, cy: centre.y});
  card.picture.setAttribute("transform", `translate(${centre.x} ${centre.y}) scale(0.48)`);
  for (const [index, line] of card.title.entries()) {
    attributes(line, {x: box.x + PADDING + 58, y: box.y + PADDING + 22 + index * 26});
  }
  const under = box.y + PADDING + 22 + Math.max(card.title.length, 2) * 26;
  for (const [index, line] of card.lines.entries()) {
    attributes(line, {x: box.x + PADDING, y: under + index * 20});
  }
  attributes(card.call, {x: box.x + PADDING, y: box.y + box.height - PADDING + 4});
  attributes(card.arm, {x: box.x, y: box.y + box.height - 4, width: box.width});
}

export const startOverview: TableApp = async (host: TableHost): Promise<void> => {
  const voice = host.voice;
  const copy = voice.pick(HUB_TEXT);
  const kit = words(voice);
  host.progress(copy.loadingBodies);
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
    "data-info": voice.say(copy.headingInfo),
  }, head);
  heading.textContent = copy.heading;
  const motivation = copy.motivation[voice.level].map(text => {
    const line = svg("text", {class: "hub-motivation", "text-anchor": "middle"}, head);
    line.textContent = text;
    return line;
  });
  const figures = svg("g", {class: "hub-bodies"}, scene);
  const links = svg("g", {class: "hub-links"}, scene);
  const organs = svg("g", {class: "hub-organs"}, scene);
  const row = svg("g", {class: "hub-row"}, scene);
  const switches = svg("g", {class: "hub-switches"}, scene);
  // The foot of the page: whose laboratory this is, and the square a visitor points a phone at.
  const foot = svg("g", {class: "hub-foot"}, scene);
  const lab = svg("g", {
    class: "hub-lab", role: "button", tabindex: 0, "data-dwell": "about",
    "data-info": `${copy.labInfo} ${LAB_URL}`,
  }, foot);
  lab.addEventListener("click", () => chooseQuery("app", ABOUT, OVERVIEW));
  lab.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    chooseQuery("app", ABOUT, OVERVIEW);
  });
  const qr = svg("g", {class: "hub-qr"}, lab);
  svg("rect", {class: "hub-qr-plate", x: -2, y: -2, width: LAB_QR_SIZE + 4, height: LAB_QR_SIZE + 4, rx: 1.5}, qr);
  svg("path", {class: "hub-qr-code", d: LAB_QR_PATH}, qr);
  const labName = svg("text", {class: "hub-lab-name"}, lab);
  labName.textContent = copy.labName;
  const labPlace = svg("text", {class: "hub-lab-line"}, lab);
  labPlace.textContent = copy.labPlace;
  const labLink = svg("text", {class: "hub-lab-link"}, lab);
  labLink.textContent = LAB_URL.replace("https://", "");
  // What the laboratory block opens, under the three lines: the page about all of this.
  const labMore = svg("text", {class: "hub-lab-more"}, lab);
  labMore.textContent = copy.about.open;

  const open = (entry: TableEntry): void => {
    chooseQuery("app", entry.id, OVERVIEW);
  };

  const {input, tracker} = await openTableInput({
    parameters: host.parameters, element: host.surface, markers: [],
  });
  // What a visitor is invited to do, which depends on what the page is driven by.
  const call = !tracker.tracker
    ? copy.clickToOpen
    : tracker.discovered ? copy.bothToOpen : copy.touchToOpen;
  const cards: CardView[] = TABLES.map(
    (entry, index) => createCard(row, entry, index, call, voice, open));
  // Whoever cannot read this yet presses play and is read to instead.
  const speech = speechFor(voice);
  const spoken = `${copy.heading}. ${copy.motivation[voice.level].join(" ")}`;
  const reader = createPills(
    switches, [{id: "read", label: kit.speak, info: voice.say(kit.speakInfo), play: true}],
    "speak", "", () => speech.toggle(spoken));
  const readerPill = reader[0];
  speech.listen(() => {
    if (readerPill === undefined) return;
    readerPill.group.setAttribute("data-speaking", String(speech.speaking()));
    readerPill.text.textContent = speech.speaking() ? kit.speakStop : kit.speak;
  });
  const leaders = TABLES.map(() => svg("path", {class: "hub-link"}, links));

  // One figure in the middle, the one this visitor chose, and the switch under it.
  const body = anatomy.bodies[chosen] ?? anatomy.bodies["male"] ?? anatomy.bodies["female"];
  if (body === undefined) throw new Error("The anatomy holds no body.");
  const figure = svg("g", {
    class: "hub-body", "data-info": voice.say(copy.bodyInfo[chosen]),
  }, figures);
  const art = svg("g", {class: "body-art"}, figure);
  // The exported body carries its own fills and is generated by pkpdsim, so it goes in as it
  // comes.
  art.innerHTML = body.svg;
  const view: BodyView = {sex: chosen, body, art, layout: {scale: 1, left: 0, top: 0}};
  // The woman and the man, as one either/or under the figure: wherever a body is shown, it is
  // one press to see the other one.
  const sexes = createPills(
    switches,
    (["female", "male"] as const).map(sex => ({
      id: sex,
      label: sex === "male" ? kit.male : kit.female,
      info: voice.say(copy.bodyInfo[sex]),
    })),
    "sex", chosen, id => chooseQuery("sex", id, "male"));

  /** One disc per organ a table is about, on each body: the organ is the table it belongs to. */
  const marks = (() => {
    const seen = new Set<string>();
    return TABLES.flatMap(entry => {
      if (seen.has(entry.organ)) return [];
      seen.add(entry.organ);
      const about = voice.say(entryCopy(voice, entry.id).about);
      const hit = svg("circle", {
        class: "hub-organ-hit", r: ORGAN_HIT.min, "data-dwell": `app:${entry.id}`,
        "data-info": about,
      }, organs);
      hit.addEventListener("click", () => open(entry));
      return [{
        entry, organ: entry.organ,
        disc: svg("circle", {class: "hub-organ", r: 15, "data-info": about}, organs),
        hit, centre: {x: 0, y: 0}, reach: ORGAN_HIT.min as number,
      }];
    });
  })();

  let viewport: Viewport = {width: window.innerWidth, height: window.innerHeight};
  let status: TableStatus = input.status;
  let snapshot: TableSnapshot = input.snapshot;
  // What a card, a body or an organ is, and the hold which opens it: both are the one layer.
  createInfo(host.surface, () => [
    ...pointerPoints(snapshot, viewport), ...tokenPoints(snapshot, viewport),
  ], voice);

  const draw = (): void => {
    const stage = stageOf(viewport);
    const boxes = cardBoxes(stage, TABLES.length);
    for (const [index, card] of cards.entries()) {
      const box = boxes[index];
      if (box !== undefined) placeCard(card, box);
    }
    // The figure stands in the middle of the ring, and the switch of the body sits under it.
    const room = bodyBox(stage);
    const scale = room.height / view.body.height;
    const bounds = view.art.getBBox();
    const width = bounds.width * scale;
    const left = stage.x + (stage.width - width) / 2 - bounds.x * scale;
    const top = room.y;
    view.layout = {scale, left, top};
    view.art.setAttribute("transform", `translate(${left} ${top}) scale(${scale})`);
    // The woman and the man stand beside the figure, where a visitor is already looking.
    placeStack(
      sexes, left + (bounds.x + bounds.width) * scale + 26,
      top + view.body.height * scale / 2 - 19);

    for (const mark of marks) {
      const anchor = anchorOf(view.body, mark.organ);
      const {scale: s, left: x, top: y} = view.layout;
      mark.centre = {x: x + anchor.x * s, y: y + anchor.y * s};
      attributes(mark.disc, {cx: mark.centre.x, cy: mark.centre.y});
      attributes(mark.hit, {cx: mark.centre.x, cy: mark.centre.y});
    }
    for (const mark of marks) {
      const gaps = marks
        .filter(other => other !== mark)
        .map(other => Math.hypot(other.centre.x - mark.centre.x, other.centre.y - mark.centre.y));
      mark.reach = Math.max(
        ORGAN_HIT.min, Math.min(ORGAN_HIT.max, gaps.length === 0 ? ORGAN_HIT.max : Math.min(...gaps) / 2));
      mark.hit.setAttribute("r", String(mark.reach));
    }
    // Every card points at the organ its table is about, which is what the ring is around.
    for (const [index, card] of cards.entries()) {
      const leader = leaders[index];
      if (leader === undefined) continue;
      const from = {
        x: card.box.x + card.box.width / 2, y: card.box.y + card.box.height / 2,
      };
      const target = marks.find(mark => mark.organ === card.entry.organ);
      if (target === undefined) {
        leader.removeAttribute("d");
        continue;
      }
      const sideways = Math.abs(target.centre.x - from.x) > Math.abs(target.centre.y - from.y);
      const start = sideways
        ? {
          x: target.centre.x < from.x ? card.box.x : card.box.x + card.box.width,
          y: card.box.y + card.box.height / 2,
        }
        : {
          x: card.box.x + card.box.width / 2,
          y: target.centre.y < from.y ? card.box.y : card.box.y + card.box.height,
        };
      leader.setAttribute("d", `M ${start.x} ${start.y} L ${target.centre.x} ${target.centre.y}`);
    }

    // The heading stands over the ring, which is the room left of the settings.
    const middle = stage.x + stage.width / 2;
    attributes(heading, {x: middle, y: HEAD.top});
    for (const [index, line] of motivation.entries()) {
      attributes(line, {x: middle, y: HEAD.top + 44 + index * HEAD.line});
    }
    // The button which reads the page aloud sits under what it reads.
    placePills(
      reader, middle + pillRun(reader) / 2,
      HEAD.top + 44 + MOTIVATION_LINES * HEAD.line + 2);
    // The laboratory in the bottom right corner: the square a phone is pointed at, and the
    // three lines beside it, which open the page about all of this.
    const square = 84;
    const base = viewport.height - CARD.margin - square;
    const right = viewport.width - CARD.margin;
    qr.setAttribute(
      "transform", `translate(${right - square} ${base}) scale(${square / LAB_QR_SIZE})`);
    const text = right - square - 14;
    attributes(labName, {x: text, y: base + 24});
    attributes(labPlace, {x: text, y: base + 46});
    attributes(labLink, {x: text, y: base + 68});
    attributes(labMore, {x: text, y: base + 90});
  };

  const update = (): void => {
    // What drives the surface is a setting and not a word of the landing page.
    reportStatus({
      ...status,
      detail: status.detail === "" ? hintFor(voice, tracker, status.state) : status.detail,
    });
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
