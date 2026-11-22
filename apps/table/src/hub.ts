/**
 * The landing page: the two reference bodies of pkpdsim side by side, the five tables on a ring
 * around them, and a heading which says what the whole thing is for. It carries no panel: what
 * a table is stands in the box at the right, for the card a visitor is pointing at.
 *
 * A card is opened by holding a finger on it, by touching the organ it points at, or with the
 * mouse. The landing page carries no object of its own: the objects of the surface belong to
 * the tables, which number them from 1, and a visitor who has just walked up has their hands.
 */

import {loadAnatomy, referenceBody} from "@pkpdsim-tui/cardio-sim";
import type {Body} from "@pkpdsim-tui/cardio-sim";
import {openTableInput} from "@pkpdsim-tui/tuio-input";
import type {TableSnapshot, TableStatus, TrackerOptions} from "@pkpdsim-tui/tuio-input";
import {
  attributes, chooseQuery, createInfo, ICONS, LAB_ROOM, pointerPoints, readStars, reportStatus,
  SAY_PATH, SAY_WAVES, svg, watchStars, words,
} from "@pkpdsim-tui/tui-kit";
import type {GlyphKind, TableApp, TableHost, Viewport, Voice} from "@pkpdsim-tui/tui-kit";
import {ABOUT, entryCopy, OVERVIEW, TABLES} from "./tables.ts";
import type {TableEntry} from "./tables.ts";
import {personLine} from "./person.ts";
import {HUB_TEXT} from "./text.ts";
import {wrapText} from "./wrap.ts";

/**
 * How many lines of motivation stand under the heading, which the layout keeps room for. The
 * copy of a level is written as lines, but a long one of them is wrapped to the room there is:
 * the sentence of an expert is twice the sentence of a child.
 */
const MOTIVATION_LINES = 4;
/** How wide a character of that line is, which is what wraps it: 21px of the sans of the page. */
const MOTIVATION_WIDTH = 10.2;
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
/** The line under the name of a card: what a visitor will do at that table. */
const TAG_COLUMNS = 24;
/** What the bodies in the middle keep clear of the icons around them, in pixels. */
const STRUT = 30;
/** The sidebar at the right: what the table a visitor is pointing at is, at length. */
const INFO = {width: 404, margin: 28, top: 168, lines: 13, columns: 40} as const;

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
/** How wide the room over and around the ring is: the page without the sidebar at the right. */
function stageWidth(viewport: Viewport): number {
  // The sidebar says what the table under the hand is, and the ring keeps clear of it.
  const column = viewport.width > 1180 ? INFO.width + 2 * INFO.margin : ICON.margin;
  return Math.max(420, viewport.width - column - ICON.margin);
}

function stageOf(viewport: Viewport, lines: number): CardBox {
  const top = HEAD.top + HEAD.line * lines + HEAD.bottom;
  return {
    x: ICON.margin,
    y: top,
    width: stageWidth(viewport),
    height: Math.max(360, viewport.height - ICON.margin - top),
  };
}

/** Where the icons sit: on a ring around the figures, evenly, starting at the top. */
function iconSpots(
  stage: CardBox, count: number,
): readonly {x: number; y: number; above: boolean}[] {
  const centre = {x: stage.x + stage.width / 2, y: stage.y + stage.height / 2};
  const radius = ringRadius(stage);
  return Array.from({length: count}, (_unused, index) => {
    const degrees = RING[index % RING.length] ?? 0;
    const angle = degrees * Math.PI / 180;
    return {
      x: centre.x + radius * Math.cos(angle),
      y: centre.y + radius * Math.sin(angle),
      // The name of the icon over the heads is read above it, where the heading leaves room:
      // under it is where the bodies stand.
      above: degrees === -90,
    };
  });
}

/** The dark disc the two bodies stand on, in the middle of the ring of icons. */
function discOf(stage: CardBox): {x: number; y: number; r: number} {
  const centre = {x: stage.x + stage.width / 2, y: stage.y + stage.height / 2};
  // What the ring leaves in the middle: the room inside it, less what an icon takes of it.
  return {...centre, r: Math.max(130, ringRadius(stage) - ICON.radius - STRUT)};
}

/**
 * The ring the tables stand on. It is a circle, so every table is the same distance from the
 * bodies in the middle and none of them looks nearer than the others, and it is as wide as the
 * narrower side of the stage allows once an icon, its name over two lines and the stars of its
 * quiz are on it.
 */
function ringRadius(stage: CardBox): number {
  const across = stage.width / 2 - ICON.radius - 92;
  const down = stage.height / 2 - ICON.radius - ICON.label - ICON.line - STAR_LINE;
  return Math.min(across, down);
}

/**
 * The room the two figures take on the disc: as tall as the disc allows with their names under
 * their feet, which is what makes them a portrait rather than a diagram.
 */
function bodyBox(stage: CardBox): CardBox {
  const disc = discOf(stage);
  // As tall as the ring leaves room for, which is what makes the two of them the thing in the
  // middle rather than a pair of marks between the icons.
  const height = disc.r * 1.9;
  return {x: disc.x - disc.r, y: disc.y - height / 2, width: 2 * disc.r, height};
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
  // The name of the table, and under it the line which says what is done at it. They are one
  // list, so that the lines are placed together whether the card hangs above or below its disc.
  const title = [
    ...wrapText(copy.title, TITLE_COLUMNS, TITLE_LINES).map(text => ({text, kind: "title"})),
    ...wrapText(copy.tagline, TAG_COLUMNS, 1).map(text => ({text, kind: "tag"})),
  ].map(({text, kind}) => {
    const element = svg("text", {
      class: `hub-icon-${kind}`, "text-anchor": "middle",
    }, group);
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
  // Who the tables are being solved for, which the figure in the middle of the ring is.
  const person = host.individual;
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
  /**
   * The heading is one line of SVG text, which does not wrap, so a long name of a collection is
   * set in whatever size the room allows rather than running off the page.
   */
  const fitHeading = (room: number): void => {
    heading.removeAttribute("font-size");
    const width = heading.getComputedTextLength();
    if (width <= room || width <= 0) return;
    const base = Number.parseFloat(window.getComputedStyle(heading).fontSize);
    const size = (Number.isFinite(base) ? base : 52) * room / width;
    heading.setAttribute("font-size", `${size.toFixed(1)}px`);
  };
  // The lines are drawn empty and filled at every layout: how many of them a sentence takes
  // depends on how wide the room over the ring is.
  const motivation = Array.from({length: MOTIVATION_LINES}, () =>
    svg("text", {class: "hub-motivation", "text-anchor": "middle"}, head));
  const sentences = copy.motivation[voice.level];
  const said = sentences.join(" ");
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
  const boxTag = svg("text", {class: "hub-info-tag"}, box);
  const boxPicture = svg("g", {class: "hub-info-picture"}, box);
  const boxIcon = svg("path", {class: "hub-info-icon"}, boxPicture);
  const boxLines = Array.from(
    {length: INFO.lines}, () => svg("text", {class: "hub-info-line"}, box));
  // What the sidebar says is read aloud by the speaker beside it, as everywhere else.
  const boxSay = svg("g", {
    class: "hub-say", role: "button", tabindex: 0, "data-dwell": "say",
  }, box);
  svg("circle", {class: "hub-say-plate", r: 17}, boxSay);
  svg("path", {class: "hub-say-cone", d: SAY_PATH}, boxSay);
  svg("path", {class: "hub-say-waves", d: SAY_WAVES}, boxSay);
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

  const open = (entry: TableEntry): void => {
    chooseQuery("app", entry.id, OVERVIEW);
  };

  // The fingers of the surface, and nothing else: the landing page has no object to read.
  const {input, tracker} = await openTableInput({
    parameters: host.parameters, element: host.surface, markers: [],
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


  // The two bodies in the middle of the ring: a woman and a man, both drawn, with the one the
  // tables are being solved for in full and the other one behind it. The landing page is about
  // that person, and the four tables around them are four ways of looking at this one body,
  // but a visitor who walks up sees at once that the collection knows both. The drawings are
  // the grown up ones of the library, because that is what the anatomy carries; what the
  // tables are solved with is the body of their age, which the figure stands at the height of.
  const views: BodyView[] = (["female", "male"] as const).flatMap(sex => {
    const body = anatomy.bodies[sex];
    if (body === undefined) return [];
    const figure = svg("g", {
      class: "hub-body", "data-chosen": String(sex === person.sex),
      "data-info": `${personLine(voice, person)} ${copy.person.solvedFor}`,
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
    // The organs are marked on the body the tables are solved for: two sets of discs would be
    // two sets of targets for one table, and the body behind is there to be compared, not
    // pressed.
    if (view.sex !== person.sex) continue;
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
  createInfo(host.surface, () => pointerPoints(snapshot, viewport), voice);

  /** The table a hand is pointing at, which is what the sidebar is about. */
  let pointed: TableEntry | undefined;
  /** How many lines the sidebar is saying, which is what the key below it stands under. */
  let boxLineCount = 3;

  /** The sidebar stands from under the settings to over the laboratory, whatever it says. */
  const placeBox = (): void => {
    const left = viewport.width - INFO.margin - INFO.width;
    const height = Math.max(
      320, viewport.height - INFO.top - ICON.margin - LAB_ROOM);
    attributes(boxPlate, {x: left, y: INFO.top, width: INFO.width, height});
    const inside = left + PADDING + 4;
    attributes(boxBar, {x: left, y: INFO.top, width: 6, height});
    attributes(boxDisc, {cx: inside + 34, cy: INFO.top + 62});
    boxPicture.setAttribute(
      "transform", `translate(${inside + 34} ${INFO.top + 62}) scale(0.72)`);
    attributes(boxTitle, {x: inside, y: INFO.top + 142});
    attributes(boxTag, {x: inside, y: INFO.top + 172});
    // The speaker stands at the end of the title line, at the far edge of the sidebar.
    boxSay.setAttribute(
      "transform",
      `translate(${left + INFO.width - PADDING - 18} ${INFO.top + 134}) scale(1)`);
    // What the sidebar says starts under the title, and under the line below it where there
    // is one: while nothing is chosen the sidebar has a title only.
    const said = INFO.top + (boxTag.textContent === "" ? 190 : 214);
    for (const [index, line] of boxLines.entries()) {
      attributes(line, {x: inside, y: said + index * 27});
    }
    // The key stands under what the sidebar says, however many lines that is.
    const under = said + boxLineCount * 27 + 26;
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
    boxTag.textContent = entry === undefined ? "" : entryCopy(voice, entry.id).tagline;
    // What is read is the text of the sidebar itself, one phrase to a line: each of them is a
    // text of the application and so has a clip of its own, which the two together do not.
    boxSay.setAttribute("data-say", entry === undefined
      ? voice.say(copy.pickText)
      : `${voice.say(entryCopy(voice, entry.id).blurb)}\n`
        + `${voice.say(entryCopy(voice, entry.id).about)}`);
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
    boxLineCount = lines.length;
    for (const [index, line] of boxLines.entries()) line.textContent = lines[index] ?? "";
    legend.setAttribute("opacity", entry === undefined ? "1" : "0");
    boxCall.textContent = entry === undefined ? "" : call;
    for (const icon of icons) {
      icon.group.setAttribute("data-selected", String(icon.entry.id === entry?.id));
    }
    placeBox();
  };

  /** A hand on a card or on an organ, which is what the sidebar follows. */
  const point = (entry: TableEntry | undefined): void => {
    pointed = entry;
    showBox(pointed);
  };
  showBox(undefined);

  const draw = (): void => {
    // What stands under the heading, wrapped to the room there is, and how much room the ring
    // is left with after it.
    // Every sentence starts a line of its own, and a sentence too long for the room it has is
    // wrapped within its own lines: two sentences never share a line, which is what makes the
    // two lines under the heading read as two things rather than as a paragraph.
    fitHeading(Math.max(320, viewport.width - 2 * ICON.margin));
    const columns = Math.max(28, Math.floor(stageWidth(viewport) / MOTIVATION_WIDTH));
    const motivationLines = sentences
      .flatMap(sentence => wrapText(sentence, columns, MOTIVATION_LINES))
      .slice(0, MOTIVATION_LINES);
    const stage = stageOf(viewport, motivationLines.length);
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
    // How tall the person is against the grown up the drawing is of: a body of eight years
    // stands in the ring at the height of a body of eight years, and its organs with it.
    const grown = referenceBody(35, person.sex).height;
    const scale = (room.height / tallest) * (grown > 0 ? person.height / grown : 1);
    const widths = views.map(one => one.art.getBBox().width * scale);
    // The two bodies stand close together, as one thing in the middle of the ring.
    const gap = Math.round(disc.r * 0.02);
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
      line.textContent = motivationLines[index] ?? "";
      attributes(line, {x: middle, y: HEAD.top + 44 + index * HEAD.line});
    }
    // The sidebar at the right, under the settings along the top. The laboratory under it is
    // furniture of the page: the application draws it in the same corner of every page.
    placeBox();
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
