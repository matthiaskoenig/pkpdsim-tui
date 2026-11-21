/**
 * The lobed liver table: clamps and a scalpel on the Couinaud segments, and the days after the
 * operation on a dial. Every number comes from the compiled liver of pkpdsim, solved in a Web
 * Worker while the objects stay on the table.
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
  chooseQuery, createChrome, createInfo, createPlot, createReadout, createTokenLayer, driveHint,
  formatNumber, pointerPoints, visibleStats, words,
} from "@pkpdsim-tui/tui-kit";
import type {ChoiceGroup, TableHost} from "@pkpdsim-tui/tui-kit";
import {openTableInput, valueFromAngle} from "@pkpdsim-tui/tuio-input";
import type {
  TableSnapshot, TableStatus, TokenRole,
} from "@pkpdsim-tui/tuio-input";
import {cardFor, lobeStats, lobeTraces} from "./cards.ts";
import type {Sample} from "./cards.ts";
import {blockAt} from "./layout.ts";
import {createLiverScene, plotBox} from "./scene.ts";
import {instrumentsOn, statesFrom} from "./plan.ts";
import {DAY_MARKER, lobeRoles, LOBE_MARKERS} from "./roles.ts";
import {lobeReading} from "./audience.ts";
import {LOBE_TEXT} from "./text.ts";
import "./style.css";

/** How long the table waits for the objects to come to rest before it solves. */
const SETTLE = 140;

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
  // The female liver is exported for the human only, so another species is the one body there is.
  const sex = parameters.get("sex") === "female" && wanted === "human" ? "female" : "male";
  const base = sex === "female" ? new URL("female/", assets) : assets;
  const data = await loadLobeData(new URL("lobes-data.json", base));
  const species = data.species[wanted] === undefined ? Object.keys(data.species)[0] ?? "human" : wanted;
  const liver = data.species[species];
  if (liver === undefined) throw new Error(`The export holds no ${wanted} liver.`);
  const lobes: readonly Lobe[] = liver.lobes;
  const bodies: readonly ChoiceGroup[] = [
    {
      id: "sex", label: kit.bodySwitch, selected: sex,
      options: [
        {
          id: "female", label: kit.female,
          ...(species === "human" ? {} : {unavailable: copy.femaleOnlyHuman}),
        },
        {id: "male", label: kit.male},
      ],
    },
    {
      id: "species", label: copy.speciesSwitch, selected: species,
      options: Object.keys(data.species).length > 1
        ? Object.keys(data.species).map(id => ({id, label: copy.species[id] ?? id}))
        : [{id: species, label: copy.species[species] ?? species}],
    },
  ];

  const solverBase = new URL(`solver_lobes/${species}/`, base);
  const config: LobeConfig = await loadLobeConfig(new URL("config.json", solverBase));
  const days = config.end / (24 * 60);
  const roles = lobeRoles(days, voice);
  const DAY_AXIS = {max: config.end, tick: 24 * 60, scale: 1 / (24 * 60), unit: copy.days};

  host.progress(copy.startingSolver);
  const core = await loadCoreHost(new URL("sbmlsim-core.js", runtime));
  const solver: Solver = await createSolver({
    host: core, key: `lobes-${species}`,
    assets: await fetchSolverAssets(solverBase, {runtimeBase: runtime}),
  });

  const surface = host.surface;
  const root = host.scene;
  const scene = createLiverScene(root, lobes, voice);
  const plot = createPlot(root, lobeTraces(voice));
  const readout = createReadout<Sample>(root, visibleStats(lobeStats(voice), voice));
  const tokenLayer = createTokenLayer(root, host);
  // What a number, an object or a segment is: the note opens where a visitor asks for it.
  const chrome = createChrome(host.chrome, {
    voice,
    onBack: () => host.back(),
    onChoose: (group, option) => {
      if (group === "sex") chooseQuery("sex", option, "male");
      else if (group === "species") chooseQuery("species", option, "human");
      else host.choose(group, option);
    },
  });

  const {input, tracker} = await openTableInput({
    parameters, element: surface, markers: [...LOBE_MARKERS],
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
  let states: Record<string, LobeState> = intactStates(lobes);
  let series: Series = {};
  let baseline: Series = {};
  let solving = true;
  let notice = "";
  let plan = "";
  let settle = 0;
  let frame = 0;
  let pending: AbortController | null = null;

  /** The day the dial shows, which is the end of the course while no dial is on the table. */
  const dayOnTable = (): number => {
    const dial = roles.find(role => role.markers.includes(DAY_MARKER));
    if (dial === undefined) return days;
    for (const token of snapshot.tokens.values()) {
      if (token.marker !== DAY_MARKER) continue;
      return valueFromAngle(dial, token.turn, origins.get(token.sessionId) ?? 0);
    }
    return days;
  };

  const solve = async (next: Record<string, LobeState>, intact: boolean): Promise<void> => {
    const changes = caseChanges(next);
    pending?.abort();
    const controller = new AbortController();
    pending = controller;
    solving = true;
    schedule();
    try {
      const result = await solver.simulate(lobeRequest({}, changes, config), {signal: controller.signal});
      series = toSeries(result);
      if (intact) baseline = series;
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

    const instruments = instrumentsOn(roles, snapshot.tokens, scene.blocks, viewport);
    states = statesFrom(lobes, instruments);
    const next = JSON.stringify(caseChanges(states));
    if (next !== plan) {
      plan = next;
      window.clearTimeout(settle);
      settle = window.setTimeout(() => void solve(states, next === "{}"), SETTLE);
    }

    const day = dayOnTable();
    const sample = sampleAt(series, day * 24 * 60);
    const reference = sampleAt(baseline, day * 24 * 60);
    root.setAttribute("data-solving", String(solving));
    scene.update({states, sample, baseline: reference});
    plot.update({series, baseline, cursor: day * 24 * 60, axis: DAY_AXIS});
    readout.update(sample, reference);
    tokenLayer.update({
      snapshot, roles, viewport,
      card: (token, role) => cardFor(voice, token, role, {
        block: role?.mode === "position"
          ? blockAt(scene.blocks, token.x * viewport.width, token.y * viewport.height)
          : undefined,
        sample, baseline: reference, days, origins,
      }),
    });
    chrome.update({
      title: host.title, about: voice.say(copy.about),
      tries: copy.tries.map(entry => voice.say(entry)),
      reading: lobeReading(voice, lobes, states, day, sample, reference),
      back: true,
      choices: [...host.choices, ...bodies],
      status, roles, notice,
      value: role => {
        if (role.mode === "position") {
          const found = instruments.filter(instrument => instrument.role.id === role.id);
          if (found.length === 0) return "-";
          return found.map(instrument => instrument.token ?? "beside").join(", ");
        }
        return copy.dayValue(formatNumber(day, 1));
      },
      live: new Set([
        ...instruments.filter(instrument => instrument.token !== undefined)
          .map(instrument => instrument.role.id),
        ...([...snapshot.tokens.values()].some(token => token.marker === DAY_MARKER) ? ["day"] : []),
      ]),
      unassigned: [...new Set([...snapshot.tokens.values()]
        .filter(token => !roles.some(role => role.markers.includes(token.marker)))
        .map(token => token.marker))],
      hint: driveHint(voice, {...tracker, connected: status.state === "connected"}, roles),
      credit: copy.credit(
        formatNumber(remnantFraction(lobes, states) * 100, 0),
        copy.species[species] ?? species,
        sex === "female" ? kit.female : kit.male,
      ),
    });
  };

  const schedule = (): void => {
    if (frame !== 0) return;
    frame = window.requestAnimationFrame(render);
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
  await solve(intactStates(lobes), true);
}
