/**
 * The control surface of the TUIO 2.0 simulator.
 *
 * The page owns the gestures and nothing else: it holds the tokens and touches of one surface
 * and sends the whole state to the simulator, which turns it into the bundles of a tracker. The
 * gestures are the ones of the Unity simulator of Interactive Scape, so that what is learned
 * here is worth something at a real tracker.
 *
 * The angle and the packing of the sensor come from the modules of the simulator itself, served
 * under `/shared/`, so that the page and the frames it causes agree on both.
 */

import {degreesOf, radiansOf, wrapAngle} from "/shared/angle.mjs";
import {clampSensor, DEFAULT_SENSOR} from "/shared/sensor.mjs";

/** How far the wheel turns a token, in degrees, and the finer step of the shift key. */
const COARSE_STEP = 5;
const FINE_STEP = 1;

/** The radius of a touch, as the fraction of the sensor height TUIO 2.0 asks for. */
const POINTER_RADIUS = 0.02;

const SVG_NS = "http://www.w3.org/2000/svg";

const stage = document.getElementById("stage");
const table = document.getElementById("table");
const tokenLayer = document.getElementById("tokens");
const pointerLayer = document.getElementById("pointers");
const statusBox = document.getElementById("status");
const statusText = document.getElementById("status-text");
const counts = document.getElementById("counts");
const markerField = document.getElementById("marker");
const widthField = document.getElementById("width");
const heightField = document.getElementById("height");

const sensor = {...DEFAULT_SENSOR};
const tokens = new Map();
const pointers = new Map();
const rendered = new Map();

let sessions = new Map();
let tracker = {source: "", trackers: 0, frameId: 0, rate: 0};
let named = 0;
let drag = null;
let box = {width: 1, height: 1};
let available = {width: 1, height: 1};
let pending = 0;
let socket = null;
let retry = null;

function element(name, attributes = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

function clamp(value, low = 0, high = 1) {
  return Math.min(high, Math.max(low, value));
}

/** The radius of a token on screen: large enough to grab, small enough to leave the table room. */
function tokenRadius() {
  return clamp(box.width * 0.028, 22, 44);
}

/** The position of an event on the surface, as the fractions of the sensor TUIO 2.0 sends. */
function positionOf(event) {
  const bounds = table.getBoundingClientRect();
  return {
    x: clamp((event.clientX - bounds.left) / bounds.width),
    y: clamp((event.clientY - bounds.top) / bounds.height),
  };
}

function markerOf() {
  const value = Number.parseInt(markerField.value, 10);
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

/* The state and what it causes: one render and one message per animation frame, however many
   events the mouse produced in between. */

function publish() {
  if (pending !== 0) return;
  pending = requestAnimationFrame(() => {
    pending = 0;
    render();
    send();
  });
}

function send() {
  if (socket === null || socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify({
    type: "surface",
    sensor,
    tokens: [...tokens.values()],
    pointers: [...pointers.values()],
  }));
}

function addToken(position) {
  named += 1;
  const key = `token-${named}`;
  tokens.set(key, {key, marker: markerOf(), x: position.x, y: position.y, angle: 0});
  publish();
}

function addPointer(position) {
  named += 1;
  const key = `pointer-${named}`;
  pointers.set(key, {key, x: position.x, y: position.y, radius: POINTER_RADIUS, press: 0.5});
  publish();
  return key;
}

function turnToken(key, degrees) {
  const token = tokens.get(key);
  if (token === undefined) return;
  token.angle = wrapAngle(token.angle + radiansOf(degrees));
  publish();
}

/* The surface itself. */

function tokenNode(key) {
  const group = element("g", {class: "token", "data-key": key, role: "img"});
  const body = element("circle", {class: "token-body", r: 1});
  const dial = element("g", {class: "token-dial"});
  const notch = element("line", {class: "token-notch", x1: 0, y1: 0, x2: 0, y2: 0});
  const grip = element("circle", {class: "token-grip", cx: 0, cy: 0, r: 1});
  dial.append(notch, grip);
  const marker = element("text", {class: "token-marker", y: 0});
  const readout = element("text", {class: "token-readout", y: 0});
  group.append(body, dial, marker, readout);
  tokenLayer.append(group);
  return {group, body, dial, notch, grip, marker, readout};
}

function pointerNode(key) {
  const group = element("g", {class: "pointer", "data-key": key});
  const halo = element("circle", {class: "pointer-halo", r: 1});
  const core = element("circle", {class: "pointer-core", r: 1});
  group.append(halo, core);
  pointerLayer.append(group);
  return {group, halo, core};
}

function render() {
  const radius = tokenRadius();
  for (const [key, node] of rendered) {
    if (!tokens.has(key) && !pointers.has(key)) {
      node.group.remove();
      rendered.delete(key);
    }
  }
  for (const token of tokens.values()) {
    let node = rendered.get(token.key);
    if (node === undefined) {
      node = tokenNode(token.key);
      rendered.set(token.key, node);
    }
    const degrees = degreesOf(token.angle);
    const session = sessions.get(`token:${token.key}`);
    node.group.setAttribute(
      "transform",
      `translate(${(token.x * box.width).toFixed(2)} ${(token.y * box.height).toFixed(2)})`,
    );
    node.body.setAttribute("r", String(radius));
    node.dial.setAttribute("transform", `rotate(${degrees.toFixed(2)})`);
    node.notch.setAttribute("y1", String(-radius * 0.2));
    node.notch.setAttribute("y2", String(-radius * 0.92));
    node.grip.setAttribute("cy", String(-radius * 0.92));
    node.grip.setAttribute("r", String(radius * 0.12));
    node.marker.setAttribute("y", String(radius * 0.22));
    node.marker.textContent = String(token.marker);
    // The readout sits under the token, and above it at the near edge, where it would be cut off.
    const below = token.y * box.height + radius + 20 < box.height;
    node.readout.setAttribute("y", String(below ? radius + 16 : -radius - 8));
    node.readout.textContent = `${degrees.toFixed(0)}° · `
      + `${token.x.toFixed(3)}, ${token.y.toFixed(3)}`
      + (session === undefined ? "" : ` · s${session}`);
    // The surface is a picture, so every token says what it is.
    node.group.setAttribute("aria-label", `Token of marker ${token.marker}, ${node.readout.textContent}`);
  }
  for (const pointer of pointers.values()) {
    let node = rendered.get(pointer.key);
    if (node === undefined) {
      node = pointerNode(pointer.key);
      rendered.set(pointer.key, node);
    }
    node.group.setAttribute(
      "transform",
      `translate(${(pointer.x * box.width).toFixed(2)} ${(pointer.y * box.height).toFixed(2)})`,
    );
    node.halo.setAttribute("r", String(pointer.radius * box.height));
    node.core.setAttribute("r", String(clamp(radius * 0.18, 4, 9)));
  }
  const touches = pointers.size === 1 ? "1 touch" : `${pointers.size} touches`;
  const objects = tokens.size === 1 ? "1 token" : `${tokens.size} tokens`;
  counts.textContent = `${objects} · ${touches} · frame ${tracker.frameId} · ${tracker.rate} Hz`;
}

/**
 * The surface on screen, which keeps the aspect ratio of the sensor: a position on the page is
 * then the position a table application draws, and a token is not an ellipse.
 */
function fit() {
  const aspect = sensor.width / sensor.height;
  let width = available.width;
  let height = width / aspect;
  if (height > available.height) {
    height = available.height;
    width = height * aspect;
  }
  box = {width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height))};
  table.style.width = `${box.width}px`;
  table.style.height = `${box.height}px`;
  table.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
  render();
}

/** The sensor the page reports, after whatever was typed into the two fields. */
function resize() {
  const clamped = clampSensor(sensor);
  sensor.width = clamped.width;
  sensor.height = clamped.height;
  widthField.value = String(sensor.width);
  heightField.value = String(sensor.height);
  fit();
  publish();
}

/* The gestures. */

function tokenKeyOf(target) {
  const group = target instanceof Element ? target.closest(".token") : null;
  return group === null ? null : group.getAttribute("data-key");
}

table.addEventListener("pointerdown", event => {
  if (!event.isPrimary && event.pointerType === "mouse") return;
  const key = tokenKeyOf(event.target);
  if (event.button === 1) {
    // The middle button lifts a token off the table, as it does in the Unity simulator.
    event.preventDefault();
    if (key !== null) {
      tokens.delete(key);
      publish();
    }
    return;
  }
  if (event.button !== 0) return;
  event.preventDefault();
  const position = positionOf(event);
  if (key !== null) {
    const token = tokens.get(key);
    if (token === undefined) return;
    drag = {kind: "token", key, dx: token.x - position.x, dy: token.y - position.y};
  } else {
    drag = {kind: "pointer", key: addPointer(position), dx: 0, dy: 0};
  }
  // The capture keeps a drag that leaves the surface, and is nothing to insist on when the
  // pointer is already gone.
  try {
    table.setPointerCapture(event.pointerId);
  } catch {
    // The drag works without it, within the surface.
  }
});

table.addEventListener("pointermove", event => {
  if (drag === null) return;
  const position = positionOf(event);
  const object = drag.kind === "token" ? tokens.get(drag.key) : pointers.get(drag.key);
  if (object === undefined) return;
  object.x = clamp(position.x + drag.dx);
  object.y = clamp(position.y + drag.dy);
  publish();
});

function endDrag() {
  if (drag === null) return;
  // A touch exists for as long as the button is down, which is what a finger does.
  if (drag.kind === "pointer") pointers.delete(drag.key);
  drag = null;
  publish();
}

table.addEventListener("pointerup", endDrag);
table.addEventListener("pointercancel", endDrag);
table.addEventListener("lostpointercapture", endDrag);

table.addEventListener("dblclick", event => {
  if (event.button !== 0) return;
  // A double click on a token is not a second token on top of it.
  if (tokenKeyOf(event.target) !== null) return;
  event.preventDefault();
  addToken(positionOf(event));
});

table.addEventListener("wheel", event => {
  const key = tokenKeyOf(event.target);
  if (key === null) return;
  event.preventDefault();
  const step = event.shiftKey ? FINE_STEP : COARSE_STEP;
  turnToken(key, event.deltaY < 0 ? step : -step);
}, {passive: false});

table.addEventListener("contextmenu", event => event.preventDefault());
table.addEventListener("auxclick", event => event.preventDefault());

markerField.addEventListener("change", () => {
  markerField.value = String(markerOf());
});

for (const field of [widthField, heightField]) {
  field.addEventListener("change", () => {
    sensor.width = Number.parseInt(widthField.value, 10);
    sensor.height = Number.parseInt(heightField.value, 10);
    resize();
  });
}

document.getElementById("clear").addEventListener("click", () => {
  tokens.clear();
  pointers.clear();
  drag = null;
  publish();
});

// The content box of the stage, which excludes its padding, is the room the surface has.
new ResizeObserver(entries => {
  const rect = entries[0]?.contentRect;
  if (rect === undefined) return;
  available = {width: rect.width, height: rect.height};
  fit();
}).observe(stage);

/* The connection to the simulator, which is the only thing the page does not own. */

function setStatus(state, text) {
  statusBox.dataset.state = state;
  statusText.textContent = text;
}

function announce() {
  if (tracker.trackers === 0) {
    setStatus("waiting", `${tracker.source} · no application is listening`);
    return;
  }
  const applications = tracker.trackers === 1 ? "1 application" : `${tracker.trackers} applications`;
  setStatus("ready", `${tracker.source} · ${applications}`);
}

function connect() {
  const url = new URL("control", window.location.href);
  url.protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(url);
  socket.addEventListener("open", () => {
    setStatus("connecting", "Waiting for the first frame...");
    send();
  });
  socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    if (message.type !== "status") return;
    tracker = {
      source: message.source, trackers: message.trackers, frameId: message.frameId,
      rate: message.rate,
    };
    sessions = new Map(message.sessions);
    announce();
    render();
  });
  socket.addEventListener("close", event => {
    socket = null;
    if (event.code === 4000) {
      // Two control pages would fight over one surface, so the newer one has it.
      setStatus("error", "Another control page took the surface over. Reload to take it back.");
      return;
    }
    setStatus("error", "The simulator is not answering. Start it with \"npm run simulator\".");
    if (retry === null) {
      retry = window.setTimeout(() => {
        retry = null;
        connect();
      }, 1000);
    }
  });
}

resize();
connect();

// The page is a tool, so what it knows is reachable from the console.
window.simulator = {tokens, pointers, sensor, addToken, addPointer, turnToken, publish};
