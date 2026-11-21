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
  caseChanges, describeStates, intactStates, loadLobeConfig, loadLobeData, lobeRequest,
  remnantFraction,
} from "@pkpdsim-tui/lobes-sim";
import type {Lobe, LobeConfig, LobeState} from "@pkpdsim-tui/lobes-sim";
import {
  chooseQuery, createChrome, createInfo, createPlot, createReadout, createTokenLayer,
  formatNumber, pointerPoints,
} from "@pkpdsim-tui/tui-kit";
import type {ChoiceGroup, TableHost} from "@pkpdsim-tui/tui-kit";
import {openTableInput, valueFromAngle} from "@pkpdsim-tui/tuio-input";
import type {
  TableSnapshot, TableStatus, TokenRole, TrackerOptions,
} from "@pkpdsim-tui/tuio-input";
import {cardFor, LOBE_STATS, LOBE_TRACES} from "./cards.ts";
import type {Sample} from "./cards.ts";
import {blockAt} from "./layout.ts";
import {createLiverScene, plotBox} from "./scene.ts";
import {instrumentsOn, statesFrom} from "./plan.ts";
import {DAY_MARKER, lobeRoles} from "./roles.ts";
import {LOBE_ABOUT, LOBE_TITLE, LOBE_TRIES, lobeReading} from "./audience.ts";
import "./style.css";

const MOUSE_HINT = "Keys 1 to 4 put an object down, drag moves it, the wheel winds the dial.";
const TABLE_HINT = "Put a clamp or the scalpel on a segment. The dial winds the days.";
const BOTH_HINT = "Put a clamp or the scalpel on a segment, or press 1 to 4 here to place one.";
/** How long the table waits for the objects to come to rest before it solves. */
const SETTLE = 140;

function hintFor(tracker: TrackerOptions, state: TableStatus["state"]): string {
  if (!tracker.tracker) return MOUSE_HINT;
  if (state === "connected") return tracker.discovered ? BOTH_HINT : TABLE_HINT;
  return `Start a TUIO ${tracker.version} tracker on ${tracker.address}, or drop "?tuio" from `
    + "the address to drive the table with the mouse.";
}

/** The lobed liver table, on the surface of the application. */
export async function startLobesTable(host: TableHost): Promise<void> {
  const parameters = host.parameters;
  const assets = host.assets;
  const runtime = new URL("runtime/", assets);

  host.progress("Loading the lobed liver...");
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
      id: "sex", label: "Body", selected: sex,
      options: [
        {id: "male", label: "Male"},
        {
          id: "female", label: "Female",
          ...(species === "human" ? {} : {unavailable: "The export has the female liver of the human only."}),
        },
      ],
    },
    {
      id: "species", label: "Species", selected: species,
      options: Object.keys(data.species).length > 1
        ? [{id: "human", label: "Human"}, {id: "rat", label: "Rat"}, {id: "mouse", label: "Mouse"}]
        : [{id: species, label: species[0]?.toUpperCase() + species.slice(1)}],
    },
  ];

  const solverBase = new URL(`solver_lobes/${species}/`, base);
  const config: LobeConfig = await loadLobeConfig(new URL("config.json", solverBase));
  const days = config.end / (24 * 60);
  const roles = lobeRoles(days);
  const DAY_AXIS = {max: config.end, tick: 24 * 60, scale: 1 / (24 * 60), unit: "days"};

  host.progress("Starting the solver...");
  const core = await loadCoreHost(new URL("sbmlsim-core.js", runtime));
  const solver: Solver = await createSolver({
    host: core, key: `lobes-${species}`,
    assets: await fetchSolverAssets(solverBase, {runtimeBase: runtime}),
  });

  const surface = host.surface;
  const root = host.scene;
  const scene = createLiverScene(root, lobes);
  const plot = createPlot(root, LOBE_TRACES);
  const readout = createReadout<Sample>(root, LOBE_STATS);
  const tokenLayer = createTokenLayer(root);
  // What a number, an object or a segment is: the note opens where a visitor asks for it.
  createInfo(surface, () => pointerPoints(snapshot, viewport));
  const chrome = createChrome(host.chrome, {
    onBack: () => host.back(),
    onChoose: (group, option) => {
      if (group === "sex") chooseQuery("sex", option, "male");
      else if (group === "species") chooseQuery("species", option, "human");
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
      notice = `The liver could not be solved: ${error instanceof Error ? error.message : String(error)}`;
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
      card: (token, role) => cardFor(token, role, {
        block: role?.mode === "position"
          ? blockAt(scene.blocks, token.x * viewport.width, token.y * viewport.height)
          : undefined,
        sample, baseline: reference, days, origins,
      }),
    });
    chrome.update({
      title: LOBE_TITLE, about: LOBE_ABOUT, tries: LOBE_TRIES,
      reading: lobeReading(lobes, states, day, sample, reference),
      back: "Back to the body",
      choices: [...host.choices, ...bodies],
      status, roles, notice,
      value: role => {
        if (role.mode === "position") {
          const found = instruments.filter(instrument => instrument.role.id === role.id);
          if (found.length === 0) return "-";
          return found.map(instrument => instrument.token ?? "beside").join(", ");
        }
        return `day ${formatNumber(day, 1)}`;
      },
      live: new Set([
        ...instruments.filter(instrument => instrument.token !== undefined)
          .map(instrument => instrument.role.id),
        ...([...snapshot.tokens.values()].some(token => token.marker === DAY_MARKER) ? ["day"] : []),
      ]),
      unassigned: [...new Set([...snapshot.tokens.values()]
        .filter(token => !roles.some(role => role.markers.includes(token.marker)))
        .map(token => token.marker))],
      hint: hintFor(tracker, status.state),
      credit: `${describeStates(lobes, states)} - `
        + `${formatNumber(remnantFraction(lobes, states) * 100, 0)} % of the mass left, `
        + `${sex} ${species} liver`,
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

  host.progress("Solving the intact liver...");
  await solve(intactStates(lobes), true);
}
