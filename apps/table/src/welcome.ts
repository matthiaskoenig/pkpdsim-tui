/**
 * What a visitor meets before the tables: the language they read, and how much the tables
 * should say. Two questions, one picture each, in that order.
 *
 * A table in a museum is walked up to by somebody who was not there a minute ago, so the first
 * screen cannot be in a language they may not read and cannot assume they know what the thing
 * is. The language is asked first, with every option written in its own tongue, and the second
 * question is then asked in the language they just chose. Both answers go into the address, so
 * every table which is opened from here carries them, and the button which starts again on the
 * landing page drops them and brings this screen back.
 */

import {LEVELS, createVoice, languageOptions, pictogram, words} from "@pkpdsim-tui/tui-kit";
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
export function askWelcome(container: HTMLElement): Promise<Welcome> {
  const root = document.createElement("div");
  root.className = "welcome";
  container.appendChild(root);

  const drawLanguages = (): void => {
    // The first question is asked in every language at once: a visitor who reads none of the
    // others still finds the one line which is theirs.
    const heads = languageOptions()
      .map(option => `<span>${escapeHtml(HUB_TEXT[option.id].askLanguage)}</span>`).join("");
    root.innerHTML = `
      <div class="welcome-card">
        <h1 class="welcome-ask welcome-ask--many">${heads}</h1>
        <div class="welcome-row">${languageOptions()
          .map(option => optionHtml(option.id, `flag-${option.id}`, option.label, ""))
          .join("")}</div>
      </div>`;
  };

  const drawLevels = (locale: Locale): void => {
    // The second question is asked in the language of the first answer.
    const voice = createVoice(locale, "adult");
    const copy = words(voice);
    root.innerHTML = `
      <div class="welcome-card">
        <h1 class="welcome-ask">${escapeHtml(HUB_TEXT[locale].askLevel)}</h1>
        <div class="welcome-row">${LEVELS
          .map(level => optionHtml(
            level, level, copy.levelNames[level], copy.levelInfo[level]))
          .join("")}</div>
      </div>`;
  };

  return new Promise<Welcome>(resolve => {
    let locale: Locale | undefined;
    drawLanguages();
    root.addEventListener("click", event => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const pick = target.closest(".welcome-pick");
      if (!(pick instanceof HTMLElement)) return;
      const choice = pick.dataset["choice"] ?? "";
      if (locale === undefined) {
        locale = languageOptions().find(option => option.id === choice)?.id;
        if (locale === undefined) return;
        drawLevels(locale);
        return;
      }
      const level = LEVELS.find(one => one === choice);
      if (level === undefined) return;
      root.remove();
      resolve({locale, level});
    });
  });
}
