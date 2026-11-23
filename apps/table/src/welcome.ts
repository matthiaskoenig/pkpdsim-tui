/**
 * What a visitor meets before the tables: the language they read, and how much the tables
 * should say. Two questions, one picture each, in that order, under the heading of the whole
 * collection so that somebody who has just walked up reads what this is before they answer.
 *
 * A table in a museum is walked up to by somebody who was not there a minute ago, so the first
 * screen cannot be in a language they may not read and cannot assume they know what the thing
 * is. The language is asked first, with every option written in its own tongue, and the second
 * question is then asked in the language they just chose. Both answers go into the address, so
 * every table opened from here carries them, and the button which starts again on the landing
 * page drops them and brings this screen back.
 *
 * The screen is pressed the way a table is pressed: with a finger which rests on a card, with
 * the object tracker already connected, and with a mouse where there is one. It therefore reads
 * the surface itself rather than waiting for the table which comes after it.
 */

import {openTableInput} from "@pkpdsim-tui/tuio-input";
import {
  createPress, createVoice, languageOptions, LEVELS, pictogram, pointerPoints, sayHtml, sayLabel,
  words,
} from "@pkpdsim-tui/tui-kit";
import type {Level, Locale} from "@pkpdsim-tui/tui-kit";
import {HUB_TEXT} from "./text.ts";

/** What the two questions answered. */
export interface Welcome {
  readonly locale: Locale;
  readonly level: Level;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  }[character] ?? character));
}

function optionHtml(choice: string, picture: string, label: string, note: string): string {
  return `<button class="welcome-pick" type="button" data-choice="${escapeHtml(choice)}"`
    + ` data-dwell="welcome:${escapeHtml(choice)}">`
    + `${pictogram(picture as Parameters<typeof pictogram>[0])}`
    + `<span class="welcome-pick-label">${escapeHtml(label)}</span>`
    + (note === "" ? "" : `<span class="welcome-pick-note">${escapeHtml(note)}</span>`)
    + `</button>`;
}

/**
 * Asks the two questions and resolves with the answers. The screen is a layer of its own over
 * the surface, so nothing of a table has to know that it was there.
 */
export function askWelcome(
  container: HTMLElement, parameters: URLSearchParams,
): Promise<Welcome> {
  const root = document.createElement("div");
  root.className = "welcome";
  container.appendChild(root);

  /** The heading of the collection, and the question under it, in one language. */
  const askHtml = (locale: Locale, question: string, options: string): string => {
    const voice = createVoice(locale, "adult");
    const copy = HUB_TEXT[locale];
    return `<div class="welcome-card">`
      + `<h1 class="welcome-title">${escapeHtml(copy.heading)}</h1>`
      + `<div class="welcome-question">${question}`
      + `${sayHtml(question.replace(/<[^>]*>/g, " "), sayLabel(voice))}</div>`
      + `<div class="welcome-row">${options}</div></div>`;
  };

  const drawLanguages = (): void => {
    // The first question is asked in every language at once: a visitor who reads none of the
    // others still finds the one line which is theirs. The heading is in the language of the
    // room, which is the first of them.
    const first = languageOptions()[0]?.id ?? "en";
    const heads = languageOptions()
      .map(option => `<span>${escapeHtml(HUB_TEXT[option.id].askLanguage)}</span>`).join("");
    root.innerHTML = askHtml(
      first,
      `<h2 class="welcome-ask welcome-ask--many">${heads}</h2>`,
      languageOptions()
        .map(option => optionHtml(option.id, `flag-${option.id}`, option.label, ""))
        .join(""));
  };

  const drawLevels = (locale: Locale): void => {
    // The second question is asked in the language of the first answer.
    const copy = words(createVoice(locale, "adult"));
    root.innerHTML = askHtml(
      locale,
      `<h2 class="welcome-ask">${escapeHtml(HUB_TEXT[locale].askLevel)}</h2>`,
      LEVELS.map(level => optionHtml(level, level, copy.levelNames[level], copy.levelInfo[level]))
        .join(""));
  };

  return new Promise<Welcome>(resolve => {
    let locale: Locale | undefined;
    drawLanguages();

    /** The fingers of the table stop being read as soon as the screen is answered. */
    let stop = (): void => undefined;
    const done = (picked: Welcome): void => {
      stop();
      root.remove();
      resolve(picked);
    };

    const take = (choice: string): void => {
      if (locale === undefined) {
        locale = languageOptions().find(option => option.id === choice)?.id;
        if (locale === undefined) return;
        drawLevels(locale);
        return;
      }
      const level = LEVELS.find(one => one === choice);
      if (level === undefined) return;
      done({locale, level});
    };

    root.addEventListener("click", event => {
      const target = event.target;
      // The flag of a language is an SVG element: a press lands on it rather than on the
      // button around it, so the press is read from any element and not from an HTML one.
      if (!(target instanceof Element)) return;
      if (target.closest("[data-say]") !== null) return;
      const pick = target.closest(".welcome-pick");
      if (!(pick instanceof HTMLElement)) return;
      take(pick.dataset["choice"] ?? "");
    });

    // The fingers of the table. A card is pressed by tapping it or by resting on it, which is
    // the press of the whole application, so a visitor never learns two ways of choosing and
    // everything of this screen answers a finger: the cards, and the speakers beside them.
    void openTableInput({parameters, element: root, markers: []}).then(source => {
      const {input} = source;
      const press = createPress({
        fingers: () => pointerPoints(
          input.snapshot, {width: window.innerWidth, height: window.innerHeight}),
      });
      stop = (): void => {
        press.stop();
        input.disconnect();
      };
      input.connect();
    });
  });
}
