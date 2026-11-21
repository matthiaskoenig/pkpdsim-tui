/**
 * The two objects of the liver table. Both are resistances of the steady pressure network of the
 * cardiovascular model, which is what makes the two supplies of the liver move: the gut sends
 * more blood when its vessels open after a meal, and a stiff liver holds the blood back.
 */

import type {Voice} from "@pkpdsim-tui/tui-kit";
import type {TokenRole} from "@pkpdsim-tui/tuio-input";
import {LIVER_TEXT} from "./text.ts";

export function liverRoles(voice: Voice): readonly TokenRole[] {
  const copy = voice.pick(LIVER_TEXT).roles;
  return [
    {
      id: "portal", label: voice.say(copy.portal.label), unit: "x", markers: [1],
      description: voice.say(copy.portal.info),
      min: 0.4, max: 6, reference: 1, mode: "absolute", scale: "log", turns: 1,
    },
    {
      id: "hepatic", label: voice.say(copy.hepatic.label), unit: "x", markers: [2],
      description: voice.say(copy.hepatic.info),
      min: 0.5, max: 8, reference: 1, mode: "absolute", scale: "log", turns: 1,
    },
  ];
}

/** The markers the liver table reads, which the input layer needs before the voice is used. */
export const LIVER_MARKERS: readonly number[] = [1, 2];
