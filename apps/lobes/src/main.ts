/**
 * The lobed liver table: clamps and a scalpel on the Couinaud segments, and the days after the
 * operation on a dial. Every number comes from the compiled liver of pkpdsim, solved in a Web
 * Worker while the objects stay on the table.
 *
 * Query parameters:
 *   ?tuio             a tracker on ws://localhost:3343
 *   ?tuio=host:port   a tracker somewhere else, which is how a table is addressed
 *   ?species=rat      a rat or a mouse liver instead of the human one
 */

import {createSolver, fetchSolverAssets, loadCoreHost, sampleAt, toSeries} from "@pkpdsim-tui/core-runtime";
import type {Series, Solver} from "@pkpdsim-tui/core-runtime";
import {
  caseChanges, describeStates, intactStates, loadLobeConfig, loadLobeData, lobeRequest,
  remnantFraction,
} from "@pkpdsim-tui/lobes-sim";
import type {Lobe, LobeConfig, LobeState} from "@pkpdsim-tui/lobes-sim";
import {
  createChrome, createPlot, createReadout, createTokenLayer, formatNumber,
} from "@pkpdsim-tui/tui-kit";
import {
  createMockTableInput, createTuioTableInput, DEFAULT_TUIO_HOST, DEFAULT_TUIO_PORT, valueFromAngle,
} from "@pkpdsim-tui/tuio-input";
import type {TableInput, TableSnapshot, TableStatus, TokenRole} from "@pkpdsim-tui/tuio-input";
import {cardFor, LOBE_STATS, LOBE_TRACES} from "./cards.ts";
import type {Sample} from "./cards.ts";
import {blockAt} from "./layout.ts";
import {createLiverScene, plotBox} from "./scene.ts";
import {instrumentsOn, statesFrom} from "./plan.ts";
import {DAY_MARKER, lobeRoles} from "./roles.ts";

const MOUSE_HINT = "Keys 1 to 4 place an object under the pointer, drag moves it, the wheel turns the dial, backspace lifts it.";
const TABLE_HINT = "Put a clamp or the scalpel on a segment. The dial winds the days.";
/** How long the table waits for the objects to come to rest before it solves. */
const SETTLE = 140;

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

async function start(): Promise<void> {
  const boot = element<HTMLElement>("boot");
  const message = element<HTMLElement>("boot-message");
  const parameters = new URLSearchParams(window.location.search);
  const assets = new URL("./assets/", window.location.href);
  const runtime = new URL("runtime/", assets);

  message.textContent = "Loading the lobed liver...";
  const data = await loadLobeData(new URL("lobes-data.json", assets));
  const wanted = parameters.get("species") ?? "human";
  const species = data.species[wanted] === undefined ? Object.keys(data.species)[0] ?? "human" : wanted;
  const liver = data.species[species];
  if (liver === undefined) throw new Error(`The export holds no ${wanted} liver.`);
  const lobes: readonly Lobe[] = liver.lobes;

  const solverBase = new URL(`solver_lobes/${species}/`, assets);
  const config: LobeConfig = await loadLobeConfig(new URL("config.json", solverBase));
  const days = config.end / (24 * 60);
  const roles = lobeRoles(days);
  const DAY_AXIS = {max: config.end, tick: 24 * 60, scale: 1 / (24 * 60), unit: "days"};

  message.textContent = "Starting the solver...";
  const host = await loadCoreHost(new URL("sbmlsim-core.js", runtime));
  const solver: Solver = await createSolver({
    host, key: `lobes-${species}`,
    assets: await fetchSolverAssets(solverBase, {runtimeBase: runtime}),
  });

  const surface = element<HTMLElement>("surface");
  const root = element<SVGSVGElement>("scene");
  const scene = createLiverScene(root, lobes);
  const plot = createPlot(root, LOBE_TRACES);
  const readout = createReadout<Sample>(root, LOBE_STATS);
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
      hint: hintFor(usesTracker, tracker.port, status.state),
      credit: `${describeStates(lobes, states)} - ${formatNumber(remnantFraction(lobes, states) * 100, 0)} % of the mass left`,
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

  message.textContent = "Solving the intact liver...";
  await solve(intactStates(lobes), true);
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
