import {describe, expect, it} from "vitest";

import {LOCALES} from "@pkpdsim-tui/tui-kit";
import type {QuizQuestion} from "@pkpdsim-tui/tui-kit";

import {CARDIO_TEXT} from "@pkpdsim-tui/cardiovascular-table/text";
import {LIVER_TEXT} from "@pkpdsim-tui/liver-table/text";
import {LOBE_TEXT} from "@pkpdsim-tui/lobes-table/text";
import {PERFUSION_TEXT} from "@pkpdsim-tui/perfusion-table/text";
import {GLIMEPIRIDE_TEXT} from "@pkpdsim-tui/glimepiride-table/text";

const TABLES = {
  cardiovascular: CARDIO_TEXT,
  liver: LIVER_TEXT,
  lobes: LOBE_TEXT,
  glimepiride: GLIMEPIRIDE_TEXT,
  perfusion: PERFUSION_TEXT,
};

/** A question nobody can answer, or one with two right answers, is a broken question. */
function check(question: QuizQuestion, where: string): void {
  expect(question.ask.length, `${where} asks nothing`).toBeGreaterThan(8);
  expect(question.choices.length, `${where} has too few choices`).toBeGreaterThanOrEqual(2);
  const ids = question.choices.map(choice => choice.id);
  expect(new Set(ids).size, `${where} repeats a choice`).toBe(ids.length);
  expect(ids, `${where} has no right answer`).toContain(question.answer);
  expect(question.because.length, `${where} says no reason`).toBeGreaterThan(20);
  for (const choice of question.choices) {
    expect(choice.label.length, `${where} has an empty choice`).toBeGreaterThan(1);
  }
}

describe("the quiz of every table", () => {
  it("asks three answerable questions in every language", () => {
    for (const [table, text] of Object.entries(TABLES)) {
      for (const locale of LOCALES) {
        const quiz = text[locale].quiz;
        expect(quiz.length, `${table} in ${locale}`).toBe(3);
        for (const question of quiz) check(question, `${table}/${locale}/${question.id}`);
      }
      // The same questions in the same order, so a visitor who switches language keeps their place.
      const ids = LOCALES.map(locale => text[locale].quiz.map(question => question.id).join(","));
      expect(new Set(ids).size, `${table} asks different questions per language`).toBe(1);
      const answers = LOCALES.map(
        locale => text[locale].quiz.map(question => question.answer).join(","));
      expect(new Set(answers).size, `${table} answers differently per language`).toBe(1);
    }
  });
});
