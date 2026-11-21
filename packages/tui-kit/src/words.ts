/**
 * The words every table shares: the way back, the legend, the switches, and what the table says
 * about how it is driven. They are the same sentences at five tables, so they are written once
 * here, in the three languages and at the three levels, and a table says them with its voice.
 */

import type {TokenRole} from "@pkpdsim-tui/tuio-input";
import type {Locale, Phrase, Voice} from "./voice.ts";
import {LOCALE_NAMES} from "./voice.ts";

export interface KitCopy {
  /** The button which leaves a table. */
  readonly back: string;
  readonly backInfo: Phrase;
  /** The heading over the legend of the objects. */
  readonly objects: string;
  /** The label of the switch which picks the table, the language and the level. */
  /** What the quiz of a table says around its questions. */
  readonly quiz: {
    readonly title: string;
    readonly info: string;
    readonly close: string;
    readonly next: string;
    readonly last: string;
    readonly again: string;
    readonly right: string;
    readonly wrong: string;
    readonly score: (right: number, of: number) => string;
  };
  /** The button in the corner which everything about the table itself waits behind. */
  readonly settings: string;
  readonly settingsInfo: Phrase;
  readonly tableSwitch: string;
  readonly languageSwitch: string;
  readonly levelSwitch: string;
  /** What the three levels are called in the switch. */
  readonly levelNames: Readonly<Record<"child" | "adult" | "expert", string>>;
  /** What a level is, behind its button. */
  readonly levelInfo: Readonly<Record<"child" | "adult" | "expert", string>>;
  /** The switch which picks the body, and what the two bodies are called. */
  readonly bodySwitch: string;
  readonly male: string;
  readonly female: string;
  /** The button which puts a figure back the way it opened. */
  readonly reset: string;
  readonly resetInfo: Phrase;
  /** The button which reads the text of a panel, a note or the landing page aloud. */
  readonly speak: string;
  readonly speakStop: string;
  readonly speakInfo: Phrase;
  /** How a table is driven, which depends on what is connected. */
  readonly mouseHint: (markers: string) => Phrase;
  readonly tableHint: Phrase;
  readonly bothHint: (markers: string) => Phrase;
  readonly waitingHint: (version: string, address: string) => string;
  /** The object on the surface which this table does not read. */
  readonly markerTitle: (marker: number) => string;
  readonly noRole: string;
  readonly noRoleNote: Phrase;
  /** The sentence about the objects of another table which are lying on this one. */
  readonly unknownMarkers: (markers: readonly number[], reads: string) => string;
  /** How a run of markers is said: "1 to 6", "1 and 2". */
  readonly span: {readonly to: string; readonly and: string; readonly comma: string};
  /** What the table is doing while it solves, and while it is still loading. */
  readonly solving: string;
  readonly loading: string;
  /** What a table says when a solve failed: the message, and what is on the table meanwhile. */
  readonly solveFailed: (message: string) => string;
  /** The common units, where a language writes them differently. */
  readonly perMinute: string;
}

const EN: KitCopy = {
  back: "Back to the body",
  backInfo: {
    child: "Go back to the two people. Every table starts there.",
    adult: "Leave this table. The body is where every table is opened from.",
  },
  objects: "Objects",
  quiz: {
    title: "Quiz",
    info: "Three questions about this table. Nothing is lost by being wrong.",
    close: "Close",
    next: "Next question",
    last: "See how it went",
    again: "Play again",
    right: "Right!",
    wrong: "Not this one.",
    score: (right, of) => right === of
      ? `All ${of} right. You know this table.`
      : `${right} of ${of} right.`,
  },
  settings: "Settings",
  settingsInfo: "Which table this is, which language it speaks, and how much it says.",
  tableSwitch: "Table",
  languageSwitch: "Language",
  levelSwitch: "For",
  levelNames: {child: "Kids", adult: "Adults", expert: "Experts"},
  levelInfo: {
    child: "Short words and a few big numbers, for about six years old.",
    adult: "For an adult who has never heard any of this before.",
    expert: "Every number, with the mechanism and the model behind it.",
  },
  bodySwitch: "Body",
  reset: "Start again",
  resetInfo: {
    child: "Puts everything back the way it was at the start.",
    adult: "Puts the table back the way it opened, with nothing changed.",
    expert: "Reloads this table at its reference state: every value back to the physiology it started from.",
  },
  speak: "Read it to me",
  speakStop: "Stop",
  speakInfo: {
    child: "Press it and the table reads this out to you.",
    adult: "Press it and the table reads this text aloud.",
    expert: "Reads this text aloud, from the recorded clip of this language where there is one and with the speech of the browser where there is not.",
  },
  male: "Man",
  female: "Woman",
  mouseHint: markers => ({
    child: `Press ${markers} to put an object down, drag it, and roll the wheel to turn it.`,
    adult: `Keys ${markers} put an object down, dragging moves it, the wheel turns it.`,
  }),
  tableHint: {
    child: "Put an object on the table and turn it.",
    adult: "Put an object on the table and turn it.",
  },
  bothHint: markers => ({
    child: `Put an object on the table and turn it, or press ${markers} here.`,
    adult: `Put an object on the table and turn it, or press ${markers} here to place one.`,
  }),
  waitingHint: (version, address) => `Start a TUIO ${version} tracker on ${address}, or drop `
    + `"?tuio" from the address to drive the table with the mouse.`,
  markerTitle: marker => `Marker ${marker}`,
  noRole: "no role",
  noRoleNote: {
    child: "This table does not use this one.",
    adult: "This table does not use this object.",
  },
  unknownMarkers: (markers, reads) => `Unknown ${markers.length === 1 ? "marker" : "markers"} `
    + `${markers.join(", ")} on the table${reads === "" ? "" : `, which reads ${reads}`}.`,
  span: {to: "to", and: "and", comma: ", "},
  solving: "Solving...",
  loading: "Loading the table...",
  solveFailed: message => `${message} The last answer stays on the table.`,
  perMinute: "a minute",
};

const DE: KitCopy = {
  back: "Zurück zum Körper",
  backInfo: {
    child: "Geh zurück zu den beiden Menschen. Dort fängt jeder Tisch an.",
    adult: "Diesen Tisch verlassen. Vom Körper aus wird jeder Tisch geöffnet.",
  },
  objects: "Objekte",
  quiz: {
    title: "Quiz",
    info: "Drei Fragen zu diesem Tisch. Falsch raten kostet nichts.",
    close: "Schließen",
    next: "Nächste Frage",
    last: "Ergebnis ansehen",
    again: "Noch einmal",
    right: "Richtig!",
    wrong: "Das ist es nicht.",
    score: (right, of) => right === of
      ? `Alle ${of} richtig. Du kennst diesen Tisch.`
      : `${right} von ${of} richtig.`,
  },
  settings: "Einstellungen",
  settingsInfo: "Welcher Tisch das ist, welche Sprache er spricht und wie viel er sagt.",
  tableSwitch: "Tisch",
  languageSwitch: "Sprache",
  levelSwitch: "Für",
  levelNames: {child: "Kinder", adult: "Erwachsene", expert: "Fachleute"},
  levelInfo: {
    child: "Kurze Wörter und wenige große Zahlen, für etwa Sechsjährige.",
    adult: "Für Erwachsene, die davon noch nie etwas gehört haben.",
    expert: "Alle Zahlen, mit dem Mechanismus und dem Modell dahinter.",
  },
  bodySwitch: "Körper",
  reset: "Von vorn",
  resetInfo: {
    child: "Stellt alles wieder so ein wie am Anfang.",
    adult: "Stellt den Tisch wieder so ein, wie er geöffnet wurde.",
    expert: "Lädt diesen Tisch im Referenzzustand neu: jeder Wert zurück auf die Physiologie, mit der er begonnen hat.",
  },
  speak: "Vorlesen",
  speakStop: "Stopp",
  speakInfo: {
    child: "Drück drauf, dann liest dir der Tisch das vor.",
    adult: "Drücken Sie darauf, dann liest der Tisch diesen Text vor.",
    expert: "Liest diesen Text vor, aus der aufgenommenen Datei dieser Sprache, wo es eine gibt, und sonst mit der Sprachausgabe des Browsers.",
  },
  male: "Mann",
  female: "Frau",
  mouseHint: markers => ({
    child: `Drücke ${markers}, dann liegt ein Objekt da. Ziehen bewegt es, das Mausrad dreht es.`,
    adult: `Die Tasten ${markers} legen ein Objekt ab, Ziehen bewegt es, das Mausrad dreht es.`,
  }),
  tableHint: {
    child: "Stell ein Objekt auf den Tisch und dreh es.",
    adult: "Stellen Sie ein Objekt auf den Tisch und drehen Sie es.",
  },
  bothHint: markers => ({
    child: `Stell ein Objekt auf den Tisch und dreh es, oder drücke hier ${markers}.`,
    adult: `Stellen Sie ein Objekt auf den Tisch und drehen Sie es, oder drücken Sie hier `
      + `${markers}, um eines abzulegen.`,
  }),
  waitingHint: (version, address) => `Starten Sie einen TUIO-${version}-Tracker auf ${address}, `
    + `oder lassen Sie "?tuio" aus der Adresse weg, um den Tisch mit der Maus zu bedienen.`,
  markerTitle: marker => `Marker ${marker}`,
  noRole: "keine Rolle",
  noRoleNote: {
    child: "Dieser Tisch benutzt das hier nicht.",
    adult: "Dieser Tisch benutzt dieses Objekt nicht.",
  },
  unknownMarkers: (markers, reads) => `${markers.length === 1 ? "Unbekannter Marker" : "Unbekannte Marker"} `
    + `${markers.join(", ")} auf dem Tisch${reads === "" ? "" : `, der ${reads} liest`}.`,
  span: {to: "bis", and: "und", comma: ", "},
  solving: "Wird gerechnet...",
  loading: "Der Tisch wird geladen...",
  solveFailed: message => `${message} Die letzte Antwort bleibt auf dem Tisch stehen.`,
  perMinute: "pro Minute",
};

const ES: KitCopy = {
  back: "Volver al cuerpo",
  backInfo: {
    child: "Vuelve a las dos personas. Cada mesa empieza allí.",
    adult: "Salir de esta mesa. Todas las mesas se abren desde el cuerpo.",
  },
  objects: "Objetos",
  quiz: {
    title: "Quiz",
    info: "Tres preguntas sobre esta mesa. Equivocarse no cuesta nada.",
    close: "Cerrar",
    next: "Siguiente pregunta",
    last: "Ver el resultado",
    again: "Otra vez",
    right: "¡Correcto!",
    wrong: "Esta no es.",
    score: (right, of) => right === of
      ? `Las ${of} correctas. Conoces esta mesa.`
      : `${right} de ${of} correctas.`,
  },
  settings: "Ajustes",
  settingsInfo: "Qué mesa es esta, en qué idioma habla y cuánto cuenta.",
  tableSwitch: "Mesa",
  languageSwitch: "Idioma",
  levelSwitch: "Para",
  levelNames: {child: "Niños", adult: "Adultos", expert: "Expertos"},
  levelInfo: {
    child: "Palabras cortas y pocos números grandes, para unos seis años.",
    adult: "Para una persona adulta que nunca ha oído hablar de esto.",
    expert: "Todos los números, con el mecanismo y el modelo detrás.",
  },
  bodySwitch: "Cuerpo",
  reset: "Desde el principio",
  resetInfo: {
    child: "Deja todo como estaba al principio.",
    adult: "Deja la mesa como estaba al abrirla, sin nada cambiado.",
    expert: "Recarga esta mesa en su estado de referencia: cada valor vuelve a la fisiología de partida.",
  },
  speak: "Léemelo",
  speakStop: "Parar",
  speakInfo: {
    child: "Púlsalo y la mesa te lo lee en voz alta.",
    adult: "Púlselo y la mesa le lee este texto en voz alta.",
    expert: "Lee este texto en voz alta, desde el audio grabado de este idioma cuando lo hay y con la voz del navegador cuando no.",
  },
  male: "Hombre",
  female: "Mujer",
  mouseHint: markers => ({
    child: `Pulsa ${markers} y aparece un objeto. Arrástralo para moverlo y gíralo con la rueda.`,
    adult: `Las teclas ${markers} colocan un objeto, arrastrarlo lo mueve, la rueda lo gira.`,
  }),
  tableHint: {
    child: "Pon un objeto sobre la mesa y gíralo.",
    adult: "Coloque un objeto sobre la mesa y gírelo.",
  },
  bothHint: markers => ({
    child: `Pon un objeto sobre la mesa y gíralo, o pulsa ${markers} aquí.`,
    adult: `Coloque un objeto sobre la mesa y gírelo, o pulse ${markers} aquí para colocar uno.`,
  }),
  waitingHint: (version, address) => `Inicie un tracker TUIO ${version} en ${address}, o quite `
    + `"?tuio" de la dirección para manejar la mesa con el ratón.`,
  markerTitle: marker => `Marcador ${marker}`,
  noRole: "sin función",
  noRoleNote: {
    child: "Esta mesa no usa este objeto.",
    adult: "Esta mesa no usa este objeto.",
  },
  unknownMarkers: (markers, reads) => `${markers.length === 1 ? "Marcador desconocido" : "Marcadores desconocidos"} `
    + `${markers.join(", ")} sobre la mesa${reads === "" ? "" : `, que lee ${reads}`}.`,
  span: {to: "a", and: "y", comma: ", "},
  solving: "Calculando...",
  loading: "Cargando la mesa...",
  solveFailed: message => `${message} La última respuesta se queda en la mesa.`,
  perMinute: "por minuto",
};

export const KIT_TEXT: Readonly<Record<Locale, KitCopy>> = {en: EN, de: DE, es: ES};

/** The shared words, in the language of this voice. */
export function words(voice: Voice): KitCopy {
  return voice.pick(KIT_TEXT);
}

/** The language switch, which says every language in its own words. */
export function languageOptions(): readonly {id: Locale; label: string}[] {
  return (Object.keys(LOCALE_NAMES) as Locale[]).map(id => ({id, label: LOCALE_NAMES[id]}));
}

/** What a tracker is, as far as the hint below the panel cares. */
export interface DriveState {
  readonly tracker: boolean;
  readonly discovered: boolean;
  readonly version: string;
  readonly address: string;
  readonly connected: boolean;
}

/**
 * How this table is driven right now: the mouse of a laptop, the objects of a table, both while
 * a tracker was found behind the server of the page, or the tracker which has not answered yet.
 */
export function driveHint(voice: Voice, drive: DriveState, roles: readonly TokenRole[]): string {
  const copy = words(voice);
  const markers = markerSpan(roles, voice);
  if (!drive.tracker) return voice.say(copy.mouseHint(markers));
  if (!drive.connected) return copy.waitingHint(drive.version, drive.address);
  return drive.discovered ? voice.say(copy.bothHint(markers)) : voice.say(copy.tableHint);
}

/** The markers a table reads, as a person says them: "1 to 6", "1 and 2", "1 bis 6". */
export function markerSpan(roles: readonly TokenRole[], voice?: Voice): string {
  const copy = voice === undefined ? EN : words(voice);
  const markers = [...new Set(roles.flatMap(role => role.markers))].sort((a, b) => a - b);
  const runs: number[][] = [];
  for (const marker of markers) {
    const last = runs.at(-1);
    if (last !== undefined && marker === (last.at(-1) ?? 0) + 1) last.push(marker);
    else runs.push([marker]);
  }
  const spoken = runs.map(run => (run.length === 1
    ? String(run[0])
    : run.length === 2
      ? `${run[0]} ${copy.span.and} ${run[1]}`
      : `${run[0]} ${copy.span.to} ${run.at(-1)}`));
  if (spoken.length <= 1) return spoken[0] ?? "";
  return `${spoken.slice(0, -1).join(copy.span.comma)} ${copy.span.and} ${spoken.at(-1)}`;
}

/**
 * The organs of the pkpdsim physiology by their id. The export names them in English, because
 * that is the language a model is written in; a table says them to the visitor instead.
 */
const ORGAN_NAMES: Readonly<Record<Locale, Readonly<Record<string, string>>>> = {
  en: {
    he: "Heart", br: "Brain", li: "Liver", ki: "Kidney", st: "Stomach", si: "Small intestine",
    la: "Large intestine", sp: "Spleen", pa: "Pancreas", mu: "Muscle", sk: "Skin",
    ad: "Fat", bo: "Bone", go: "Gonads", lu: "Lungs", gu: "Gut",
  },
  de: {
    he: "Herz", br: "Gehirn", li: "Leber", ki: "Niere", st: "Magen", si: "Dünndarm",
    la: "Dickdarm", sp: "Milz", pa: "Bauchspeicheldrüse", mu: "Muskel", sk: "Haut",
    ad: "Fett", bo: "Knochen", go: "Keimdrüsen", lu: "Lunge", gu: "Darm",
  },
  es: {
    he: "Corazón", br: "Cerebro", li: "Hígado", ki: "Riñón", st: "Estómago",
    si: "Intestino delgado", la: "Intestino grueso", sp: "Bazo", pa: "Páncreas", mu: "Músculo",
    sk: "Piel", ad: "Grasa", bo: "Hueso", go: "Gónadas", lu: "Pulmones", gu: "Intestino",
  },
};

/** What an organ of the physiology is called here, by the name of the export otherwise. */
export function organName(voice: Voice, id: string, exported: string): string {
  return ORGAN_NAMES[voice.locale][id] ?? exported;
}
