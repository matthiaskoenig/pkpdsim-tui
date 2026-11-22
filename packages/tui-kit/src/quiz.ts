/**
 * The quiz of a table: three questions about what the table in front of the visitor does.
 *
 * A table in a museum is looked at for a minute. A question turns that minute into something a
 * visitor finds out rather than reads: they answer, they are told at once whether they were
 * right and why, and the answer sends them back to the objects to see it happen. That is the
 * whole design. There is no score to beat and nothing is lost by being wrong: a wrong answer is
 * answered with the reason, which is the part worth remembering.
 *
 * The quiz is its own card over the table, opened by the button in the near corner, because a
 * question which stands on the surface all day is furniture a visitor stops seeing.
 */

import type {Voice} from "./voice.ts";
import {keepStars, starMarks, starsOf} from "./stars.ts";
import {words} from "./words.ts";

export interface QuizChoice {
  readonly id: string;
  readonly label: string;
}

export interface QuizQuestion {
  readonly id: string;
  /** The question itself, in the words of this visitor. */
  readonly ask: string;
  readonly choices: readonly QuizChoice[];
  /** The id of the choice which is right. */
  readonly answer: string;
  /** Why it is right, in one sentence, which is the part worth remembering. */
  readonly because: string;
  /** What to do at the table to see it, which is where the answer sends the visitor. */
  readonly tryIt?: string;
}

export interface Quiz {
  /** Opens the card on the first question, which is what the button does. */
  open(): void;
  close(): void;
}

export interface QuizOptions {
  readonly voice: Voice;
  readonly questions: readonly QuizQuestion[];
  /** The table the stars of a run belong to, which the landing page shows them on. */
  readonly table?: string;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  }[character] ?? character));
}

/**
 * The quiz of a table. It draws its own button, so a table joins in with one line and the
 * button stands in the same corner of every table.
 */
export function createQuiz(container: HTMLElement, options: QuizOptions): Quiz {
  const copy = words(options.voice).quiz;
  const panel = words(options.voice);
  const questions = options.questions;
  const root = document.createElement("div");
  root.className = "quiz";
  root.innerHTML = `
    <button class="quiz-button" type="button" data-dwell="quiz"
      data-info="${escapeHtml(copy.info)}">
      <span class="quiz-mark" aria-hidden="true">?</span>
      <span class="quiz-button-label">${escapeHtml(copy.title)}</span>
    </button>
    <div class="quiz-card" hidden>
      <div class="quiz-head">
        <span class="quiz-step"></span>
        <span class="quiz-stars" aria-hidden="true"></span>
        <div class="quiz-head-buttons">
          <button class="quiz-close" type="button" data-dwell="quiz-close"
            aria-label="${escapeHtml(copy.close)}">${escapeHtml(copy.close)}</button>
        </div>
      </div>
      <p class="quiz-ask"></p>
      <div class="quiz-choices"></div>
      <div class="quiz-answer" hidden>
        <p class="quiz-verdict"></p>
        <p class="quiz-because"></p>
        <p class="quiz-try"></p>
        <button class="quiz-next" type="button" data-dwell="quiz-next"></button>
      </div>
    </div>
  `;
  const button = root.querySelector(".quiz-button") as HTMLElement;
  const card = root.querySelector(".quiz-card") as HTMLElement;
  const step = root.querySelector(".quiz-step") as HTMLElement;
  const ask = root.querySelector(".quiz-ask") as HTMLElement;
  const choices = root.querySelector(".quiz-choices") as HTMLElement;
  const answer = root.querySelector(".quiz-answer") as HTMLElement;
  const verdict = root.querySelector(".quiz-verdict") as HTMLElement;
  const because = root.querySelector(".quiz-because") as HTMLElement;
  const tried = root.querySelector(".quiz-try") as HTMLElement;
  const next = root.querySelector(".quiz-next") as HTMLElement;
  const stars = root.querySelector(".quiz-stars") as HTMLElement;
  const label = root.querySelector(".quiz-button-label") as HTMLElement;
  const table = options.table ?? "";

  let at = 0;
  let right = 0;
  let answered = false;
  let done = false;

  /** The dots of the head: which question this is, and how the ones before it went. */
  const marks = (): string => questions.map((_question, index) => {
    const state = index < at ? "past" : index === at ? "now" : "ahead";
    return `<span class="quiz-dot" data-state="${state}"></span>`;
  }).join("");

  const draw = (): void => {
    const question = questions[at];
    root.dataset["open"] = String(card.hidden === false);
    // What this run has won so far, and what the table has won on its best run: the stars are
    // the same marks in both places, so a visitor sees on the landing page what they did here.
    stars.textContent = starMarks(right, questions.length);
    const best = table === "" ? 0 : starsOf(table);
    label.textContent = best > 0 ? `${copy.title} ${"★".repeat(best)}` : copy.title;
    if (done || question === undefined) {
      step.innerHTML = marks();
      ask.textContent = copy.score(right, questions.length);
      choices.innerHTML = `<button class="quiz-choice quiz-choice--again" type="button"`
        + ` data-dwell="quiz-again">${escapeHtml(copy.again)}</button>`;
      answer.hidden = true;
      card.dataset["state"] = right === questions.length ? "perfect" : "done";
      return;
    }
    card.dataset["state"] = answered ? "answered" : "asking";
    step.innerHTML = marks();
    ask.textContent = question.ask;
    choices.innerHTML = question.choices.map(choice => `<button class="quiz-choice"`
      + ` type="button" data-choice="${escapeHtml(choice.id)}"`
      + ` data-dwell="quiz:${escapeHtml(question.id)}:${escapeHtml(choice.id)}"`
      + `>${escapeHtml(choice.label)}</button>`).join("");
    answer.hidden = !answered;
  };

  const show = (open: boolean): void => {
    card.hidden = !open;
    root.dataset["open"] = String(open);
    if (open && done) {
      at = 0;
      right = 0;
      done = false;
      answered = false;
    }
    draw();
  };

  const pick = (choice: string): void => {
    const question = questions[at];
    if (question === undefined || answered) return;
    answered = true;
    const correct = choice === question.answer;
    if (correct) {
      right += 1;
      // A star is won the moment it is answered, so a visitor who walks away keeps it.
      if (table !== "") keepStars(table, right);
    }
    for (const element of choices.querySelectorAll(".quiz-choice")) {
      const id = element.getAttribute("data-choice");
      element.setAttribute("data-right", String(id === question.answer));
      element.setAttribute("data-picked", String(id === choice));
    }
    card.dataset["state"] = "answered";
    card.dataset["correct"] = String(correct);
    verdict.textContent = correct ? copy.right : copy.wrong;
    because.textContent = question.because;
    tried.textContent = question.tryIt ?? "";
    tried.hidden = question.tryIt === undefined;
    next.textContent = at + 1 < questions.length ? copy.next : copy.last;
    answer.hidden = false;
  };

  root.addEventListener("click", event => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest(".quiz-button") !== null) {
      show(card.hidden === true);
      return;
    }
    if (target.closest(".quiz-close") !== null) {
      show(false);
      return;
    }
    if (target.closest(".quiz-next") !== null) {
      answered = false;
      at += 1;
      done = at >= questions.length;
      draw();
      return;
    }
    if (target.closest(".quiz-choice--again") !== null) {
      at = 0;
      right = 0;
      done = false;
      answered = false;
      draw();
      return;
    }
    const choice = target.closest(".quiz-choice");
    if (choice instanceof HTMLElement) {
      const id = choice.dataset["choice"];
      if (id !== undefined) pick(id);
    }
  });
  container.appendChild(root);
  draw();
  return {
    open: () => show(true),
    close: () => show(false),
  };
}
