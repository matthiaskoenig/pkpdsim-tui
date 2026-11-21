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
  createChrome, createInfo, createReadout, createTokenLayer, driveHint, pointerPoints,
  tokenPoints, visibleStats, words,
} from "@pkpdsim-tui/tui-kit";
import type {Box, TableHost, Viewport} from "@pkpdsim-tui/tui-kit";
import {openTableInput, unassignedMarkers, valuesFromTokens} from "@pkpdsim-tui/tuio-input";
import type {TableSnapshot, TableStatus} from "@pkpdsim-tui/tuio-input";
import {cardFor, liverStats, LOBULES} from "./cards.ts";
import {createChapters} from "./chapters.ts";
import {createLobule} from "./lobule.ts";
import {createSupply} from "./supply.ts";
import {liverReading} from "./audience.ts";
import {liverRoles, LIVER_MARKERS} from "./roles.ts";
import {LIVER_TEXT} from "./text.ts";
import "./style.css";
/** The band of numbers at the top, and the room the panel keeps at the left. */
const BAND = 132;
const PANEL = 400;
const MARGIN = 36;
const CHAPTERS = 86;

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
  const voice = host.voice;
  const copy = voice.pick(LIVER_TEXT);
  const roles = liverRoles(voice);
  const stats = visibleStats(liverStats(voice), voice);
  host.progress(words(voice).loading);
  // The liver table reads the export of the circulation, which is the folder it is given.
  const data = await loadCardiovascularData(
    new URL("cardiovascular-data.json", host.assets));
  const reference: PressureReference = data.pressure;
  const base = defaultControls(reference);
  const baseline = solvePressure(reference, base);

  const surface = host.surface;
  const root = host.scene;
  const supply = createSupply(root, voice);
  const lobule = createLobule(root, voice);
  const chapters = createChapters(root, voice);
  const readout = createReadout<PressureSolution>(root, stats);
  const tokenLayer = createTokenLayer(root, host);
  const chrome = createChrome(host.chrome, {
    voice,
    onBack: () => host.back(),
    onChoose: (group, option) => host.choose(group, option),
  });

  const {input, tracker} = await openTableInput({
    parameters: host.parameters, element: surface,
    markers: [...LIVER_MARKERS],
  });

  let viewport: Viewport = {width: window.innerWidth, height: window.innerHeight};
  let snapshot: TableSnapshot = input.snapshot;
  let status: TableStatus = input.status;
  let frame = 0;

  // The note layer reads the fingers of the tracker out of the snapshot, on the clock of
  // the page, so it is built once there is one. Built before the input is opened, its
  // first frame fell into the wait for the tracker and read a snapshot which did not
  // exist yet, and the layer died with it.
  createInfo(surface, () => [
    ...pointerPoints(snapshot, viewport), ...tokenPoints(snapshot, viewport),
  ], voice);

  const render = (): void => {
    frame = 0;
    const values = valuesFromTokens(roles, snapshot.tokens);
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
      snapshot, roles: roles, viewport,
      card: (token, role) => cardFor(voice, token, role, solution),
    });
    chrome.update({
      title: host.title, about: voice.say(copy.about),
      tries: copy.tries.map(entry => voice.say(entry)),
      reading: liverReading(voice, solution, baseline),
      back: true,
      status, roles, notice: "",
      value: role => `${(values.get(role.id) ?? role.reference).toFixed(2)}x`,
      live: new Set(values.keys()),
      unassigned: unassignedMarkers(roles, snapshot.tokens),
      hint: driveHint(
        voice, {...tracker, connected: status.state === "connected"}, roles),
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
