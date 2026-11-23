/**
 * The control surface of the TUIO simulator.
 *
 * The page owns the gestures and nothing else: it holds the tokens and touches of one surface
 * and sends the whole state to the simulator, which turns it into the bundles of a tracker. The
 * gestures are the ones of the Unity simulator of Interactive Scape, so that what is learned
 * here is worth something at a real tracker.
 *
 * It also says what the tracker speaks and where, and it can put the application that listens
 * under the surface: the page embeds it at the size of the sensor and scales it to the surface
 * on screen, so the objects sit on the picture they drive, as they do on the glass of a table.
 *
 * The angle and the packing of the sensor come from the modules of the simulator itself, served
 * under `shared/` beside the page, so that the page and the frames it causes agree on both.
 * Everything the page asks for is relative to itself, so it works behind a path as well: the
 * development server of the table serves it under `/simulator/`, which is what puts the whole
 * table on one port.
 */

import {degreesOf, radiansOf, wrapAngle} from "./shared/angle.mjs";
import {createGlyph} from "./glyph.mjs";
import {clampSensor, DEFAULT_SENSOR} from "./shared/sensor.mjs";
import {DEFAULT_SETTINGS, normalizeSettings} from "./shared/protocol.mjs";

/** How far the wheel turns a token, in degrees, and the finer step of the shift key. */
const COARSE_STEP = 5;
const FINE_STEP = 1;

/** The radius of a touch, as the fraction of the sensor height TUIO 2.0 asks for. */
const POINTER_RADIUS = 0.02;

/** The object ids the picker of the right double click offers. */
const PICKER_IDS = 16;

/** How close in time and in pixels two right clicks are one right double click. */
const DOUBLE_MS = 500;
const DOUBLE_PX = 16;

/**
 * Where an application reaches the tracker when it came through the same server as this page:
 * the development server of the table proxies this path to the tracker, so the application, its
 * models and the tracker are one address and one forwarded port.
 */
const TRACKER_PATH = "/tuio";

/**
 * What the table under the surface calls its objects. The application posts what it reads on
 * every change, so the surface can draw an object as the thing it stands for and say what the
 * table made of the last turn.
 */
const MIRROR_SOURCE = "pkpdsim-tui";

/** How far a touch travels before it is a finger moving and not a finger at rest, in pixels. */
const DRAG_PX = 6;

/** How many actions the rail keeps. */
const HISTORY = 60;

/** Where the page keeps what was typed into it, so a reload is not a fresh start. */
const STORE_KEY = "pkpdsim-tui-simulator";

const SVG_NS = "http://www.w3.org/2000/svg";

const stage = document.getElementById("stage");
const surfaceBox = document.getElementById("surface");
const frame = document.getElementById("frame");
const table = document.getElementById("table");
const tokenLayer = document.getElementById("tokens");
const pointerLayer = document.getElementById("pointers");
const statusBox = document.getElementById("status");
const statusText = document.getElementById("status-text");
const counts = document.getElementById("counts");
const markerField = document.getElementById("marker");
const widthField = document.getElementById("width");
const heightField = document.getElementById("height");
const versionField = document.getElementById("version");
const transportField = document.getElementById("transport");
const portField = document.getElementById("port");
const appField = document.getElementById("app");
const picker = document.getElementById("picker");
const pickerGrid = document.getElementById("picker-grid");
const historyList = document.getElementById("history");
const historyEmpty = document.getElementById("history-empty");

const sensor = {...DEFAULT_SENSOR};
const tokens = new Map();
const pointers = new Map();
const rendered = new Map();
/** What the table under the surface says about each object, by the id of the object. */
let mirror = new Map();
/** The entry of the history which the next one of the same kind is folded into. */
let folding = null;

let settings = {...DEFAULT_SETTINGS};
let sessions = new Map();
let tracker = {source: "", description: "", trackers: null, frameId: 0, rate: 0, trouble: ""};
let named = 0;
let drag = null;
let box = {width: 1, height: 1};
let available = {width: 1, height: 1};
let pending = 0;
let socket = null;
let retry = null;
let lastContext = {at: 0, x: 0, y: 0};
let appUrl = "";

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

/** The position of an event on the surface, as the fractions of the sensor TUIO sends. */
function positionOf(event) {
  const bounds = table.getBoundingClientRect();
  return {
    x: clamp((event.clientX - bounds.left) / bounds.width),
    y: clamp((event.clientY - bounds.top) / bounds.height),
  };
}

function markerOf() {
  const value = Number.parseInt(markerField.value, 10);
  return Number.isInteger(value) && value >= 1 ? value : 1;
}

/** The id the next object gets, which counts up as objects are placed. */
function setMarker(value) {
  // The objects of a table are numbered from one: the first puck a visitor puts down is 1, and
  // every table of this repository reads 1 and upwards.
  markerField.value = String(Math.max(1, Math.min(999, value)));
}

/* What the page keeps between reloads: what was typed, never what is on the surface. */

function remember() {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify({settings, app: appUrl, sensor}));
  } catch {
    // A page in private mode keeps nothing, which costs it nothing.
  }
}

function recall() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORE_KEY) ?? "null");
    if (stored === null) return;
    settings = normalizeSettings(stored.settings, DEFAULT_SETTINGS);
    appUrl = typeof stored.app === "string" ? stored.app : "";
    const size = clampSensor(stored.sensor ?? DEFAULT_SENSOR);
    sensor.width = size.width;
    sensor.height = size.height;
  } catch {
    // Anything unreadable is the default, which is always a working simulator.
  }
}

/* What has happened, in the rail: every action of the surface, and what the table made of it. */

function clockOf(date = new Date()) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
    + `:${String(date.getSeconds()).padStart(2, "0")}`;
}

/**
 * One line of the history. `fold` is a name under which repeated actions become one line that
 * is rewritten, so that turning an object does not bury everything else.
 */
function note(kind, text, fold = "") {
  if (fold !== "" && folding !== null && folding.fold === fold) {
    folding.text.textContent = text;
    folding.time.textContent = clockOf();
    return;
  }
  const item = document.createElement("li");
  item.dataset.kind = kind;
  const time = document.createElement("span");
  time.className = "history-time";
  time.textContent = clockOf();
  const body = document.createElement("span");
  body.className = "history-text";
  body.textContent = text;
  item.append(time, body);
  historyList.prepend(item);
  while (historyList.childElementCount > HISTORY) historyList.lastElementChild.remove();
  historyEmpty.hidden = true;
  folding = fold === "" ? null : {fold, text: body, time};
}

function forget() {
  historyList.replaceChildren();
  historyEmpty.hidden = false;
  folding = null;
}

/** What an object is called by the table under the surface, or its number alone. */
function nameOf(marker) {
  const object = mirror.get(marker);
  return object === undefined || object.kind === "unassigned"
    ? `Object ${marker}`
    : `Object ${marker} ${object.title}`;
}

/** Where a position on the surface is, in the per cents a person can point at. */
function spotOf(position) {
  return `${Math.round(position.x * 100)}%, ${Math.round(position.y * 100)}%`;
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

/** What the tracker should speak and where, which only the simulator can really answer. */
function sendSettings() {
  settings = normalizeSettings({
    version: versionField.value,
    transport: transportField.value,
    port: Number.parseInt(portField.value, 10),
    host: settings.host,
  }, settings);
  portField.value = String(settings.port);
  remember();
  if (socket === null || socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify({type: "settings", settings}));
}

function addToken(position, marker = markerOf()) {
  named += 1;
  const key = `token-${named}`;
  tokens.set(key, {key, marker, x: position.x, y: position.y, angle: 0});
  // The field names the next object, so placing one counts it up, as the Unity simulator does.
  setMarker(marker + 1);
  note("place", `${nameOf(marker)} put down at ${spotOf(position)}`);
  publish();
}

function addPointer(position) {
  named += 1;
  const key = `pointer-${named}`;
  pointers.set(key, {
    key, x: position.x, y: position.y, radius: POINTER_RADIUS, press: 0.5, kind: "hold",
  });
  publish();
  return key;
}

function turnToken(key, degrees) {
  const token = tokens.get(key);
  if (token === undefined) return;
  token.angle = wrapAngle(token.angle + radiansOf(degrees));
  note("turn", `${nameOf(token.marker)} turned to ${degreesOf(token.angle).toFixed(0)}°`,
    `turn:${key}`);
  publish();
}

/* What the table under the surface says about the objects on it. */

/**
 * The table posts what it reads whenever it changes, and the surface takes it as the names and
 * the pictures of its objects. A change of a value is the answer of the table to the last turn,
 * so it goes into the history: the surface says what was done, the table says what came of it.
 */
function takeMirror(message) {
  const next = new Map();
  for (const object of Array.isArray(message.objects) ? message.objects : []) {
    if (typeof object?.marker !== "number") continue;
    next.set(object.marker, object);
  }
  for (const [marker, object] of next) {
    const before = mirror.get(marker);
    if (object.kind === "unassigned") {
      if (before === undefined) note("reading", `${nameOf(marker)} reads nothing on this table`);
      continue;
    }
    if (before !== undefined && before.value === object.value && before.title === object.title) {
      continue;
    }
    const tail = object.note === "" ? "" : ` · ${object.note}`;
    note("reading", `${object.title} ${object.value}${tail}`, `reading:${marker}`);
  }
  mirror = next;
  render();
}

window.addEventListener("message", event => {
  const message = event.data;
  if (message === null || typeof message !== "object") return;
  if (message.source !== MIRROR_SOURCE) return;
  // Only the table which is under this surface says what is on it.
  if (frame.contentWindow !== null && event.source !== frame.contentWindow) return;
  if (message.type === "objects") takeMirror(message);
});

/** A table which has just been put under the surface is asked what is already on it. */
function greetApp() {
  frame.contentWindow?.postMessage({source: MIRROR_SOURCE, type: "hello"}, "*");
}

frame.addEventListener("load", () => {
  mirror = new Map();
  greetApp();
  render();
});

/* The application under the surface. */

/**
 * The address the embedded application is opened at: the one that was typed, pointed at this
 * tracker. Over UDP it is opened as it is, because a browser cannot receive a datagram and the
 * application drives itself with the mouse instead.
 */
function appAddress(raw) {
  const url = new URL(raw, window.location.href);
  if (settings.transport === "websocket") {
    // An application on the origin of this page came through the same server as the page, which
    // carries the tracker at `TRACKER_PATH`: one port serves the table and the surface that
    // drives it. An application somewhere else is given the host and the port of the tracker.
    const sameServer = url.origin === window.location.origin;
    url.searchParams.set(
      "tuio", sameServer ? TRACKER_PATH : `${window.location.hostname}:${settings.port}`);
    if (settings.version === "2.0") url.searchParams.delete("tuio-version");
    else url.searchParams.set("tuio-version", settings.version);
    // A colon, a slash and a comma are legal in a query and are what a person reads, so the
    // address of the tracker and the ids of the markers stay readable in the address bar of the
    // application.
    url.search = url.searchParams.toString()
      .replaceAll("%3A", ":").replaceAll("%2F", "/").replaceAll("%2C", ",");
  }
  return url.href;
}

function showApp(raw) {
  const address = raw.trim();
  if (address === "") {
    hideApp();
    return;
  }
  let href = "";
  try {
    href = appAddress(address);
  } catch {
    setStatus("error", `"${address}" is not an address.`);
    return;
  }
  appUrl = address;
  appField.value = address;
  note("app", `The table under the surface is ${address}`);
  frame.src = href;
  frame.hidden = false;
  surfaceBox.classList.add("has-app");
  remember();
}

function hideApp() {
  appUrl = "";
  frame.removeAttribute("src");
  frame.hidden = true;
  surfaceBox.classList.remove("has-app");
  remember();
}

/* The surface itself. */

function tokenNode(key) {
  const group = element("g", {class: "token", "data-key": key, role: "img"});
  const body = element("circle", {class: "token-body", r: 1});
  const dial = element("g", {class: "token-dial"});
  const notch = element("line", {class: "token-notch", x1: 0, y1: 0, x2: 0, y2: 0});
  const grip = element("circle", {class: "token-grip", cx: 0, cy: 0, r: 1});
  dial.append(notch, grip);
  // The picture of the object turns with it, as a print on a wooden token would.
  const face = element("g", {class: "token-face"});
  const glyph = createGlyph(face);
  // The number of the object is printed at its foot, where the picture does not cover it.
  const badge = element("circle", {class: "token-badge", cx: 0, cy: 0, r: 1});
  const marker = element("text", {class: "token-marker", y: 0});
  const name = element("text", {class: "token-name", y: 0});
  const value = element("text", {class: "token-value", y: 0});
  const readout = element("text", {class: "token-readout", y: 0});
  group.append(body, dial, face, badge, marker, name, value, readout);
  tokenLayer.append(group);
  return {group, body, dial, notch, grip, face, glyph, badge, marker, name, value, readout};
}

function pointerNode(key) {
  const group = element("g", {class: "pointer", "data-key": key, "data-kind": "hold"});
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
    const reading = mirror.get(token.marker);
    const known = reading !== undefined && reading.kind !== "unassigned";
    node.group.setAttribute(
      "transform",
      `translate(${(token.x * box.width).toFixed(2)} ${(token.y * box.height).toFixed(2)})`,
    );
    node.group.dataset.kind = reading === undefined ? "unknown" : reading.kind;
    node.body.setAttribute("r", String(radius));
    node.dial.setAttribute("transform", `rotate(${degrees.toFixed(2)})`);
    node.notch.setAttribute("y1", String(-radius * 0.2));
    node.notch.setAttribute("y2", String(-radius * 0.92));
    node.grip.setAttribute("cy", String(-radius * 0.92));
    node.grip.setAttribute("r", String(radius * 0.12));
    // The picture of the object fills the ring and turns with it; the number steps aside for it.
    node.face.setAttribute("transform", `rotate(${degrees.toFixed(2)})`);
    node.glyph.update(known ? reading.glyph : undefined, radius / 36);
    const picture = known && reading.glyph !== undefined && reading.glyph !== null;
    node.badge.setAttribute("opacity", picture ? "1" : "0");
    node.badge.setAttribute("cy", String(radius * 0.74));
    node.badge.setAttribute("r", String(radius * 0.32));
    node.marker.setAttribute("y", String(picture ? radius * 0.87 : radius * 0.22));
    node.marker.setAttribute("font-size", String(picture ? radius * 0.4 : radius * 0.62));
    node.marker.textContent = String(token.marker);
    // What the object is and what it is set to, under it and upright: the table is read from
    // one side, and a label at an angle reads as a mistake. The card of the table itself stands
    // above the object, so the two do not sit on each other.
    const lines = known ? 3 : 1;
    const below = token.y * box.height + radius + 16 * lines + 8 < box.height;
    const first = below ? radius + 17 : -radius - 9 - 16 * (lines - 1);
    node.name.setAttribute("y", String(first));
    node.name.textContent = known ? reading.title : "";
    node.value.setAttribute("y", String(known ? first + 16 : first));
    node.value.textContent = known ? reading.value : "";
    node.readout.setAttribute("y", String(known ? first + 32 : first));
    node.readout.textContent = `${degrees.toFixed(0)}° · `
      + `<${token.x.toFixed(3)}, ${token.y.toFixed(3)}>`
      + (session === undefined ? "" : ` · s${session}`);
    // The surface is a picture, so every token says what it is.
    node.group.setAttribute("aria-label", known
      ? `Object ${token.marker}, ${reading.title}, ${reading.value}, ${node.readout.textContent}`
      : `Object ${token.marker}, ${node.readout.textContent}`);
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
    node.group.dataset.kind = pointer.kind ?? "hold";
    node.halo.setAttribute("r", String(pointer.radius * box.height));
    node.core.setAttribute("r", String(clamp(radius * 0.18, 4, 9)));
  }
  const touches = pointers.size === 1 ? "1 touch" : `${pointers.size} touches`;
  const objects = tokens.size === 1 ? "1 object" : `${tokens.size} objects`;
  counts.textContent = `${objects} · ${touches} · frame ${tracker.frameId} · ${tracker.rate} Hz`;
}

/**
 * The surface on screen, which keeps the aspect ratio of the sensor: a position on the page is
 * then the position a table application draws, and a token is not an ellipse. The application
 * under it is laid out at the size of the sensor and scaled to the same box, so what is on
 * screen is the table, shrunk.
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
  surfaceBox.style.width = `${box.width}px`;
  surfaceBox.style.height = `${box.height}px`;
  table.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
  frame.style.width = `${sensor.width}px`;
  frame.style.height = `${sensor.height}px`;
  frame.style.transform = `scale(${box.width / sensor.width})`;
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
  remember();
}

/* The picker of the right double click, which places an object that is not the next one. */

function openPicker(event, position) {
  pickerGrid.replaceChildren();
  for (let id = 1; id <= PICKER_IDS; id += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = String(id);
    if (id === markerOf()) button.classList.add("next");
    button.addEventListener("click", () => {
      closePicker();
      addToken(position, id);
    });
    pickerGrid.append(button);
  }
  const bounds = stage.getBoundingClientRect();
  picker.hidden = false;
  const width = picker.offsetWidth;
  const height = picker.offsetHeight;
  const x = clamp(event.clientX - bounds.left + 8, 8, Math.max(8, bounds.width - width - 8));
  const y = clamp(event.clientY - bounds.top + 8, 8, Math.max(8, bounds.height - height - 8));
  picker.style.left = `${x}px`;
  picker.style.top = `${y}px`;
  pickerGrid.firstElementChild?.focus();
}

function closePicker() {
  picker.hidden = true;
}

/* The gestures. */

function tokenKeyOf(target) {
  const group = target instanceof Element ? target.closest(".token") : null;
  return group === null ? null : group.getAttribute("data-key");
}

/**
 * A click on the glass is a tap, and a tap has to last: a table takes a finger as a choice when
 * it has rested on something for a moment, so a touch which is released at once stays on the
 * surface until `TAP_HOLD` has passed. Holding the button down is still a finger at rest, and
 * dragging is still a finger moving.
 */
const TAP_MS = 250;
const TAP_HOLD = 700;
/** The taps which are still on the surface, so that placing an object can clear them. */
const taps = new Map();

function dropTaps() {
  for (const [key, timer] of taps) {
    window.clearTimeout(timer);
    pointers.delete(key);
  }
  taps.clear();
}

table.addEventListener("pointerdown", event => {
  if (!event.isPrimary && event.pointerType === "mouse") return;
  closePicker();
  const key = tokenKeyOf(event.target);
  if (event.button === 1) {
    // The middle button lifts a token off the table, as it does in the Unity simulator.
    event.preventDefault();
    if (key !== null) {
      const lifted = tokens.get(key);
      tokens.delete(key);
      if (lifted !== undefined) note("lift", `${nameOf(lifted.marker)} taken off the table`);
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
    drag = {
      kind: "token", key, dx: token.x - position.x, dy: token.y - position.y, moved: false,
    };
  } else {
    drag = {
      kind: "pointer", key: addPointer(position), dx: 0, dy: 0, at: event.timeStamp,
      from: position, moved: false,
    };
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
  if (drag.kind === "pointer") {
    // A finger which has travelled is a finger moving across the glass, and no longer one at
    // rest. The two are different things to a table, so they are different colours here.
    const far = Math.hypot(
      (position.x - drag.from.x) * box.width, (position.y - drag.from.y) * box.height) > DRAG_PX;
    if (far) {
      drag.moved = true;
      object.kind = "drag";
    }
  } else {
    drag.moved = true;
  }
  publish();
});

function endDrag(event) {
  if (drag === null) return;
  const ended = drag;
  drag = null;
  if (ended.kind !== "pointer") {
    const token = tokens.get(ended.key);
    if (ended.moved && token !== undefined) {
      note("move", `${nameOf(token.marker)} moved to ${spotOf(token)}`, `move:${ended.key}`);
    }
    publish();
    return;
  }
  // A touch exists for as long as the button is down, which is what a finger does, except for
  // a tap: that one is held a moment longer, so that a table can take it as a choice.
  const held = (event?.timeStamp ?? 0) - ended.at;
  const touch = pointers.get(ended.key);
  const where = touch === undefined ? "" : ` at ${spotOf(touch)}`;
  if (event === undefined || held > TAP_MS) {
    note(ended.moved ? "drag" : "hold",
      ended.moved ? `Finger dragged${where}` : `Finger held${where} for ${Math.round(held)} ms`);
    pointers.delete(ended.key);
    publish();
    return;
  }
  // A tap is held on the glass a moment longer, so the table can take it as a choice, and it
  // is a tap from now on: a different thing from a finger at rest, and a different colour.
  if (touch !== undefined) touch.kind = "tap";
  note("tap", `Tap${where}`);
  const key = ended.key;
  taps.set(key, window.setTimeout(() => {
    taps.delete(key);
    pointers.delete(key);
    publish();
  }, TAP_HOLD - held));
  publish();
}

// Only a release is a tap: a cancelled or lost pointer is a touch which went away.
table.addEventListener("pointerup", event => endDrag(event));
table.addEventListener("pointercancel", () => endDrag());
table.addEventListener("lostpointercapture", () => endDrag());

table.addEventListener("dblclick", event => {
  if (event.button !== 0) return;
  // A double click on a token is not a second token on top of it.
  if (tokenKeyOf(event.target) !== null) return;
  event.preventDefault();
  // The two clicks which placed the object are not two taps on the table as well.
  dropTaps();
  addToken(positionOf(event));
});

table.addEventListener("wheel", event => {
  const key = tokenKeyOf(event.target);
  if (key === null) return;
  event.preventDefault();
  const step = event.shiftKey ? FINE_STEP : COARSE_STEP;
  turnToken(key, event.deltaY < 0 ? step : -step);
}, {passive: false});

/**
 * The right button opens the picker on the second click, because the first one is how a context
 * menu is asked for and the menu is in the way of a surface. A right double click on a token is
 * not a second token on top of it, as a left one is not.
 */
table.addEventListener("contextmenu", event => {
  event.preventDefault();
  const at = event.timeStamp;
  const near = Math.abs(event.clientX - lastContext.x) < DOUBLE_PX
    && Math.abs(event.clientY - lastContext.y) < DOUBLE_PX;
  const double = at - lastContext.at < DOUBLE_MS && near;
  lastContext = {at: double ? 0 : at, x: event.clientX, y: event.clientY};
  if (!double || tokenKeyOf(event.target) !== null) return;
  openPicker(event, positionOf(event));
});

table.addEventListener("auxclick", event => event.preventDefault());

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closePicker();
});

document.addEventListener("pointerdown", event => {
  if (!picker.hidden && !picker.contains(event.target)) closePicker();
}, true);

markerField.addEventListener("change", () => {
  setMarker(markerOf());
});

for (const field of [widthField, heightField]) {
  field.addEventListener("change", () => {
    sensor.width = Number.parseInt(widthField.value, 10);
    sensor.height = Number.parseInt(heightField.value, 10);
    resize();
  });
}

for (const field of [versionField, transportField, portField]) {
  field.addEventListener("change", () => {
    sendSettings();
    // The embedded application connects itself, so a tracker it cannot reach is a reload.
    if (appUrl !== "") showApp(appUrl);
  });
}

document.getElementById("load").addEventListener("click", () => showApp(appField.value));
document.getElementById("unload").addEventListener("click", hideApp);
appField.addEventListener("change", () => showApp(appField.value));

document.getElementById("clear").addEventListener("click", () => {
  dropTaps();
  tokens.clear();
  pointers.clear();
  drag = null;
  note("clear", "The surface was cleared");
  publish();
});

document.getElementById("forget").addEventListener("click", forget);

/* The surface alone, for a demonstration: the stage carries the table and the picker. */
const fullscreenButton = document.getElementById("fullscreen");

function fullscreenLabel() {
  fullscreenButton.textContent = document.fullscreenElement === null
    ? "Full screen"
    : "Leave full screen";
}

fullscreenButton.addEventListener("click", () => {
  if (document.fullscreenElement === null) void stage.requestFullscreen?.();
  else void document.exitFullscreen?.();
});
document.addEventListener("fullscreenchange", () => {
  fullscreenLabel();
  // The surface is laid out for the room it has, which the screen has just changed.
  fit();
});
fullscreenLabel();

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
  if (tracker.trouble !== "") {
    setStatus("error", tracker.trouble);
    return;
  }
  if (tracker.trackers === null) {
    // Nothing connects to a sender, so a UDP tracker cannot say who is there.
    setStatus("ready", `${tracker.description} · sending, whoever listens`);
    return;
  }
  if (tracker.trackers === 0) {
    setStatus("waiting", `${tracker.description} · no application is listening`);
    return;
  }
  const applications = tracker.trackers === 1 ? "1 application" : `${tracker.trackers} applications`;
  setStatus("ready", `${tracker.description} · ${applications}`);
}

function connect() {
  const url = new URL("control", window.location.href);
  url.protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(url);
  socket.addEventListener("open", () => {
    setStatus("connecting", "Waiting for the first frame...");
    sendSettings();
    send();
  });
  socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    if (message.type !== "status") return;
    tracker = {
      source: message.source, description: message.description, trackers: message.trackers,
      frameId: message.frameId, rate: message.rate, trouble: message.trouble ?? "",
    };
    settings = normalizeSettings(message.settings, settings);
    versionField.value = settings.version;
    transportField.value = settings.transport;
    if (document.activeElement !== portField) portField.value = String(settings.port);
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

/**
 * The application the address of this page asks for: `?table=cardiovascular` is a table of the
 * application beside this page, and anything which looks like an address is taken as one.
 */
/**
 * The ids of the markers of a table travel with the table: a surface which is driving the pucks
 * of a real table is set to their ids, and the application under it reads the same list, so the
 * mapping of a table can be tried before the table itself is there.
 */
function withIds(address) {
  const ids = new URL(window.location.href).searchParams.get("ids");
  if (ids === null || !/^\d+(,\d+)*$/u.test(ids) || address.includes("ids=")) return address;
  return `${address}${address.includes("?") ? "&" : "?"}ids=${ids}`;
}

function wantedApp() {
  const wanted = new URL(window.location.href).searchParams.get("table");
  if (wanted === null || wanted.trim() === "") return "";
  const value = wanted.trim();
  // A table of this server, by its id or by its path. An address of somewhere else is not taken
  // from the address bar, because a link somebody was sent would then open a page of its
  // choosing inside this one; the field above the surface still takes any address, which is a
  // table somebody typed in rather than one that was handed to them.
  if (value.startsWith("/")) return withIds(value);
  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const url = new URL(value);
      return url.origin === window.location.origin ? withIds(`${url.pathname}${url.search}`) : "";
    } catch {
      return "";
    }
  }
  return withIds(value === "overview" ? "/" : `/?app=${encodeURIComponent(value)}`);
}

recall();
versionField.value = settings.version;
transportField.value = settings.transport;
portField.value = String(settings.port);
const asked = wantedApp();
if (asked !== "") appUrl = asked;
appField.value = appUrl;
setMarker(1);
resize();
if (appUrl !== "") showApp(appUrl);
connect();

// The page is a tool, so what it knows is reachable from the console.
window.simulator = {tokens, pointers, sensor, settings, addToken, addPointer, turnToken, publish, showApp};
