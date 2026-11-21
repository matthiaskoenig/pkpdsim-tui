/**
 * Where the liver story goes on: the three tables which take one part of it further. A card is
 * opened by a finger resting on it, as everything else at a table is, or with the mouse.
 */

import {chooseQuery, svg} from "@pkpdsim-tui/tui-kit";
import type {Box} from "@pkpdsim-tui/tui-kit";

export interface Chapter {
  readonly app: string;
  readonly title: string;
  readonly line: string;
  readonly info: string;
}

export const CHAPTERS: readonly Chapter[] = [
  {
    app: "glimepiride", title: "It takes drugs apart",
    line: "Follow a tablet through one.",
    info: "Almost every drug is changed by the liver before the body is rid of it. The "
      + "glimepiride table follows one tablet through the gut, the liver and the kidneys.",
  },
  {
    app: "lobes", title: "It grows back",
    line: "Cut a piece away.",
    info: "A liver is built of eight pieces which can be taken out one by one. The lobed liver "
      + "table cuts them away and follows how the rest takes the work over.",
  },
  {
    app: "perfusion", title: "It lives outside the body",
    line: "Keep one alive on a machine.",
    info: "A liver on a perfusion machine is kept warm and supplied with oxygen outside the "
      + "body, which is how a donor organ is carried and tested today.",
  },
];

export interface Chapters {
  resize(box: Box): void;
}

export function createChapters(parent: SVGSVGElement): Chapters {
  const root = svg("g", {class: "chapters"}, parent);
  const cards = CHAPTERS.map(chapter => {
    const group = svg("g", {
      class: "chapter", role: "button", tabindex: 0,
      "data-dwell": `app:${chapter.app}`, "data-info": chapter.info,
    }, root);
    const plate = svg("rect", {class: "chapter-plate", rx: 14}, group);
    const title = svg("text", {class: "chapter-title"}, group);
    title.textContent = chapter.title;
    const line = svg("text", {class: "chapter-line"}, group);
    line.textContent = chapter.line;
    const arm = svg("rect", {class: "chapter-arm", height: 3}, group);
    const open = (): void => chooseQuery("app", chapter.app, "overview");
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
