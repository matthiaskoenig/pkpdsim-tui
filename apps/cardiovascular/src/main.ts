/**
 * The cardiovascular table: the objects on the surface are the resistances of the circulation,
 * and the anatomy answers while a hand is still on them.
 *
 * Query parameters:
 *   ?tuio             a tracker on ws://localhost:3333
 *   ?tuio=host:port   a tracker somewhere else, which is how a table is addressed
 *   ?tuio-version=1.1 a tracker that speaks TUIO 1.1 rather than TUIO 2.0
 *   ?sex=female       the female reference body
 */

import {
  defaultControls, loadAnatomy, loadCardiovascularData, solvePressure,
} from "@pkpdsim-tui/cardio-sim";
import type {PressureSolution} from "@pkpdsim-tui/cardio-sim";
import {
  createMockTableInput, createTuioTableInput, trackerOptions,
} from "@pkpdsim-tui/tuio-input";
import type {
  TableInput, TableSnapshot, TableStatus, TrackerOptions,
} from "@pkpdsim-tui/tuio-input";
import {unassignedMarkers, winningTokens} from "@pkpdsim-tui/tuio-input";
import {createChrome, createReadout, createTokenLayer, formatFactor} from "@pkpdsim-tui/tui-kit";
import {CARDIOVASCULAR_STATS, cardFor} from "./cards.ts";
import {CARDIOVASCULAR_ROLES, controlsFromTokens} from "./roles.ts";
import {createScene} from "./scene.ts";

const MOUSE_HINT = "Keys 1 to 4 place an object under the pointer, drag moves it, the wheel turns it, backspace lifts it.";
const TABLE_HINT = "Put an object on the table and turn it.";

function element<T extends Element>(id: string): T {
  const found = document.getElementById(id);
  if (found === null) throw new Error(`The page has no element "${id}".`);
  return found as unknown as T;
}


/** What a person at the table should do next, which depends on how the page was started. */
function hintFor(tracker: TrackerOptions, state: TableStatus["state"]): string {
  if (!tracker.tracker) return MOUSE_HINT;
  if (state === "connected") return TABLE_HINT;
  return `Set the tracker to WebSocket, TUIO ${tracker.version} and port ${tracker.port}, then `
    + "reload. Without \"?tuio\" in the address the table runs on the mouse instead.";
}

function fail(message: string): void {
  const boot = element<HTMLElement>("boot");
  boot.classList.add("boot--error");
  boot.hidden = false;
  const heading = boot.querySelector("h1");
  if (heading !== null) heading.textContent = "The table could not start";
  element<HTMLElement>("boot-message").textContent = message;
}

async function start(): Promise<void> {
  const parameters = new URLSearchParams(window.location.search);
  const assets = new URL("assets/", document.baseURI);
  const [data, anatomy] = await Promise.all([
    loadCardiovascularData(new URL("cardiovascular-data.json", assets)),
    loadAnatomy(new URL("cardiovascular-anatomy.json", assets)),
  ]);
  const sex = parameters.get("sex") === "female" ? "female" : "male";
  const body = anatomy.bodies[sex] ?? Object.values(anatomy.bodies)[0];
  if (body === undefined) throw new Error("The anatomy holds no body.");

  const reference = data.pressure;
  const baseline = solvePressure(reference, defaultControls(reference));

  const surface = element<HTMLElement>("surface");
  const root = element<SVGSVGElement>("scene");
  const scene = createScene(root, body, reference);
  const readout = createReadout(root, CARDIOVASCULAR_STATS);
  const tokenLayer = createTokenLayer(root);
  const chrome = createChrome(element<HTMLElement>("chrome"));

  const tracker = trackerOptions(parameters);
  const usesTracker = tracker.tracker;
  const input: TableInput = usesTracker
    ? createTuioTableInput(tracker)
    : createMockTableInput({
      element: surface,
      markers: CARDIOVASCULAR_ROLES.map(role => role.markers[0] ?? 0),
    });

  const origins = new Map<number, number>();
  let viewport = {width: window.innerWidth, height: window.innerHeight};
  let snapshot: TableSnapshot = input.snapshot;
  let status: TableStatus = input.status;
  let solution: PressureSolution = baseline;
  let notice = "";
  let frame = 0;

  const render = (): void => {
    frame = 0;
    for (const [sessionId, token] of snapshot.tokens) {
      if (!origins.has(sessionId)) origins.set(sessionId, token.turn);
    }
    for (const sessionId of [...origins.keys()]) {
      if (!snapshot.tokens.has(sessionId)) origins.delete(sessionId);
    }
    const controls = controlsFromTokens(CARDIOVASCULAR_ROLES, snapshot.tokens, reference, origins);
    try {
      solution = solvePressure(reference, controls);
      notice = "";
    } catch (error) {
      notice = `${error instanceof Error ? error.message : String(error)} The last circulation stays on screen.`;
    }
    scene.update(solution, reference);
    readout.update(solution, baseline);
    tokenLayer.update({
      snapshot, roles: CARDIOVASCULAR_ROLES, viewport,
      card: (token, role) => cardFor(token, role, solution, origins),
    });
    chrome.update({
      status, roles: CARDIOVASCULAR_ROLES, notice,
      value: role => {
        const live = controls[role.id as keyof typeof controls];
        return live === undefined ? "-" : formatFactor(live);
      },
      live: new Set(winningTokens(CARDIOVASCULAR_ROLES, snapshot.tokens).keys()),
      unassigned: unassignedMarkers(CARDIOVASCULAR_ROLES, snapshot.tokens),
      hint: hintFor(tracker, status.state),
      credit: anatomy.attribution,
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
    readout.resize(viewport);
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
  render();
  element<HTMLElement>("boot").hidden = true;
}

try {
  await start();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  fail(`${message} The exported models and reference data are copied in with "npm run sync".`);
  console.error(error);
}
