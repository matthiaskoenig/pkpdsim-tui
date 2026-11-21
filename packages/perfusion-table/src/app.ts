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
  createChrome, createInfo, createPlot, createReadout, createTokenLayer, formatNumber,
  pointerPoints, tokenPoints,
} from "@pkpdsim-tui/tui-kit";
import type {Box, TableHost, Viewport} from "@pkpdsim-tui/tui-kit";
import {openTableInput, unassignedMarkers, valuesFromTokens} from "@pkpdsim-tui/tuio-input";
import type {TableSnapshot, TableStatus, TrackerOptions} from "@pkpdsim-tui/tuio-input";
import {cardFor, PERFUSION_STATS, PERFUSION_TRACES} from "./cards.ts";
import type {PerfusionReadout} from "./cards.ts";
import {createCircuit} from "./circuit.ts";
import {
  PERFUSION_ABOUT, PERFUSION_TITLE, PERFUSION_TRIES, perfusionReading,
} from "./audience.ts";
import {perfusionRoles} from "./roles.ts";
import "./style.css";

const MOUSE_HINT = "Keys 1 to 4 put an object down, drag moves it, the wheel turns it.";
const TABLE_HINT = "Put an object on the table and turn it.";
const BOTH_HINT = "Put an object on the table and turn it, or press 1 to 4 here to place one.";
/** How long the table waits for the objects to come to rest before it solves. */
const SETTLE = 140;
const BAND = 132;
const PANEL = 400;
const MARGIN = 36;
const ZONES = 4;

function hintFor(tracker: TrackerOptions, state: TableStatus["state"]): string {
  if (!tracker.tracker) return MOUSE_HINT;
  if (state === "connected") return tracker.discovered ? BOTH_HINT : TABLE_HINT;
  return `Start a TUIO ${tracker.version} tracker on ${tracker.address}, or drop "?tuio" from `
    + "the address to drive the table with the mouse.";
}

function boxes(viewport: Viewport): {circuit: Box; plot: Box} {
  const left = PANEL;
  const right = viewport.width - MARGIN;
  const top = BAND + 20;
  const height = Math.max(240, viewport.height - top - MARGIN);
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
  const solverBase = new URL("solver/", host.assets);
  host.progress("Starting the solver...");
  const core = await loadCoreHost(new URL("sbmlsim-core.js", solverBase));
  const solver: Solver = await createSolver({
    host: core, key: "perfusion", assets: await fetchSolverAssets(solverBase),
  });

  const hours = PERFUSION_SIMULATION.end / 60;
  const roles = perfusionRoles(hours);
  const axis = {max: PERFUSION_SIMULATION.end, tick: 60, scale: 1 / 60, unit: "h"};

  const surface = host.surface;
  const root = host.scene;
  const circuit = createCircuit(root);
  const plot = createPlot(root, PERFUSION_TRACES);
  const readout = createReadout<PerfusionReadout>(root, PERFUSION_STATS);
  const tokenLayer = createTokenLayer(root);
  createInfo(surface, () => [
    ...pointerPoints(snapshot, viewport), ...tokenPoints(snapshot, viewport),
  ]);
  const chrome = createChrome(host.chrome, {
    onBack: () => host.back(),
    onChoose: (group, option) => host.choose(group, option),
  });

  const {input, tracker} = await openTableInput({
    parameters: host.parameters, element: surface, markers: roles.map(role => role.markers[0] ?? 0),
  });

  const origins = new Map<number, number>();
  let viewport: Viewport = {width: window.innerWidth, height: window.innerHeight};
  let snapshot: TableSnapshot = input.snapshot;
  let status: TableStatus = input.status;
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
      notice = `This perfusion could not be solved: `
        + `${error instanceof Error ? error.message : String(error)}`;
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
      card: (token, role) => cardFor(token, role, current, origins),
    });
    chrome.update({
      title: PERFUSION_TITLE, about: PERFUSION_ABOUT, tries: PERFUSION_TRIES,
      reading: perfusionReading(settings, current, hour),
      back: "Back to the body",
      choices: [...host.choices],
      status, roles, notice,
      value: role => {
        const value = values.get(role.id) ?? role.reference;
        const digits = role.id === "flow" || role.id === "hour" ? 1 : 0;
        return `${formatNumber(value, digits)} ${role.unit}`;
      },
      live: new Set(values.keys()),
      unassigned: unassignedMarkers(roles, snapshot.tokens),
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

  host.progress("Solving the reference perfusion...");
  await solve(REFERENCE_SETTINGS, true);
}
