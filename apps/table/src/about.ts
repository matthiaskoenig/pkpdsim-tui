/**
 * The page about all of this: whose laboratory the models come from, what they are, which
 * software solves them, under which licences, and who paid for the work.
 *
 * It is one page rather than a line under every table. A visitor who wants to know where the
 * bodies come from, or whether they may use the models, asks once, and a credit which has its
 * own page can say the whole thing instead of fitting into a footnote on the glass.
 */

import {createInfo, pointerPoints, tokenPoints, words} from "@pkpdsim-tui/tui-kit";
import type {TableApp, TableHost} from "@pkpdsim-tui/tui-kit";
import {openTableInput} from "@pkpdsim-tui/tuio-input";
import type {TableSnapshot} from "@pkpdsim-tui/tuio-input";

import {LAB_QR_PATH, LAB_QR_SIZE, LAB_URL} from "./qr.ts";
import {HUB_TEXT} from "./text.ts";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  }[character] ?? character));
}

function list(items: readonly string[]): string {
  return items.map(item => `<li>${escapeHtml(item)}</li>`).join("");
}

export const startAbout: TableApp = async (host: TableHost): Promise<void> => {
  const voice = host.voice;
  const copy = voice.pick(HUB_TEXT).about;
  const kit = words(voice);

  const page = document.createElement("div");
  page.className = "about";
  page.innerHTML = `
    <div class="about-sheet">
      <button class="back about-back" type="button" data-dwell="back">
${escapeHtml(kit.back)}
      </button>
      <h1 class="about-title">${escapeHtml(copy.title)}</h1>
      <p class="about-intro">${escapeHtml(copy.intro)}</p>
      <div class="about-grid">
        <section class="about-card about-card--lab">
          <h2>${escapeHtml(copy.groupTitle)}</h2>
          <div class="about-lab">
            <img class="about-photo" src="people/matthias-koenig.webp"
              alt="${escapeHtml(copy.groupLines[0] ?? "")}" width="300" height="300">
            <div class="about-lines">${
              copy.groupLines.map((line, index) => `<p class="about-line${
                index === 0 ? " about-line--name" : ""}">${escapeHtml(line)}</p>`).join("")
            }</div>
            <svg class="about-qr" viewBox="-1 -1 ${LAB_QR_SIZE + 2} ${LAB_QR_SIZE + 2}"
              role="img" aria-label="${escapeHtml(LAB_URL)}">
              <rect x="-1" y="-1" width="${LAB_QR_SIZE + 2}" height="${LAB_QR_SIZE + 2}"
                fill="#ffffff"></rect>
              <path d="${LAB_QR_PATH}" fill="#0f1d28"></path>
            </svg>
          </div>
          <div class="about-contacts">${
            copy.contacts.map(contact => `<div class="about-contact">`
              + `<h3 class="about-city">${escapeHtml(contact.city)}</h3>`
              + contact.lines.map(line =>
                `<p class="about-line">${escapeHtml(line)}</p>`).join("")
              + `</div>`).join("")
          }</div>
        </section>
        <section class="about-card">
          <h2>${escapeHtml(copy.modelsTitle)}</h2>
          <p>${escapeHtml(copy.modelsText)}</p>
        </section>
        <section class="about-card">
          <h2>${escapeHtml(copy.softwareTitle)}</h2>
          <ul class="about-software">${
            copy.software.map(item => `<li><b>${escapeHtml(item.name)}</b> ${
              escapeHtml(item.line)}</li>`).join("")
          }</ul>
          <!-- Which release is on this glass. A name and a number say the same in every
               language, so it is the one line of this page which is not translated. -->
          <p class="about-version">pkpdsim-tui ${escapeHtml(__TABLE_VERSION__)}</p>
        </section>
        <section class="about-card">
          <h2>${escapeHtml(copy.licenceTitle)}</h2>
          <ul class="about-licences">${list(copy.licenceLines)}</ul>
          <h2 class="about-funding-title">${escapeHtml(copy.fundingTitle)}</h2>
          <p class="about-funding">${escapeHtml(copy.fundingText)}</p>
        </section>
      </div>
    </div>
  `;
  host.chrome.appendChild(page);
  const back = page.querySelector(".about-back") as HTMLButtonElement;
  back.addEventListener("click", () => host.back());

  // The page is read the way every table is read: a finger which rests on the way back takes it.
  const {input} = await openTableInput({
    parameters: host.parameters, element: host.surface, markers: [],
  });
  let viewport = {width: window.innerWidth, height: window.innerHeight};
  let snapshot: TableSnapshot = input.snapshot;
  createInfo(host.surface, () => [
    ...pointerPoints(snapshot, viewport), ...tokenPoints(snapshot, viewport),
  ], voice);
  input.subscribe(next => {
    snapshot = next;
  });
  window.addEventListener("resize", () => {
    viewport = {width: window.innerWidth, height: window.innerHeight};
  }, {passive: true});
  window.addEventListener("pagehide", () => input.disconnect());
  input.connect();
};
