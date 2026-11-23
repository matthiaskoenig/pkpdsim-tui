/**
 * The cardiovascular table: the objects on the surface are the resistances of the circulation
 * and the beat of the heart, and the anatomy answers while a hand is still on them.
 *
 * Two models run side by side. The steady network is algebraic and is solved as soon as an
 * object has moved, so the organs and the vessels follow a hand without a wait. The compiled heart of pkpdsim is
 * solved in a Web Worker for the objects as they came to rest, and it is what the numbers at the
 * edges and the beat beside the heart are read from.
 *
 * The application starts this table for `?app=cardiovascular`, with the body of `?sex`; the
 * tracker and the surface are the ones of the application, see `apps/table`.
 */

import {
  bodyParameters, bodyReference, defaultControls, flowScale, heartCase, heartRequest,
  loadAnatomy, loadCardiovascularData, loadHeartConfig, solvePressure,
} from "@pkpdsim-tui/cardio-sim";
import type {
  HeartConfig, HeartControls, HeartSummary, PressureControls, PressureSolution,
} from "@pkpdsim-tui/cardio-sim";
import {createSolver, fetchSolverAssets, loadCoreHost} from "@pkpdsim-tui/core-runtime";
import type {Solver} from "@pkpdsim-tui/core-runtime";
import {markersOn, openTableInput, rolesOn} from "@pkpdsim-tui/tuio-input";
import type {TableSnapshot, TableStatus} from "@pkpdsim-tui/tuio-input";
import {unassignedMarkers, winningTokens} from "@pkpdsim-tui/tuio-input";
import {
  bodyName, chooseQuery, createChrome, createQuiz, createInfo, createReadout, createTokenLayer,
  driveHint, formatFactor, formatNumber, pointerPoints, visibleStats, words,
} from "@pkpdsim-tui/tui-kit";
import type {ChoiceGroup, TableHost} from "@pkpdsim-tui/tui-kit";
import {beatCycle, sampleBeat} from "./beat.ts";
import {createBeats} from "./beats.ts";
import {createHepatic} from "./hepatic.ts";
import {createPulse} from "./pulse.ts";
import type {BeatCycle} from "./beat.ts";
import {cardioReading} from "./audience.ts";
import {cardiovascularStats, cardFor} from "./cards.ts";
import {CARDIO_TEXT} from "./text.ts";
import type {CardioReadout} from "./cards.ts";
import {
  cardiovascularRoles, CARDIOVASCULAR_MARKERS, controlsFromTokens, heartControlsFromTokens,
} from "./roles.ts";
import {createScene} from "./scene.ts";
import "./style.css";

/** How long the table waits for the objects to come to rest before it solves the heart. */
const SETTLE = 160;

/**
 * What the table reads out of a run: the two bands, the beat beside the heart and the panels at
 * the edges, and the total blood volume, which is how the run checks itself. The export carries
 * every flow of the body on top of these, and each one is another number per output row for the
 * worker to hand back.
 */
const TABLE_COLUMNS = new Set([
  "time", "CV_P_ar", "CV_P_po", "CV_P_li", "CV_P_lv", "CV_V_lv", "CO", "Qlu", "Qh", "Qpo",
  "CV_V_blood_total",
]);

/** The cardiovascular table, on the surface of the application. */
export async function startCardiovascularTable(host: TableHost): Promise<void> {
  const voice = host.voice;
  const copy = voice.pick(CARDIO_TEXT);
  const kit = words(voice);
  // The objects of this table, read from the markers this table carries, see `?ids=`.
  const roles = rolesOn(host.markerIds, cardiovascularRoles(voice));
  const stats = visibleStats(cardiovascularStats(voice), voice);
  const parameters = host.parameters;
  const assets = host.assets;
  // Who the table is solved for, from the first screen: the body, its weight and its height.
  const individual = host.individual;
  const sex = individual.sex;
  // The anatomy holds both bodies; the reference circulation and the compiled heart are the
  // export of one of them. The engine and the host of the runtime are shared.
  const dataBase = sex === "female" ? new URL("female/", assets) : assets;
  const runtime = new URL("solver/", assets);
  const solverBase = sex === "female" ? new URL("female/solver/", assets) : runtime;

  host.progress(copy.loadingCirculation);
  const [data, anatomy, config] = await Promise.all([
    loadCardiovascularData(new URL("cardiovascular-data.json", dataBase)),
    loadAnatomy(new URL("cardiovascular-anatomy.json", assets)),
    loadHeartConfig(new URL("config.json", solverBase)),
  ]);
  // What the table asks of a run. The published cases are read at 0.2 ms over the summarized
  // beats and at 15000 points over the whole run, which is more than a table can wait for: it
  // reads the same beats at 2 ms, which moves every number of the summary by less than a tenth
  // of its unit, and the whole run only coarsely, because the table draws the beats and not it.
  const table: HeartConfig = {
    ...config,
    // The heart of this person: the model scales its chambers, its vessels and the blood it
    // moves from the body weight and the height, so a child's heart beats a child's volume.
    preinit: bodyParameters(individual),
    columns: config.columns.filter(column => TABLE_COLUMNS.has(column)),
    summary_step_seconds: Math.max(config.summary_step_seconds, 0.002),
    course_points: 1200,
  };
  const body = anatomy.bodies[sex] ?? Object.values(anatomy.bodies)[0];
  if (body === undefined) throw new Error("The anatomy holds no body.");
  // The circulation of this person: the exported network is that of the reference adult, and a
  // body which moves less blood is the same network with more resistance. How much less it
  // moves is the cardiac output of a body of that age until the heart of this body has been
  // solved once, and from then on it is what that run said.
  let reference = bodyReference(data.pressure, flowScale(individual));

  /**
   * The network of the body at the head which makes it move what the heart moved.
   *
   * The algebra of the network is driven by a pressure head, and the heart is what makes that
   * head: a heart which beats faster or harder pushes more blood through the same vessels, and
   * every organ gets more of it. So the head is set to the one at which this network carries
   * the cardiac output the beating heart of these settings produced, which is what makes the
   * liver on the body follow the dial of the heart rate rather than only the picture of the
   * beat. The resistances are already in that run, so a vessel which was narrowed shows up
   * twice over: in the share each organ takes here, and in the output the heart managed there.
   */
  const steadyAt = (controls: PressureControls, output: number): PressureSolution => {
    const trial = solvePressure(reference, controls);
    const head = controls.arterial - controls.venous;
    if (!(output > 0) || !(trial.co > 0) || head <= 0) return trial;
    return solvePressure(
      reference, {...controls, arterial: controls.venous + head * output / trial.co});
  };

  let steadyBaseline = solvePressure(reference, defaultControls(reference));
  // The reference heart of this body, as pkpdsim exported it. It is what the table shows until
  // the first run of the live heart has come back, and what every number is compared with.
  const exported = data.cases.find(solved => solved.id === "baseline") ?? data.cases[0];
  if (exported === undefined) throw new Error("The export holds no case of the reference heart.");
  // What every number of the table is held against: the heart of this body at rest. Until the
  // first run of it comes back it is the exported heart of the reference adult, which is what
  // the table is drawn with while it is still solving.
  let referenceSummary: HeartSummary = exported.summary.after;

  host.progress(copy.startingHeart);
  const core = await loadCoreHost(new URL("sbmlsim-core.js", runtime));
  const solver: Solver = await createSolver({
    host: core, key: `heart-${sex}`,
    assets: await fetchSolverAssets(solverBase, {runtimeBase: runtime}),
  });

  const surface = host.surface;
  const root = host.scene;
  const scene = createScene(root, body, reference, voice);
  const readout = createReadout<CardioReadout>(root, stats);
  const pulse = createPulse(root, voice);
  // The beats of the last minute, under the shape of one of them.
  const beats = createBeats(root, voice);
  // What the liver is getting, over the last minute: the monitor beside the body.
  const hepatic = createHepatic(root, voice);
  const tokenLayer = createTokenLayer(root, host);
  // What a number, an object or an organ is: the sentence opens where a visitor asks for it,
  // with the mouse or with a finger resting on it.
  // Three questions about this table, behind the button in the near corner.
  createQuiz(host.chrome, {voice, questions: copy.quiz, table: "cardiovascular"});
  const chrome = createChrome(host.chrome, {
    mark: host.mark,
    voice,
    onBack: () => host.back(),
    onReset: () => host.reset(),
    onChoose: (group, option) => {
      // The body of the person, which the weight of the first screen belongs to: the
      // other body takes the reference weight of its own age.
      if (group === "sex") chooseQuery("sex", option, "female", ["bw"]);
      else host.choose(group, option);
    },
  });

  const {input, tracker} = await openTableInput({
    parameters, element: surface,
    markers: markersOn(host.markerIds, CARDIOVASCULAR_MARKERS),
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
  let steady: PressureSolution = steadyBaseline;
  let heartControls: HeartControls = heartControlsFromTokens(roles, new Map());
  let summary: HeartSummary = referenceSummary;
  let cycle: BeatCycle | undefined;
  /** The heart of this individual at rest, which every later beat is drawn against. */
  let baseline: BeatCycle | undefined;
  /** Where the table stands in the beat, carried over when the rate changes. */
  let phase = 0;
  let clock = 0;
  let notice = "";
  let solving = true;
  let asked = "";
  let settle = 0;
  let pending: AbortController | null = null;
  let dirty = true;

  /** The next frame reads everything again. */
  const schedule = (): void => {
    dirty = true;
  };

  /** One run of the compiled heart for the objects as they now stand. */
  const solve = async (controls: HeartControls): Promise<void> => {
    pending?.abort();
    const controller = new AbortController();
    pending = controller;
    solving = true;
    // The table says that it is working on it while the heart is being solved.
    schedule();
    try {
      const result = await solver.simulate(
        heartRequest(controls, table), {signal: controller.signal});
      const solved = heartCase(result, controls, table);
      summary = solved.summary.after;
      cycle = beatCycle(solved) ?? cycle;
      // The first run is the heart of the individual at rest, because an empty surface asks
      // for the reference controls. It stays behind every later one, dashed, and it is what
      // the bands hold their numbers against: a child at rest is not a grown up at rest, and
      // what a visitor turns the objects against is the body which is on the table.
      if (baseline === undefined) {
        const grown = exported.summary.after.mean_cardiac_output;
        const mine = summary.mean_cardiac_output;
        referenceSummary = summary;
        // The organ flows of the picture are the flows of the heart which was just solved: the
        // network is scaled so that it moves what this heart moves.
        if (grown > 0 && mine > 0) {
          reference = bodyReference(data.pressure, mine / grown);
          steadyBaseline = steadyAt(defaultControls(reference), mine);
        }
      }
      baseline ??= cycle;
      notice = "";
    } catch (error) {
      if (controller.signal.aborted) return;
      notice = kit.solveFailed(error instanceof Error ? error.message : String(error));
    } finally {
      if (pending === controller) {
        pending = null;
        solving = false;
      }
      // The run that came back is what the bands, the cards and the sentence are read from.
      schedule();
    }
  };

  /** The heavy part of a frame: the objects changed, so everything is read again. */
  const update = (): void => {
    for (const [sessionId, token] of snapshot.tokens) {
      if (!origins.has(sessionId)) origins.set(sessionId, token.turn);
    }
    for (const sessionId of [...origins.keys()]) {
      if (!snapshot.tokens.has(sessionId)) origins.delete(sessionId);
    }
    const controls = controlsFromTokens(roles, snapshot.tokens, reference, origins);
    heartControls = heartControlsFromTokens(roles, snapshot.tokens, origins);
    try {
      steady = steadyAt(controls, summary.mean_cardiac_output);
      notice = "";
    } catch (error) {
      notice = kit.solveFailed(error instanceof Error ? error.message : String(error));
    }
    const next = JSON.stringify(heartControls);
    if (next !== asked) {
      asked = next;
      window.clearTimeout(settle);
      settle = window.setTimeout(() => void solve(heartControls), SETTLE);
    }

    const value: CardioReadout = {heart: summary, steady};
    const against: CardioReadout = {heart: referenceSummary, steady: steadyBaseline};
    root.setAttribute("data-solving", String(solving));
    scene.update(steady, reference);
    readout.update(value, against);
    tokenLayer.update({
      snapshot, roles: roles, viewport,
      card: (token, role) => cardFor(voice, token, role, value, origins),
    });
    chrome.update({
      title: host.title, about: voice.say(copy.about),
      tries: copy.tries.map(entry => voice.say(entry)),
      reading: cardioReading(voice, heartControls, individual, summary, referenceSummary),
      back: true,
      status, roles: roles, notice,
      value: role => {
        const live = heartControls[role.id as keyof HeartControls];
        if (live === undefined) return "-";
        return role.id === "heartRate" ? `${formatNumber(live, 0)} /min` : formatFactor(live);
      },
      live: new Set(winningTokens(roles, snapshot.tokens).keys()),
      unassigned: unassignedMarkers(roles, snapshot.tokens),
      hint: driveHint(voice, {...tracker, connected: status.state === "connected"}, roles),
    });
  };

  /**
   * The beat, which runs on the clock of the table and not on the objects: the solved cycle is
   * walked around once per period, so the ventricle beside the heart beats in real time.
   */
  const tick = (now: number): void => {
    const elapsed = clock === 0 ? 0 : Math.min((now - clock) / 1000, 0.25);
    clock = now;
    if (dirty) {
      dirty = false;
      update();
    }
    // The monitor of the liver is drawn from the steady network, which stands for the objects
    // as they are now, rather than from the last run of the heart; it is sampled on the clock
    // of the table so that its curves scroll as evenly as the beat beside them.
    hepatic.update(steady, now);
    if (cycle !== undefined) {
      phase = (phase + elapsed * (cycle.heartRate / 60)) % 1;
      const frame = sampleBeat(cycle, phase);
      scene.beat({cycle, frame});
      pulse.update({cycle, frame, summary, baseline});
      beats.update({arterial: frame.arterial, heartRate: cycle.heartRate}, now);
    } else {
      scene.beat(undefined);
      pulse.update(undefined);
      beats.update(undefined, now);
    }
    window.requestAnimationFrame(tick);
  };

  const resize = (): void => {
    viewport = {width: window.innerWidth, height: window.innerHeight};
    root.setAttribute("viewBox", `0 0 ${viewport.width} ${viewport.height}`);
    scene.resize(viewport);
    readout.resize(viewport);
    pulse.resize(viewport);
    beats.resize(viewport);
    hepatic.resize(viewport);
    schedule();
  };

  input.subscribe((next, nextStatus) => {
    snapshot = next;
    status = nextStatus;
    schedule();
  });

  window.addEventListener("resize", resize);
  window.addEventListener("pagehide", () => input.disconnect());
  resize();
  input.connect();
  update();
  // The first run of the heart is the reference one, so the table beats as soon as it is up.
  await solve(heartControls);
  schedule();
  window.requestAnimationFrame(tick);
}
