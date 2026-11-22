/**
 * The machine perfusion table: an organ outside the body, kept alive by a pump, an oxygenator
 * and a warm perfusate. The three settings of the machine are objects on the surface, and the
 * model is solved again whenever they come to rest.
 *
 * The application starts this table for `?app=perfusion`; the tracker and the surface are the
 * ones of the application, see `apps/table`.
 */

import {
  createSolver, fetchSolverAssets, loadCoreHost, sampleAt, toSeries,
} from "@pkpdsim-tui/core-runtime";
import type {Series, Solver} from "@pkpdsim-tui/core-runtime";
import {
  PERFUSION_COLUMNS, PERFUSION_SIMULATION, perfusionRequest, REFERENCE_SETTINGS,
} from "@pkpdsim-tui/perfusion-sim";
import type {PerfusionSettings} from "@pkpdsim-tui/perfusion-sim";
import {
  createChrome, createInfo, createPlot, createQuiz, createReadout, createTokenLayer, driveHint, formatNumber,
  LAB_ROOM, pointerPoints, tokenPoints, visibleStats, words,
} from "@pkpdsim-tui/tui-kit";
import type {Box, TableHost, Viewport} from "@pkpdsim-tui/tui-kit";
import {openTableInput, unassignedMarkers, valuesFromTokens} from "@pkpdsim-tui/tuio-input";
import type {TableSnapshot, TableStatus, TrackerOptions} from "@pkpdsim-tui/tuio-input";
import {cardFor, perfusionStats, perfusionTraces} from "./cards.ts";
import type {PerfusionReadout} from "./cards.ts";
import {createCircuit} from "./circuit.ts";
import {
  perfusionReading,
} from "./audience.ts";
import {perfusionRoles, PERFUSION_MARKERS} from "./roles.ts";
import {PERFUSION_TEXT} from "./text.ts";
import "./style.css";

/** How long the table waits for the objects to come to rest before it solves. */
const SETTLE = 140;
const BAND = 132;
const PANEL = 400;
const MARGIN = 36;
const ZONES = 4;



function boxes(viewport: Viewport): {circuit: Box; plot: Box} {
  const left = PANEL;
  const right = viewport.width - MARGIN;
  const top = BAND + 20;
  // The laboratory stands in the bottom corner of every page, under both of them.
  const height = Math.max(240, viewport.height - top - MARGIN - LAB_ROOM);
  const split = Math.min((right - left) * 0.56, height * 1.1);
  return {
    circuit: {x: left, y: top, width: split, height},
    plot: {
      x: left + split + 30, y: top + 20, width: right - left - split - 30,
      height: Math.max(200, height - 60),
    },
  };
}

/** The machine perfusion table, on the surface of the application. */
export async function startPerfusionTable(host: TableHost): Promise<void> {
  const voice = host.voice;
  const copy = voice.pick(PERFUSION_TEXT);
  const kit = words(voice);
  const solverBase = new URL("solver/", host.assets);
  host.progress(copy.startingSolver);
  const core = await loadCoreHost(new URL("sbmlsim-core.js", solverBase));
  const solver: Solver = await createSolver({
    host: core, key: "perfusion", assets: await fetchSolverAssets(solverBase),
  });

  const hours = PERFUSION_SIMULATION.end / 60;
  const roles = perfusionRoles(hours, voice);
  const axis = {max: PERFUSION_SIMULATION.end, tick: 60, scale: 1 / 60, unit: "h"};

  const surface = host.surface;
  const root = host.scene;
  const circuit = createCircuit(root, voice);
  const plot = createPlot(root, perfusionTraces(voice));
  const readout = createReadout<PerfusionReadout>(
    root, visibleStats(perfusionStats(voice), voice));
  const tokenLayer = createTokenLayer(root, host);
  // Three questions about this table, behind the button in the near corner.
  createQuiz(host.chrome, {voice, questions: copy.quiz, table: "perfusion"});
  const chrome = createChrome(host.chrome, {
    mark: host.mark,
    voice,
    onBack: () => host.back(),
    onReset: () => host.reset(),
    onChoose: (group, option) => host.choose(group, option),
  });

  const {input, tracker} = await openTableInput({
    parameters: host.parameters, element: surface, markers: [...PERFUSION_MARKERS],
  });

  const origins = new Map<number, number>();
  let viewport: Viewport = {width: window.innerWidth, height: window.innerHeight};
  let snapshot: TableSnapshot = input.snapshot;
  let status: TableStatus = input.status;

  // The note layer reads the fingers of the tracker out of the snapshot, on the clock of
  // the page, so it is built once there is one. Built before the input is opened, its
  // first frame fell into the wait for the tracker and read a snapshot which did not
  // exist yet, and the layer died with it.
  createInfo(surface, () => [
    ...pointerPoints(snapshot, viewport), ...tokenPoints(snapshot, viewport),
  ], voice);
  let series: Series = {};
  let baseline: Series = {};
  let solving = true;
  let notice = "";
  let solved = "";
  let settle = 0;
  let frame = 0;
  let pending: AbortController | null = null;

  const readoutOf = (course: Series, hour: number): PerfusionReadout => {
    const at = sampleAt(course, hour * 60);
    const zones = Array.from({length: ZONES}, (_unused, index) => ({
      alive: at[`f_alive_z${index + 1}`] ?? 1,
      oxygen: at[`pO2_z${index + 1}`] ?? at["pO2_out"] ?? 0,
    }));
    return {
      inflow: at["pO2_in"] ?? 0,
      outflow: at["pO2_out"] ?? 0,
      bile: at["bile_rate"] ?? 0,
      alivePericentral: at["f_alive_pc"] ?? at["f_alive_z4"] ?? 1,
      alivePeriportal: at["f_alive_z1"] ?? 1,
      alt: at["alt_act_res"] ?? 0,
      lactate: at["[lac_res]"] ?? 0,
      zones,
    };
  };

  const solve = async (settings: PerfusionSettings, isReference: boolean): Promise<void> => {
    pending?.abort();
    const controller = new AbortController();
    pending = controller;
    solving = true;
    schedule();
    try {
      const result = await solver.simulate(
        perfusionRequest(settings, PERFUSION_COLUMNS), {signal: controller.signal});
      series = toSeries(result);
      if (isReference) baseline = series;
      notice = "";
    } catch (error) {
      if (controller.signal.aborted) return;
      notice = kit.solveFailed(error instanceof Error ? error.message : String(error));
    } finally {
      if (pending === controller) {
        pending = null;
        solving = false;
      }
      schedule();
    }
  };

  const render = (): void => {
    frame = 0;
    for (const [sessionId, token] of snapshot.tokens) {
      if (!origins.has(sessionId)) origins.set(sessionId, token.turn);
    }
    for (const sessionId of [...origins.keys()]) {
      if (!snapshot.tokens.has(sessionId)) origins.delete(sessionId);
    }

    const values = valuesFromTokens(roles, snapshot.tokens, origins);
    const settings: PerfusionSettings = {
      flow: values.get("flow") ?? REFERENCE_SETTINGS.flow,
      oxygen: values.get("oxygen") ?? REFERENCE_SETTINGS.oxygen,
      temperature: values.get("temperature") ?? REFERENCE_SETTINGS.temperature,
    };
    const hour = values.get("hour") ?? hours;

    const next = JSON.stringify(settings);
    if (next !== solved) {
      solved = next;
      window.clearTimeout(settle);
      settle = window.setTimeout(
        () => void solve(settings, next === JSON.stringify(REFERENCE_SETTINGS)), SETTLE);
    }

    const current = readoutOf(series, hour);
    const reference = readoutOf(baseline, hour);
    root.setAttribute("data-solving", String(solving));
    circuit.update(current, settings.flow);
    plot.update({series, baseline, cursor: hour * 60, axis});
    readout.update(current, reference);
    tokenLayer.update({
      snapshot, roles, viewport,
      card: (token, role) => cardFor(voice, token, role, current, origins),
    });
    chrome.update({
      title: host.title, about: voice.say(copy.about),
      tries: copy.tries.map(entry => voice.say(entry)),
      reading: perfusionReading(voice, settings, current, hour),
      back: true,
      status, roles, notice,
      value: role => {
        const value = values.get(role.id) ?? role.reference;
        const digits = role.id === "flow" || role.id === "hour" ? 1 : 0;
        return `${formatNumber(value, digits)} ${role.unit}`;
      },
      live: new Set(values.keys()),
      unassigned: unassignedMarkers(roles, snapshot.tokens),
      hint: driveHint(voice, {...tracker, connected: status.state === "connected"}, roles),
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
    circuit.resize(layout.circuit);
    plot.resize(layout.plot);
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

  host.progress(copy.solvingReference);
  await solve(REFERENCE_SETTINGS, true);
}
