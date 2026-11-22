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
  AGE_RANGE, clampAge, clampWeight, individualOf, referenceBody, weightRange,
} from "@pkpdsim-tui/cardio-sim";
import type {Individual, Sex} from "@pkpdsim-tui/cardio-sim";
import {openTableInput} from "@pkpdsim-tui/tuio-input";
import {bodyName, pictogram, sayHtml, sayLabel} from "@pkpdsim-tui/tui-kit";
import type {Voice} from "@pkpdsim-tui/tui-kit";
import {HUB_TEXT} from "./text.ts";

/** How long a finger rests on a card before it is pressed, as everywhere else on a table. */
const PRESS = 620;

/** The address this table carries the person in. */
export const PERSON_KEYS = ["age", "sex", "bw"] as const;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  }[character] ?? character));
}

/** Who the address says is at the table, with the reference adult where it says nothing. */
export function personOf(parameters: URLSearchParams): Individual {
  const sex: Sex = parameters.get("sex") === "male" ? "male" : "female";
  const age = Number(parameters.get("age") ?? AGE_RANGE.value);
  const weight = parameters.get("bw");
  return individualOf(
    Number.isFinite(age) ? age : AGE_RANGE.value,
    sex,
    weight === null || !Number.isFinite(Number(weight)) ? undefined : Number(weight),
  );
}

/** The person in the address, so that every table opened from here is solved for them. */
export function writePerson(parameters: URLSearchParams, person: Individual): void {
  parameters.set("age", String(person.age));
  parameters.set("sex", person.sex);
  parameters.set("bw", String(person.weight));
}

/** The person in words: a woman of thirty-five years and sixty kilograms. */
export function personLine(voice: Voice, person: Individual): string {
  const copy = voice.pick(HUB_TEXT).person;
  const body = bodyName(voice, person.sex, person.age);
  return `${body}, ${Math.round(person.age)} ${copy.years}, ${person.weight.toFixed(1)} kg`;
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
  let weight = clampWeight(start.weight, age, sex);

  const ageDial: DialOptions = {
    id: "age", label: text.age, unit: text.years, info: text.ageInfo,
    min: AGE_RANGE.min, max: AGE_RANGE.max, step: 1,
  };
  const weightDial = (): DialOptions => {
    const range = weightRange(age, sex);
    return {
      id: "weight", label: text.weight, unit: "kg", info: text.weightInfo,
      min: range.min, max: range.max, step: 0.5, reference: referenceBody(age, sex).weight,
    };
  };

  // The two bodies, named for the age which is set: a body of eight years is a girl or a boy.
  const bodyPick = (value: Sex): string =>
    `<button class="welcome-pick welcome-pick--body" type="button" data-choice="${value}"`
    + ` data-dwell="person:${value}" aria-pressed="${value === sex}">`
    + `${pictogram(value === "female" ? "woman" : "man")}`
    + `<span class="welcome-pick-label">`
    + `${escapeHtml(bodyName(voice, value, age))}</span></button>`;

  const note = voice.say(text.note);
  root.innerHTML = `<div class="welcome-card welcome-card--person">`
    + `<h1 class="welcome-title">${escapeHtml(copy.heading)}</h1>`
    + `<div class="welcome-question"><h2 class="welcome-ask">${escapeHtml(text.ask)}</h2>`
    + `${sayHtml(`${text.ask} ${note}`, sayLabel(voice))}</div>`
    + `<p class="welcome-note">${escapeHtml(note)}</p>`
    + `<div class="welcome-row welcome-row--bodies">`
    + `${bodyPick("female")}${bodyPick("male")}</div>`
    + `<div class="dials">${dialHtml(ageDial)}${dialHtml(weightDial())}</div>`
    + `<p class="person-body"></p>`
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
        mark.title = `${options.reference.toFixed(1)} kg ${text.reference}`;
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
    for (const pick of root.querySelectorAll(".welcome-pick--body")) {
      const value = (pick as HTMLElement).dataset["choice"];
      pick.setAttribute("aria-pressed", String(value === sex));
      const label = pick.querySelector(".welcome-pick-label");
      if (label !== null && (value === "female" || value === "male")) {
        label.textContent = bodyName(voice, value, age);
      }
    }
    const line = root.querySelector(".person-body");
    if (line !== null) {
      line.textContent = `${text.height} ${referenceBody(age, sex).height} cm`;
    }
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
      age = clampAge(valueAt(ageDial, track, x));
      // The weight belongs to the age: a body of four years does not keep the sixty kilograms
      // of the adult it was a moment ago, so the dial follows to the reference of the new age.
      weight = referenceBody(age, sex).weight;
    } else if (id === "weight") {
      weight = clampWeight(valueAt(weightDial(), track, x), age, sex);
    } else {
      return;
    }
    draw();
  };

  draw();

  return new Promise<Individual>(resolve => {
    let stop = (): void => undefined;
    const done = (): void => {
      stop();
      root.remove();
      resolve(individualOf(age, sex, weight));
    };

    const take = (choice: string): void => {
      if (choice === "ready") {
        done();
        return;
      }
      if (choice !== "female" && choice !== "male") return;
      sex = choice;
      // The body of a woman and the body of a man weigh different things at the same age.
      weight = referenceBody(age, sex).weight;
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

    // The fingers of the table: a card is pressed by resting on it, and a line is set by
    // touching it anywhere, which is the gesture of a dial and not of a button.
    void openTableInput({parameters, element: root, markers: []}).then(source => {
      const {input} = source;
      const resting = new Map<number, {key: string; since: number; fired: boolean}>();
      let armed: Element | undefined;
      let running = true;
      const arm = (element: Element | undefined): void => {
        if (armed === element) return;
        armed?.removeAttribute("data-arming");
        element?.setAttribute("data-arming", "true");
        armed = element;
      };
      const watch = (now: number): void => {
        if (!running) return;
        window.requestAnimationFrame(watch);
        const held = new Set<number>();
        let filling: Element | undefined;
        for (const pointer of input.snapshot.pointers.values()) {
          const x = pointer.x * window.innerWidth;
          const target = document.elementFromPoint(x, pointer.y * window.innerHeight);
          const track = target?.closest?.("[data-dial-track]");
          if (track !== null && track !== undefined) {
            setFrom(track, x);
            continue;
          }
          const pick = target?.closest?.(".welcome-pick");
          if (!(pick instanceof HTMLElement)) continue;
          const key = pick.dataset["choice"] ?? "";
          held.add(pointer.sessionId);
          const seen = resting.get(pointer.sessionId);
          if (seen === undefined || seen.key !== key) {
            resting.set(pointer.sessionId, {key, since: now, fired: false});
            filling = pick;
          } else if (!seen.fired && now - seen.since >= PRESS) {
            seen.fired = true;
            take(key);
          } else if (!seen.fired) {
            filling = pick;
          }
        }
        for (const id of [...resting.keys()]) {
          if (!held.has(id)) resting.delete(id);
        }
        arm(filling);
      };
      stop = (): void => {
        running = false;
        arm(undefined);
        input.disconnect();
      };
      input.connect();
      window.requestAnimationFrame(watch);
    });
  });
}
