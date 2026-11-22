/** What the glimepiride table says, in the three languages and at the three levels. */

import type {Locale, Phrase, QuizQuestion} from "@pkpdsim-tui/tui-kit";

export interface Named {
  readonly label: Phrase;
  readonly info: Phrase;
}

/** What the sentence of the panel is built from. */
export interface GlimepirideFacts {
  readonly sex: "male" | "female";
  readonly weight: string;
  /** What is different about this person, as keys with the words they carry. */
  readonly who: readonly string[];
  readonly dose: string | undefined;
  readonly referenceDose: string;
  /** How much of the drug this person sees against the person nobody changed. */
  readonly exposure: "more" | "same" | "less" | "half" | "times";
  readonly factor: string;
  /** The half life, when it is longer than the reference one. */
  readonly half: {readonly now: string; readonly reference: string} | undefined;
  /** How many daily tablets, when it is more than the one. */
  readonly doses: number;
}

export interface GlimepirideCopy {
  readonly about: Phrase;
  readonly tries: readonly Phrase[];
  /** The three questions of the quiz, which send a visitor back to the objects. */
  readonly quiz: readonly QuizQuestion[];
  readonly stats: Readonly<Record<
    "now" | "cmax" | "tmax" | "halflife" | "auc" | "urine", Named>>;
  readonly roles: Readonly<Record<
    "dose" | "cyp2c9" | "cirrhosis" | "renal" | "weight" | "doses", Named>>;
  /** The clinical classes, by the label of the export. */
  readonly categories: Readonly<Record<string, string>>;
  readonly traces: Readonly<Record<"gli" | "m1" | "m2", string>>;
  /** The parts of the body a bubble stands on, in the words of the visitor. */
  readonly regions: Readonly<Record<string, string>>;
  readonly slowly: (category: string) => string;
  readonly cirrhotic: (category: string) => string;
  readonly kidneys: (value: string, category: string) => string;
  readonly weighs: (value: string) => string;
  readonly takesInstead: (dose: string, reference: string) => string;
  readonly hourValue: (hour: string) => string;
  /** How many tablets the person takes, as the panel and the card write it. */
  readonly doseCount: (count: number) => string;
  readonly everyMorning: string;
  readonly windBack: string;
  readonly reading: (facts: GlimepirideFacts) => string;
  readonly loading: string;
  readonly startingSolver: string;
  readonly solvingReference: string;
}

const EN: GlimepirideCopy = {
  quiz: [
    {
      id: "liver",
      ask: "What does the liver do with the tablet?",
      choices: [
        {id: "break", label: "It takes it apart"},
        {id: "store", label: "It keeps it for later"},
        {id: "back", label: "It sends it back to the stomach"},
      ],
      answer: "break",
      because: "The liver takes glimepiride apart with an enzyme called CYP2C9. What is left of it"
        + " is carried out of the blood by the kidneys.",
      tryIt: "Try it: turn object 2 down and watch the curve climb.",
    },
    {
      id: "slow",
      ask: "Two people take the same tablet. Who ends up with more of the drug in their blood?",
      choices: [
        {id: "slow", label: "The one whose liver works slowly"},
        {id: "heavy", label: "The one who weighs more"},
        {id: "same", label: "Both the same"},
      ],
      answer: "slow",
      because: "A slow liver takes less apart every hour, so more of it stays. Weight spreads the"
        + " drug through more body, which lowers the level rather than raising it.",
      tryIt: "Try it: turn object 2 to the left and read the peak.",
    },
    {
      id: "kidneys",
      ask: "What are the kidneys for here?",
      choices: [
        {id: "urine", label: "They carry it out of the blood into the urine"},
        {id: "bigger", label: "They make the tablet bigger"},
        {id: "pump", label: "They pump the blood"},
      ],
      answer: "urine",
      because: "The kidneys filter the blood, and what they take out of it is in the urine. When"
        + " they work less well, more of the drug stays in the body.",
      tryIt: "Try it: turn object 4 down and watch the number under the urine.",
    },
  ],
  about: {
    child: "This tablet helps people whose blood has too much sugar. It goes into the gut, the liver takes it apart, and the kidneys wash the pieces out.",
    adult: "Glimepiride lowers blood sugar in type 2 diabetes. The liver takes it apart into M1 and M2, and the kidneys wash those out. Set who the person is, and the same tablet does something else.",
    expert: "The whole body PBPK model of glimepiride of pkpdsim: CYP2C9 makes M1, which is oxidized to M2, and both are cleared renally. The dose, the genotype, the cirrhosis, the creatinine clearance and the body weight of the individual are the objects.",
  },
  tries: [
    {
      child: "Turn 2 down: this person takes the tablet apart slowly, so more of it stays inside.",
      adult: "Turn 2 down: this person breaks the drug down slowly, and it piles up.",
      expert: "Turn 2 down to a poor metabolizer: the exposure rises and the half life with it.",
    },
    {
      child: "Turn 3 up: a tablet every morning, and watch what is left when the next one comes.",
      adult: "Turn 3 up for a tablet a day and watch the drug build up from one day to the next.",
      expert: "Turn 3 up to a daily dose and read the accumulation against the single dose.",
    },
  ],
  stats: {
    now: {
      label: {child: "In the blood now", adult: "Plasma now"},
      info: {
        child: "How much of the tablet is in the blood at the hour the dial points at.",
        adult: "How much glimepiride is in the blood at the hour the dial points at.",
        expert: "The venous plasma concentration of glimepiride at the time the dial points at.",
      },
    },
    cmax: {
      label: {child: "The most", adult: "Peak plasma"},
      info: {
        child: "The most the blood ever holds of it.",
        adult: "The most the blood ever holds, which is what a dose is felt as.",
        expert: "Cmax of the parent drug in venous plasma, the value a bioequivalence study reports.",
      },
    },
    tmax: {
      label: {child: "When", adult: "Time of the peak"},
      info: {
        child: "How long it takes until there is the most of it in the blood.",
        adult: "How long the tablet takes to reach that peak: the time it needs to dissolve, to be absorbed and to pass the liver.",
        expert: "Tmax, which carries the dissolution, the absorption and the first pass through the liver.",
      },
    },
    halflife: {
      label: {child: "Half gone after", adult: "Half life"},
      info: {
        child: "How long it takes until half of it has gone again.",
        adult: "The time in which half of what is in the blood disappears. A liver which works slowly makes it longer.",
        expert: "The terminal half life of the parent drug, which rises with a poor metabolizer and with cirrhosis.",
      },
    },
    auc: {
      label: {child: "All of it", adult: "Exposure"},
      info: {
        child: "Everything the body gets of the drug over the whole day.",
        adult: "Everything the body sees of the drug over the whole course: the area under the curve.",
        expert: "AUC of the parent drug, the measure an exposure is compared by between individuals.",
      },
    },
    urine: {
      label: {child: "Into the urine", adult: "M1 and M2 in urine"},
      info: {
        child: "The pieces the liver made, which leave in the urine.",
        adult: "What leaves in the urine. Glimepiride itself does not: the liver turns it into M1 and M2 first.",
        expert: "The cumulative renal excretion of M1 and M2. The parent drug is not excreted unchanged.",
      },
    },
  },
  roles: {
    dose: {
      label: {child: "The tablet", adult: "Dose"},
      info: {
        child: "How big the tablet is that this person swallows.",
        adult: "The tablet the individual takes. The table gives the reference dose while the object is off the surface.",
        expert: "The oral dose of glimepiride, from 1 to 8 mg, the licensed range.",
      },
    },
    cyp2c9: {
      label: {child: "How fast the liver works", adult: "CYP2C9 activity"},
      info: {
        child: "How quickly the liver takes the tablet apart. Some people are slow at it.",
        adult: "The activity of CYP2C9, which makes M1 out of glimepiride. Turning it down is a poor metabolizer.",
        expert: "The activity of CYP2C9, the enzyme which hydroxylates glimepiride to M1. The detents are the *1/*1, *1/*2, *1/*3, *2/*3 and *3/*3 genotypes.",
      },
    },
    cirrhosis: {
      label: {child: "A sick liver", adult: "Cirrhosis"},
      info: {
        child: "How badly the liver is scarred. A scarred liver works less well.",
        adult: "How cirrhotic the liver is, from healthy to Child-Pugh C.",
        expert: "The degree of cirrhosis, which scales the functional liver volume, the blood flow and the enzyme activity, with the Child-Pugh classes as detents.",
      },
    },
    renal: {
      label: {child: "The kidneys", adult: "Creatinine clearance"},
      info: {
        child: "How well the kidneys wash things out of the blood.",
        adult: "What the kidneys still clear. The metabolites leave in the urine, so impairment holds them back.",
        expert: "The creatinine clearance of the individual, which scales the renal clearance of M1 and M2.",
      },
    },
    weight: {
      label: {child: "How heavy", adult: "Body weight"},
      info: {
        child: "How heavy this person is. A bigger body has more blood to fill.",
        adult: "The body weight, which scales the organs and the blood flows of the individual.",
        expert: "The body weight, which scales the organ volumes and the blood flows of the physiology, and with them the volume of distribution.",
      },
    },
    doses: {
      label: {child: "How many tablets", adult: "Tablets, one a day"},
      info: {
        child: "Turn it for a tablet every morning, up to ten mornings.",
        adult: "How many days in a row the person takes a tablet, one every morning.",
        expert: "A dose of the tablet put back into the stomach every 24 hours, for up to ten days, with one further day after the last of them.",
      },
    },
  },
  categories: {
    healthy: "healthy", normal: "normal", mild: "mild", moderate: "moderate", severe: "severe",
  },
  traces: {gli: "glimepiride", m1: "M1", m2: "M2"},
  regions: {
    gut: "Gut", liver: "Liver", blood: "Blood", lung: "Lungs", kidney: "Kidneys",
    rest: "The rest of the body", gone: "Out of the body",
  },
  slowly: category => `breaks glimepiride down slowly (${category})`,
  cirrhotic: category => `has a cirrhotic liver (${category})`,
  kidneys: (value, category) => `has kidneys that clear ${value} ml/min (${category})`,
  weighs: value => `weighs ${value} kg`,
  takesInstead: (dose, reference) => `takes ${dose} mg instead of ${reference} mg`,
  hourValue: hour => `hour ${hour}`,
  doseCount: count => (count === 1 ? "one tablet" : `${count} tablets`),
  everyMorning: "one every morning",
  windBack: "turn back to the dose",
  reading: facts => {
    const body = `A ${facts.sex === "female" ? "woman" : "man"} of ${facts.weight} kg`;
    const parts = [...(facts.dose === undefined ? [] : [facts.dose]), ...facts.who].slice(0, 2);
    const course = facts.doses > 1
      ? ` One every morning, ${facts.doses} mornings in a row.`
      : "";
    if (parts.length === 0) {
      return `${body} takes ${facts.referenceDose} mg of glimepiride.${course}`;
    }
    const sentence = parts.length === 1 ? parts[0] : `${parts[0]} and ${parts[1]}`;
    const exposure = {
      times: `${facts.factor} times as much`, more: "noticeably more",
      same: "about as much", less: "noticeably less", half: "about half as much",
    }[facts.exposure] ?? "about as much";
    const half = facts.half === undefined
      ? ""
      : ` It also stays in the blood longer: half of it is gone after ${facts.half.now} hours `
        + `instead of ${facts.half.reference}.`;
    return `${body} who ${sentence}: ${exposure} of the drug in the blood as the person nobody `
      + `changed.${half}${course}`;
  },
  loading: "Loading glimepiride...",
  startingSolver: "Starting the solver...",
  solvingReference: "Solving the reference individual...",
};

const DE: GlimepirideCopy = {
  quiz: [
    {
      id: "liver",
      ask: "Was macht die Leber mit der Tablette?",
      choices: [
        {id: "break", label: "Sie baut sie ab"},
        {id: "store", label: "Sie hebt sie für später auf"},
        {id: "back", label: "Sie schickt sie zurück in den Magen"},
      ],
      answer: "break",
      because: "Die Leber baut Glimepirid mit dem Enzym CYP2C9 ab. Was davon übrig bleibt, holen"
        + " die Nieren aus dem Blut.",
      tryIt: "Probier es: Dreh Objekt 2 herunter und sieh zu, wie die Kurve steigt.",
    },
    {
      id: "slow",
      ask: "Zwei Menschen nehmen dieselbe Tablette. Bei wem bleibt mehr davon im Blut?",
      choices: [
        {id: "slow", label: "Bei dem, dessen Leber langsam arbeitet"},
        {id: "heavy", label: "Bei dem, der mehr wiegt"},
        {id: "same", label: "Bei beiden gleich viel"},
      ],
      answer: "slow",
      because: "Eine langsame Leber baut pro Stunde weniger ab, also bleibt mehr übrig. Gewicht"
        + " verteilt den Stoff auf mehr Körper und senkt den Spiegel eher, als dass es ihn hebt.",
      tryIt: "Probier es: Dreh Objekt 2 nach links und lies den Spitzenwert ab.",
    },
    {
      id: "kidneys",
      ask: "Wozu sind die Nieren hier da?",
      choices: [
        {id: "urine", label: "Sie holen den Stoff aus dem Blut in den Urin"},
        {id: "bigger", label: "Sie machen die Tablette größer"},
        {id: "pump", label: "Sie pumpen das Blut"},
      ],
      answer: "urine",
      because: "Die Nieren filtern das Blut, und was sie herausholen, steht im Urin. Arbeiten sie"
        + " schlechter, bleibt mehr davon im Körper.",
      tryIt: "Probier es: Dreh Objekt 4 herunter und sieh dir die Zahl beim Urin an.",
    },
  ],
  about: {
    child: "Diese Tablette hilft Menschen, die zu viel Zucker im Blut haben. Sie geht in den Darm, die Leber zerlegt sie, und die Nieren spülen die Teile hinaus.",
    adult: "Glimepirid senkt den Blutzucker bei Typ-2-Diabetes. Die Leber zerlegt es zu M1 und M2, und die Nieren spülen diese hinaus. Stellen Sie ein, wer die Person ist, und dieselbe Tablette tut etwas anderes.",
    expert: "Das Ganzkörper-PBPK-Modell von Glimepirid aus pkpdsim: CYP2C9 bildet M1, das zu M2 oxidiert wird, und beide werden renal eliminiert. Dosis, Genotyp, Zirrhose, Kreatinin-Clearance und Körpergewicht des Individuums sind die Objekte.",
  },
  tries: [
    {
      child: "Dreh 2 herunter: diese Person zerlegt die Tablette langsam, also bleibt mehr davon drin.",
      adult: "Drehen Sie 2 herunter: diese Person baut das Medikament langsam ab, und es sammelt sich an.",
      expert: "Drehen Sie 2 auf einen Poor Metabolizer herunter: die Exposition steigt und die Halbwertszeit mit ihr.",
    },
    {
      child: "Dreh 3 hoch: jeden Morgen eine Tablette, und schau, was noch da ist, wenn die nächste kommt.",
      adult: "Drehen Sie 3 hoch auf eine Tablette am Tag und sehen Sie, wie sich das Medikament von Tag zu Tag ansammelt.",
      expert: "Drehen Sie 3 auf eine tägliche Dosis hoch und lesen Sie die Akkumulation gegen die Einzeldosis.",
    },
  ],
  stats: {
    now: {
      label: {child: "Jetzt im Blut", adult: "Plasma jetzt"},
      info: {
        child: "Wie viel von der Tablette gerade im Blut ist, zu der Stunde, auf die das Rad zeigt.",
        adult: "Wie viel Glimepirid zu der Stunde im Blut ist, auf die das Rad zeigt.",
        expert: "Die venöse Plasmakonzentration von Glimepirid zum eingestellten Zeitpunkt.",
      },
    },
    cmax: {
      label: {child: "Am meisten", adult: "Spitzenspiegel"},
      info: {
        child: "Das Meiste, was je davon im Blut ist.",
        adult: "Das Meiste, was das Blut je enthält, und das ist, was von einer Dosis zu spüren ist.",
        expert: "Cmax des Muttersubstanz im venösen Plasma, der Wert, den eine Bioäquivalenzstudie berichtet.",
      },
    },
    tmax: {
      label: {child: "Wann", adult: "Zeit des Maximums"},
      info: {
        child: "Wie lange es dauert, bis am meisten davon im Blut ist.",
        adult: "Wie lange die Tablette bis zu diesem Maximum braucht: die Zeit zum Auflösen, zur Aufnahme und für den Weg durch die Leber.",
        expert: "Tmax, in dem Auflösung, Resorption und First-Pass durch die Leber stecken.",
      },
    },
    halflife: {
      label: {child: "Halb weg nach", adult: "Halbwertszeit"},
      info: {
        child: "Wie lange es dauert, bis die Hälfte wieder weg ist.",
        adult: "Die Zeit, in der die Hälfte von dem verschwindet, was im Blut ist. Eine langsam arbeitende Leber macht sie länger.",
        expert: "Die terminale Halbwertszeit der Muttersubstanz, die bei Poor Metabolizern und bei Zirrhose steigt.",
      },
    },
    auc: {
      label: {child: "Alles zusammen", adult: "Exposition"},
      info: {
        child: "Alles, was der Körper über den ganzen Tag von dem Medikament bekommt.",
        adult: "Alles, was der Körper über den ganzen Verlauf von dem Medikament sieht: die Fläche unter der Kurve.",
        expert: "Die AUC der Muttersubstanz, das Maß, an dem Expositionen zwischen Individuen verglichen werden.",
      },
    },
    urine: {
      label: {child: "In den Urin", adult: "M1 und M2 im Urin"},
      info: {
        child: "Die Teile, die die Leber gemacht hat und die mit dem Urin hinausgehen.",
        adult: "Was mit dem Urin hinausgeht. Glimepirid selbst nicht: die Leber macht erst M1 und M2 daraus.",
        expert: "Die kumulative renale Ausscheidung von M1 und M2. Die Muttersubstanz wird nicht unverändert ausgeschieden.",
      },
    },
  },
  roles: {
    dose: {
      label: {child: "Die Tablette", adult: "Dosis"},
      info: {
        child: "Wie groß die Tablette ist, die diese Person schluckt.",
        adult: "Die Tablette, die das Individuum nimmt. Ohne Objekt auf der Fläche gilt die Referenzdosis.",
        expert: "Die orale Dosis Glimepirid, 1 bis 8 mg, der zugelassene Bereich.",
      },
    },
    cyp2c9: {
      label: {child: "Wie schnell die Leber arbeitet", adult: "CYP2C9-Aktivität"},
      info: {
        child: "Wie schnell die Leber die Tablette zerlegt. Manche Menschen sind darin langsam.",
        adult: "Die Aktivität von CYP2C9, das aus Glimepirid M1 macht. Herunterdrehen ist ein Poor Metabolizer.",
        expert: "Die Aktivität von CYP2C9, das Glimepirid zu M1 hydroxyliert. Die Rasten sind die Genotypen *1/*1, *1/*2, *1/*3, *2/*3 und *3/*3.",
      },
    },
    cirrhosis: {
      label: {child: "Eine kranke Leber", adult: "Zirrhose"},
      info: {
        child: "Wie stark die Leber vernarbt ist. Eine vernarbte Leber arbeitet schlechter.",
        adult: "Wie zirrhotisch die Leber ist, von gesund bis Child-Pugh C.",
        expert: "Der Grad der Zirrhose, der funktionelles Lebervolumen, Blutfluss und Enzymaktivität skaliert, mit den Child-Pugh-Klassen als Rasten.",
      },
    },
    renal: {
      label: {child: "Die Nieren", adult: "Kreatinin-Clearance"},
      info: {
        child: "Wie gut die Nieren Dinge aus dem Blut waschen.",
        adult: "Was die Nieren noch klären. Die Metaboliten gehen mit dem Urin hinaus, eine Einschränkung hält sie also zurück.",
        expert: "Die Kreatinin-Clearance des Individuums, die die renale Clearance von M1 und M2 skaliert.",
      },
    },
    weight: {
      label: {child: "Wie schwer", adult: "Körpergewicht"},
      info: {
        child: "Wie schwer diese Person ist. Ein größerer Körper hat mehr Blut zu füllen.",
        adult: "Das Körpergewicht, das Organe und Blutflüsse des Individuums skaliert.",
        expert: "Das Körpergewicht, das Organvolumina und Blutflüsse der Physiologie skaliert und damit das Verteilungsvolumen.",
      },
    },
    doses: {
      label: {child: "Wie viele Tabletten", adult: "Tabletten, eine am Tag"},
      info: {
        child: "Dreh daran: jeden Morgen eine Tablette, bis zu zehn Morgen lang.",
        adult: "Wie viele Tage hintereinander die Person eine Tablette nimmt, jeden Morgen eine.",
        expert: "Eine Dosis der Tablette alle 24 Stunden zurück in den Magen, bis zu zehn Tage lang, mit einem weiteren Tag nach der letzten.",
      },
    },
  },
  categories: {
    healthy: "gesund", normal: "normal", mild: "leicht", moderate: "mittel", severe: "schwer",
  },
  traces: {gli: "Glimepirid", m1: "M1", m2: "M2"},
  regions: {
    gut: "Darm", liver: "Leber", blood: "Blut", lung: "Lunge", kidney: "Nieren",
    rest: "Der übrige Körper", gone: "Aus dem Körper",
  },
  slowly: category => `Glimepirid langsam abbaut (${category})`,
  cirrhotic: category => `eine zirrhotische Leber hat (${category})`,
  kidneys: (value, category) => `Nieren hat, die ${value} ml/min klären (${category})`,
  weighs: value => `${value} kg wiegt`,
  takesInstead: (dose, reference) => `${dose} mg statt ${reference} mg nimmt`,
  hourValue: hour => `Stunde ${hour}`,
  doseCount: count => (count === 1 ? "eine Tablette" : `${count} Tabletten`),
  everyMorning: "jeden Morgen eine",
  windBack: "zurück zur Dosis drehen",
  reading: facts => {
    const body = `${facts.sex === "female" ? "Eine Frau" : "Ein Mann"} von ${facts.weight} kg`;
    const parts = [...(facts.dose === undefined ? [] : [facts.dose]), ...facts.who].slice(0, 2);
    const course = facts.doses > 1
      ? ` Jeden Morgen eine, ${facts.doses} Morgen hintereinander.`
      : "";
    if (parts.length === 0) {
      return `${body} nimmt ${facts.referenceDose} mg Glimepirid.${course}`;
    }
    const sentence = parts.length === 1 ? parts[0] : `${parts[0]} und ${parts[1]}`;
    const exposure = {
      times: `${facts.factor} mal so viel`, more: "deutlich mehr",
      same: "etwa gleich viel", less: "deutlich weniger", half: "etwa halb so viel",
    }[facts.exposure] ?? "etwa gleich viel";
    const half = facts.half === undefined
      ? ""
      : ` Es bleibt auch länger im Blut: die Hälfte ist nach ${facts.half.now} Stunden weg `
        + `statt nach ${facts.half.reference}.`;
    return `${body}, ${facts.sex === "female" ? "die" : "der"} ${sentence}: ${exposure} vom `
      + `Medikament im Blut wie die Person, an der nichts geändert wurde.${half}${course}`;
  },
  loading: "Glimepirid wird geladen...",
  startingSolver: "Der Solver wird gestartet...",
  solvingReference: "Die Referenzperson wird gerechnet...",
};

const ES: GlimepirideCopy = {
  quiz: [
    {
      id: "liver",
      ask: "¿Qué hace el hígado con la pastilla?",
      choices: [
        {id: "break", label: "La descompone"},
        {id: "store", label: "La guarda para después"},
        {id: "back", label: "La devuelve al estómago"},
      ],
      answer: "break",
      because: "El hígado descompone la glimepirida con una enzima que se llama CYP2C9. Lo que"
        + " queda lo sacan los riñones de la sangre.",
      tryIt: "Pruébalo: baja el objeto 2 y mira cómo sube la curva.",
    },
    {
      id: "slow",
      ask: "Dos personas toman la misma pastilla. ¿A quién le queda más en la sangre?",
      choices: [
        {id: "slow", label: "A quien tiene un hígado lento"},
        {id: "heavy", label: "A quien pesa más"},
        {id: "same", label: "A las dos igual"},
      ],
      answer: "slow",
      because: "Un hígado lento descompone menos cada hora, así que queda más. El peso reparte el"
        + " fármaco por más cuerpo y baja el nivel en vez de subirlo.",
      tryIt: "Pruébalo: gira el objeto 2 a la izquierda y lee el pico.",
    },
    {
      id: "kidneys",
      ask: "¿Para qué están aquí los riñones?",
      choices: [
        {id: "urine", label: "Sacan el fármaco de la sangre a la orina"},
        {id: "bigger", label: "Hacen la pastilla más grande"},
        {id: "pump", label: "Bombean la sangre"},
      ],
      answer: "urine",
      because: "Los riñones filtran la sangre, y lo que sacan de ella está en la orina. Si"
        + " trabajan peor, queda más fármaco en el cuerpo.",
      tryIt: "Pruébalo: baja el objeto 4 y mira el número de la orina.",
    },
  ],
  about: {
    child: "Esta pastilla ayuda a las personas que tienen demasiado azúcar en la sangre. Va al intestino, el hígado la desarma y los riñones lavan los trozos.",
    adult: "La glimepirida baja el azúcar en sangre en la diabetes tipo 2. El hígado la desarma en M1 y M2, y los riñones los eliminan. Ajuste quién es la persona, y la misma pastilla hace otra cosa.",
    expert: "El modelo PBPK de cuerpo entero de la glimepirida de pkpdsim: CYP2C9 forma M1, que se oxida a M2, y ambos se eliminan por vía renal. La dosis, el genotipo, la cirrosis, el aclaramiento de creatinina y el peso del individuo son los objetos.",
  },
  tries: [
    {
      child: "Gira el 2 hacia abajo: esta persona desarma la pastilla despacio, así que queda más dentro.",
      adult: "Gire el 2 hacia abajo: esta persona metaboliza el fármaco despacio y se le acumula.",
      expert: "Gire el 2 a metabolizador lento: la exposición sube y con ella la semivida.",
    },
    {
      child: "Sube el 3: una pastilla cada mañana, y mira qué queda cuando llega la siguiente.",
      adult: "Suba el 3 a una pastilla al día y vea cómo se acumula el fármaco de un día al siguiente.",
      expert: "Suba el 3 a una dosis diaria y lea la acumulación frente a la dosis única.",
    },
  ],
  stats: {
    now: {
      label: {child: "Ahora en la sangre", adult: "Plasma ahora"},
      info: {
        child: "Cuánta pastilla hay en la sangre a la hora que marca el dial.",
        adult: "Cuánta glimepirida hay en la sangre a la hora que marca el dial.",
        expert: "La concentración plasmática venosa de glimepirida en el instante marcado.",
      },
    },
    cmax: {
      label: {child: "Lo máximo", adult: "Pico plasmático"},
      info: {
        child: "Lo máximo que llega a haber en la sangre.",
        adult: "Lo máximo que llega a haber en la sangre, que es lo que se nota de una dosis.",
        expert: "Cmax del fármaco original en plasma venoso, el valor que informa un estudio de bioequivalencia.",
      },
    },
    tmax: {
      label: {child: "Cuándo", adult: "Hora del pico"},
      info: {
        child: "Cuánto tarda hasta que hay lo máximo en la sangre.",
        adult: "Cuánto tarda la pastilla en llegar a ese pico: lo que necesita para disolverse, absorberse y pasar por el hígado.",
        expert: "Tmax, que recoge la disolución, la absorción y el primer paso hepático.",
      },
    },
    halflife: {
      label: {child: "La mitad fuera a las", adult: "Semivida"},
      info: {
        child: "Cuánto tarda hasta que ya se ha ido la mitad.",
        adult: "El tiempo en el que desaparece la mitad de lo que hay en la sangre. Un hígado lento la alarga.",
        expert: "La semivida terminal del fármaco original, que sube con el metabolizador lento y con la cirrosis.",
      },
    },
    auc: {
      label: {child: "Todo junto", adult: "Exposición"},
      info: {
        child: "Todo lo que el cuerpo recibe del fármaco durante todo el día.",
        adult: "Todo lo que el cuerpo ve del fármaco a lo largo del curso: el área bajo la curva.",
        expert: "El AUC del fármaco original, la medida con la que se comparan exposiciones entre individuos.",
      },
    },
    urine: {
      label: {child: "A la orina", adult: "M1 y M2 en orina"},
      info: {
        child: "Los trozos que hizo el hígado y que salen con la orina.",
        adult: "Lo que sale con la orina. La glimepirida misma no: el hígado la convierte antes en M1 y M2.",
        expert: "La excreción renal acumulada de M1 y M2. El fármaco original no se excreta inalterado.",
      },
    },
  },
  roles: {
    dose: {
      label: {child: "La pastilla", adult: "Dosis"},
      info: {
        child: "Cómo de grande es la pastilla que traga esta persona.",
        adult: "La pastilla que toma el individuo. Sin el objeto sobre la superficie vale la dosis de referencia.",
        expert: "La dosis oral de glimepirida, de 1 a 8 mg, el rango autorizado.",
      },
    },
    cyp2c9: {
      label: {child: "Cómo de rápido trabaja el hígado", adult: "Actividad de CYP2C9"},
      info: {
        child: "Con qué rapidez desarma el hígado la pastilla. Algunas personas son lentas.",
        adult: "La actividad de CYP2C9, que hace M1 a partir de la glimepirida. Bajarla es un metabolizador lento.",
        expert: "La actividad de CYP2C9, la enzima que hidroxila la glimepirida a M1. Los topes son los genotipos *1/*1, *1/*2, *1/*3, *2/*3 y *3/*3.",
      },
    },
    cirrhosis: {
      label: {child: "Un hígado enfermo", adult: "Cirrosis"},
      info: {
        child: "Cuántas cicatrices tiene el hígado. Un hígado con cicatrices trabaja peor.",
        adult: "Cómo de cirrótico está el hígado, de sano a Child-Pugh C.",
        expert: "El grado de cirrosis, que escala el volumen hepático funcional, el flujo sanguíneo y la actividad enzimática, con las clases de Child-Pugh como topes.",
      },
    },
    renal: {
      label: {child: "Los riñones", adult: "Aclaramiento de creatinina"},
      info: {
        child: "Cómo de bien lavan los riñones las cosas de la sangre.",
        adult: "Lo que los riñones todavía aclaran. Los metabolitos salen con la orina, así que la insuficiencia los retiene.",
        expert: "El aclaramiento de creatinina del individuo, que escala el aclaramiento renal de M1 y M2.",
      },
    },
    weight: {
      label: {child: "Cuánto pesa", adult: "Peso corporal"},
      info: {
        child: "Cuánto pesa esta persona. Un cuerpo más grande tiene más sangre que llenar.",
        adult: "El peso corporal, que escala los órganos y los flujos sanguíneos del individuo.",
        expert: "El peso corporal, que escala los volúmenes de órgano y los flujos de la fisiología, y con ellos el volumen de distribución.",
      },
    },
    doses: {
      label: {child: "Cuántas pastillas", adult: "Pastillas, una al día"},
      info: {
        child: "Gíralo: una pastilla cada mañana, hasta diez mañanas.",
        adult: "Cuántos días seguidos toma la persona una pastilla, una cada mañana.",
        expert: "Una dosis de la pastilla de vuelta al estómago cada 24 horas, hasta diez días, con un día más tras la última.",
      },
    },
  },
  categories: {
    healthy: "sano", normal: "normal", mild: "leve", moderate: "moderada", severe: "grave",
  },
  traces: {gli: "glimepirida", m1: "M1", m2: "M2"},
  regions: {
    gut: "Intestino", liver: "Hígado", blood: "Sangre", lung: "Pulmones", kidney: "Riñones",
    rest: "El resto del cuerpo", gone: "Fuera del cuerpo",
  },
  slowly: category => `metaboliza la glimepirida despacio (${category})`,
  cirrhotic: category => `tiene un hígado cirrótico (${category})`,
  kidneys: (value, category) => `tiene riñones que aclaran ${value} ml/min (${category})`,
  weighs: value => `pesa ${value} kg`,
  takesInstead: (dose, reference) => `toma ${dose} mg en lugar de ${reference} mg`,
  hourValue: hour => `hora ${hour}`,
  doseCount: count => (count === 1 ? "una pastilla" : `${count} pastillas`),
  everyMorning: "una cada mañana",
  windBack: "gírelo hacia la dosis",
  reading: facts => {
    const body = `${facts.sex === "female" ? "Una mujer" : "Un hombre"} de ${facts.weight} kg`;
    const parts = [...(facts.dose === undefined ? [] : [facts.dose]), ...facts.who].slice(0, 2);
    const course = facts.doses > 1
      ? ` Una cada mañana, ${facts.doses} mañanas seguidas.`
      : "";
    if (parts.length === 0) {
      return `${body} toma ${facts.referenceDose} mg de glimepirida.${course}`;
    }
    const sentence = parts.length === 1 ? parts[0] : `${parts[0]} y ${parts[1]}`;
    const exposure = {
      times: `${facts.factor} veces más`, more: "bastante más",
      same: "más o menos lo mismo", less: "bastante menos", half: "más o menos la mitad",
    }[facts.exposure] ?? "más o menos lo mismo";
    const half = facts.half === undefined
      ? ""
      : ` Además se queda más tiempo en la sangre: la mitad se ha ido a las ${facts.half.now} `
        + `horas en lugar de a las ${facts.half.reference}.`;
    return `${body} que ${sentence}: ${exposure} de fármaco en la sangre que la persona a la `
      + `que no se le cambió nada.${half}${course}`;
  },
  loading: "Cargando la glimepirida...",
  startingSolver: "Arrancando el solucionador...",
  solvingReference: "Resolviendo el individuo de referencia...",
};

export const GLIMEPIRIDE_TEXT: Readonly<Record<Locale, GlimepirideCopy>> = {en: EN, de: DE, es: ES};
