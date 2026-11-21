/**
 * The glimepiride table: the dose, the genotype, the liver, the kidneys and the body weight of
 * one individual are objects on the surface, and the plasma course of glimepiride and of its
 * metabolites answers while a hand is still on them.
 *
 * Query parameters:
 *   ?tuio             a tracker on ws://localhost:3343
 *   ?tuio=host:port   a tracker somewhere else, which is how a table is addressed
 */

import {
  createSolver, fetchSolverAssets, loadCoreHost, sampleAt, toSeries,
} from "@pkpdsim-tui/core-runtime";
import type {Series, Solver} from "@pkpdsim-tui/core-runtime";
import {
  finalValue, GLIMEPIRIDE_COLUMNS, GLIMEPIRIDE_SIMULATION, glimepirideRequest, pharmacokinetics,
  referenceIndividual,
} from "@pkpdsim-tui/glimepiride-sim";
import type {GlimepirideIndividual} from "@pkpdsim-tui/glimepiride-sim";
import {
  createChrome, createPlot, createReadout, createTokenLayer, formatNumber,
} from "@pkpdsim-tui/tui-kit";
import type {Box} from "@pkpdsim-tui/tui-kit";
import {
  createMockTableInput, createTuioTableInput, DEFAULT_TUIO_HOST, DEFAULT_TUIO_PORT,
  unassignedMarkers, valuesFromTokens,
} from "@pkpdsim-tui/tuio-input";
import type {TableInput, TableSnapshot, TableStatus} from "@pkpdsim-tui/tuio-input";
import {
  cardFor, categoryOf, formatValue, GLIMEPIRIDE_STATS, GLIMEPIRIDE_TRACES, MICROMOLAR,
} from "./cards.ts";
import type {GlimepirideReadout} from "./cards.ts";
import {createPathway, PATHWAY_HEIGHT, stationNumber} from "./pathway.ts";
import {glimepirideRoles} from "./roles.ts";

const MOUSE_HINT = "Keys 1 to 6 place an object under the pointer, drag moves it, the wheel turns it, backspace lifts it.";
const TABLE_HINT = "Put an object on the table and turn it.";
/** How long the table waits for the objects to come to rest before it solves. */
const SETTLE = 140;
const BAND = 132;
const GAP = 26;

function element<T extends Element>(id: string): T {
  const found = document.getElementById(id);
  if (found === null) throw new Error(`The page has no element "${id}".`);
  return found as unknown as T;
}

function parseTracker(value: string | null): {host: string; port: number} {
  if (value === null || value === "" || value === "true") {
    return {host: DEFAULT_TUIO_HOST, port: DEFAULT_TUIO_PORT};
  }
  const [host, port] = value.split(":");
  const parsed = Number.parseInt(port ?? "", 10);
  return {
    host: host === undefined || host === "" ? DEFAULT_TUIO_HOST : host,
    port: Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TUIO_PORT,
  };
}

function hintFor(usesTracker: boolean, port: number, state: TableStatus["state"]): string {
  if (!usesTracker) return MOUSE_HINT;
  if (state === "connected") return TABLE_HINT;
  return `Start the tracker on port ${port}, or drop "?tuio" from the address to drive the table `
    + "with the mouse.";
}

function pathwayBox(viewport: {width: number; height: number}): Box {
  const width = Math.min(viewport.width - 2 * 420, 1180);
  return {x: (viewport.width - width) / 2, y: BAND + GAP, width, height: PATHWAY_HEIGHT};
}

function plotBox(viewport: {width: number; height: number}): Box {
  const pathway = pathwayBox(viewport);
  const top = pathway.y + pathway.height + GAP * 2;
  return {
    x: pathway.x, y: top,
    width: pathway.width,
    height: Math.max(200, viewport.height - top - BAND - GAP * 2),
  };
}

async function start(): Promise<void> {
  const boot = element<HTMLElement>("boot");
  const message = element<HTMLElement>("boot-message");
  const parameters = new URLSearchParams(window.location.search);
  const solverBase = new URL("./assets/solver/", window.location.href);

  message.textContent = "Starting the solver...";
  const host = await loadCoreHost(new URL("sbmlsim-core.js", solverBase));
  const solver: Solver = await createSolver({
    host, key: "glimepiride", assets: await fetchSolverAssets(solverBase),
  });

  const hours = GLIMEPIRIDE_SIMULATION.end / 60;
  const roles = glimepirideRoles(hours);
  const reference = referenceIndividual();
  const axis = {max: GLIMEPIRIDE_SIMULATION.end, tick: 600, scale: 1 / 60, unit: "h"};

  const surface = element<HTMLElement>("surface");
  const root = element<SVGSVGElement>("scene");
  const pathway = createPathway(root);
  const plot = createPlot(root, GLIMEPIRIDE_TRACES);
  const readout = createReadout<GlimepirideReadout>(root, GLIMEPIRIDE_STATS);
  const tokenLayer = createTokenLayer(root);
  const chrome = createChrome(element<HTMLElement>("chrome"));

  const usesTracker = parameters.has("tuio");
  const tracker = parseTracker(parameters.get("tuio"));
  const input: TableInput = usesTracker
    ? createTuioTableInput(tracker)
    : createMockTableInput({
      element: surface,
      markers: roles.map(role => role.markers[0] ?? 0),
    });

  const origins = new Map<number, number>();
  let viewport = {width: window.innerWidth, height: window.innerHeight};
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

  const readoutOf = (course: Series, hour: number): GlimepirideReadout => ({
    pk: pharmacokinetics(course, "[Cve_gli]", {factor: MICROMOLAR}),
    now: (sampleAt(course, hour * 60)["[Cve_gli]"] ?? 0) * MICROMOLAR,
    urine: finalValue(course, "Aurine_m1_m2", 1000),
  });

  const solve = async (individual: GlimepirideIndividual, isReference: boolean): Promise<void> => {
    pending?.abort();
    const controller = new AbortController();
    pending = controller;
    solving = true;
    schedule();
    try {
      const result = await solver.simulate(
        glimepirideRequest(individual, GLIMEPIRIDE_COLUMNS), {signal: controller.signal});
      series = toSeries(result);
      if (isReference) baseline = series;
      notice = "";
    } catch (error) {
      if (controller.signal.aborted) return;
      notice = `This individual could not be solved: ${error instanceof Error ? error.message : String(error)}`;
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
    const individual: GlimepirideIndividual = {
      dose: values.get("dose") ?? reference.dose,
      cyp2c9: values.get("cyp2c9") ?? reference.cyp2c9,
      cirrhosis: values.get("cirrhosis") ?? reference.cirrhosis,
      renal: values.get("renal") ?? reference.renal,
      weight: values.get("weight") ?? reference.weight,
    };
    const hour = values.get("hour") ?? hours;

    const next = JSON.stringify(individual);
    if (next !== solved) {
      solved = next;
      window.clearTimeout(settle);
      settle = window.setTimeout(
        () => void solve(individual, next === JSON.stringify(reference)), SETTLE);
    }

    const current = readoutOf(series, hour);
    const reference_readout = readoutOf(baseline, hour);
    root.setAttribute("data-solving", String(solving));
    plot.update({series, baseline, cursor: hour * 60, axis});
    readout.update(current, reference_readout);
    pathway.update({
      tablet: {
        value: stationNumber(individual.dose, "mg", 1), note: "oral",
        changed: individual.dose !== reference.dose,
      },
      liver: {
        value: `CYP2C9 ${formatNumber(individual.cyp2c9, 2)}x`,
        note: categoryOf("cirrhosis", individual.cirrhosis),
        changed: individual.cyp2c9 !== reference.cyp2c9 || individual.cirrhosis !== reference.cirrhosis,
      },
      plasma: {
        value: stationNumber(current.now, "uM", 3),
        note: `peak ${formatNumber(current.pk.cmax, 3)} uM`,
        changed: false,
      },
      kidney: {
        value: stationNumber(individual.renal, "ml/min", 0),
        note: categoryOf("renal", individual.renal),
        changed: individual.renal !== reference.renal,
      },
      urine: {
        value: stationNumber(current.urine, "umole", 1),
        note: "M1 and M2 at the end",
        changed: false,
      },
    });
    tokenLayer.update({
      snapshot, roles, viewport,
      card: (token, role) => cardFor(token, role, {values, origins, hours, readout: current}),
    });
    chrome.update({
      status, roles, notice,
      value: role => {
        if (role.id === "hour") return `${formatNumber(hour, 1)} h`;
        const value = values.get(role.id) ?? role.reference;
        const category = categoryOf(role.id, value);
        return category === "" ? formatValue(role, value) : `${formatValue(role, value)}, ${category}`;
      },
      live: new Set(values.keys()),
      unassigned: unassignedMarkers(roles, snapshot.tokens),
      hint: hintFor(usesTracker, tracker.port, status.state),
      credit: `${formatNumber(individual.weight, 0)} kg, ${formatNumber(individual.dose, 1)} mg `
        + `glimepiride, ${categoryOf("cyp2c9", individual.cyp2c9)}`,
    });
  };

  const schedule = (): void => {
    if (frame !== 0) return;
    frame = window.requestAnimationFrame(render);
  };

  const resize = (): void => {
    viewport = {width: window.innerWidth, height: window.innerHeight};
    root.setAttribute("viewBox", `0 0 ${viewport.width} ${viewport.height}`);
    pathway.resize(pathwayBox(viewport));
    plot.resize(plotBox(viewport));
    readout.resize(viewport);
    schedule();
  };

  input.subscribe((next, nextStatus) => {
    snapshot = next;
    status = nextStatus;
    schedule();
  });
  window.addEventListener("resize", resize, {passive: true});
  resize();
  input.connect();

  message.textContent = "Solving the reference individual...";
  await solve(reference, true);
  boot.hidden = true;
}

void start().catch((error: unknown) => {
  const boot = document.getElementById("boot");
  const message = document.getElementById("boot-message");
  if (boot !== null) boot.classList.add("boot--error");
  if (message !== null) {
    message.textContent = error instanceof Error ? error.message : String(error);
  }
  console.error(error);
});
