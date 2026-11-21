/**
 * Where the liver story goes on: the three tables which take one part of it further. A card is
 * opened by a finger resting on it, as everything else at a table is, or with the mouse.
 */

import {chooseQuery, svg} from "@pkpdsim-tui/tui-kit";
import type {Box, Voice} from "@pkpdsim-tui/tui-kit";
import {LIVER_TEXT} from "./text.ts";

/** Which table a chapter leads to; what it is called is in the words of the table. */
const CHAPTER_APPS = ["glimepiride", "lobes", "perfusion"] as const;

export interface Chapters {
  resize(box: Box): void;
}

export function createChapters(parent: SVGSVGElement, voice: Voice): Chapters {
  const copy = voice.pick(LIVER_TEXT).chapters;
  const root = svg("g", {class: "chapters"}, parent);
  const cards = CHAPTER_APPS.map(app => {
    const chapter = copy[app];
    const group = svg("g", {
      class: "chapter", role: "button", tabindex: 0,
      "data-dwell": `app:${app}`, "data-info": voice.say(chapter.info),
    }, root);
    const plate = svg("rect", {class: "chapter-plate", rx: 14}, group);
    const title = svg("text", {class: "chapter-title"}, group);
    title.textContent = chapter.title;
    const line = svg("text", {class: "chapter-line"}, group);
    line.textContent = chapter.line;
    const arm = svg("rect", {class: "chapter-arm", height: 3}, group);
    const open = (): void => chooseQuery("app", app, "overview");
    group.addEventListener("click", open);
    group.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      open();
    });
    return {plate, title, line, arm};
  });

  return {
    resize(box: Box): void {
      const gap = 18;
      const width = (box.width - gap * (cards.length - 1)) / cards.length;
      for (const [index, card] of cards.entries()) {
        const x = box.x + index * (width + gap);
        card.plate.setAttribute("x", String(x));
        card.plate.setAttribute("y", String(box.y));
        card.plate.setAttribute("width", String(width));
        card.plate.setAttribute("height", String(box.height));
        card.title.setAttribute("x", String(x + 18));
        card.title.setAttribute("y", String(box.y + 32));
        card.line.setAttribute("x", String(x + 18));
        card.line.setAttribute("y", String(box.y + 58));
        card.arm.setAttribute("x", String(x));
        card.arm.setAttribute("y", String(box.y + box.height - 3));
        card.arm.setAttribute("width", String(width));
      }
    },
  };
}
