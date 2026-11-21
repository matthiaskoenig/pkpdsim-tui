/**
 * What is set on a perfusion machine: the pump, the oxygen of the perfusate and the temperature
 * of the circuit. These are parameters of the exported model; no equation of the perfusion lives
 * here, see `pkpdsim.perfusion`.
 */

/** One setting of the machine, with the range an experimenter can choose from. */
export interface PerfusionControl {
  readonly id: keyof PerfusionSettings;
  readonly label: string;
  readonly unit: string;
  /** The parameter of the SBML model this setting is. */
  readonly parameter: string;
  readonly min: number;
  readonly max: number;
  /** The value of the reference perfusion. */
  readonly value: number;
  /** What the model is given, which may be in another unit than the dial is read in. */
  readonly factor: number;
}

export interface PerfusionSettings {
  /** The pump flow, in millilitres a minute. */
  readonly flow: number;
  /** The oxygen the oxygenator holds the perfusate at, in kPa. */
  readonly oxygen: number;
  /** The temperature of the circuit, in degrees Celsius. */
  readonly temperature: number;
}

export const PERFUSION_CONTROLS: Readonly<Record<keyof PerfusionSettings, PerfusionControl>> = {
  flow: {
    id: "flow", label: "Pump", unit: "ml/min", parameter: "Q_pump",
    min: 0.3, max: 6, value: 3, factor: 0.001,
  },
  oxygen: {
    id: "oxygen", label: "Oxygen", unit: "kPa", parameter: "pO2_target",
    min: 2, max: 80, value: 50, factor: 1,
  },
  temperature: {
    id: "temperature", label: "Temperature", unit: "C", parameter: "T",
    min: 4, max: 37, value: 37, factor: 1,
  },
};

export const REFERENCE_SETTINGS: PerfusionSettings = {
  flow: PERFUSION_CONTROLS.flow.value,
  oxygen: PERFUSION_CONTROLS.oxygen.value,
  temperature: PERFUSION_CONTROLS.temperature.value,
};

/** The parameters of the model for these settings, as the solver takes them. */
export function parametersOf(settings: Partial<PerfusionSettings> = {}): [string, number][] {
  const values: PerfusionSettings = {...REFERENCE_SETTINGS, ...settings};
  return Object.values(PERFUSION_CONTROLS).map(
    control => [control.parameter, values[control.id] * control.factor]);
}
