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
  chooseQuery, createChrome, createInfo, createPlot, createQuiz, createReadout, createTokenLayer, driveHint,
  formatNumber, pointerPoints, visibleStats, words,
} from "@pkpdsim-tui/tui-kit";
import type {Box, ChoiceGroup, TableHost} from "@pkpdsim-tui/tui-kit";
import {openTableInput, unassignedMarkers, valuesFromTokens} from "@pkpdsim-tui/tuio-input";
import type {TableSnapshot, TableStatus, TrackerOptions} from "@pkpdsim-tui/tuio-input";
import {
  cardFor, categoryOf, formatValue, glimepirideStats, glimepirideTraces, MICROMOLAR,
} from "./cards.ts";
import type {GlimepirideReadout} from "./cards.ts";
import {createPathway, PATHWAY_HEIGHT, stationNumber} from "./pathway.ts";
import {glimepirideRoles, GLIMEPIRIDE_MARKERS} from "./roles.ts";
import {GLIMEPIRIDE_TEXT} from "./text.ts";
import {
  bodyChoices, glimepirideReading,
} from "./audience.ts";
import "./style.css";

/** How long the table waits for the objects to come to rest before it solves. */
const SETTLE = 140;
const BAND = 132;
const GAP = 26;


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
  const voice = host.voice;
  const copy = voice.pick(GLIMEPIRIDE_TEXT);
  const kit = words(voice);
  const parameters = host.parameters;
  const solverBase = new URL("solver/", host.assets);

  host.progress(copy.startingSolver);
  const core = await loadCoreHost(new URL("sbmlsim-core.js", solverBase));
  const solver: Solver = await createSolver({
    host: core, key: "glimepiride", assets: await fetchSolverAssets(solverBase),
  });

  const hours = GLIMEPIRIDE_SIMULATION.end / 60;
  const sex: Sex = parameters.get("sex") === "female" ? "female" : "male";
  const roles = glimepirideRoles(hours, voice, sex);
  const reference = referenceIndividual(sex);
  const bodies: readonly ChoiceGroup[] = [{...bodyChoices(voice), selected: sex}];
  const axis = {max: GLIMEPIRIDE_SIMULATION.end, tick: 600, scale: 1 / 60, unit: "h"};

  const surface = host.surface;
  const root = host.scene;
  const pathway = createPathway(root, voice);
  const plot = createPlot(root, glimepirideTraces(voice));
  const readout = createReadout<GlimepirideReadout>(
    root, visibleStats(glimepirideStats(voice), voice));
  const tokenLayer = createTokenLayer(root, host);
  // What a number, an object or a station is: the note opens where a visitor asks for it.
  // Three questions about this table, behind the button in the near corner.
  createQuiz(host.chrome, {voice, questions: copy.quiz});
  const chrome = createChrome(host.chrome, {
    voice,
    onBack: () => host.back(),
    onChoose: (group, option) => {
      if (group === "sex") chooseQuery("sex", option, "male");
      else host.choose(group, option);
    },
  });

  const {input, tracker} = await openTableInput({
    parameters, element: surface, markers: [...GLIMEPIRIDE_MARKERS],
  });

  const origins = new Map<number, number>();
  let viewport = {width: window.innerWidth, height: window.innerHeight};
  let snapshot: TableSnapshot = input.snapshot;
  let status: TableStatus = input.status;

  // The note layer reads the fingers of the tracker out of the snapshot, on the clock of
  // the page, so it is built once there is one. Built before the input is opened, its
  // first frame fell into the wait for the tracker and read a snapshot which did not
  // exist yet, and the layer died with it.
  createInfo(surface, () => pointerPoints(snapshot, viewport), voice);
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
        value: stationNumber(individual.dose, "mg", 1), note: copy.oral,
        changed: individual.dose !== reference.dose,
      },
      liver: {
        value: `CYP2C9 ${formatNumber(individual.cyp2c9, 2)}x`,
        note: categoryOf(voice, "cirrhosis", individual.cirrhosis),
        changed: individual.cyp2c9 !== reference.cyp2c9 || individual.cirrhosis !== reference.cirrhosis,
      },
      plasma: {
        value: stationNumber(current.now, "uM", 3),
        note: copy.peak(formatNumber(current.pk.cmax, 3)),
        changed: false,
      },
      kidney: {
        value: stationNumber(individual.renal, "ml/min", 0),
        note: categoryOf(voice, "renal", individual.renal),
        changed: individual.renal !== reference.renal,
      },
      urine: {
        value: stationNumber(current.urine, "umole", 1),
        note: copy.endOfCourse,
        changed: false,
      },
    });
    tokenLayer.update({
      snapshot, roles, viewport,
      card: (token, role) => cardFor(
        voice, token, role, {values, origins, hours, readout: current}),
    });
    chrome.update({
      title: host.title, about: voice.say(copy.about),
      tries: copy.tries.map(entry => voice.say(entry)),
      reading: glimepirideReading(
        voice, individual, sex, current, reference_readout, reference),
      back: true,
      choices: bodies,
      status, roles, notice,
      value: role => {
        if (role.id === "hour") return `${formatNumber(hour, 1)} h`;
        const value = values.get(role.id) ?? role.reference;
        const category = categoryOf(voice, role.id, value);
        return category === "" ? formatValue(role, value) : `${formatValue(role, value)}, ${category}`;
      },
      live: new Set(values.keys()),
      unassigned: unassignedMarkers(roles, snapshot.tokens),
      hint: driveHint(voice, {...tracker, connected: status.state === "connected"}, roles),
      credit: `${formatNumber(individual.weight, 0)} kg, ${formatNumber(individual.dose, 1)} mg `
        + `${copy.traces.gli}, ${categoryOf(voice, "cyp2c9", individual.cyp2c9)}`,
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

  host.progress(copy.solvingReference);
  await solve(reference, true);
}
