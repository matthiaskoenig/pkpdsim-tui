/**
 * The glimepiride table: the dose, the genotype, the liver, the kidneys and the body weight of
 * one individual are objects on the surface, and the plasma course of glimepiride and of its
 * metabolites answers while a hand is still on them.
 *
 * The application starts this table for `?app=glimepiride`, with the body of `?sex`; the tracker
 * and the surface are the ones of the application, see `apps/table`.
 */

import {
  createSolver, fetchSolverAssets, loadCoreHost, sampleAt, toSeries,
} from "@pkpdsim-tui/core-runtime";
import type {Series, Solver} from "@pkpdsim-tui/core-runtime";
import {
  finalValue, GLIMEPIRIDE_COLUMNS, GLIMEPIRIDE_SIMULATION, glimepirideRequest, pharmacokinetics,
  referenceIndividual,
} from "@pkpdsim-tui/glimepiride-sim";
import type {GlimepirideIndividual, Sex} from "@pkpdsim-tui/glimepiride-sim";
import {
  chooseQuery, createChrome, createInfo, createPlot, createReadout, createTokenLayer,
  formatNumber, pointerPoints,
} from "@pkpdsim-tui/tui-kit";
import type {Box, ChoiceGroup, TableHost} from "@pkpdsim-tui/tui-kit";
import {openTableInput, unassignedMarkers, valuesFromTokens} from "@pkpdsim-tui/tuio-input";
import type {TableSnapshot, TableStatus, TrackerOptions} from "@pkpdsim-tui/tuio-input";
import {
  cardFor, categoryOf, formatValue, GLIMEPIRIDE_STATS, GLIMEPIRIDE_TRACES, MICROMOLAR,
} from "./cards.ts";
import type {GlimepirideReadout} from "./cards.ts";
import {createPathway, PATHWAY_HEIGHT, stationNumber} from "./pathway.ts";
import {glimepirideRoles} from "./roles.ts";
import {
  GLIMEPIRIDE_ABOUT, GLIMEPIRIDE_TITLE, GLIMEPIRIDE_TRIES, glimepirideReading,
} from "./audience.ts";
import "./style.css";

const MOUSE_HINT = "Keys 1 to 6 put an object down, drag moves it, the wheel turns it.";
const TABLE_HINT = "Put an object on the table and turn it.";
const BOTH_HINT = "Put an object on the table and turn it, or press 1 to 6 here to place one.";
/** How long the table waits for the objects to come to rest before it solves. */
const SETTLE = 140;
const BAND = 132;
const GAP = 26;


function hintFor(tracker: TrackerOptions, state: TableStatus["state"]): string {
  if (!tracker.tracker) return MOUSE_HINT;
  if (state === "connected") return tracker.discovered ? BOTH_HINT : TABLE_HINT;
  return `Start a TUIO ${tracker.version} tracker on ${tracker.address}, or drop "?tuio" from `
    + "the address to drive the table with the mouse.";
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

/** The glimepiride table, on the surface of the application. */
export async function startGlimepirideTable(host: TableHost): Promise<void> {
  const parameters = host.parameters;
  const solverBase = new URL("solver/", host.assets);

  host.progress("Starting the solver...");
  const core = await loadCoreHost(new URL("sbmlsim-core.js", solverBase));
  const solver: Solver = await createSolver({
    host: core, key: "glimepiride", assets: await fetchSolverAssets(solverBase),
  });

  const hours = GLIMEPIRIDE_SIMULATION.end / 60;
  const sex: Sex = parameters.get("sex") === "female" ? "female" : "male";
  const roles = glimepirideRoles(hours, sex);
  const reference = referenceIndividual(sex);
  const bodies: readonly ChoiceGroup[] = [{
    id: "sex", label: "Body", selected: sex,
    options: [{id: "male", label: "Male"}, {id: "female", label: "Female"}],
  }];
  const axis = {max: GLIMEPIRIDE_SIMULATION.end, tick: 600, scale: 1 / 60, unit: "h"};

  const surface = host.surface;
  const root = host.scene;
  const pathway = createPathway(root);
  const plot = createPlot(root, GLIMEPIRIDE_TRACES);
  const readout = createReadout<GlimepirideReadout>(root, GLIMEPIRIDE_STATS);
  const tokenLayer = createTokenLayer(root);
  // What a number, an object or a station is: the note opens where a visitor asks for it.
  createInfo(surface, () => pointerPoints(snapshot, viewport));
  const chrome = createChrome(host.chrome, {
    onBack: () => host.back(),
    onChoose: (group, option) => {
      if (group === "sex") chooseQuery("sex", option, "male");
      else host.choose(group, option);
    },
  });

  const {input, tracker} = await openTableInput({
    parameters, element: surface, markers: roles.map(role => role.markers[0] ?? 0),
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
        glimepirideRequest(individual, sex, GLIMEPIRIDE_COLUMNS), {signal: controller.signal});
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
      title: GLIMEPIRIDE_TITLE, about: GLIMEPIRIDE_ABOUT, tries: GLIMEPIRIDE_TRIES,
      reading: glimepirideReading(individual, sex, current, reference_readout, reference),
      back: "Back to the body",
      choices: [...host.choices, ...bodies],
      status, roles, notice,
      value: role => {
        if (role.id === "hour") return `${formatNumber(hour, 1)} h`;
        const value = values.get(role.id) ?? role.reference;
        const category = categoryOf(role.id, value);
        return category === "" ? formatValue(role, value) : `${formatValue(role, value)}, ${category}`;
      },
      live: new Set(values.keys()),
      unassigned: unassignedMarkers(roles, snapshot.tokens),
      hint: hintFor(tracker, status.state),
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

  host.progress("Solving the reference individual...");
  await solve(reference, true);
}
