/**
 * The liver table: why the body has a liver at all. Two supplies bring the blood, one lobule
 * shows what happens inside, and three cards lead to the tables which take it further.
 *
 * The numbers come from the steady pressure network of the cardiovascular model, which is
 * algebra and answers while a hand is still on an object.
 */

import {defaultControls, loadCardiovascularData, solvePressure} from "@pkpdsim-tui/cardio-sim";
import type {PressureControls, PressureReference, PressureSolution} from "@pkpdsim-tui/cardio-sim";
import {
  createChrome, createInfo, createReadout, createTokenLayer, pointerPoints, tokenPoints,
} from "@pkpdsim-tui/tui-kit";
import type {Box, TableHost, Viewport} from "@pkpdsim-tui/tui-kit";
import {openTableInput, unassignedMarkers, valuesFromTokens} from "@pkpdsim-tui/tuio-input";
import type {TableSnapshot, TableStatus, TrackerOptions} from "@pkpdsim-tui/tuio-input";
import {cardFor, LIVER_STATS, LOBULES} from "./cards.ts";
import {createChapters} from "./chapters.ts";
import {createLobule} from "./lobule.ts";
import {createSupply} from "./supply.ts";
import {LIVER_ABOUT, LIVER_TITLE, LIVER_TRIES, liverReading} from "./audience.ts";
import {LIVER_ROLES} from "./roles.ts";
import "./style.css";

const MOUSE_HINT = "Keys 1 and 2 put an object down, drag moves it, the wheel turns it.";
const TABLE_HINT = "Put an object on the table and turn it.";
const BOTH_HINT = "Put an object on the table and turn it, or press 1 or 2 here to place one.";
/** The band of numbers at the top, and the room the panel keeps at the left. */
const BAND = 132;
const PANEL = 400;
const MARGIN = 36;
const CHAPTERS = 86;

function hintFor(tracker: TrackerOptions, state: TableStatus["state"]): string {
  if (!tracker.tracker) return MOUSE_HINT;
  if (state === "connected") return tracker.discovered ? BOTH_HINT : TABLE_HINT;
  return `Start a TUIO ${tracker.version} tracker on ${tracker.address}, or drop "?tuio" from `
    + "the address to drive the table with the mouse.";
}

function boxes(viewport: Viewport): {supply: Box; lobule: Box; chapters: Box} {
  const left = PANEL;
  const right = viewport.width - MARGIN;
  const top = BAND + 20;
  const chapters = {
    x: left, y: viewport.height - MARGIN - CHAPTERS, width: right - left, height: CHAPTERS,
  };
  const height = Math.max(220, chapters.y - 28 - top);
  const split = (right - left) * 0.54;
  return {
    supply: {x: left, y: top, width: split, height},
    lobule: {x: left + split + 24, y: top, width: right - left - split - 24, height},
    chapters,
  };
}

/** The liver table, on the surface of the application. */
export async function startLiverTable(host: TableHost): Promise<void> {
  host.progress("Loading the circulation...");
  // The liver table reads the export of the circulation, which is the folder it is given.
  const data = await loadCardiovascularData(
    new URL("cardiovascular-data.json", host.assets));
  const reference: PressureReference = data.pressure;
  const base = defaultControls(reference);
  const baseline = solvePressure(reference, base);

  const surface = host.surface;
  const root = host.scene;
  const supply = createSupply(root);
  const lobule = createLobule(root);
  const chapters = createChapters(root);
  const readout = createReadout<PressureSolution>(root, LIVER_STATS);
  const tokenLayer = createTokenLayer(root);
  createInfo(surface, () => [
    ...pointerPoints(snapshot, viewport), ...tokenPoints(snapshot, viewport),
  ]);
  const chrome = createChrome(host.chrome, {
    onBack: () => host.back(),
    onChoose: (group, option) => host.choose(group, option),
  });

  const {input, tracker} = await openTableInput({
    parameters: host.parameters, element: surface,
    markers: LIVER_ROLES.map(role => role.markers[0] ?? 0),
  });

  let viewport: Viewport = {width: window.innerWidth, height: window.innerHeight};
  let snapshot: TableSnapshot = input.snapshot;
  let status: TableStatus = input.status;
  let frame = 0;

  const render = (): void => {
    frame = 0;
    const values = valuesFromTokens(LIVER_ROLES, snapshot.tokens);
    const controls: PressureControls = {
      ...base,
      portal: values.get("portal") ?? base.portal,
      hepatic: values.get("hepatic") ?? base.hepatic,
    };
    const solution = solvePressure(reference, controls);
    supply.update(solution);
    lobule.update(1e6 * solution.qh / LOBULES);
    readout.update(solution, baseline);
    tokenLayer.update({
      snapshot, roles: LIVER_ROLES, viewport,
      card: (token, role) => cardFor(token, role, solution),
    });
    chrome.update({
      title: LIVER_TITLE, about: LIVER_ABOUT, tries: LIVER_TRIES,
      reading: liverReading(solution, baseline),
      back: "Back to the body",
      choices: [...host.choices],
      status, roles: LIVER_ROLES, notice: "",
      value: role => `${(values.get(role.id) ?? role.reference).toFixed(2)}x`,
      live: new Set(values.keys()),
      unassigned: unassignedMarkers(LIVER_ROLES, snapshot.tokens),
      hint: hintFor(tracker, status.state),
      credit: "",
    });
  };

  const schedule = (): void => {
    if (frame !== 0) return;
    frame = window.requestAnimationFrame(render);
  };

  const resize = (): void => {
    viewport = {width: window.innerWidth, height: window.innerHeight};
    root.setAttribute("viewBox", `0 0 ${viewport.width} ${viewport.height}`);
    const layout = boxes(viewport);
    supply.resize(layout.supply);
    lobule.resize(layout.lobule);
    chapters.resize(layout.chapters);
    readout.resize(viewport);
    schedule();
  };

  input.subscribe((next, nextStatus) => {
    snapshot = next;
    status = nextStatus;
    schedule();
  });
  window.addEventListener("resize", resize, {passive: true});
  window.addEventListener("pagehide", () => input.disconnect());
  resize();
  input.connect();
}
