/**
 * The exact reduction of the steady pressure network of the cardiovascular model, ported from
 * `cardiovascular-model.mjs` of the pkpdsim documentation without changing its algebra. The
 * dynamic heartbeat traces are the exported reference solutions and are not solved here.
 *
 * It is algebra, not an integration, which is what lets the picture follow a hand on a table.
 */

import type {OrganFlow, PressureControls, PressureReference, PressureSolution} from "./types.ts";

/**
 * The same network at another body. The exported reference is the circulation of the reference
 * adult: a body which moves `scale` of the blood that adult moves is that network with its
 * resistances divided by `scale`, and the flow of every organ follows. The pressures are left
 * alone, because what changes with a body is how much blood goes through it and not the head
 * it is driven by.
 */
export function bodyReference(
  reference: PressureReference, scale: number,
): PressureReference {
  if (!Number.isFinite(scale) || scale <= 0 || scale === 1) return reference;
  return {
    ...reference,
    cardiac_output: reference.cardiac_output * scale,
    portal_resistance: reference.portal_resistance / scale,
    hepatic_resistance: reference.hepatic_resistance / scale,
    organs: reference.organs.map(organ => ({...organ, resistance: organ.resistance / scale})),
  };
}

export function defaultControls(reference: PressureReference): PressureControls {
  return {
    hepatic: 1, systemic: 1, portal: 1, renal: 1,
    arterial: reference.arterial_pressure, venous: reference.venous_pressure,
  };
}

export function solvePressure(reference: PressureReference, controls: PressureControls): PressureSolution {
  const {hepatic, systemic, portal, renal, arterial, venous} = controls;
  const values = [hepatic, systemic, portal, renal, arterial, venous];
  if (!values.every(Number.isFinite) || Math.min(hepatic, systemic, portal, renal) <= 0 || arterial <= venous) {
    throw new RangeError("Positive resistances and an arterial pressure above the venous pressure are required.");
  }
  const conductances: OrganFlow[] = reference.organs.map(organ => ({
    ...organ,
    conductance: 1 / (organ.resistance * systemic * (organ.id === "ki" ? renal : 1)),
  }));
  const splanchnic = conductances
    .filter(organ => organ.portal)
    .reduce((sum, organ) => sum + organ.conductance, 0);
  const liver = conductances.find(organ => organ.id === "li");
  if (liver === undefined) throw new TypeError("The reference has no liver among its organs.");
  const hepaticArtery = liver.conductance;
  const gp = 1 / (reference.portal_resistance * portal);
  const gh = 1 / (reference.hepatic_resistance * hepatic);
  // Nodal conservation, with the potentials shifted by the venous pressure to avoid cancellation
  // when small pressure differences are calculated.
  const a = splanchnic + gp;
  const d = gp + hepaticArtery + gh;
  const determinant = splanchnic * d + gp * (hepaticArtery + gh);
  const head = arterial - venous;
  const ppo = venous + head * (splanchnic * d + gp * hepaticArtery) / determinant;
  const pli = venous + head * (hepaticArtery * a + gp * splanchnic) / determinant;
  const flows: OrganFlow[] = conductances.map(organ => ({
    ...organ,
    flow: organ.conductance * (arterial - (organ.portal ? ppo : organ.id === "li" ? pli : venous)),
  }));
  const qpo = (ppo - pli) * gp;
  const qh = (pli - venous) * gh;
  const qha = flows.find(organ => organ.id === "li")?.flow ?? 0;
  const co = flows.reduce((sum, organ) => sum + organ.flow, 0);
  return {
    ppo, pli, qpo, qh, qha, co, flows,
    systemicFlow: flows
      .filter(organ => !organ.portal && organ.id !== "li")
      .reduce((sum, organ) => sum + organ.flow, 0),
    portalResidual: flows
      .filter(organ => organ.portal)
      .reduce((sum, organ) => sum + organ.flow, 0) - qpo,
    hepaticResidual: qha + qpo - qh,
  };
}

