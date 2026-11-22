/**
 * The button which reads a text aloud: a small speaker beside the sentence it says. A visitor
 * who cannot read yet, who cannot read this language, or who is standing too far from the glass
 * to read anything presses it and hears what is written there.
 *
 * It is one handler for the whole page, on the document, because the thing it belongs to is
 * drawn again whenever the table changes: the panel, the note behind an element, the sidebar of
 * the landing page and the two questions of the first screen all carry the same button, in the
 * markup of a page and in the scene of an SVG alike. What is said stands in `data-say` on it.
 */

import {normalizeSpeech, speechFor} from "./speech.ts";
import type {Voice} from "./voice.ts";
import {words} from "./words.ts";

/** The speaker, in a box of 24 by 24: the cone, and two waves coming off it. */
export const SAY_PATH = "M4 9.2h3.4L12 5.2v13.6l-4.6-4H4z";
export const SAY_WAVES = "M15.6 9.4a3.6 3.6 0 0 1 0 5.2M18.4 6.9a7.2 7.2 0 0 1 0 10.2";

/** The markup of the button, for the places which are written as HTML. */
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  }[character] ?? character));
}

export function sayHtml(text: string, label: string): string {
  const safe = escapeHtml(text);
  return `<button class="say" type="button" data-say="${safe}" data-dwell="say"`
    + ` aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">`
    + `<svg class="say-art" viewBox="0 0 24 24" aria-hidden="true">`
    + `<path class="say-cone" d="${SAY_PATH}"></path>`
    + `<path class="say-waves" d="${SAY_WAVES}"></path></svg></button>`;
}

/** What the button is called, which is its label wherever it stands. */
export function sayLabel(voice: Voice): string {
  return words(voice).readAloud;
}

/** Whether the page already listens, so that every table does not add a handler of its own. */
let listening: Voice | undefined;

/**
 * Makes every speaker of the page read its text. The voice is the one of the visitor, so the
 * clips of that language are the ones which are played.
 */
export function watchSay(voice: Voice): void {
  const speech = speechFor(voice);
  if (listening !== undefined) return;
  listening = voice;
  document.addEventListener("click", event => {
    const target = event.target;
    // The press lands on the speaker itself, which is an SVG inside the button.
    if (!(target instanceof Element)) return;
    const button = target.closest("[data-say]");
    if (button === null) return;
    event.preventDefault();
    const text = button.getAttribute("data-say") ?? "";
    if (text === "") return;
    speech.toggle(text);
  });
  // While something is being read, the button which started it says so.
  speech.listen(() => {
    for (const button of document.querySelectorAll("[data-say]")) {
      const text = button.getAttribute("data-say") ?? "";
      const saying = speech.speaking() && speech.saying() === normalizeSpeech(text);
      if (saying) button.setAttribute("data-speaking", "true");
      else button.removeAttribute("data-speaking");
    }
  });
}
