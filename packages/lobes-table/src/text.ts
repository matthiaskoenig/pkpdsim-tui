/** What the lobed liver table says, in the three languages and at the three levels. */

import type {Locale, Phrase, QuizQuestion} from "@pkpdsim-tui/tui-kit";

export interface Named {
  readonly label: Phrase;
  readonly info: Phrase;
}

/** What the sentence of the panel is built from, which every language says its own way. */
export interface LobeFacts {
  /** The pieces which were cut away, clamped at the vein, clamped at the artery. */
  readonly cut: readonly string[];
  readonly portal: readonly string[];
  readonly arterial: readonly string[];
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
  readonly roles: Readonly<Record<"portal" | "arterial" | "resect" | "day", Named>>;
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
      tryIt: "Try it: resect a few segments, then wind the day dial forward.",
    },
    {
      id: "clamp",
      ask: "A clamp closes the portal branch of one segment. What happens to that segment?",
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
      child: "Put the knife on the four pieces on the right: that is what a doctor does to take a tumour out.",
      adult: "Put the scalpel on the four pieces of the right lobe: that is the operation for a tumour.",
      expert: "Put the scalpel on segments V to VIII: a right hemihepatectomy, and watch the remnant and the portal pressure.",
    },
    {
      child: "Turn dial 4 back to the operation and forward again, and watch the liver grow.",
      adult: "Wind dial 4 back to the operation and forward again to watch the liver grow.",
      expert: "Wind dial 4 back to day zero and forward to follow the regeneration of the remnant.",
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
    portal: {
      label: {child: "Vein clamp", adult: "Portal clamp"},
      info: {
        child: "Put it on a piece, and the blood of the gut no longer reaches it.",
        adult: "Closes the portal branch of the segment under it, which is a portal vein ligation.",
        expert: "Portal vein ligation of the segment under it: that side atrophies, the other grows, which is how a remnant is prepared before a resection.",
      },
    },
    arterial: {
      label: {child: "Artery clamp", adult: "Arterial clamp"},
      info: {
        child: "Put it on a piece, and the fresh blood from the heart no longer reaches it.",
        adult: "Closes the hepatic artery of the segment under it.",
        expert: "Arterial clamping of the segment under it, which takes its oxygen supply while the portal inflow stays.",
      },
    },
    resect: {
      label: {child: "Knife", adult: "Scalpel"},
      info: {
        child: "Put it on a piece to take that piece away.",
        adult: "Takes the segment under it away, which is a resection.",
        expert: "Resection of the segment under it: its mass and its function are gone at once, and the remnant carries the whole load.",
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
    const list = (names: readonly string[]): string => (names.length <= 1
      ? names[0] ?? ""
      : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);
    const share = (fraction: number): string => (fraction > 0.995
      ? "the whole liver"
      : fraction > 0.74 ? "most of the liver"
        : fraction > 0.49 ? "about half of the liver"
          : fraction > 0.29 ? "a third of the liver" : "a small part of the liver");
    const done: string[] = [];
    if (facts.cut.length > 0) {
      done.push(`piece${facts.cut.length > 1 ? "s" : ""} ${list(facts.cut)} `
        + `${facts.cut.length > 1 ? "were" : "was"} cut away`);
    }
    if (facts.portal.length > 0) {
      done.push(`the portal vein of piece${facts.portal.length > 1 ? "s" : ""} `
        + `${list(facts.portal)} is clamped off`);
    }
    if (facts.arterial.length > 0) {
      done.push(`the artery of piece${facts.arterial.length > 1 ? "s" : ""} `
        + `${list(facts.arterial)} is clamped off`);
    }
    const first = done.slice(0, 2);
    const operation = first.length === 1 ? first[0] : `${first[0]} and ${first[1]}`;
    const left = facts.cut.length === 0 ? "" : `, which leaves ${share(facts.remnant)}`;
    const regrowth = facts.day < 0.05
      ? `Right after it, ${facts.grown} of a liver is left`
      : `After ${facts.dayLabel} it is back to ${facts.grown} of a whole one`;
    const backing = facts.backing === undefined
      ? "."
      : `, and the blood backs up in front of it: ${facts.backing} mmHg above normal in the `
        + "portal vein.";
    return `In this liver ${operation}${left}. ${regrowth}${backing}`;
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
      id: "clamp",
      ask: "Eine Klemme schließt den Pfortaderast eines Segments. Was passiert mit dem Segment?",
      choices: [
        {id: "shrinks", label: "Es bekommt weniger Blut und schrumpft"},
        {id: "grows", label: "Es wächst schneller als die anderen"},
        {id: "nothing", label: "Nichts, die Arterie reicht aus"},
      ],
      answer: "shrinks",
      because: "Das meiste Blut eines Segments kommt durch die Pfortader. Genau so lässt man vor"
        + " einer Operation die andere Seite wachsen: man schließt die Pfortader der kranken.",
      tryIt: "Probier es: Klemme ein Segment ab und sieh zu, was der Rest der Leber macht.",
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
      child: "Leg das Messer auf die vier Stücke rechts: so nehmen Ärzte einen Tumor heraus.",
      adult: "Legen Sie das Skalpell auf die vier Stücke des rechten Lappens: das ist die Operation bei einem Tumor.",
      expert: "Legen Sie das Skalpell auf die Segmente V bis VIII: eine rechte Hemihepatektomie, und beobachten Sie Rest und Pfortaderdruck.",
    },
    {
      child: "Dreh Rad 4 zurück zur Operation und wieder vor, und sieh zu, wie die Leber wächst.",
      adult: "Drehen Sie Rad 4 zurück zur Operation und wieder vor, um die Leber wachsen zu sehen.",
      expert: "Drehen Sie Rad 4 auf Tag null zurück und vor, um der Regeneration des Restes zu folgen.",
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
    portal: {
      label: {child: "Venenklemme", adult: "Pfortaderklemme"},
      info: {
        child: "Leg sie auf ein Stück, dann kommt das Blut aus dem Darm nicht mehr dorthin.",
        adult: "Verschließt den Pfortaderast des Segments darunter, also eine Pfortaderligatur.",
        expert: "Pfortaderligatur des Segments darunter: diese Seite atrophiert, die andere wächst, und so wird ein Rest vor einer Resektion vorbereitet.",
      },
    },
    arterial: {
      label: {child: "Arterienklemme", adult: "Arterienklemme"},
      info: {
        child: "Leg sie auf ein Stück, dann kommt das frische Blut vom Herzen nicht mehr dorthin.",
        adult: "Verschließt die Leberarterie des Segments darunter.",
        expert: "Arterielle Abklemmung des Segments darunter, die ihm den Sauerstoff nimmt, während der portale Zufluss bleibt.",
      },
    },
    resect: {
      label: {child: "Messer", adult: "Skalpell"},
      info: {
        child: "Leg es auf ein Stück, um dieses Stück wegzunehmen.",
        adult: "Nimmt das Segment darunter weg, also eine Resektion.",
        expert: "Resektion des Segments darunter: Masse und Funktion sind sofort weg, und der Rest trägt die ganze Last.",
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
    const list = (names: readonly string[]): string => (names.length <= 1
      ? names[0] ?? ""
      : `${names.slice(0, -1).join(", ")} und ${names.at(-1)}`);
    const share = (fraction: number): string => (fraction > 0.995
      ? "die ganze Leber"
      : fraction > 0.74 ? "der größte Teil der Leber"
        : fraction > 0.49 ? "etwa die halbe Leber"
          : fraction > 0.29 ? "ein Drittel der Leber" : "ein kleiner Teil der Leber");
    const done: string[] = [];
    if (facts.cut.length > 0) {
      done.push(`${facts.cut.length > 1 ? "die Stücke" : "das Stück"} ${list(facts.cut)} `
        + `${facts.cut.length > 1 ? "wurden" : "wurde"} weggenommen`);
    }
    if (facts.portal.length > 0) {
      done.push(`die Pfortader ${facts.portal.length > 1 ? "der Stücke" : "des Stücks"} `
        + `${list(facts.portal)} abgeklemmt ist`);
    }
    if (facts.arterial.length > 0) {
      done.push(`die Arterie ${facts.arterial.length > 1 ? "der Stücke" : "des Stücks"} `
        + `${list(facts.arterial)} abgeklemmt ist`);
    }
    const first = done.slice(0, 2);
    const operation = first.length === 1 ? first[0] : `${first[0]} und ${first[1]}`;
    const left = facts.cut.length === 0 ? "" : `, womit ${share(facts.remnant)} bleibt`;
    const regrowth = facts.day < 0.05
      ? `Direkt danach sind ${facts.grown} einer Leber übrig`
      : `Nach ${facts.dayLabel} ist sie wieder bei ${facts.grown} einer ganzen`;
    const backing = facts.backing === undefined
      ? "."
      : `, und das Blut staut sich davor: ${facts.backing} mmHg über normal in der Pfortader.`;
    return `In dieser Leber ${operation}${left}. ${regrowth}${backing}`;
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
      tryIt: "Pruébalo: quita unos segmentos y luego gira el dial de los días.",
    },
    {
      id: "clamp",
      ask: "Una pinza cierra la rama portal de un segmento. ¿Qué le pasa a ese segmento?",
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
      child: "Pon el cuchillo en las cuatro piezas de la derecha: así quita un médico un tumor.",
      adult: "Ponga el bisturí sobre las cuatro piezas del lóbulo derecho: esa es la operación de un tumor.",
      expert: "Ponga el bisturí sobre los segmentos V a VIII: una hemihepatectomía derecha, y observe el remanente y la presión portal.",
    },
    {
      child: "Gira el dial 4 hacia atrás hasta la operación y otra vez hacia delante, y mira crecer el hígado.",
      adult: "Gire el dial 4 hacia atrás hasta la operación y de nuevo hacia delante para ver crecer el hígado.",
      expert: "Gire el dial 4 al día cero y hacia delante para seguir la regeneración del remanente.",
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
    portal: {
      label: {child: "Pinza de la vena", adult: "Pinza portal"},
      info: {
        child: "Ponla sobre una pieza y la sangre del intestino ya no llega allí.",
        adult: "Cierra la rama portal del segmento que tiene debajo, es decir, una ligadura de la vena porta.",
        expert: "Ligadura portal del segmento de debajo: ese lado se atrofia y el otro crece, y así se prepara un remanente antes de una resección.",
      },
    },
    arterial: {
      label: {child: "Pinza de la arteria", adult: "Pinza arterial"},
      info: {
        child: "Ponla sobre una pieza y la sangre fresca del corazón ya no llega allí.",
        adult: "Cierra la arteria hepática del segmento que tiene debajo.",
        expert: "Pinzamiento arterial del segmento de debajo, que le quita el oxígeno mientras el aporte portal sigue.",
      },
    },
    resect: {
      label: {child: "Cuchillo", adult: "Bisturí"},
      info: {
        child: "Ponlo sobre una pieza para quitar esa pieza.",
        adult: "Quita el segmento que tiene debajo, es decir, una resección.",
        expert: "Resección del segmento de debajo: su masa y su función desaparecen de golpe, y el remanente carga con todo.",
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
    const list = (names: readonly string[]): string => (names.length <= 1
      ? names[0] ?? ""
      : `${names.slice(0, -1).join(", ")} y ${names.at(-1)}`);
    const share = (fraction: number): string => (fraction > 0.995
      ? "todo el hígado"
      : fraction > 0.74 ? "la mayor parte del hígado"
        : fraction > 0.49 ? "alrededor de medio hígado"
          : fraction > 0.29 ? "un tercio del hígado" : "una parte pequeña del hígado");
    const done: string[] = [];
    if (facts.cut.length > 0) {
      done.push(`se ${facts.cut.length > 1 ? "quitaron las piezas" : "quitó la pieza"} `
        + `${list(facts.cut)}`);
    }
    if (facts.portal.length > 0) {
      done.push(`la vena porta de ${facts.portal.length > 1 ? "las piezas" : "la pieza"} `
        + `${list(facts.portal)} está pinzada`);
    }
    if (facts.arterial.length > 0) {
      done.push(`la arteria de ${facts.arterial.length > 1 ? "las piezas" : "la pieza"} `
        + `${list(facts.arterial)} está pinzada`);
    }
    const first = done.slice(0, 2);
    const operation = first.length === 1 ? first[0] : `${first[0]} y ${first[1]}`;
    const left = facts.cut.length === 0 ? "" : `, con lo que queda ${share(facts.remnant)}`;
    const regrowth = facts.day < 0.05
      ? `Justo después queda ${facts.grown} de un hígado`
      : `Tras ${facts.dayLabel} vuelve a estar en ${facts.grown} de uno entero`;
    const backing = facts.backing === undefined
      ? "."
      : `, y la sangre se acumula delante: ${facts.backing} mmHg por encima de lo normal en la `
        + "vena porta.";
    return `En este hígado ${operation}${left}. ${regrowth}${backing}`;
  },
  loading: "Cargando los lóbulos del hígado...",
  startingSolver: "Arrancando el solucionador...",
  solvingIntact: "Resolviendo el hígado intacto...",
};

export const LOBE_TEXT: Readonly<Record<Locale, LobeCopy>> = {en: EN, de: DE, es: ES};
