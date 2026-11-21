/**
 * What the circulation says: the numbers of the bands at the edges, and the card beside an
 * object. The shared parts of the table draw them; which number belongs where is this
 * application's own.
 *
 * The band reads the beating heart, which is the compiled model solved for the objects on the
 * table. The steady network beside it is the instant one: it answers while a hand is still on an
 * object and drives the anatomy, and the heart follows a moment later.
 */

import type {HeartSummary, PressureSolution} from "@pkpdsim-tui/cardio-sim";
import {clamp, formatFactor, formatNumber, words} from "@pkpdsim-tui/tui-kit";
import type {StatDefinition, TokenCard, TokenGlyph, Voice} from "@pkpdsim-tui/tui-kit";
import {CARDIO_TEXT} from "./text.ts";
import {valueFromAngle} from "@pkpdsim-tui/tuio-input";
import type {TableToken, TokenRole} from "@pkpdsim-tui/tuio-input";

/** What the table has solved: the pulsatile heart, and the steady network of the anatomy. */
export interface CardioReadout {
  readonly heart: HeartSummary;
  readonly steady: PressureSolution;
}

/**
 * The numbers of the band. A child reads the two of a blood pressure cuff and what the heart
 * moves; an adult the stroke volume and the portal pressure as well; an expert the gradient
 * which says how far a cirrhosis has gone.
 */
export function cardiovascularStats(voice: Voice): readonly StatDefinition<CardioReadout>[] {
  const copy = voice.pick(CARDIO_TEXT).stats;
  const stat = (
    id: keyof typeof copy, unit: string, digits: number, of: (value: CardioReadout) => number,
    from?: "adult" | "expert",
  ): StatDefinition<CardioReadout> => ({
    id, unit, digits, of,
    label: voice.say(copy[id].label), info: voice.say(copy[id].info),
    ...(from === undefined ? {} : {from}),
  });
  return [
    stat("systolic", "mmHg", 0, value => value.heart.arterial_systolic),
    stat("diastolic", "mmHg", 0, value => value.heart.arterial_diastolic),
    stat("co", "l/min", 2, value => value.heart.mean_cardiac_output),
    stat("stroke", "ml", 0, value => value.heart.stroke_volume, "adult"),
    stat("ppo", "mmHg", 1, value => value.heart.mean_portal_pressure, "adult"),
    stat(
      "gradient", "mmHg", 1,
      value => value.heart.mean_portal_pressure - value.heart.mean_hepatic_pressure, "expert"),
  ];
}

/** The number a turn of this object changes, so the card says what it is doing. */
export function noteFor(voice: Voice, roleId: string, value: CardioReadout): string {
  const copy = voice.pick(CARDIO_TEXT).notes;
  switch (roleId) {
    case "hepatic":
      return copy.hepatic(formatNumber(
        value.heart.mean_portal_pressure - value.heart.mean_hepatic_pressure));
    case "portal":
      return copy.portal(formatNumber(value.heart.mean_portal_flow));
    case "systemic":
      return copy.systemic(`${formatNumber(value.heart.arterial_systolic, 0)}/`
        + `${formatNumber(value.heart.arterial_diastolic, 0)} mmHg`);
    case "renal": {
      const kidney = value.steady.flows.find(organ => organ.id === "ki");
      return copy.renal(formatNumber(kidney?.flow ?? 0));
    }
    case "heartRate":
      return copy.heartRate(formatNumber(value.heart.mean_cardiac_output));
    case "contractility":
      return copy.contractility(formatNumber(value.heart.stroke_volume, 0));
    default:
      return "";
  }
}

/**
 * The picture inside the object. A resistance is a vessel: the model is Poiseuille's, where the
 * resistance of a tube goes with the fourth power of its radius, so a factor of 8 is a vessel
 * of about six tenths of its width and that is what the picture shows.
 */
function glyphFor(role: TokenRole, dialled: number): TokenGlyph {
  if (role.id === "heartRate") return {kind: "heart", level: 1, rate: dialled};
  const span = role.max - role.min;
  if (role.id === "contractility") {
    return {kind: "heart", level: span <= 0 ? 1 : (dialled - role.min) / span, rate: 75};
  }
  const width = (factor: number): number => Math.pow(Math.max(factor, 0.01), -0.25);
  const widest = width(role.min);
  const narrowest = width(role.max);
  const open = widest === narrowest ? 0.5 : (width(dialled) - narrowest) / (widest - narrowest);
  return {kind: "vessel", level: clamp(open, 0, 1)};
}

export function cardFor(
  voice: Voice,
  token: TableToken,
  role: TokenRole | undefined,
  value: CardioReadout,
  origins: ReadonlyMap<number, number>,
): TokenCard {
  if (role === undefined) {
    const kit = words(voice);
    return {
      kind: "unassigned", title: kit.markerTitle(token.marker), value: kit.noRole,
      note: voice.say(kit.noRoleNote),
    };
  }
  const angle = role.mode === "absolute" ? token.angle : token.turn;
  const dialled = valueFromAngle(role, angle, origins.get(token.sessionId) ?? 0);
  const reading = role.id === "heartRate"
    ? `${formatNumber(dialled, 0)} /min`
    : formatFactor(dialled);
  return {
    kind: "dial", title: role.label, value: reading, note: noteFor(voice, role.id, value),
    glyph: glyphFor(role, dialled), info: role.description,
  };
}
