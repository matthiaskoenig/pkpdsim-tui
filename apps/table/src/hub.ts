/**
 * The landing page: the two reference bodies of pkpdsim side by side, the five tables on a ring
 * around them, and a heading which says what the whole thing is for. It carries no panel: what
 * a table is stands in the box at the right, for the card a visitor is pointing at.
 *
 * A card is opened by holding a finger on it, by touching the organ it points at, with the
 * mouse, or with the first object of the surface: marker 0 is the table switch, its angle walks
 * around the ring, and holding it still on a table opens that one.
 */

import {loadAnatomy} from "@pkpdsim-tui/cardio-sim";
import type {Body} from "@pkpdsim-tui/cardio-sim";
import {openTableInput} from "@pkpdsim-tui/tuio-input";
import type {TableSnapshot, TableStatus, TrackerOptions} from "@pkpdsim-tui/tuio-input";
import {
  attributes, chooseQuery, createInfo, createTokenLayer, ICONS, pointerPoints, readStars,
  reportStatus, svg, tokenPoints, watchStars, words,
} from "@pkpdsim-tui/tui-kit";
import type {GlyphKind, TableApp, TableHost, Viewport, Voice} from "@pkpdsim-tui/tui-kit";
import {valuesFromTokens} from "@pkpdsim-tui/tuio-input";
import {LAB_QR_PATH, LAB_QR_SIZE, LAB_URL} from "./qr.ts";
import {
  ABOUT, entryCopy, OVERVIEW, TABLES, tableAtDial, TOPIC_MARKER, topicRole,
} from "./tables.ts";
import type {TableEntry} from "./tables.ts";
import {HUB_TEXT} from "./text.ts";
import {wrapText} from "./wrap.ts";

/** How many lines of motivation stand under the heading, which the layout keeps room for. */
const MOTIVATION_LINES = 2;
/** The icon of a table, in pixels: a big disc of the colour of that table, and its name. */
const ICON = {radius: 58, margin: 28, label: 34, line: 26, ring: 6} as const;
/** The room the stars of a table take under its name, in pixels. */
const STAR_LINE = 30;
/** The room the heading takes at the top. */
const HEAD = {top: 78, line: 34, bottom: 78} as const;
const PADDING: number = 26;
/** The name under an icon, which may need two lines. */
const TITLE_COLUMNS = 16;
const TITLE_LINES = 2;
/** How long the strut between the circle and an icon is, in pixels. */
const STRUT = 54;
/** The sidebar at the right: what the table a visitor is pointing at is, at length. */
const INFO = {width: 404, margin: 28, top: 168, lines: 13, columns: 40} as const;
/** The room the laboratory block takes in the bottom corner, which the sidebar stops above. */
const LAB_HEIGHT = 96;
/** How long the object of the table switch is held still before that table opens, in ms. */
const HOLD = 1500;
/**
 * Where the icons sit on the ring around the disc, in degrees, clockwise from the top. The
 * bodies in the middle and the tables around them say what the collection is: four ways of
 * looking at the same person.
 */
const RING: readonly number[] = [-90, 0, 90, 180];
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

/** One icon: the elements which move when the surface is resized. */
interface IconView {
  readonly entry: TableEntry;
  readonly group: SVGGElement;
  readonly disc: SVGCircleElement;
  readonly ring: SVGCircleElement;
  readonly arm: SVGCircleElement;
  readonly picture: SVGGElement;
  readonly title: readonly SVGTextElement[];
  /** The stars this table has been answered with, which came from its quiz. */
  readonly stars: SVGTextElement;
  centre: {x: number; y: number};
}

/** One of the two figures in the middle: the woman and the man the tables are solved on. */
interface BodyView {
  readonly sex: "male" | "female";
  readonly body: Body;
  readonly art: SVGGElement;
  layout: {scale: number; left: number; top: number};
  marks: OrganMark[];
}

/** One organ of one body: the disc a card points at, and the circle a finger has to find. */
interface OrganMark {
  readonly entry: TableEntry;
  readonly organ: string;
  readonly disc: SVGCircleElement;
  readonly hit: SVGCircleElement;
  centre: {x: number; y: number};
  reach: number;
}

/** The room the bodies and the ring of icons share: everything under the heading, left of the
 * sidebar which says what a table is. */
function stageOf(viewport: Viewport): CardBox {
  const top = HEAD.top + HEAD.line * MOTIVATION_LINES + HEAD.bottom;
  // The sidebar says what the table under the object is, and the ring keeps clear of it.
  const column = viewport.width > 1180 ? INFO.width + 2 * INFO.margin : ICON.margin;
  return {
    x: ICON.margin,
    y: top,
    width: Math.max(420, viewport.width - column - ICON.margin),
    height: Math.max(360, viewport.height - ICON.margin - top),
  };
}

/** Where the icons sit: on a ring around the figures, evenly, starting at the top. */
function iconSpots(
  stage: CardBox, count: number,
): readonly {x: number; y: number; above: boolean}[] {
  const centre = {x: stage.x + stage.width / 2, y: stage.y + stage.height / 2};
  // The ring is as wide as the stage allows once the disc and the longest name are on it.
  const rx = stage.width / 2 - ICON.radius - 92;
  // The name of an icon may run to two lines, and the one at the foot of the ring reads under
  // it, so the ring keeps that much off the edge of the surface.
  const ry = stage.height / 2 - ICON.radius - ICON.label - ICON.line - STAR_LINE;
  return Array.from({length: count}, (_unused, index) => {
    const degrees = RING[index % RING.length] ?? 0;
    const angle = degrees * Math.PI / 180;
    return {
      x: centre.x + rx * Math.cos(angle),
      y: centre.y + ry * Math.sin(angle),
      // The name of the icon over the heads is read above it, where the heading leaves room:
      // under it is where the bodies stand.
      above: degrees === -90,
    };
  });
}

/** The dark disc the two bodies stand on, in the middle of the ring of icons. */
function discOf(stage: CardBox): {x: number; y: number; r: number} {
  const centre = {x: stage.x + stage.width / 2, y: stage.y + stage.height / 2};
  const rx = stage.width / 2 - ICON.radius - 92;
  const ry = stage.height / 2 - ICON.radius - ICON.label - ICON.line;
  return {...centre, r: Math.max(150, Math.min(rx, ry) - ICON.radius - STRUT)};
}

/**
 * The room the two figures take on the disc: as tall as the disc allows with their names under
 * their feet, which is what makes them a portrait rather than a diagram.
 */
function bodyBox(stage: CardBox): CardBox {
  const disc = discOf(stage);
  // As tall as the circle takes with the names under the feet still inside it.
  const height = disc.r * 1.4;
  return {x: disc.x - disc.r, y: disc.y - height / 2 - disc.r * 0.1, width: 2 * disc.r, height};
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

/** How far around the arming ring of an icon goes: its whole circumference. */
const ARM_LENGTH = 2 * Math.PI * (ICON.radius + ICON.ring);

function createIcon(
  parent: SVGGElement, entry: TableEntry, voice: Voice,
  open: (entry: TableEntry) => void, point: (entry: TableEntry | undefined) => void,
): IconView {
  const copy = entryCopy(voice, entry.id);
  const group = svg("g", {
    class: "hub-icon", role: "button", tabindex: 0,
    // A finger has no click: it opens the icon it rests on, and the icon fills while it does.
    "data-dwell": `app:${entry.id}`,
  }, parent);
  // What the table is, for the visitor who wants more than its name: it stands in the sidebar,
  // which is one place to read rather than a note wherever the hand is.
  group.addEventListener("pointerenter", () => point(entry));
  group.addEventListener("pointerleave", () => point(undefined));
  // The ring around the disc, which the object fills while it is held on this table.
  const ring = svg("circle", {
    class: "hub-icon-ring", r: ICON.radius + ICON.ring, fill: "none", stroke: entry.color,
  }, group);
  const arm = svg("circle", {
    class: "hub-icon-arm", r: ICON.radius + ICON.ring, fill: "none", stroke: entry.color,
    "stroke-dasharray": ARM_LENGTH, "stroke-dashoffset": ARM_LENGTH,
  }, group);
  const disc = svg("circle", {class: "hub-icon-disc", r: ICON.radius, fill: entry.color}, group);
  // The picture of the table, which is the object a visitor will have in their hand on it.
  const picture = svg("g", {class: "hub-icon-picture"}, group);
  svg("path", {
    class: "hub-icon-glyph", d: (ICONS[entry.picture as GlyphKind] ?? []).join(" "),
  }, picture);
  const title = wrapText(copy.title, TITLE_COLUMNS, TITLE_LINES).map(text => {
    const element = svg("text", {class: "hub-icon-title", "text-anchor": "middle"}, group);
    element.textContent = text;
    return element;
  });
  // What a visitor took from this table: one star a question, from the quiz on it.
  const stars = svg("text", {
    class: "hub-icon-stars", "text-anchor": "middle", fill: entry.color,
  }, group);
  group.addEventListener("click", () => open(entry));
  group.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    open(entry);
  });
  return {entry, group, disc, ring, arm, picture, title, stars, centre: {x: 0, y: 0}};
}

function placeIcon(
  icon: IconView, centre: {x: number; y: number}, above: boolean,
): void {
  icon.centre = centre;
  for (const circle of [icon.disc, icon.ring, icon.arm]) {
    attributes(circle, {cx: centre.x, cy: centre.y});
  }
  // The ring fills from the top, which is where a hand expects a clock to start.
  icon.arm.setAttribute("transform", `rotate(-90 ${centre.x} ${centre.y})`);
  icon.picture.setAttribute(
    "transform", `translate(${centre.x} ${centre.y}) scale(${(ICON.radius / 46).toFixed(3)})`);
  for (const [index, line] of icon.title.entries()) {
    const under = centre.y + ICON.radius + ICON.label + index * ICON.line;
    const over = centre.y - ICON.radius - ICON.label
      - (icon.title.length - 1 - index) * ICON.line
      - (above ? STAR_LINE : 0);
    attributes(line, {x: centre.x, y: above ? over : under});
  }
  // The stars stand on the far side of the name from the icon, which keeps the row of them
  // out of the middle where the bodies are.
  const lines = icon.title.length;
  attributes(icon.stars, {
    x: centre.x,
    y: above
      ? centre.y - ICON.radius - ICON.label - (lines - 1) * ICON.line + STAR_LINE - 4
      : centre.y + ICON.radius + ICON.label + (lines - 1) * ICON.line + STAR_LINE,
  });
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
  // The box at the right: what the table under the hand, or under the object, is about. It is
  // the one place a visitor reads, so a card and an organ say it there rather than each in a
  // note of its own.
  const box = svg("g", {class: "hub-info"}, scene);
  const boxPlate = svg("rect", {class: "hub-info-plate", rx: 18}, box);
  // The colour of the table runs down the edge of the sidebar and behind its picture.
  const boxBar = svg("rect", {class: "hub-info-bar"}, box);
  const boxDisc = svg("circle", {class: "hub-info-disc", r: 42}, box);
  const boxTitle = svg("text", {class: "hub-info-title"}, box);
  const boxPicture = svg("g", {class: "hub-info-picture"}, box);
  const boxIcon = svg("path", {class: "hub-info-icon"}, boxPicture);
  const boxLines = Array.from(
    {length: INFO.lines}, () => svg("text", {class: "hub-info-line"}, box));
  // While nothing is chosen the sidebar is the key of the five colours, which is what makes an
  // icon on the ring and an organ on the body the same table.
  const legend = svg("g", {class: "hub-legend"}, box);
  const keys = TABLES.map(entry => {
    const row = svg("g", {class: "hub-legend-row"}, legend);
    const dot = svg("circle", {class: "hub-legend-dot", r: 11, fill: entry.color}, row);
    const name = svg("text", {class: "hub-legend-name"}, row);
    name.textContent = entryCopy(voice, entry.id).title;
    return {dot, name};
  });
  const boxCall = svg("text", {class: "hub-info-call"}, box);
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

  const roles = [topicRole(voice)];
  const {input, tracker} = await openTableInput({
    parameters: host.parameters, element: host.surface, markers: [TOPIC_MARKER],
  });
  // What a visitor is invited to do, which depends on what the page is driven by.
  const call = !tracker.tracker
    ? copy.clickToOpen
    : tracker.discovered ? copy.bothToOpen : copy.touchToOpen;
  const icons: IconView[] = TABLES.map(
    entry => createIcon(row, entry, voice, open, entry2 => point(entry2)));

  /** The stars every table has been answered with, which its quiz keeps for it. */
  const paintStars = (): void => {
    const stars = readStars();
    for (const icon of icons) {
      const won = stars[icon.entry.id] ?? 0;
      icon.stars.textContent = won > 0 ? "★".repeat(won) : "";
    }
  };
  paintStars();
  watchStars(paintStars);


  // The woman and the man, side by side: the two reference bodies every table is solved on. The
  // page shows both of them, and the switch between them belongs to a table, where a body is
  // being solved for.
  const views: BodyView[] = (["female", "male"] as const).flatMap(sex => {
    const body = anatomy.bodies[sex];
    if (body === undefined) return [];
    const figure = svg("g", {
      class: "hub-body", "data-info": voice.say(copy.bodyInfo[sex]),
    }, figures);
    const art = svg("g", {class: "body-art"}, figure);
    // The exported body carries its own fills and is generated by pkpdsim, so it goes in as it
    // comes.
    art.innerHTML = body.svg;
    return [{
      sex, body, art, layout: {scale: 1, left: 0, top: 0}, marks: [] as OrganMark[],
    }];
  });
  if (views.length === 0) throw new Error("The anatomy holds no body.");

  /** One disc per organ a table is about, on each body: the organ is the table it belongs to. */
  for (const view of views) {
    const seen = new Set<string>();
    view.marks = TABLES.flatMap(entry => {
      if (seen.has(entry.organ)) return [];
      seen.add(entry.organ);
      const hit = svg("circle", {
        class: "hub-organ-hit", r: ORGAN_HIT.min, "data-dwell": `app:${entry.id}`,
      }, organs);
      hit.addEventListener("click", () => open(entry));
      // What a table is stands in the box at the right, so an organ and a card say it in the
      // one place rather than in a note over the body.
      hit.addEventListener("pointerenter", () => point(entry));
      hit.addEventListener("pointerleave", () => point(undefined));
      return [{
        entry, organ: entry.organ,
        disc: svg("circle", {class: "hub-organ", r: 15, stroke: entry.color}, organs),
        hit, centre: {x: 0, y: 0}, reach: ORGAN_HIT.min as number,
      }];
    });
  }

  let viewport: Viewport = {width: window.innerWidth, height: window.innerHeight};
  let status: TableStatus = input.status;
  let snapshot: TableSnapshot = input.snapshot;
  // The hold which opens a card, and the note behind the heading and the laboratory: one layer.
  createInfo(host.surface, () => [
    ...pointerPoints(snapshot, viewport), ...tokenPoints(snapshot, viewport),
  ], voice);
  // The object which picks a table draws its ring and its card like the objects of a table do.
  const tokenLayer = createTokenLayer(root, host);

  /** The table a hand is pointing at, which is read before the one the object points at. */
  let pointed: TableEntry | undefined;
  /** The table the object points at, and since when it has been pointing at the same one. */
  let turned: TableEntry | undefined;
  let turnedAt = 0;
  /** The object has to be turned once before it opens anything: it opens what a visitor chose. */
  let moved = false;

  /** The sidebar stands from under the settings to over the laboratory, whatever it says. */
  const placeBox = (): void => {
    const left = viewport.width - INFO.margin - INFO.width;
    const height = Math.max(
      320, viewport.height - INFO.top - ICON.margin - LAB_HEIGHT - 24);
    attributes(boxPlate, {x: left, y: INFO.top, width: INFO.width, height});
    const inside = left + PADDING + 4;
    attributes(boxBar, {x: left, y: INFO.top, width: 6, height});
    attributes(boxDisc, {cx: inside + 34, cy: INFO.top + 62});
    boxPicture.setAttribute(
      "transform", `translate(${inside + 34} ${INFO.top + 62}) scale(0.72)`);
    attributes(boxTitle, {x: inside, y: INFO.top + 142});
    for (const [index, line] of boxLines.entries()) {
      attributes(line, {x: inside, y: INFO.top + 190 + index * 27});
    }
    // The key stands under what the sidebar says, which is three lines while nothing is chosen.
    const under = INFO.top + 190 + 3 * 27 + 26;
    for (const [index, key] of keys.entries()) {
      attributes(key.dot, {cx: inside + 11, cy: under + index * 44});
      attributes(key.name, {x: inside + 36, y: under + index * 44 + 7});
    }
    attributes(boxCall, {x: inside, y: INFO.top + height - 28});
  };

  /** What the sidebar says: a table, or what this page is while nothing is chosen. */
  const showBox = (entry: TableEntry | undefined): void => {
    const title = entry === undefined ? copy.pickTitle : entryCopy(voice, entry.id).title;
    const text = entry === undefined
      ? voice.say(copy.pickText)
      : `${voice.say(entryCopy(voice, entry.id).blurb)} `
        + `${voice.say(entryCopy(voice, entry.id).about)}`;
    boxTitle.textContent = title;
    boxIcon.setAttribute(
      "d", entry === undefined ? "" : (ICONS[entry.picture as GlyphKind] ?? []).join(" "));
    boxPicture.setAttribute("opacity", entry === undefined ? "0" : "1");
    // The sidebar wears the colour of the table it is about, so the icon, the organ on the
    // body and the words are read as one thing.
    const colour = entry?.color ?? "var(--accent)";
    boxBar.setAttribute("fill", colour);
    boxDisc.setAttribute("fill", colour);
    boxDisc.setAttribute("opacity", entry === undefined ? "0" : "1");
    const lines = wrapText(text, INFO.columns, INFO.lines);
    for (const [index, line] of boxLines.entries()) line.textContent = lines[index] ?? "";
    legend.setAttribute("opacity", entry === undefined ? "1" : "0");
    boxCall.textContent = entry === undefined
      ? "" : turned?.id === entry.id ? copy.holdToOpen : call;
    for (const icon of icons) {
      icon.group.setAttribute("data-selected", String(icon.entry.id === entry?.id));
    }
    placeBox();
  };

  /** A hand on a card or on an organ, which is read before the object. */
  const point = (entry: TableEntry | undefined): void => {
    pointed = entry;
    showBox(pointed ?? turned);
  };
  showBox(undefined);

  const draw = (): void => {
    const stage = stageOf(viewport);
    const spots = iconSpots(stage, TABLES.length);
    for (const [index, icon] of icons.entries()) {
      const spot = spots[index];
      if (spot !== undefined) placeIcon(icon, spot, spot.above);
    }
    // The woman and the man stand side by side in the middle of the ring, both at the scale of
    // the taller of them, so that the two can be compared rather than only looked at.
    const disc = discOf(stage);
    const room = bodyBox(stage);
    const tallest = Math.max(...views.map(one => one.body.height));
    const scale = room.height / tallest;
    const widths = views.map(one => one.art.getBBox().width * scale);
    const gap = Math.round(disc.r * 0.12);
    const total = widths.reduce((sum, width) => sum + width, 0) + gap * (views.length - 1);
    let cursor = stage.x + (stage.width - total) / 2;
    for (const [index, one] of views.entries()) {
      const bounds = one.art.getBBox();
      const left = cursor - bounds.x * scale;
      const top = room.y + (room.height - one.body.height * scale);
      one.layout = {scale, left, top};
      one.art.setAttribute("transform", `translate(${left} ${top}) scale(${scale})`);
      cursor += (widths[index] ?? 0) + gap;
    }


    for (const one of views) {
      for (const mark of one.marks) {
        const anchor = anchorOf(one.body, mark.organ);
        const {scale: s, left: x, top: y} = one.layout;
        mark.centre = {x: x + anchor.x * s, y: y + anchor.y * s};
        attributes(mark.disc, {cx: mark.centre.x, cy: mark.centre.y});
        attributes(mark.hit, {cx: mark.centre.x, cy: mark.centre.y});
      }
      for (const mark of one.marks) {
        const gaps = one.marks
          .filter(other => other !== mark)
          .map(other => Math.hypot(other.centre.x - mark.centre.x, other.centre.y - mark.centre.y));
        mark.reach = Math.max(
          ORGAN_HIT.min,
          Math.min(ORGAN_HIT.max, gaps.length === 0 ? ORGAN_HIT.max : Math.min(...gaps) / 2));
        mark.hit.setAttribute("r", String(mark.reach));
      }
    }


    // The heading stands over the ring, which is the room left of the sidebar.
    const middle = stage.x + stage.width / 2;
    attributes(heading, {x: middle, y: HEAD.top});
    for (const [index, line] of motivation.entries()) {
      attributes(line, {x: middle, y: HEAD.top + 44 + index * HEAD.line});
    }
    // The sidebar at the right, under the settings along the top.
    placeBox();
    // The laboratory in the bottom right corner: the square a phone is pointed at, and the
    // three lines beside it, which open the page about all of this.
    const square = 84;
    const base = viewport.height - ICON.margin - square;
    const right = viewport.width - ICON.margin;
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
    // The object which picks a table: its angle is which of the five it is pointing at.
    const values = valuesFromTokens(roles, snapshot.tokens);
    const value = values.get("topic");
    const next = value === undefined ? undefined : tableAtDial(value);
    if (next?.id !== turned?.id) {
      // The first reading of an object which was just put down is where it happens to lie, so
      // it chooses nothing until it has been turned.
      if (turned !== undefined && next !== undefined) moved = true;
      turned = next;
      turnedAt = performance.now();
      if (next === undefined) moved = false;
      showBox(pointed ?? turned);
    }
    tokenLayer.update({
      snapshot, roles, viewport,
      card: (token, role) => {
        if (role === undefined) {
          return {kind: "unassigned", title: kit.markerTitle(token.marker), value: kit.noRole,
            note: voice.say(kit.noRoleNote)};
        }
        const entry = tableAtDial(
          valuesFromTokens(roles, new Map([[token.sessionId, token]])).get("topic") ?? 0);
        return {
          kind: "dial", title: role.label,
          value: entryCopy(voice, entry.id).title,
          note: moved ? copy.holdToOpen : "",
          info: role.description,
          glyph: {kind: entry.picture as GlyphKind, level: 1},
        };
      },
    });
  };

  /**
   * The object opens the table it has been held still on. A hand presses a card by resting on
   * it, and an object does the same by standing still: the card fills while it is held, so that
   * waiting is visibly doing something.
   */
  const holding = (now: number): void => {
    window.requestAnimationFrame(holding);
    const entry = turned;
    const icon = icons.find(one => one.entry.id === entry?.id);
    for (const one of icons) {
      if (one !== icon) one.arm.setAttribute("stroke-dashoffset", String(ARM_LENGTH));
    }
    if (entry === undefined || icon === undefined || !moved) return;
    const held = Math.min(1, (now - turnedAt) / HOLD);
    icon.arm.setAttribute("stroke-dashoffset", (ARM_LENGTH * (1 - held)).toFixed(1));
    if (held >= 1) {
      icon.arm.setAttribute("stroke-dashoffset", String(ARM_LENGTH));
      open(entry);
    }
  };
  window.requestAnimationFrame(holding);

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
