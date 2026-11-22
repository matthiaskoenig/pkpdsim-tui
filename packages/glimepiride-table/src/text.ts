/** What the glimepiride table says, in the three languages and at the three levels. */

import type {Locale, Phrase, QuizQuestion} from "@pkpdsim-tui/tui-kit";

export interface Named {
  readonly label: Phrase;
  readonly info: Phrase;
  /** What this object is in the body, behind the light bulb of the page the table opens with. */
  readonly more?: Phrase;
}

/** What the sentence of the panel is built from. */
export interface GlimepirideFacts {
  readonly sex: "male" | "female";
  /** Whether the body is a child's, which is what it is called and what follows it. */
  readonly child: boolean;
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
    "dose" | "absorption" | "cyp2c9" | "cirrhosis" | "renal" | "doses", Named>>;
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
    child: "This tablet helps people whose blood has too much sugar. It melts in the belly, goes into the blood, the liver takes it apart, and the kidneys wash the pieces out.",
    adult: "Glimepiride lowers blood sugar in type 2 diabetes, and every drug makes the same four steps: it is taken up out of the gut, carried around the body in the blood, taken apart by the liver, and washed out by the kidneys. One object stands at each of those steps, and the person at the table is who all of it happens to.",
    expert: "The whole body PBPK model of glimepiride of pkpdsim, along absorption, distribution, metabolism and elimination: the tablet dissolves and is absorbed, the body it is distributed in is the individual, CYP2C9 makes M1 which is oxidized to M2, and both are cleared renally.",
  },
  tries: [
    {
      child: "Turn 4 down: this person takes the tablet apart slowly, so more of it stays inside.",
      adult: "Turn 4 down: this person breaks the drug down slowly, and it piles up.",
      expert: "Turn 4 down to a poor metabolizer: the exposure rises and the half life with it.",
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
      more: "Glimepiride is a sulfonylurea, a tablet for type 2 diabetes: it makes the beta cells of the pancreas release more insulin, which brings the blood sugar down. It is taken once in the morning, and the strengths which are manufactured are what a prescription can choose from, which is why this dial clicks through them instead of sliding. A small body starts low, because too much of this drug takes the blood sugar too far down, which is what it is watched for.",
      label: {child: "The tablet", adult: "Dose"},
      info: {
        child: "Turn it and the tablet gets bigger or smaller: half a milligram up to eight.",
        adult: "Changes the dose, through the tablets there are: 0.5, 1, 2, 3, 4, 6 and 8 mg. It starts at what a body of this weight is given, so a child starts far below an adult.",
        expert: "The oral dose of glimepiride, snapped to the marketed strengths. The reference is the starting dose carried down from 4 mg with the body weight.",
      },
    },
    absorption: {
      more: "A tablet does nothing until it is in solution. What is swallowed first falls apart in the stomach and dissolves, and only dissolved drug crosses the wall of the gut into the blood, which is the A of ADME. That is why the curve climbs over a couple of hours instead of jumping: a tablet made to dissolve slowly moves the peak later and flattens it, while the amount which arrives in the end is the same.",
      label: {child: "How fast the tablet melts", adult: "Dissolution"},
      info: {
        child: "Turn it and the tablet falls apart faster or slower in the belly, so the drug arrives sooner or later.",
        adult: "Changes how fast the tablet dissolves in the stomach. Nothing crosses the gut wall before it is in solution, so this moves the peak earlier or later without changing how much arrives.",
        expert: "The dissolution rate constant of the tablet in the stomach, which sets the rate of the absorption step and so the time of the maximum.",
      },
    },
    cyp2c9: {
      more: "CYP2C9 is one of the liver enzymes of the cytochrome P450 family, and it is the one which takes glimepiride apart, first into M1 and then M2. The gene comes in variants: *1 is the common one, and somebody carrying *2 or *3 works through the drug more slowly, which is the M of ADME done at another speed. The same tablet then leaves more drug in the blood for longer, which is why a dose is sometimes chosen from a genotype.",
      label: {child: "How fast the liver works", adult: "CYP2C9 activity"},
      info: {
        child: "Turn it down and the liver takes the tablet apart slowly, so more of it stays in the blood.",
        adult: "Changes how fast the liver takes the drug apart, the M of ADME. Turning it down is a poor metabolizer: the drug is cleared more slowly and more of it is in the blood.",
        expert: "The activity of CYP2C9, the enzyme which hydroxylates glimepiride to M1. The detents are the *1/*1, *1/*2, *1/*3, *2/*3 and *3/*3 genotypes.",
      },
    },
    cirrhosis: {
      more: "Cirrhosis is a liver in which years of injury have left scar tissue: working tissue is lost, the blood finds its way around what is left, and the enzymes go with it. How far it has gone is graded in the clinic as Child-Pugh A, B or C. For a drug the liver clears, the three losses point the same way: less of it is taken apart on the way through, so more of it stands in the blood from the first tablet on.",
      label: {child: "A sick liver", adult: "Cirrhosis"},
      info: {
        child: "Turn it up and the liver is scarred: it is smaller, gets less blood and works less well.",
        adult: "Changes how cirrhotic the liver is, from healthy to Child-Pugh C. It takes the working liver volume, the blood flow and the enzymes down together.",
        expert: "The degree of cirrhosis, which scales the functional liver volume, the blood flow and the enzyme activity, with the Child-Pugh classes as detents.",
      },
    },
    renal: {
      more: "The kidneys filter the blood and send what is not wanted into the urine, which is the E of ADME. Glimepiride itself leaves through the liver, but its pieces M1 and M2 leave through the kidneys, and M1 still lowers blood sugar. The creatinine clearance is how that filtering is measured, around 100 ml a minute in a healthy adult; when it falls, M1 stays in the body longer and the tablet goes on working after it should have stopped.",
      label: {child: "The kidneys", adult: "Creatinine clearance"},
      info: {
        child: "Turn it down and the kidneys wash less out, so the pieces of the tablet stay in the blood.",
        adult: "Changes what the kidneys still clear, the E of ADME. M1 and M2 leave in the urine, so impairment holds them back.",
        expert: "The creatinine clearance of the individual, which scales the renal clearance of M1 and M2.",
      },
    },
    doses: {
      more: "One tablet is not how a drug is taken. The next morning's tablet arrives while the one before it is still being cleared, so the level climbs from day to day until as much leaves in a day as arrives, which is the steady state, and it is reached after about four or five half lives. A slow liver or a weak kidney does not only lift the first peak: it lifts the plateau that every day after it sits on.",
      label: {child: "How many tablets", adult: "Tablets, one a day"},
      info: {
        child: "Turn it for a tablet every morning, up to ten mornings, and watch what is left when the next one comes.",
        adult: "Changes how many days in a row the person takes a tablet, one every morning, which is what builds the drug up from day to day.",
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
    const body = `A ${facts.child ? (facts.sex === "female" ? "girl" : "boy")
      : (facts.sex === "female" ? "woman" : "man")} of ${facts.weight} kg`;
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
    child: "Diese Tablette hilft Menschen, die zu viel Zucker im Blut haben. Sie zergeht im Bauch, geht ins Blut, die Leber zerlegt sie, und die Nieren spülen die Teile hinaus.",
    adult: "Glimepirid senkt den Blutzucker bei Typ-2-Diabetes, und jedes Medikament macht dieselben vier Schritte: Es wird aus dem Darm aufgenommen, im Blut durch den Körper verteilt, von der Leber zerlegt und von den Nieren hinausgespült. An jedem dieser Schritte steht ein Objekt, und die Person am Tisch ist die, der das alles passiert.",
    expert: "Das Ganzkörper-PBPK-Modell von Glimepirid aus pkpdsim, entlang Absorption, Verteilung, Metabolismus und Elimination: Die Tablette löst sich auf und wird resorbiert, der Körper, in dem sie verteilt wird, ist das Individuum, CYP2C9 bildet M1, das zu M2 oxidiert wird, und beide werden renal eliminiert.",
  },
  tries: [
    {
      child: "Dreh 4 herunter: diese Person zerlegt die Tablette langsam, also bleibt mehr davon drin.",
      adult: "Drehen Sie 4 herunter: diese Person baut das Medikament langsam ab, und es sammelt sich an.",
      expert: "Drehen Sie 4 auf einen Poor Metabolizer herunter: die Exposition steigt und die Halbwertszeit mit ihr.",
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
      more: "Glimepirid ist ein Sulfonylharnstoff, eine Tablette für den Typ-2-Diabetes: Sie bringt die Betazellen der Bauchspeicheldrüse dazu, mehr Insulin abzugeben, was den Blutzucker senkt. Sie wird einmal morgens genommen, und die Stärken, die es gibt, sind das, woraus ein Rezept wählen kann, weshalb dieser Regler durch sie klickt statt zu gleiten. Ein kleiner Körper beginnt niedrig, denn zu viel davon zieht den Blutzucker zu weit herunter, und genau darauf wird bei diesem Medikament geachtet.",
      label: {child: "Die Tablette", adult: "Dosis"},
      info: {
        child: "Dreh daran, dann wird die Tablette größer oder kleiner: ein halbes Milligramm bis acht.",
        adult: "Ändert die Dosis, in den Tabletten, die es gibt: 0,5, 1, 2, 3, 4, 6 und 8 mg. Sie beginnt bei dem, was ein Körper dieses Gewichts bekommt, ein Kind also weit unter einem Erwachsenen.",
        expert: "Die orale Dosis Glimepirid, auf die vermarkteten Stärken gerastet. Die Referenz ist die Anfangsdosis, von 4 mg mit dem Körpergewicht heruntergetragen.",
      },
    },
    absorption: {
      more: "Eine Tablette wirkt erst, wenn sie gelöst ist. Was geschluckt wird, zerfällt zuerst im Magen und löst sich, und nur gelöster Wirkstoff geht durch die Darmwand ins Blut, das A von ADME. Deshalb steigt die Kurve über ein paar Stunden an, statt zu springen: Eine Tablette, die langsam zerfällt, schiebt das Maximum nach hinten und flacht es ab, während am Ende dieselbe Menge ankommt.",
      label: {child: "Wie schnell die Tablette zergeht", adult: "Auflösung"},
      info: {
        child: "Dreh daran, dann zerfällt die Tablette im Bauch schneller oder langsamer, und das Medikament kommt früher oder später an.",
        adult: "Ändert, wie schnell sich die Tablette im Magen auflöst. Erst gelöst geht etwas durch die Darmwand, also verschiebt das den Gipfel nach vorn oder hinten, ohne die Menge zu ändern.",
        expert: "Die Auflösungskonstante der Tablette im Magen, die den Absorptionsschritt und damit die Zeit des Maximums bestimmt.",
      },
    },
    cyp2c9: {
      more: "CYP2C9 ist eines der Leberenzyme der Cytochrom-P450-Familie, und es ist dasjenige, das Glimepirid zerlegt, erst zu M1 und dann zu M2. Das Gen kommt in Varianten vor: *1 ist die häufige, und wer *2 oder *3 trägt, arbeitet den Wirkstoff langsamer ab, das M von ADME in anderem Tempo. Dieselbe Tablette lässt dann mehr Wirkstoff länger im Blut, und deshalb wird eine Dosis manchmal nach dem Genotyp gewählt.",
      label: {child: "Wie schnell die Leber arbeitet", adult: "CYP2C9-Aktivität"},
      info: {
        child: "Dreh herunter, dann zerlegt die Leber die Tablette langsam, und es bleibt mehr davon im Blut.",
        adult: "Ändert, wie schnell die Leber das Medikament zerlegt, das M von ADME. Herunterdrehen ist ein Poor Metabolizer: Das Medikament wird langsamer abgebaut, und mehr davon ist im Blut.",
        expert: "Die Aktivität von CYP2C9, das Glimepirid zu M1 hydroxyliert. Die Rasten sind die Genotypen *1/*1, *1/*2, *1/*3, *2/*3 und *3/*3.",
      },
    },
    cirrhosis: {
      more: "Eine Zirrhose ist eine Leber, in der Jahre der Schädigung Narbengewebe hinterlassen haben: Arbeitendes Gewebe geht verloren, das Blut sucht sich einen Weg an dem Rest vorbei, und die Enzyme gehen mit. Wie weit das gediehen ist, wird in der Klinik als Child-Pugh A, B oder C eingeteilt. Für ein Medikament, das die Leber klärt, zeigen die drei Verluste in dieselbe Richtung: Weniger davon wird auf dem Weg zerlegt, also steht ab der ersten Tablette mehr davon im Blut.",
      label: {child: "Eine kranke Leber", adult: "Zirrhose"},
      info: {
        child: "Dreh hoch, dann ist die Leber vernarbt: Sie ist kleiner, bekommt weniger Blut und arbeitet schlechter.",
        adult: "Ändert, wie zirrhotisch die Leber ist, von gesund bis Child-Pugh C. Funktionelles Lebervolumen, Blutfluss und Enzyme gehen zusammen herunter.",
        expert: "Der Grad der Zirrhose, der funktionelles Lebervolumen, Blutfluss und Enzymaktivität skaliert, mit den Child-Pugh-Klassen als Rasten.",
      },
    },
    renal: {
      more: "Die Nieren filtern das Blut und schicken, was nicht gebraucht wird, in den Urin, das E von ADME. Glimepirid selbst geht über die Leber, aber seine Bruchstücke M1 und M2 gehen über die Nieren, und M1 senkt den Blutzucker weiterhin. Die Kreatinin-Clearance ist das Maß dieser Filterleistung, bei einem gesunden Erwachsenen rund 100 Milliliter pro Minute; fällt sie, bleibt M1 länger im Körper und die Tablette wirkt weiter, wenn sie längst aufgehört haben sollte.",
      label: {child: "Die Nieren", adult: "Kreatinin-Clearance"},
      info: {
        child: "Dreh herunter, dann waschen die Nieren weniger hinaus, und die Teile der Tablette bleiben im Blut.",
        adult: "Ändert, was die Nieren noch klären, das E von ADME. M1 und M2 gehen mit dem Urin hinaus, eine Einschränkung hält sie also zurück.",
        expert: "Die Kreatinin-Clearance des Individuums, die die renale Clearance von M1 und M2 skaliert.",
      },
    },
    doses: {
      more: "Eine einzelne Tablette ist nicht, wie ein Medikament genommen wird. Die Tablette des nächsten Morgens kommt an, während die davor noch abgebaut wird, also steigt der Spiegel von Tag zu Tag, bis an einem Tag so viel geht, wie ankommt: der Steady State, erreicht nach etwa vier bis fünf Halbwertszeiten. Eine langsame Leber oder eine schwache Niere hebt nicht nur das erste Maximum, sie hebt das Plateau, auf dem jeder weitere Tag sitzt.",
      label: {child: "Wie viele Tabletten", adult: "Tabletten, eine am Tag"},
      info: {
        child: "Dreh daran: jeden Morgen eine Tablette, bis zu zehn Morgen lang, und schau, was noch da ist, wenn die nächste kommt.",
        adult: "Ändert, wie viele Tage hintereinander die Person eine Tablette nimmt, jeden Morgen eine. Genau das lässt das Medikament von Tag zu Tag ansteigen.",
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
    const body = `${facts.child ? (facts.sex === "female" ? "Ein Mädchen" : "Ein Junge")
      : (facts.sex === "female" ? "Eine Frau" : "Ein Mann")} von ${facts.weight} kg`;
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
    const which = facts.child
      ? (facts.sex === "female" ? "das" : "der")
      : (facts.sex === "female" ? "die" : "der");
    return `${body}, ${which} ${sentence}: ${exposure} vom `
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
    child: "Esta pastilla ayuda a las personas que tienen demasiado azúcar en la sangre. Se deshace en la barriga, pasa a la sangre, el hígado la desarma y los riñones lavan los trozos.",
    adult: "La glimepirida baja el azúcar en sangre en la diabetes tipo 2, y todo medicamento da los mismos cuatro pasos: se absorbe desde el intestino, se reparte por el cuerpo con la sangre, el hígado lo desarma y los riñones lo lavan. En cada paso hay un objeto, y la persona de la mesa es a quien le pasa todo esto.",
    expert: "El modelo PBPK de cuerpo entero de la glimepirida de pkpdsim, a lo largo de absorción, distribución, metabolismo y eliminación: la pastilla se disuelve y se absorbe, el cuerpo en el que se distribuye es el individuo, CYP2C9 forma M1, que se oxida a M2, y ambos se eliminan por vía renal.",
  },
  tries: [
    {
      child: "Gira el 4 hacia abajo: esta persona desarma la pastilla despacio, así que queda más dentro.",
      adult: "Gire el 4 hacia abajo: esta persona metaboliza el fármaco despacio y se le acumula.",
      expert: "Gire el 4 a metabolizador lento: la exposición sube y con ella la semivida.",
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
      more: "La glimepirida es una sulfonilurea, una pastilla para la diabetes tipo 2: hace que las células beta del páncreas suelten más insulina, lo que baja el azúcar en sangre. Se toma una vez por la mañana, y las dosis que se fabrican son entre las que puede elegir una receta, por eso esta barra salta de una a otra en vez de deslizarse. Un cuerpo pequeño empieza bajo, porque demasiada de esta sustancia baja el azúcar más de la cuenta, que es justo lo que se vigila.",
      label: {child: "La pastilla", adult: "Dosis"},
      info: {
        child: "Gíralo y la pastilla se hace más grande o más pequeña: de medio miligramo a ocho.",
        adult: "Cambia la dosis, en las pastillas que existen: 0,5, 1, 2, 3, 4, 6 y 8 mg. Empieza en lo que recibe un cuerpo de este peso, así que un niño empieza muy por debajo de un adulto.",
        expert: "La dosis oral de glimepirida, ajustada a las presentaciones comercializadas. La referencia es la dosis inicial, bajada desde 4 mg con el peso corporal.",
      },
    },
    absorption: {
      more: "Una pastilla no hace nada hasta que está disuelta. Lo que se traga primero se deshace en el estómago y se disuelve, y solo el fármaco disuelto cruza la pared del intestino hacia la sangre, que es la A de ADME. Por eso la curva sube a lo largo de un par de horas en vez de saltar: una pastilla que se disuelve despacio retrasa el máximo y lo aplana, mientras que la cantidad que llega al final es la misma.",
      label: {child: "Cómo de rápido se deshace la pastilla", adult: "Disolución"},
      info: {
        child: "Gíralo y la pastilla se deshace más rápido o más lento en la barriga, así que el medicamento llega antes o después.",
        adult: "Cambia la rapidez con que la pastilla se disuelve en el estómago. Nada cruza la pared del intestino sin estar disuelto, así que esto adelanta o retrasa el pico sin cambiar la cantidad.",
        expert: "La constante de disolución de la pastilla en el estómago, que fija el paso de absorción y con él el tiempo del máximo.",
      },
    },
    cyp2c9: {
      more: "CYP2C9 es una de las enzimas hepáticas de la familia del citocromo P450, y es la que desmonta la glimepirida, primero a M1 y luego a M2. El gen tiene variantes: *1 es la común, y quien lleva *2 o *3 procesa el fármaco más despacio, la M de ADME a otra velocidad. La misma pastilla deja entonces más fármaco en sangre durante más tiempo, y por eso a veces la dosis se elige a partir del genotipo.",
      label: {child: "Cómo de rápido trabaja el hígado", adult: "Actividad de CYP2C9"},
      info: {
        child: "Bájalo y el hígado desarma la pastilla despacio, así que queda más en la sangre.",
        adult: "Cambia la rapidez con que el hígado desarma el medicamento, la M de ADME. Bajarla es un metabolizador lento: se elimina más despacio y queda más en la sangre.",
        expert: "La actividad de CYP2C9, la enzima que hidroxila la glimepirida a M1. Los topes son los genotipos *1/*1, *1/*2, *1/*3, *2/*3 y *3/*3.",
      },
    },
    cirrhosis: {
      more: "La cirrosis es un hígado en el que años de daño han dejado tejido de cicatriz: se pierde tejido que trabaja, la sangre se abre paso rodeando lo que queda, y las enzimas se van con ello. Cuánto ha avanzado se clasifica en la clínica como Child-Pugh A, B o C. Para un fármaco que el hígado elimina, las tres pérdidas apuntan al mismo lado: se desmonta menos de camino, así que desde la primera pastilla queda más en la sangre.",
      label: {child: "Un hígado enfermo", adult: "Cirrosis"},
      info: {
        child: "Súbelo y el hígado tiene cicatrices: es más pequeño, recibe menos sangre y trabaja peor.",
        adult: "Cambia cómo de cirrótico está el hígado, de sano a Child-Pugh C. Bajan juntos el volumen hepático funcional, el flujo sanguíneo y las enzimas.",
        expert: "El grado de cirrosis, que escala el volumen hepático funcional, el flujo sanguíneo y la actividad enzimática, con las clases de Child-Pugh como topes.",
      },
    },
    renal: {
      more: "Los riñones filtran la sangre y mandan a la orina lo que no se quiere, que es la E de ADME. La glimepirida sale por el hígado, pero sus fragmentos M1 y M2 salen por los riñones, y M1 sigue bajando el azúcar. El aclaramiento de creatinina mide ese filtrado, unos 100 mililitros por minuto en un adulto sano; cuando cae, M1 se queda más tiempo en el cuerpo y la pastilla sigue actuando cuando ya debería haber parado.",
      label: {child: "Los riñones", adult: "Aclaramiento de creatinina"},
      info: {
        child: "Bájalo y los riñones lavan menos, así que los trozos de la pastilla se quedan en la sangre.",
        adult: "Cambia lo que los riñones todavía aclaran, la E de ADME. M1 y M2 salen con la orina, así que la insuficiencia los retiene.",
        expert: "El aclaramiento de creatinina del individuo, que escala el aclaramiento renal de M1 y M2.",
      },
    },
    doses: {
      more: "Una sola pastilla no es como se toma un medicamento. La pastilla de la mañana siguiente llega mientras la anterior todavía se está eliminando, así que el nivel sube de día en día hasta que en un día sale tanto como entra, el estado estacionario, alcanzado tras unas cuatro o cinco vidas medias. Un hígado lento o un riñón débil no solo levanta el primer máximo: levanta la meseta sobre la que se apoya cada día siguiente.",
      label: {child: "Cuántas pastillas", adult: "Pastillas, una al día"},
      info: {
        child: "Gíralo: una pastilla cada mañana, hasta diez mañanas, y mira lo que queda cuando llega la siguiente.",
        adult: "Cambia cuántos días seguidos toma la persona una pastilla, una cada mañana, que es lo que la acumula de día en día.",
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
    const body = `${facts.child ? (facts.sex === "female" ? "Una niña" : "Un niño")
      : (facts.sex === "female" ? "Una mujer" : "Un hombre")} de ${facts.weight} kg`;
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
