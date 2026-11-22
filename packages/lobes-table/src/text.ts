/** What the lobed liver table says, in the three languages and at the three levels. */

import type {Locale, Phrase, QuizQuestion} from "@pkpdsim-tui/tui-kit";

export interface Named {
  readonly label: Phrase;
  readonly info: Phrase;
}

/** What the sentence of the panel is built from, which every language says its own way. */
export interface LobeFacts {
  /** The operation on the table, by its name. */
  readonly operation: string;
  /** How much of the liver the operation took, as a share. */
  readonly removed: string;
  /** How much liver is left, as a share of a whole one. */
  readonly remnant: number;
  readonly day: number;
  readonly dayLabel: string;
  readonly grown: string;
  /** How far the portal pressure is above the untouched liver, when that is worth saying. */
  readonly backing: string | undefined;
}

export interface LobeCopy {
  readonly about: Phrase;
  readonly tries: readonly Phrase[];
  /** The three questions of the quiz, which send a visitor back to the objects. */
  readonly quiz: readonly QuizQuestion[];
  readonly stats: Readonly<Record<
    "remnant" | "portal-pressure" | "gradient" | "portal-flow" | "arterial-flow", Named>>;
  readonly roles: Readonly<Record<"resection" | "day", Named>>;
  /** What each operation of the export is called, by the id of its case. */
  readonly operations: Readonly<Record<string, Phrase>>;
  /** The plot of the curves: what it is, and the line of a whole liver. */
  readonly regeneration: {readonly title: string; readonly whole: string};
  readonly traces: Readonly<Record<"volume" | "portal", string>>;
  readonly speciesSwitch: string;
  readonly species: Readonly<Record<string, string>>;
  readonly femaleOnlyHuman: string;
  readonly segment: (numeral: string) => string;
  /** Where a segment lies, by the name the export of the model gives it. */
  readonly segmentNames: Readonly<Record<string, string>>;
  /** The unit of the band which is read against the liver nobody operated on. */
  readonly ofReference: string;
  readonly days: string;
  /** The line under the panel: what is left of the liver, and whose it is. */
  readonly credit: (share: string, species: string, body: string) => string;
  readonly resected: string;
  readonly massGone: (share: string) => string;
  readonly noSegment: string;
  readonly putOnSegment: string;
  readonly takenAway: (share: string) => string;
  readonly nowAt: (share: string, volume: string) => string;
  readonly dayValue: (day: string) => string;
  readonly windBack: string;
  readonly vessels: Readonly<Record<"portal" | "artery" | "hepatic", string>>;
  readonly whole: string;
  readonly reading: (facts: LobeFacts) => string;
  readonly loading: string;
  readonly startingSolver: string;
  readonly solvingIntact: string;
}

const EN: LobeCopy = {
  quiz: [
    {
      id: "grow",
      ask: "A surgeon takes half of a liver away. What does the rest do?",
      choices: [
        {id: "grows", label: "It grows back over the next days"},
        {id: "stays", label: "It stays half a liver forever"},
        {id: "stops", label: "It stops working"},
      ],
      answer: "grows",
      because: "The liver is the only organ which grows back. The part which is left takes over"
        + " the work and is close to its old size again within days.",
      tryIt: "Try it: turn the scalpel to a bigger operation, then wind the day dial forward.",
    },
    {
      id: "bigger",
      ask: "Two livers, one missing a segment and one missing its whole right side. Which grows faster?",
      choices: [
        {id: "shrinks", label: "It gets less blood and shrinks"},
        {id: "grows", label: "It grows faster than the others"},
        {id: "nothing", label: "Nothing, the artery is enough"},
      ],
      answer: "shrinks",
      because: "Most of the blood of a segment comes through the portal vein. Closing it is how"
        + " surgeons make the other side grow before they operate on it.",
      tryIt: "Try it: clamp a segment and watch what the rest of the liver does.",
    },
    {
      id: "pressure",
      ask: "After a large resection, what happens to the pressure in the portal vein?",
      choices: [
        {id: "up", label: "It goes up"},
        {id: "down", label: "It goes down"},
        {id: "same", label: "It stays the same"},
      ],
      answer: "up",
      because: "The same blood from the gut now has to pass through a smaller liver, so the"
        + " pressure in front of it rises. Too much of that is what makes a resection dangerous.",
      tryIt: "Try it: resect more and more, and watch the portal pressure climb.",
    },
  ],
  about: {
    child: "A liver is built of eight pieces. You can take some away, and the rest grows back until the liver is big enough again.",
    adult: "A liver is built of eight pieces, each with its own blood supply. A surgeon can close one off or cut it away, and what is left grows back within days.",
    expert: "The eight Couinaud segments as independent units of the resection model of pkpdsim: portal vein ligation, arterial clamping and resection change the functional mass, and the remnant regenerates over the days which follow.",
  },
  tries: [
    {
      child: "Turn the knife: every turn is another operation, and you see what it takes away.",
      adult: "Turn the scalpel to walk through the operations, from one segment to the whole right side.",
      expert: "Turn the scalpel through the resections of the export and read the remnant and the portal pressure of each.",
    },
    {
      child: "Turn the other dial back to the operation and forward again, and watch the liver grow.",
      adult: "Wind the day dial back to the operation and forward again to watch the liver grow back.",
      expert: "Wind the day dial back to day zero and forward to follow the regeneration of the remnant against the other operations.",
    },
  ],
  stats: {
    remnant: {
      label: {child: "How much liver", adult: "Liver volume"},
      info: {
        child: "How much liver there is now, against a whole one.",
        adult: "How much liver there is, against the same liver on the same day without an operation.",
        expert: "The remnant volume against the unoperated liver of the same day, which is what the regeneration is measured by.",
      },
    },
    "portal-pressure": {
      label: {child: "Pressure at the liver", adult: "Portal pressure"},
      info: {
        child: "How hard the blood pushes in the pipe which goes to the liver.",
        adult: "The pressure in the vein which brings the blood of the gut to the liver. The whole blood of the gut has to get through what is left of it.",
        expert: "Portal venous pressure. After a large resection the whole portal flow passes a small remnant, which is the small for size situation.",
      },
    },
    gradient: {
      label: {child: "Lost in the liver", adult: "Portal gradient"},
      info: {
        child: "How much of the push is used up inside the liver.",
        adult: "The pressure the blood loses on its way through the liver. It rises when there is less liver for the same blood.",
        expert: "The portal to hepatic venous gradient, which rises as the remnant takes the whole portal inflow.",
      },
    },
    "portal-flow": {
      label: {child: "From the gut", adult: "Portal flow"},
      info: {
        child: "The blood which comes from the gut to the liver.",
        adult: "The blood the gut sends to the liver, about three quarters of everything the liver gets.",
        expert: "Portal inflow, which a resection does not reduce: the same flow enters a smaller liver.",
      },
    },
    "arterial-flow": {
      label: {child: "From the heart", adult: "Arterial flow"},
      info: {
        child: "The blood with oxygen which comes straight from the heart.",
        adult: "The blood the liver gets straight from the heart, which carries the oxygen.",
        expert: "Hepatic arterial inflow, which buffers against the portal flow in a real liver.",
      },
    },
  },
  roles: {
    resection: {
      label: {child: "Knife", adult: "The operation"},
      info: {
        child: "Turn it to choose how much of the liver is taken away.",
        adult: "Turns through the operations a surgeon does, from one segment to the whole right side of the liver.",
        expert: "The resections of the export, in the order of the mass they take: the segments they remove are gone at once and the remnant carries the whole load.",
      },
    },
    day: {
      label: {child: "Days after", adult: "Day after the operation"},
      info: {
        child: "Turn it to travel through the days after the operation.",
        adult: "Turn it back to walk from the end of the course to the operation.",
        expert: "The day of the solved course, from the end back to the operation. The dial is relative and reads the day it was put down at.",
      },
    },
  },
  operations: {
    intact: {child: "Nothing taken", adult: "No operation"},
    resection_sg8: {child: "One piece (VIII)", adult: "Segment VIII", expert: "Segmentectomy VIII"},
    left_hepatectomy: {child: "The left half", adult: "Left half (II, III, IV)", expert: "Left hemihepatectomy"},
    right_hepatectomy: {child: "The right half", adult: "Right half (V to VIII)", expert: "Right hemihepatectomy"},
    extended_right_hepatectomy: {child: "Almost everything", adult: "Right half and more (IV to VIII)", expert: "Extended right hepatectomy"},
    resection_lll: {child: "The left piece", adult: "Left lateral lobe"},
    resection_ll: {child: "The left piece", adult: "Left lobe"},
    hepatectomy: {child: "Two thirds", adult: "Two thirds of the liver", expert: "Two thirds hepatectomy"},
    hepatectomy70: {child: "Two thirds", adult: "70 % of the liver", expert: "70 % hepatectomy"},
    hepatectomy90: {child: "Almost everything", adult: "90 % of the liver", expert: "90 % hepatectomy"},
  },
  regeneration: {title: "What grows back", whole: "whole"},
  traces: {volume: "liver volume", portal: "portal pressure"},
  speciesSwitch: "Species",
  species: {human: "Human", rat: "Rat", mouse: "Mouse"},
  femaleOnlyHuman: "The export has the female liver of the human only.",
  segment: numeral => `segment ${numeral}`,
  segmentNames: {
    "caudate lobe": "caudate lobe",
    "left lateral superior": "left lateral superior",
    "left lateral inferior": "left lateral inferior",
    "left medial": "left medial",
    "right anterior inferior": "right anterior inferior",
    "right posterior inferior": "right posterior inferior",
    "right posterior superior": "right posterior superior",
    "right anterior superior": "right anterior superior",
  },
  ofReference: "% of reference",
  days: "days",
  credit: (share, species, body) => `${share} % of the liver left, ${body} ${species}`,
  resected: "resected",
  massGone: share => `${share} of the mass gone`,
  noSegment: "no segment",
  putOnSegment: "Put it on a segment of the liver",
  takenAway: share => `${share} of the mass, taken away`,
  nowAt: (share, volume) => `${share} of the mass, now at ${volume}`,
  dayValue: day => `day ${day}`,
  windBack: "turn back to the operation",
  vessels: {portal: "portal", artery: "artery", hepatic: "hepatic veins"},
  whole: "The liver is whole.",
  reading: facts => {
    const share = (fraction: number): string => (fraction > 0.995
      ? "the whole liver"
      : fraction > 0.74 ? "most of the liver"
        : fraction > 0.49 ? "about half of the liver"
          : fraction > 0.29 ? "a third of the liver" : "a small part of the liver");
    const regrowth = facts.day < 0.05
      ? `Right after the operation, ${facts.grown} of a liver is left`
      : `After ${facts.dayLabel} it is back to ${facts.grown} of a whole one`;
    const backing = facts.backing === undefined
      ? "."
      : `, and the blood backs up in front of it: ${facts.backing} mmHg above normal in the `
        + "portal vein.";
    return `${facts.operation}: ${facts.removed} of the liver is gone, which leaves `
      + `${share(facts.remnant)}. ${regrowth}${backing}`;
  },
  loading: "Loading the lobed liver...",
  startingSolver: "Starting the solver...",
  solvingIntact: "Solving the intact liver...",
};

const DE: LobeCopy = {
  quiz: [
    {
      id: "grow",
      ask: "Eine Chirurgin nimmt die Hälfte einer Leber weg. Was macht der Rest?",
      choices: [
        {id: "grows", label: "Er wächst in den nächsten Tagen nach"},
        {id: "stays", label: "Er bleibt für immer eine halbe Leber"},
        {id: "stops", label: "Er hört auf zu arbeiten"},
      ],
      answer: "grows",
      because: "Die Leber ist das einzige Organ, das nachwächst. Der übrige Teil übernimmt die"
        + " Arbeit und ist nach wenigen Tagen fast wieder so groß wie vorher.",
      tryIt: "Probier es: Entferne ein paar Segmente und dreh dann das Tage-Rad vorwärts.",
    },
    {
      id: "bigger",
      ask: "Zwei Lebern, einer fehlt ein Segment, der anderen die ganze rechte Seite. Welche wächst schneller?",
      choices: [
        {id: "shrinks", label: "Es bekommt weniger Blut und schrumpft"},
        {id: "grows", label: "Es wächst schneller als die anderen"},
        {id: "nothing", label: "Nichts, die Arterie reicht aus"},
      ],
      answer: "shrinks",
      because: "Das meiste Blut eines Segments kommt durch die Pfortader. Genau so lässt man vor"
        + " einer Operation die andere Seite wachsen: man schließt die Pfortader der kranken.",
      tryIt: "Probier es: Dreh das Skalpell auf eine größere Operation und sieh zu, was der Rest der Leber macht.",
    },
    {
      id: "pressure",
      ask: "Nach einer großen Resektion: Was passiert mit dem Druck in der Pfortader?",
      choices: [
        {id: "up", label: "Er steigt"},
        {id: "down", label: "Er fällt"},
        {id: "same", label: "Er bleibt gleich"},
      ],
      answer: "up",
      because: "Dasselbe Blut aus dem Darm muss jetzt durch eine kleinere Leber, also steigt der"
        + " Druck davor. Zu viel davon ist das, was eine Resektion gefährlich macht.",
      tryIt: "Probier es: Entferne immer mehr und sieh zu, wie der Pfortaderdruck steigt.",
    },
  ],
  about: {
    child: "Eine Leber besteht aus acht Stücken. Man kann welche wegnehmen, und der Rest wächst nach, bis die Leber wieder groß genug ist.",
    adult: "Eine Leber ist aus acht Stücken gebaut, jedes mit eigener Blutversorgung. Chirurginnen und Chirurgen können eines abklemmen oder wegschneiden, und was übrig bleibt, wächst binnen Tagen nach.",
    expert: "Die acht Couinaud-Segmente als eigenständige Einheiten des Resektionsmodells von pkpdsim: Pfortaderligatur, arterielle Abklemmung und Resektion ändern die funktionelle Masse, und der Rest regeneriert in den folgenden Tagen.",
  },
  tries: [
    {
      child: "Dreh das Messer: jede Drehung ist eine andere Operation, und du siehst, was sie wegnimmt.",
      adult: "Drehen Sie das Skalpell durch die Operationen, von einem Segment bis zur ganzen rechten Seite.",
      expert: "Drehen Sie das Skalpell durch die Resektionen des Exports und lesen Sie Rest und Pfortaderdruck jeder einzelnen.",
    },
    {
      child: "Dreh das andere Rad zurück zur Operation und wieder vor, und sieh zu, wie die Leber wächst.",
      adult: "Drehen Sie das Tagesrad zurück zur Operation und wieder vor, um die Leber nachwachsen zu sehen.",
      expert: "Drehen Sie das Tagesrad auf Tag null zurück und vor, um der Regeneration des Restes neben den anderen Operationen zu folgen.",
    },
  ],
  stats: {
    remnant: {
      label: {child: "Wie viel Leber", adult: "Lebervolumen"},
      info: {
        child: "Wie viel Leber jetzt da ist, verglichen mit einer ganzen.",
        adult: "Wie viel Leber da ist, verglichen mit derselben Leber am selben Tag ohne Operation.",
        expert: "Das Restvolumen gegen die nicht operierte Leber desselben Tages, woran die Regeneration gemessen wird.",
      },
    },
    "portal-pressure": {
      label: {child: "Druck an der Leber", adult: "Pfortaderdruck"},
      info: {
        child: "Wie stark das Blut in dem Rohr drückt, das zur Leber geht.",
        adult: "Der Druck in der Vene, die das Blut des Darms zur Leber bringt. Das ganze Blut des Darms muss durch das, was von ihr übrig ist.",
        expert: "Pfortaderdruck. Nach großer Resektion passiert der ganze Pfortaderfluss einen kleinen Rest, und das ist die Small-for-size-Situation.",
      },
    },
    gradient: {
      label: {child: "In der Leber verloren", adult: "Pfortadergradient"},
      info: {
        child: "Wie viel vom Druck in der Leber verbraucht wird.",
        adult: "Der Druck, den das Blut auf dem Weg durch die Leber verliert. Er steigt, wenn weniger Leber für dasselbe Blut da ist.",
        expert: "Der portal-hepatovenöse Gradient, der steigt, wenn der Rest den ganzen Pfortaderzufluss aufnimmt.",
      },
    },
    "portal-flow": {
      label: {child: "Aus dem Darm", adult: "Pfortaderfluss"},
      info: {
        child: "Das Blut, das aus dem Darm zur Leber kommt.",
        adult: "Das Blut, das der Darm zur Leber schickt, etwa drei Viertel von allem, was die Leber bekommt.",
        expert: "Portaler Zufluss, den eine Resektion nicht verringert: derselbe Fluss tritt in eine kleinere Leber ein.",
      },
    },
    "arterial-flow": {
      label: {child: "Vom Herzen", adult: "Arterieller Fluss"},
      info: {
        child: "Das Blut mit Sauerstoff, das direkt vom Herzen kommt.",
        adult: "Das Blut, das die Leber direkt vom Herzen bekommt und das den Sauerstoff trägt.",
        expert: "Hepatisch-arterieller Zufluss, der in der realen Leber gegen den Pfortaderfluss puffert.",
      },
    },
  },
  roles: {
    resection: {
      label: {child: "Messer", adult: "Die Operation"},
      info: {
        child: "Dreh daran, um zu wählen, wie viel Leber weggenommen wird.",
        adult: "Dreht durch die Operationen, die Chirurgen machen, von einem Segment bis zur ganzen rechten Seite der Leber.",
        expert: "Die Resektionen des Exports, nach der Masse geordnet, die sie nehmen: die Segmente sind sofort weg, und der Rest trägt die ganze Last.",
      },
    },
    day: {
      label: {child: "Tage danach", adult: "Tag nach der Operation"},
      info: {
        child: "Dreh daran, um durch die Tage nach der Operation zu reisen.",
        adult: "Drehen Sie zurück, um vom Ende des Verlaufs zur Operation zu gehen.",
        expert: "Der Tag des gelösten Verlaufs, vom Ende zurück zur Operation. Das Rad ist relativ und liest den Tag, an dem es abgelegt wurde.",
      },
    },
  },
  operations: {
    intact: {child: "Nichts weggenommen", adult: "Keine Operation"},
    resection_sg8: {child: "Ein Stück (VIII)", adult: "Segment VIII", expert: "Segmentresektion VIII"},
    left_hepatectomy: {child: "Die linke Hälfte", adult: "Linke Hälfte (II, III, IV)", expert: "Linke Hemihepatektomie"},
    right_hepatectomy: {child: "Die rechte Hälfte", adult: "Rechte Hälfte (V bis VIII)", expert: "Rechte Hemihepatektomie"},
    extended_right_hepatectomy: {child: "Fast alles", adult: "Rechte Hälfte und mehr (IV bis VIII)", expert: "Erweiterte rechte Hepatektomie"},
    resection_lll: {child: "Das linke Stück", adult: "Linker Lateralappen"},
    resection_ll: {child: "Das linke Stück", adult: "Linker Lappen"},
    hepatectomy: {child: "Zwei Drittel", adult: "Zwei Drittel der Leber", expert: "Zwei-Drittel-Hepatektomie"},
    hepatectomy70: {child: "Zwei Drittel", adult: "70 % der Leber", expert: "70-%-Hepatektomie"},
    hepatectomy90: {child: "Fast alles", adult: "90 % der Leber", expert: "90-%-Hepatektomie"},
  },
  regeneration: {title: "Was nachwächst", whole: "ganz"},
  traces: {volume: "Lebervolumen", portal: "Pfortaderdruck"},
  speciesSwitch: "Spezies",
  species: {human: "Mensch", rat: "Ratte", mouse: "Maus"},
  femaleOnlyHuman: "Der Export hat die weibliche Leber nur für den Menschen.",
  segment: numeral => `Segment ${numeral}`,
  segmentNames: {
    "caudate lobe": "Lobus caudatus",
    "left lateral superior": "links lateral superior",
    "left lateral inferior": "links lateral inferior",
    "left medial": "links medial",
    "right anterior inferior": "rechts anterior inferior",
    "right posterior inferior": "rechts posterior inferior",
    "right posterior superior": "rechts posterior superior",
    "right anterior superior": "rechts anterior superior",
  },
  ofReference: "% der Referenz",
  days: "Tage",
  credit: (share, species, body) => `${share} % der Leber übrig, ${species}, ${body}`,
  resected: "entfernt",
  massGone: share => `${share} der Masse weg`,
  noSegment: "kein Segment",
  putOnSegment: "Auf ein Segment der Leber legen",
  takenAway: share => `${share} der Masse, weggenommen`,
  nowAt: (share, volume) => `${share} der Masse, jetzt bei ${volume}`,
  dayValue: day => `Tag ${day}`,
  windBack: "zurück zur Operation drehen",
  vessels: {portal: "Pfortader", artery: "Arterie", hepatic: "Lebervenen"},
  whole: "Die Leber ist unversehrt.",
  reading: facts => {
    const share = (fraction: number): string => (fraction > 0.995
      ? "die ganze Leber"
      : fraction > 0.74 ? "der größte Teil der Leber"
        : fraction > 0.49 ? "etwa die halbe Leber"
          : fraction > 0.29 ? "ein Drittel der Leber" : "ein kleiner Teil der Leber");
    const regrowth = facts.day < 0.05
      ? `Direkt nach der Operation sind ${facts.grown} einer Leber übrig`
      : `Nach ${facts.dayLabel} ist sie wieder bei ${facts.grown} einer ganzen`;
    const backing = facts.backing === undefined
      ? "."
      : `, und das Blut staut sich davor: ${facts.backing} mmHg über normal in der Pfortader.`;
    return `${facts.operation}: ${facts.removed} der Leber sind weg, `
      + `${share(facts.remnant)} bleibt. ${regrowth}${backing}`;
  },
  loading: "Die Leberlappen werden geladen...",
  startingSolver: "Der Solver wird gestartet...",
  solvingIntact: "Die unversehrte Leber wird gerechnet...",
};

const ES: LobeCopy = {
  quiz: [
    {
      id: "grow",
      ask: "Una cirujana quita la mitad de un hígado. ¿Qué hace el resto?",
      choices: [
        {id: "grows", label: "Vuelve a crecer en los días siguientes"},
        {id: "stays", label: "Se queda para siempre como medio hígado"},
        {id: "stops", label: "Deja de trabajar"},
      ],
      answer: "grows",
      because: "El hígado es el único órgano que vuelve a crecer. La parte que queda asume el"
        + " trabajo y en pocos días casi recupera su tamaño.",
      tryIt: "Pruébalo: gira el bisturí hacia una operación mayor y luego gira el dial de los días.",
    },
    {
      id: "bigger",
      ask: "Dos hígados: a uno le falta un segmento, al otro todo el lado derecho. ¿Cuál crece más rápido?",
      choices: [
        {id: "shrinks", label: "Recibe menos sangre y se encoge"},
        {id: "grows", label: "Crece más rápido que los demás"},
        {id: "nothing", label: "Nada, con la arteria le basta"},
      ],
      answer: "shrinks",
      because: "La mayor parte de la sangre de un segmento llega por la vena porta. Así se hace"
        + " crecer el otro lado antes de operar: cerrando la porta del lado enfermo.",
      tryIt: "Pruébalo: pinza un segmento y mira qué hace el resto del hígado.",
    },
    {
      id: "pressure",
      ask: "Tras una resección grande, ¿qué pasa con la presión de la vena porta?",
      choices: [
        {id: "up", label: "Sube"},
        {id: "down", label: "Baja"},
        {id: "same", label: "Se queda igual"},
      ],
      answer: "up",
      because: "La misma sangre del intestino tiene que pasar ahora por un hígado más pequeño,"
        + " así que la presión delante sube. Demasiada es lo que hace peligrosa una resección.",
      tryIt: "Pruébalo: quita cada vez más y mira cómo sube la presión portal.",
    },
  ],
  about: {
    child: "Un hígado está hecho de ocho piezas. Puedes quitar algunas y el resto vuelve a crecer hasta que el hígado es bastante grande otra vez.",
    adult: "Un hígado está construido de ocho piezas, cada una con su propio aporte de sangre. Un cirujano puede cerrar una o quitarla, y lo que queda vuelve a crecer en días.",
    expert: "Los ocho segmentos de Couinaud como unidades propias del modelo de resección de pkpdsim: la ligadura portal, el pinzamiento arterial y la resección cambian la masa funcional, y el remanente regenera en los días siguientes.",
  },
  tries: [
    {
      child: "Gira el cuchillo: cada giro es otra operación, y ves lo que se lleva.",
      adult: "Gire el bisturí para recorrer las operaciones, de un segmento a todo el lado derecho.",
      expert: "Gire el bisturí por las resecciones del export y lea el remanente y la presión portal de cada una.",
    },
    {
      child: "Gira el otro dial hacia atrás hasta la operación y otra vez hacia delante, y mira crecer el hígado.",
      adult: "Gire el dial de los días hacia atrás hasta la operación y de nuevo hacia delante para ver crecer el hígado.",
      expert: "Gire el dial de los días al día cero y hacia delante para seguir la regeneración del remanente junto a las otras operaciones.",
    },
  ],
  stats: {
    remnant: {
      label: {child: "Cuánto hígado", adult: "Volumen del hígado"},
      info: {
        child: "Cuánto hígado hay ahora, comparado con uno entero.",
        adult: "Cuánto hígado hay, comparado con el mismo hígado el mismo día sin operación.",
        expert: "El volumen del remanente frente al hígado no operado del mismo día, que es con lo que se mide la regeneración.",
      },
    },
    "portal-pressure": {
      label: {child: "Presión en el hígado", adult: "Presión portal"},
      info: {
        child: "Con cuánta fuerza empuja la sangre en el tubo que va al hígado.",
        adult: "La presión en la vena que lleva la sangre del intestino al hígado. Toda la sangre del intestino tiene que pasar por lo que queda de él.",
        expert: "Presión portal. Tras una resección amplia todo el flujo portal atraviesa un remanente pequeño, que es la situación de small for size.",
      },
    },
    gradient: {
      label: {child: "Perdido en el hígado", adult: "Gradiente portal"},
      info: {
        child: "Cuánto empuje se gasta dentro del hígado.",
        adult: "La presión que pierde la sangre al atravesar el hígado. Sube cuando hay menos hígado para la misma sangre.",
        expert: "El gradiente portal a venoso hepático, que sube cuando el remanente recibe todo el aporte portal.",
      },
    },
    "portal-flow": {
      label: {child: "Del intestino", adult: "Flujo portal"},
      info: {
        child: "La sangre que llega del intestino al hígado.",
        adult: "La sangre que el intestino manda al hígado, unos tres cuartos de todo lo que recibe el hígado.",
        expert: "Aporte portal, que una resección no reduce: el mismo flujo entra en un hígado más pequeño.",
      },
    },
    "arterial-flow": {
      label: {child: "Del corazón", adult: "Flujo arterial"},
      info: {
        child: "La sangre con oxígeno que viene directa del corazón.",
        adult: "La sangre que el hígado recibe directamente del corazón, la que lleva el oxígeno.",
        expert: "Aporte arterial hepático, que amortigua frente al flujo portal en un hígado real.",
      },
    },
  },
  roles: {
    resection: {
      label: {child: "Cuchillo", adult: "La operación"},
      info: {
        child: "Gíralo para elegir cuánto hígado se quita.",
        adult: "Gira por las operaciones que hacen los cirujanos, de un segmento a todo el lado derecho del hígado.",
        expert: "Las resecciones del export, ordenadas por la masa que se llevan: los segmentos desaparecen de golpe y el remanente carga con todo.",
      },
    },
    day: {
      label: {child: "Días después", adult: "Día tras la operación"},
      info: {
        child: "Gíralo para viajar por los días posteriores a la operación.",
        adult: "Gírelo hacia atrás para ir del final del curso hasta la operación.",
        expert: "El día del curso resuelto, del final hacia la operación. El dial es relativo y lee el día en que se colocó.",
      },
    },
  },
  operations: {
    intact: {child: "No se quita nada", adult: "Sin operación"},
    resection_sg8: {child: "Una pieza (VIII)", adult: "Segmento VIII", expert: "Segmentectomía VIII"},
    left_hepatectomy: {child: "La mitad izquierda", adult: "Mitad izquierda (II, III, IV)", expert: "Hemihepatectomía izquierda"},
    right_hepatectomy: {child: "La mitad derecha", adult: "Mitad derecha (V a VIII)", expert: "Hemihepatectomía derecha"},
    extended_right_hepatectomy: {child: "Casi todo", adult: "Mitad derecha y más (IV a VIII)", expert: "Hepatectomía derecha ampliada"},
    resection_lll: {child: "La pieza izquierda", adult: "Lóbulo lateral izquierdo"},
    resection_ll: {child: "La pieza izquierda", adult: "Lóbulo izquierdo"},
    hepatectomy: {child: "Dos tercios", adult: "Dos tercios del hígado", expert: "Hepatectomía de dos tercios"},
    hepatectomy70: {child: "Dos tercios", adult: "70 % del hígado", expert: "Hepatectomía del 70 %"},
    hepatectomy90: {child: "Casi todo", adult: "90 % del hígado", expert: "Hepatectomía del 90 %"},
  },
  regeneration: {title: "Lo que vuelve a crecer", whole: "entero"},
  traces: {volume: "volumen del hígado", portal: "presión portal"},
  speciesSwitch: "Especie",
  species: {human: "Humano", rat: "Rata", mouse: "Ratón"},
  femaleOnlyHuman: "La exportación tiene el hígado femenino solo del humano.",
  segment: numeral => `segmento ${numeral}`,
  segmentNames: {
    "caudate lobe": "lóbulo caudado",
    "left lateral superior": "lateral izquierdo superior",
    "left lateral inferior": "lateral izquierdo inferior",
    "left medial": "medial izquierdo",
    "right anterior inferior": "anterior derecho inferior",
    "right posterior inferior": "posterior derecho inferior",
    "right posterior superior": "posterior derecho superior",
    "right anterior superior": "anterior derecho superior",
  },
  ofReference: "% de la referencia",
  days: "días",
  credit: (share, species, body) => `queda el ${share} % del hígado, ${species}, ${body}`,
  resected: "resecado",
  massGone: share => `${share} de la masa fuera`,
  noSegment: "sin segmento",
  putOnSegment: "Póngalo sobre un segmento del hígado",
  takenAway: share => `${share} de la masa, quitado`,
  nowAt: (share, volume) => `${share} de la masa, ahora al ${volume}`,
  dayValue: day => `día ${day}`,
  windBack: "gírelo hacia la operación",
  vessels: {portal: "porta", artery: "arteria", hepatic: "venas hepáticas"},
  whole: "El hígado está entero.",
  reading: facts => {
    const share = (fraction: number): string => (fraction > 0.995
      ? "todo el hígado"
      : fraction > 0.74 ? "la mayor parte del hígado"
        : fraction > 0.49 ? "alrededor de medio hígado"
          : fraction > 0.29 ? "un tercio del hígado" : "una parte pequeña del hígado");
    const regrowth = facts.day < 0.05
      ? `Justo después de la operación queda ${facts.grown} de un hígado`
      : `Tras ${facts.dayLabel} vuelve a estar en ${facts.grown} de uno entero`;
    const backing = facts.backing === undefined
      ? "."
      : `, y la sangre se acumula delante: ${facts.backing} mmHg por encima de lo normal en la `
        + "vena porta.";
    return `${facts.operation}: falta ${facts.removed} del hígado, queda `
      + `${share(facts.remnant)}. ${regrowth}${backing}`;
  },
  loading: "Cargando los lóbulos del hígado...",
  startingSolver: "Arrancando el solucionador...",
  solvingIntact: "Resolviendo el hígado intacto...",
};

export const LOBE_TEXT: Readonly<Record<Locale, LobeCopy>> = {en: EN, de: DE, es: ES};
