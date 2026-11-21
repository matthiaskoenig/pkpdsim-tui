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
import {clamp, formatFactor, formatNumber} from "@pkpdsim-tui/tui-kit";
import type {StatDefinition, TokenCard, TokenGlyph} from "@pkpdsim-tui/tui-kit";
import {valueFromAngle} from "@pkpdsim-tui/tuio-input";
import type {TableToken, TokenRole} from "@pkpdsim-tui/tuio-input";

/** What the table has solved: the pulsatile heart, and the steady network of the anatomy. */
export interface CardioReadout {
  readonly heart: HeartSummary;
  readonly steady: PressureSolution;
}

export const CARDIOVASCULAR_STATS: readonly StatDefinition<CardioReadout>[] = [
  {
    id: "systolic", label: "Systolic", unit: "mmHg", digits: 0,
    of: value => value.heart.arterial_systolic,
    info: "The highest pressure in the arteries, while the heart is squeezing. It is the first "
      + "of the two numbers a blood pressure cuff reads.",
  },
  {
    id: "diastolic", label: "Diastolic", unit: "mmHg", digits: 0,
    of: value => value.heart.arterial_diastolic,
    info: "The pressure that is left between two beats, while the heart fills again.",
  },
  {
    id: "co", label: "Cardiac output", unit: "l/min", digits: 2,
    of: value => value.heart.mean_cardiac_output,
    info: "The blood the heart moves in a minute: the rate times what one beat ejects. Five to "
      + "six litres at rest, four to five times that in an athlete at full effort.",
  },
  {
    id: "stroke", label: "Stroke volume", unit: "ml", digits: 0,
    of: value => value.heart.stroke_volume,
    info: "What one beat ejects. A failing heart moves less with every beat and makes it up "
      + "with a faster rate.",
  },
  {
    id: "ppo", label: "Portal pressure", unit: "mmHg", digits: 1,
    of: value => value.heart.mean_portal_pressure,
    info: "The pressure in the vein which carries the blood of the gut to the liver. When the "
      + "liver obstructs it, the blood backs up here: that is portal hypertension.",
  },
  {
    id: "gradient", label: "Portal gradient", unit: "mmHg", digits: 1,
    of: value => value.heart.mean_portal_pressure - value.heart.mean_hepatic_pressure,
    info: "The pressure the blood loses on its way through the liver. A clinician measures it "
      + "to tell how far a cirrhosis has gone.",
  },
];

/** The number a turn of this object changes, so the card says what it is doing. */
export function noteFor(roleId: string, value: CardioReadout): string {
  switch (roleId) {
    case "hepatic":
      return `portal gradient ${formatNumber(value.heart.mean_portal_pressure - value.heart.mean_hepatic_pressure)} mmHg`;
    case "portal":
      return `portal flow ${formatNumber(value.heart.mean_portal_flow)} l/min`;
    case "systemic":
      return `blood pressure ${formatNumber(value.heart.arterial_systolic, 0)}/`
        + `${formatNumber(value.heart.arterial_diastolic, 0)} mmHg`;
    case "renal": {
      const kidney = value.steady.flows.find(organ => organ.id === "ki");
      return `renal flow ${formatNumber(kidney?.flow ?? 0)} l/min`;
    }
    case "heartRate":
      return `cardiac output ${formatNumber(value.heart.mean_cardiac_output)} l/min`;
    case "contractility":
      return `stroke volume ${formatNumber(value.heart.stroke_volume, 0)} ml`;
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
  token: TableToken,
  role: TokenRole | undefined,
  value: CardioReadout,
  origins: ReadonlyMap<number, number>,
): TokenCard {
  if (role === undefined) {
    return {
      kind: "unassigned", title: `Marker ${token.marker}`, value: "no role",
      note: "This table does not use this object",
    };
  }
  const angle = role.mode === "absolute" ? token.angle : token.turn;
  const dialled = valueFromAngle(role, angle, origins.get(token.sessionId) ?? 0);
  const reading = role.id === "heartRate"
    ? `${formatNumber(dialled, 0)} /min`
    : formatFactor(dialled);
  return {
    kind: "dial", title: role.label, value: reading, note: noteFor(role.id, value),
    glyph: glyphFor(role, dialled), info: role.description,
  };
}
