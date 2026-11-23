/**
 * Who the tables are about: the third question of the first screen, and the one page a visitor
 * can walk back into at any time.
 *
 * A model of the body is a model of somebody. The collection used to show the reference adult
 * of the library and nothing else, so a child at the glass watched a seventy-three kilogram man
 * being simulated. Here a visitor sets an age between four and a hundred and twenty years, a
 * body, and what that body weighs; the reference body of that age carries the height with it,
 * and every table of the collection is solved for those numbers.
 *
 * The screen is dragged rather than pressed: an age is one of a hundred and sixteen values and
 * a row of buttons for that is a wall. A line with a knob is set by a finger anywhere on it,
 * which is the one gesture on these tables that is not a press, and which needs no instruction
 * because the knob follows the finger from the first moment.
 */

import {
  AGE_RANGE, clampAge, clampHeight, clampWeight, figureScale, HEIGHT_RANGE, individualOf,
  loadAnatomy, referenceBody, WEIGHT_RANGE,
} from "@pkpdsim-tui/cardio-sim";
import type {Individual, Sex} from "@pkpdsim-tui/cardio-sim";
import {openTableInput} from "@pkpdsim-tui/tuio-input";
import {
  bodyName, createPress, pictogram, pointerPoints, sayHtml, sayLabel,
} from "@pkpdsim-tui/tui-kit";
import type {Voice} from "@pkpdsim-tui/tui-kit";
import {HUB_TEXT} from "./text.ts";

/** How tall a grown up stands on this screen, in pixels, and the height the two are drawn at. */
const FIGURE = {height: 180, adult: 35} as const;

/** The address this table carries the person in. */
export const PERSON_KEYS = ["age", "sex", "bw", "height"] as const;

/**
 * The age the screen opens at, by who said they were looking. A visitor who answered that a
 * child is at the table is shown a child: the question before this one has already been
 * answered, and asking a ten year old to drag the age down from thirty-five is asking them to
 * undo it. A grown up and somebody of the field open at the reference adult of the library.
 * The weight and the height follow from the age, as the reference body of that age has them,
 * until a dial is moved.
 */
export const CHILD_AGE = 10;

export function startingAge(parameters: URLSearchParams): number {
  return parameters.get("level") === "child" ? CHILD_AGE : AGE_RANGE.value;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  }[character] ?? character));
}

/** Who the address says is at the table, with the reference adult where it says nothing. */
export function personOf(parameters: URLSearchParams): Individual {
  const sex: Sex = parameters.get("sex") === "male" ? "male" : "female";
  const start = startingAge(parameters);
  const age = Number(parameters.get("age") ?? start);
  const weight = parameters.get("bw");
  const height = parameters.get("height");
  return individualOf(
    Number.isFinite(age) ? age : start,
    sex,
    weight === null || !Number.isFinite(Number(weight)) ? undefined : Number(weight),
    height === null || !Number.isFinite(Number(height)) ? undefined : Number(height),
  );
}

/** The person in the address, so that every table opened from here is solved for them. */
export function writePerson(parameters: URLSearchParams, person: Individual): void {
  parameters.set("age", String(person.age));
  parameters.set("sex", person.sex);
  parameters.set("bw", String(person.weight));
  parameters.set("height", String(person.height));
}

/** The person in words: a woman of thirty-five years and sixty kilograms. */
export function personLine(voice: Voice, person: Individual): string {
  const copy = voice.pick(HUB_TEXT).person;
  const body = bodyName(voice, person.sex, person.age);
  return `${body}, ${Math.round(person.age)} ${copy.years}, ${person.weight.toFixed(1)} kg,`
    + ` ${Math.round(person.height)} cm`;
}

interface DialOptions {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  readonly info: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  /** Where the reference of this dial sits, which the track marks. */
  readonly reference?: number;
}

function dialHtml(dial: DialOptions): string {
  return `<div class="dial" data-dial="${escapeHtml(dial.id)}">`
    + `<div class="dial-head">`
    + `<span class="dial-name">${escapeHtml(dial.label)}</span>`
    + `<span class="dial-value"></span></div>`
    + `<div class="dial-track" data-dial-track="${escapeHtml(dial.id)}"`
    + ` data-info="${escapeHtml(dial.info)}" role="slider" tabindex="0"`
    + ` aria-label="${escapeHtml(dial.label)}">`
    + `<div class="dial-fill"></div><div class="dial-mark" hidden></div>`
    + `<div class="dial-knob"></div></div>`
    + `<div class="dial-ends"><span class="dial-min"></span><span class="dial-max"></span></div>`
    + `</div>`;
}

/**
 * Asks who is at the table and resolves with them. The screen is a layer over the surface, as
 * the two questions before it are, and reads the fingers of the table itself.
 */
export function askPerson(
  container: HTMLElement, parameters: URLSearchParams, voice: Voice, start: Individual,
): Promise<Individual> {
  const copy = voice.pick(HUB_TEXT);
  const text = copy.person;
  const root = document.createElement("div");
  root.className = "welcome welcome--person";
  container.appendChild(root);

  let age = clampAge(start.age);
  let sex: Sex = start.sex;
  let weight = clampWeight(start.weight);
  let height = clampHeight(start.height);

  const ageDial: DialOptions = {
    id: "age", label: text.age, unit: text.years, info: text.ageInfo,
    min: AGE_RANGE.min, max: AGE_RANGE.max, step: 1,
  };
  // What this body weighs. The dial spans what a body on these tables can weigh, from a small
  // child to a strongly obese adult, and it does not move when the age does: the three numbers
  // of a person are chosen one by one. The mark on it is the reference weight of the chosen
  // age, so a visitor sees what is typical for it without anything moving by itself.
  const weightDial = (): DialOptions => ({
    id: "weight", label: text.weight, unit: "kg", info: text.weightInfo,
    min: WEIGHT_RANGE.min, max: WEIGHT_RANGE.max, step: 0.5,
    reference: referenceBody(age, sex).weight,
  });
  // How tall this body is. It opens at the reference of the age and is then the visitor's to
  // set, because a body of a given age is not one height, and every model of the collection
  // scales its organs from the height as well as from the weight.
  const heightDial = (): DialOptions => ({
    id: "height", label: text.height, unit: "cm", info: text.heightInfo,
    min: HEIGHT_RANGE.min, max: HEIGHT_RANGE.max, step: 1,
    reference: referenceBody(age, sex).height,
  });

  // The two bodies, named for the age which is set: a body of eight years is a girl or a boy.
  // The picture is the body itself, the drawing every table of the collection is solved on,
  // and it stands at the height of that body: the two sexes differ, and both of them grow and
  // shrink with the age dial under them. The pictogram is what is shown until the drawing of
  // the library has been fetched, so the screen is never empty.
  const bodyPick = (value: Sex): string =>
    `<button class="welcome-pick welcome-pick--body" type="button" data-choice="${value}"`
    + ` data-dwell="person:${value}" aria-pressed="${value === sex}">`
    + `<span class="welcome-body" data-sex="${value}">`
    + `${pictogram(value === "female" ? "woman" : "man")}</span>`
    + `<span class="welcome-pick-label">`
    + `${escapeHtml(bodyName(voice, value, age))}</span></button>`;

  const note = voice.say(text.note);
  // Every sentence of the note starts a line of its own: two sentences on one line read as a
  // paragraph, and nobody reads a paragraph while standing at a table.
  const noteHtml = note.split(/(?<=[.!?])\s+/u)
    .map(sentence => `<span class="welcome-line">${escapeHtml(sentence)}</span>`).join("");
  root.innerHTML = `<div class="welcome-card welcome-card--person">`
    + `<h1 class="welcome-title">${escapeHtml(copy.heading)}</h1>`
    + `<div class="welcome-question"><h2 class="welcome-ask">${escapeHtml(text.ask)}</h2>`
    + `${sayHtml(`${text.ask} ${note}`, sayLabel(voice))}</div>`
    + `<p class="welcome-note">${noteHtml}</p>`
    + `<div class="welcome-row welcome-row--bodies">`
    + `${bodyPick("female")}${bodyPick("male")}</div>`
    + `<div class="dials">${dialHtml(ageDial)}${dialHtml(weightDial())}`
    + `${dialHtml(heightDial())}</div>`
    + `<button class="welcome-pick welcome-pick--go" type="button" data-choice="ready"`
    + ` data-dwell="person:ready" data-info="${escapeHtml(text.readyInfo)}">`
    + `<span class="welcome-pick-label">${escapeHtml(text.ready)}</span></button>`
    + `</div>`;

  const dialOf = (id: string): HTMLElement | null =>
    root.querySelector(`.dial[data-dial="${id}"]`);

  /** What a dial shows: its value, how far its knob stands, and where its reference is. */
  const drawDial = (options: DialOptions, value: number): void => {
    const dial = dialOf(options.id);
    if (dial === null) return;
    const span = options.max - options.min;
    const at = span === 0 ? 0 : (value - options.min) / span;
    const shown = options.step < 1 ? value.toFixed(1) : String(Math.round(value));
    const name = dial.querySelector(".dial-value");
    if (name !== null) name.textContent = `${shown} ${options.unit}`;
    const fill = dial.querySelector<HTMLElement>(".dial-fill");
    if (fill !== null) fill.style.width = `${(at * 100).toFixed(2)}%`;
    const knob = dial.querySelector<HTMLElement>(".dial-knob");
    if (knob !== null) knob.style.left = `${(at * 100).toFixed(2)}%`;
    const mark = dial.querySelector<HTMLElement>(".dial-mark");
    if (mark !== null) {
      if (options.reference === undefined || span === 0) {
        mark.hidden = true;
      } else {
        mark.hidden = false;
        mark.style.left = `${(((options.reference - options.min) / span) * 100).toFixed(2)}%`;
        const shown = options.step < 1
          ? options.reference.toFixed(1)
          : String(Math.round(options.reference));
        mark.title = `${shown} ${options.unit} ${text.reference}`;
      }
    }
    const low = dial.querySelector(".dial-min");
    const high = dial.querySelector(".dial-max");
    const ends = (one: number): string =>
      options.step < 1 ? one.toFixed(0) : String(Math.round(one));
    if (low !== null) low.textContent = ends(options.min);
    if (high !== null) high.textContent = ends(options.max);
    const track = dial.querySelector(".dial-track");
    if (track !== null) {
      track.setAttribute("aria-valuemin", String(options.min));
      track.setAttribute("aria-valuemax", String(options.max));
      track.setAttribute("aria-valuenow", shown);
    }
  };

  /** Everything the screen shows of the body which is being put together. */
  const draw = (): void => {
    drawDial(ageDial, age);
    drawDial(weightDial(), weight);
    drawDial(heightDial(), height);
    for (const pick of root.querySelectorAll(".welcome-pick--body")) {
      const value = (pick as HTMLElement).dataset["choice"];
      pick.setAttribute("aria-pressed", String(value === sex));
      const label = pick.querySelector(".welcome-pick-label");
      if (label !== null && (value === "female" || value === "male")) {
        label.textContent = bodyName(voice, value, age);
      }
    }
    // The chosen body stands at the height and the width which are set, the other one at the
    // reference of its age, so the two are compared with each other and the pair grows and
    // broadens with the dials.
    for (const figure of root.querySelectorAll<SVGSVGElement>(".welcome-body-art")) {
      const value = figure.dataset["sex"] === "male" ? "male" : "female";
      const shown = value === sex
        ? individualOf(age, value, weight, height)
        : individualOf(age, value);
      const shape = figureScale(shown, referenceBody(FIGURE.adult, value));
      figure.style.height = `${(FIGURE.height * shape.y).toFixed(1)}px`;
      figure.style.transform = `scaleX(${shape.x.toFixed(3)})`;
    }
  };

  /**
   * The drawing of the library, in place of the pictogram: the same silhouette the body of the
   * landing page is drawn from, one per sex. It is fetched after the screen is up, because the
   * screen is answered with a finger and must be there before it arrives.
   */
  const drawBodies = async (): Promise<void> => {
    const anatomy = await loadAnatomy(
      new URL("assets/cardiovascular/cardiovascular-anatomy.json", document.baseURI));
    for (const value of ["female", "male"] as const) {
      const body = anatomy.bodies[value];
      const slot = root.querySelector(`.welcome-body[data-sex="${value}"]`);
      if (body === undefined || slot === null) continue;
      slot.innerHTML = `<svg class="welcome-body-art" data-sex="${value}"`
        + ` aria-hidden="true"><g>${body.svg}</g></svg>`;
      const figure = slot.querySelector("svg");
      const group = figure?.querySelector("g");
      if (figure === null || figure === undefined || group === null || group === undefined) {
        continue;
      }
      const bounds = group.getBBox();
      figure.setAttribute(
        "viewBox", `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);
    }
    draw();
  };

  /** The value a finger or a pointer at this place of the track stands for. */
  const valueAt = (options: DialOptions, track: Element, x: number): number => {
    const box = track.getBoundingClientRect();
    const at = box.width === 0 ? 0 : Math.min(1, Math.max(0, (x - box.left) / box.width));
    const raw = options.min + at * (options.max - options.min);
    return Math.round(raw / options.step) * options.step;
  };

  const setFrom = (track: Element, x: number): void => {
    const id = (track as HTMLElement).dataset["dialTrack"];
    if (id === "age") {
      // The age is the physiology the body is interpolated from, and nothing else: what the
      // visitor has put on the weight and the height dials stays where they put it.
      age = clampAge(valueAt(ageDial, track, x));
    } else if (id === "weight") {
      weight = clampWeight(valueAt(weightDial(), track, x));
    } else if (id === "height") {
      height = clampHeight(valueAt(heightDial(), track, x));
    } else {
      return;
    }
    draw();
  };

  draw();
  // A body which cannot be fetched leaves the pictogram standing, which answers the question
  // just as well: the screen is never held up by a drawing.
  void drawBodies().catch(() => undefined);

  return new Promise<Individual>(resolve => {
    let stop = (): void => undefined;
    const done = (): void => {
      stop();
      root.remove();
      resolve(individualOf(age, sex, weight, height));
    };

    const take = (choice: string): void => {
      if (choice === "ready") {
        done();
        return;
      }
      if (choice !== "female" && choice !== "male") return;
      sex = choice;
      // What was set stays set: a visitor who has put their own weight and their own height on
      // the dials and then looks at the other body wants the same body, not the reference one.
      draw();
    };

    // The mouse, where there is one: a press on a line sets it, and a drag moves it.
    let dragging: Element | undefined;
    root.addEventListener("pointerdown", event => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const track = target.closest("[data-dial-track]");
      if (track === null) return;
      dragging = track;
      setFrom(track, event.clientX);
      event.preventDefault();
    });
    window.addEventListener("pointermove", event => {
      if (dragging === undefined) return;
      setFrom(dragging, event.clientX);
    });
    window.addEventListener("pointerup", () => {
      dragging = undefined;
    });
    root.addEventListener("click", event => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-say]") !== null) return;
      const pick = target.closest(".welcome-pick");
      if (!(pick instanceof HTMLElement)) return;
      take(pick.dataset["choice"] ?? "");
    });

    // The fingers of the table. A card is pressed by tapping it or by resting on it, as
    // everywhere else, and a line of a dial is set by touching it anywhere, which is the
    // gesture of a dial and not of a button.
    void openTableInput({parameters, element: root, markers: []}).then(source => {
      const {input} = source;
      const press = createPress({
        fingers: () => pointerPoints(input.snapshot),
        onPoint: point => {
          const target = document.elementFromPoint(point.x, point.y);
          const track = target?.closest?.("[data-dial-track]");
          if (track === null || track === undefined) return false;
          setFrom(track, point.x);
          return true;
        },
      });
      stop = (): void => {
        press.stop();
        input.disconnect();
      };
      input.connect();
    });
  });
}
