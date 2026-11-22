/**
 * Liver surgery: the operations a surgeon does on one dial, how fast the liver grows back on
 * another, and the curve of every one of those operations under the liver, which the days run
 * along by themselves. Every number comes from the compiled liver of pkpdsim, solved in a Web
 * Worker while the objects are moved.
 *
 * The application starts this table for `?app=lobes`, with the body of `?sex` and the liver of
 * `?species` (`rat` or `mouse` instead of the human one); the tracker and the surface are the
 * ones of the application, see `apps/table`.
 */

import {createSolver, fetchSolverAssets, loadCoreHost, sampleAt, toSeries} from "@pkpdsim-tui/core-runtime";
import type {Series, Solver} from "@pkpdsim-tui/core-runtime";
import {
  caseChanges, intactStates, loadLobeConfig, loadLobeData, lobeRequest,
  remnantFraction,
} from "@pkpdsim-tui/lobes-sim";
import type {Lobe, LobeConfig, LobeState} from "@pkpdsim-tui/lobes-sim";
import {
  bodyName, chooseQuery, createChrome, createInfo, createQuiz, createReadout, createTokenLayer,
  driveHint, formatNumber, pointerPoints, visibleStats, words,
} from "@pkpdsim-tui/tui-kit";
import type {ChoiceGroup, Pictogram, TableHost} from "@pkpdsim-tui/tui-kit";
import {bodyParameters} from "@pkpdsim-tui/cardio-sim";
import {openTableInput, valueFromAngle} from "@pkpdsim-tui/tuio-input";
import type {
  TableSnapshot, TableStatus, TokenRole,
} from "@pkpdsim-tui/tuio-input";
import {cardFor, lobeStats} from "./cards.ts";
import type {Sample} from "./cards.ts";
import {createLiverScene, plotBox} from "./scene.ts";
import {createRegeneration} from "./regeneration.ts";
import {
  GROWTH_MARKER, LOBE_MARKERS, lobeRoles, operationAtDial, operationName, operationsOf, statesOf,
} from "./operations.ts";
import type {Operation} from "./operations.ts";
import {courseOf} from "./course.ts";
import {lobeReading} from "./audience.ts";
import {LOBE_TEXT} from "./text.ts";
import "./style.css";

/** How long the table waits for the objects to come to rest before it solves. */
const SETTLE = 140;
/** How long the course takes to run once on the table, and how long it then rests, in ms. */
const CYCLE = 20000;
const HOLD = 4000;
/** How many points a run of the table has, which is the smoothness of its curves. */
const POINTS = 181;

/**
 * The animals a liver of this table belongs to, in the order the switch offers them, each with
 * the figure it is drawn as. The export of the female body carries the human alone, because the
 * female body is a human one: the switch offers all three there as well, and picking one of the
 * animals opens the export which has it.
 */
const SPECIES_ORDER = ["human", "rat", "mouse"] as const;

const SPECIES_PICTURES: Readonly<Record<string, Pictogram>> = {
  human: "human", rat: "rat", mouse: "mouse",
};

/** The lobed liver table, on the surface of the application. */
export async function startLobesTable(host: TableHost): Promise<void> {
  const voice = host.voice;
  const copy = voice.pick(LOBE_TEXT);
  const kit = words(voice);
  const parameters = host.parameters;
  const assets = host.assets;
  const runtime = new URL("runtime/", assets);

  host.progress(copy.loading);
  const wanted = parameters.get("species") ?? "human";
  // Who the table is solved for, and which animal the liver is of. The female liver is exported
  // for the human only, so another species is the one body there is.
  const person = host.individual;
  const sex = person.sex === "female" && wanted === "human" ? "female" : "male";
  const base = sex === "female" ? new URL("female/", assets) : assets;
  const data = await loadLobeData(new URL("lobes-data.json", base));
  const species = data.species[wanted] === undefined ? Object.keys(data.species)[0] ?? "human" : wanted;
  const liver = data.species[species];
  if (liver === undefined) throw new Error(`The export holds no ${wanted} liver.`);
  const lobes: readonly Lobe[] = liver.lobes;
  const bodies: readonly ChoiceGroup[] = [
    {
      // The two bodies, as the figures themselves: a visitor sees which one the liver is in.
      id: "sex", label: kit.bodySwitch, selected: sex,
      options: [
        {
          id: "female", label: bodyName(voice, "female", person.age), picture: "woman",
          ...(species === "human" ? {} : {unavailable: copy.femaleOnlyHuman}),
        },
        {id: "male", label: bodyName(voice, "male", person.age), picture: "man"},
      ],
    },
    {
      // The animal the liver belongs to, drawn rather than named: the operations of this table
      // are the ones done to a rat and to a mouse in the laboratory, and to a person in a
      // clinic, and the figure says which of the three is on the glass.
      id: "species", label: copy.speciesSwitch, selected: species,
      options: (sex === "female" ? SPECIES_ORDER : SPECIES_ORDER.filter(id => id in data.species))
        .map(id => ({
          id, label: copy.species[id] ?? id, picture: SPECIES_PICTURES[id] as Pictogram,
        })),
    },
  ];

  // The operations of this species, which the export carries a run for: the intact liver, one
  // segment, and the hemihepatectomies, in the order of the mass they take.
  const operations = operationsOf(liver);
  const solverBase = new URL(`solver_lobes/${species}/`, base);
  const exported: LobeConfig = await loadLobeConfig(new URL("config.json", solverBase));
  // The export runs five days of every species, which is the course of a rat. A liver grows
  // back over its own time, so the table runs the course of this species over its own span.
  const course = courseOf(species);
  const days = course.days;
  const config: LobeConfig = {
    ...exported, end: days * 24 * 60, points: POINTS,
    // A human liver is the liver of the person at the table: the model scales it, its blood
    // flows and its share of the cardiac output from the body weight and the height. The liver
    // of a rat or a mouse is the animal's own and carries no body of ours.
    ...(species === "human" ? {preinit: bodyParameters(person)} : {}),
  };
  const roles = lobeRoles(voice, operations.length);

  host.progress(copy.startingSolver);
  const core = await loadCoreHost(new URL("sbmlsim-core.js", runtime));
  const solver: Solver = await createSolver({
    host: core, key: `lobes-${species}`,
    assets: await fetchSolverAssets(solverBase, {runtimeBase: runtime}),
  });

  const surface = host.surface;
  const root = host.scene;
  const scene = createLiverScene(root, lobes, voice);
  const plot = createRegeneration(root, voice, operations);
  const readout = createReadout<Sample>(root, visibleStats(lobeStats(voice), voice));
  const tokenLayer = createTokenLayer(root, host);
  // What a number, an object or a segment is: the note opens where a visitor asks for it.
  // Three questions about this table, behind the button in the near corner.
  createQuiz(host.chrome, {voice, questions: copy.quiz, table: "lobes"});
  const chrome = createChrome(host.chrome, {
    mark: host.mark,
    voice,
    onBack: () => host.back(),
    onReset: () => host.reset(),
    onChoose: (group, option) => {
      // The body of the person, which the weight of the first screen belongs to: the
      // other body takes the reference weight of its own age.
      if (group === "sex") chooseQuery("sex", option, "female", ["bw"]);
      else if (group === "species") chooseQuery("species", option, "human");
      else host.choose(group, option);
    },
  });

  const {input, tracker} = await openTableInput({
    parameters, element: surface, markers: [...LOBE_MARKERS],
  });

  /** The operation the knife is pointing at, which is nothing while it is off the table. */
  const operationOnTable = (): Operation => {
    const dial = roles.find(role => role.id === "resection");
    if (dial === undefined) return operationAtDial(operations, 0);
    for (const token of snapshot.tokens.values()) {
      if (!dial.markers.includes(token.marker)) continue;
      return operationAtDial(operations, valueFromAngle(dial, token.turn));
    }
    return operationAtDial(operations, 0);
  };

  const origins = new Map<number, number>();
  let viewport = {width: window.innerWidth, height: window.innerHeight};
  let snapshot: TableSnapshot = input.snapshot;
  let status: TableStatus = input.status;

  // The note layer reads the fingers of the tracker out of the snapshot, on the clock of
  // the page, so it is built once there is one. Built before the input is opened, its
  // first frame fell into the wait for the tracker and read a snapshot which did not
  // exist yet, and the layer died with it.
  createInfo(surface, () => pointerPoints(snapshot, viewport), voice);
  let states: Record<string, LobeState> = intactStates(lobes);
  /** The run of every operation at the rate on the table, which the curves are drawn from. */
  const runs = new Map<string, Series>();
  let series: Series = {};
  let baseline: Series = {};
  let solving = true;
  let notice = "";
  let plan = "";
  let frame = 0;
  let settle = 0;
  let pending: AbortController | null = null;
  // The day the course has reached. It runs by itself and starts over at the operation, which
  // is the regeneration happening rather than a dial a visitor has to find.
  let started = performance.now();
  let day = 0;

  /** What the rate dial is at, which is one while it is off the table. */
  const growthOnTable = (): number => {
    const dial = roles.find(role => role.id === "growth");
    if (dial === undefined) return 1;
    for (const token of snapshot.tokens.values()) {
      if (token.marker !== GROWTH_MARKER) continue;
      return valueFromAngle(dial, token.turn);
    }
    return 1;
  };

  /**
   * Every operation at this rate, the one on the table first: the curves are only comparable
   * when all of them grow at the same speed, so a turn of the rate dial solves all of them.
   */
  const solveAll = async (chosen: Operation, factor: number): Promise<void> => {
    pending?.abort();
    const controller = new AbortController();
    pending = controller;
    solving = true;
    schedule();
    const growth = course.growth * factor;
    const order = [chosen, ...operations.filter(one => one.id !== chosen.id)];
    try {
      for (const operation of order) {
        const changes = caseChanges(statesOf(lobes, operation));
        const result = await solver.simulate(
          lobeRequest({growth}, changes, config), {signal: controller.signal});
        const run = toSeries(result);
        runs.set(operation.id, run);
        if (operation.id === chosen.id) series = run;
        if (operation.lobes.length === 0) baseline = run;
        notice = "";
        // The first run is the one a visitor is looking at, so the table shows it at once and
        // fills the other curves in behind it.
        if (operation.id === chosen.id) solving = false;
        schedule();
      }
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

    const operation = operationOnTable();
    const factor = growthOnTable();
    states = statesOf(lobes, operation);
    // The rate is read to two digits, so a hand resting on the dial does not solve all day.
    const next = `${operation.id} ${factor.toFixed(2)}`;
    if (next !== plan) {
      plan = next;
      // A new operation or a new rate is a new course, which starts at the operation again.
      started = performance.now();
      window.clearTimeout(settle);
      settle = window.setTimeout(() => void solveAll(operation, factor), SETTLE);
    }

    // The course runs by itself and rests at the end before it starts over.
    const phase = (performance.now() - started) % (CYCLE + HOLD);
    const step = days > 30 ? 1 : 0.1;
    day = Math.round(Math.min(phase / CYCLE, 1) * days / step) * step;
    const sample = sampleAt(series, day * 24 * 60);
    const reference = sampleAt(baseline, day * 24 * 60);
    root.setAttribute("data-solving", String(solving));
    scene.update({states, sample, baseline: reference});
    plot.update({day, days, selected: operation, runs});
    readout.update(sample, reference);
    tokenLayer.update({
      snapshot, roles, viewport,
      card: (token, role) => cardFor(voice, token, role, {
        operation, sample, baseline: reference, factor,
      }),
    });
    chrome.update({
      title: host.title, about: voice.say(copy.about),
      tries: copy.tries.map(entry => voice.say(entry)),
      reading: lobeReading(voice, lobes, states, operation, day, sample, reference),
      back: true,
      choices: bodies,
      status, roles, notice,
      value: role => (role.id === "resection"
        ? operationName(voice, operation)
        : copy.growthValue(formatNumber(factor, 1))),
      live: new Set([...snapshot.tokens.values()]
        .flatMap(token => roles
          .filter(role => role.markers.includes(token.marker))
          .map(role => role.id))),
      unassigned: [...new Set([...snapshot.tokens.values()]
        .filter(token => !roles.some(role => role.markers.includes(token.marker)))
        .map(token => token.marker))],
      hint: driveHint(voice, {...tracker, connected: status.state === "connected"}, roles),
      credit: copy.credit(
        formatNumber(remnantFraction(lobes, states) * 100, 0),
        copy.species[species] ?? species,
        bodyName(voice, sex, person.age),
      ),
    });
  };

  const schedule = (): void => {
    if (frame !== 0) return;
    frame = window.requestAnimationFrame(render);
  };

  // The clock of the course: the table draws every frame, because the days run whether a hand
  // is on it or not.
  const tick = (): void => {
    schedule();
    window.requestAnimationFrame(tick);
  };

  const resize = (): void => {
    viewport = {width: window.innerWidth, height: window.innerHeight};
    root.setAttribute("viewBox", `0 0 ${viewport.width} ${viewport.height}`);
    scene.resize(viewport);
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

  host.progress(copy.solvingIntact);
  await solveAll(operationAtDial(operations, 0), 1);
  tick();
}
