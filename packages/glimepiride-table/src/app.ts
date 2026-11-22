/**
 * How a drug is broken down: the dose, the body weight, how many daily tablets, the genotype,
 * the liver and the kidneys of one individual are objects on the surface. The body of that
 * individual stands on the table with a bubble on every part of it which holds the drug, and
 * the course runs by itself: the bubbles fill and empty while the curve of the plasma is drawn
 * under them.
 *
 * The application starts this table for `?app=glimepiride`, with the body of `?sex`; the tracker
 * and the surface are the ones of the application, see `apps/table`.
 */

import {
  createSolver, fetchSolverAssets, loadCoreHost, sampleAt, toSeries,
} from "@pkpdsim-tui/core-runtime";
import type {Series, Solver} from "@pkpdsim-tui/core-runtime";
import {
  finalValue, GLIMEPIRIDE_COLUMNS, GLIMEPIRIDE_DOSES, glimepirideRequest, pharmacokinetics,
  referenceIndividual,
} from "@pkpdsim-tui/glimepiride-sim";
import type {GlimepirideIndividual, Sex} from "@pkpdsim-tui/glimepiride-sim";
import {loadAnatomy} from "@pkpdsim-tui/cardio-sim";
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
import {createBodyFigure} from "./body.ts";
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
/** How long the course takes to run once on the table, and how long it then rests, in ms. */
const CYCLE = 18000;
const HOLD = 3000;
/** What the panel at the near edge takes, which the figure keeps clear of. */
const PANEL = 430;

/** The individual stands in the left half of what is left, the curve in the right half. */
function bodyBox(viewport: {width: number; height: number}): Box {
  const left = PANEL;
  const width = Math.max(340, (viewport.width - left - GAP * 2) * 0.48);
  const top = BAND + GAP;
  return {x: left, y: top, width, height: Math.max(260, viewport.height - top - BAND - GAP)};
}

function plotBox(viewport: {width: number; height: number}): Box {
  const body = bodyBox(viewport);
  const x = body.x + body.width + GAP;
  return {
    x, y: body.y + 40,
    width: Math.max(320, viewport.width - x - GAP * 2),
    height: Math.max(220, viewport.height - body.y - BAND - GAP * 2),
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

  const sex: Sex = parameters.get("sex") === "female" ? "female" : "male";
  const roles = glimepirideRoles(voice, sex);
  const reference = referenceIndividual(sex);
  const bodies: readonly ChoiceGroup[] = [{...bodyChoices(voice), selected: sex}];
  // The figure is the one every table of the application is solved on: the reference body of
  // the pkpdsim physiology, which the circulation exports with its anatomy.
  // The assets of this table are its own folder, and the bodies belong to the circulation.
  const anatomy = await loadAnatomy(
    new URL("../cardiovascular/cardiovascular-anatomy.json", host.assets));
  const body = anatomy.bodies[sex] ?? anatomy.bodies["male"];
  if (body === undefined) throw new Error("The anatomy holds no body.");

  const surface = host.surface;
  const root = host.scene;
  const figure = createBodyFigure(root, body, voice);
  const plot = createPlot(root, glimepirideTraces(voice));
  const readout = createReadout<GlimepirideReadout>(
    root, visibleStats(glimepirideStats(voice), voice));
  const tokenLayer = createTokenLayer(root, host);
  // What a number, an object or a station is: the note opens where a visitor asks for it.
  // Three questions about this table, behind the button in the near corner.
  createQuiz(host.chrome, {voice, questions: copy.quiz, table: "glimepiride"});
  const chrome = createChrome(host.chrome, {
    mark: host.mark,
    voice,
    onBack: () => host.back(),
    onReset: () => host.reset(),
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
  // The course runs by itself and starts over whenever the individual changes, which is the
  // drug moving through the body rather than a dial a visitor has to find first.
  let started = performance.now();
  let span = 2 * 24 * 60;

  const readoutOf = (course: Series, hour: number): GlimepirideReadout => ({
    pk: pharmacokinetics(course, "[Cve_gli]", {factor: MICROMOLAR}),
    now: (sampleAt(course, hour * 60)["[Cve_gli]"] ?? 0) * MICROMOLAR,
    urine: finalValue(course, "Aurine_m1_m2", 1000),
  });

  const solve = async (
    individual: GlimepirideIndividual, doses: number, isReference: boolean,
  ): Promise<void> => {
    pending?.abort();
    const controller = new AbortController();
    pending = controller;
    solving = true;
    schedule();
    try {
      const request = glimepirideRequest(individual, sex, GLIMEPIRIDE_COLUMNS, doses);
      span = request.end;
      const result = await solver.simulate(request, {signal: controller.signal});
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
    const doses = Math.round(values.get("doses") ?? GLIMEPIRIDE_DOSES.value);

    const next = JSON.stringify({individual, doses});
    if (next !== solved) {
      solved = next;
      // A new individual is a new course, which runs from the first tablet again.
      started = performance.now();
      window.clearTimeout(settle);
      settle = window.setTimeout(
        () => void solve(
          individual, doses,
          next === JSON.stringify({individual: reference, doses: GLIMEPIRIDE_DOSES.value})),
        SETTLE);
    }

    // Where the running course has got to. A course of ten days runs in the same time as one
    // of two, because what a visitor watches is the shape of it.
    const phase = (performance.now() - started) % (CYCLE + HOLD);
    const minutes = Math.min(phase / CYCLE, 1) * span;
    const hour = minutes / 60;
    const axis = {
      max: span, tick: span > 3 * 24 * 60 ? 24 * 60 : 600, scale: 1 / 60, unit: "h",
    };

    const current = readoutOf(series, hour);
    const reference_readout = readoutOf(baseline, hour);
    root.setAttribute("data-solving", String(solving));
    plot.update({series, baseline, cursor: minutes, axis});
    readout.update(current, reference_readout);
    // Every bubble is a share of what has been swallowed by now, so the gut is full right
    // after a tablet and the body fills from it.
    const sample = sampleAt(series, minutes);
    const molar = sample["Mr_gli"] ?? 490.62;
    const taken = Math.min(doses, Math.floor(minutes / (24 * 60)) + 1);
    figure.update({sample, dose: molar > 0 ? (taken * individual.dose) / molar : 0});
    tokenLayer.update({
      snapshot, roles, viewport,
      card: (token, role) => cardFor(
        voice, token, role, {values, origins, doses, readout: current}),
    });
    chrome.update({
      title: host.title, about: voice.say(copy.about),
      tries: copy.tries.map(entry => voice.say(entry)),
      reading: glimepirideReading(
        voice, individual, sex, current, reference_readout, reference, doses),
      back: true,
      choices: bodies,
      status, roles, notice,
      value: role => {
        if (role.id === "doses") return copy.doseCount(doses);
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

  // The clock of the course: the table draws every frame, because the drug moves whether a
  // hand is on the table or not.
  const tick = (): void => {
    schedule();
    window.requestAnimationFrame(tick);
  };

  const resize = (): void => {
    viewport = {width: window.innerWidth, height: window.innerHeight};
    root.setAttribute("viewBox", `0 0 ${viewport.width} ${viewport.height}`);
    figure.resize(bodyBox(viewport));
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
  await solve(reference, GLIMEPIRIDE_DOSES.value, true);
  tick();
}
