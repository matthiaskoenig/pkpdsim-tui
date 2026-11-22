/** What the circulation table says, in the three languages and at the three levels. */

import type {Locale, Phrase, QuizQuestion} from "@pkpdsim-tui/tui-kit";

export interface Named {
  readonly label: Phrase;
  readonly info: Phrase;
}

/** What the sentence of the panel is built from. */
export interface CardioFacts {
  /** Who the table is solved for, as the sentence names them: a girl of 26.8 kg. */
  readonly body: string;
  readonly pressure: string;
  readonly output: string;
  /** What the objects have done, as keys, in the order they were found. */
  readonly done: readonly CardioDone[];
  readonly rate: string;
}

export type CardioDone =
  | "systemicUp" | "systemicDown" | "renalUp" | "rate" | "weak" | "strong";

export interface CardioCopy {
  readonly about: Phrase;
  readonly tries: readonly Phrase[];
  /** The three questions of the quiz, which send a visitor back to the objects. */
  readonly quiz: readonly QuizQuestion[];
  readonly stats: Readonly<Record<
    "systolic" | "diastolic" | "co" | "stroke" | "ppo" | "gradient", Named>>;
  readonly roles: Readonly<Record<
    "systemic" | "renal" | "heartRate" | "contractility", Named>>;
  readonly notes: Readonly<Record<
    "systemic" | "renal" | "heartRate" | "contractility", (value: string) => string>>;
  readonly pulse: {
    readonly title: string;
    readonly aorta: string;
    readonly ventricle: string;
    /** What the dashed curve behind the beats is: the heart before anything was turned. */
    readonly baseline: string;
  };
  /** The beats of the last minute, which is how a faster heart is counted. */
  readonly beats: {
    readonly title: string;
    readonly count: (beats: string) => string;
  };
  /** The monitor of the liver: the blood through it and the pressures around it, over a minute. */
  readonly hepatic: {
    readonly title: string;
    readonly flowTitle: string;
    readonly gradient: string;
    readonly total: string;
    readonly portal: string;
    readonly artery: string;
    readonly portalPressure: string;
    readonly liverPressure: string;
    readonly window: (seconds: number) => string;
  };
  readonly organNote: (name: string, flow: string, share: string, portal: boolean) => string;
  readonly lungNote: (flow: string) => string;
  readonly reading: (facts: CardioFacts) => string;
  /** The person at the table, as the reading names them: the body, and what it weighs. */
  readonly body: (person: {
    sex: "male" | "female"; child: boolean; weight: string;
  }) => string;
  readonly loadingCirculation: string;
  readonly startingHeart: string;
}

const EN: CardioCopy = {
  quiz: [
    {
      id: "pump",
      ask: "The heart beats faster. What happens to the blood in the body?",
      choices: [
        {id: "more", label: "More of it moves every minute"},
        {id: "less", label: "Less of it moves every minute"},
        {id: "same", label: "Nothing changes"},
      ],
      answer: "more",
      because: "Every beat pushes out about the same amount, so more beats move more blood."
        + " That is the cardiac output, and every organ is served out of it.",
      tryIt: "Try it: turn object 1 up and watch the flow through the liver.",
    },
    {
      id: "resistance",
      ask: "A vessel to an organ gets narrower. What does that organ get?",
      choices: [
        {id: "less", label: "Less blood"},
        {id: "more", label: "More blood"},
        {id: "same", label: "The same, it just takes longer"},
      ],
      answer: "less",
      because: "A narrow vessel is a high resistance, and blood takes the easier way. The organ"
        + " behind it gets less, and the pressure in front of it goes up.",
      tryIt: "Try it: turn one of the resistances up and watch its organ go blue.",
    },
    {
      id: "squeeze",
      ask: "Object 2 makes the heart squeeze harder. What does one beat do then?",
      choices: [
        {id: "more", label: "It pushes out more blood"},
        {id: "less", label: "It pushes out less blood"},
        {id: "faster", label: "It beats faster"},
      ],
      answer: "more",
      because: "That object is how hard the muscle squeezes. A harder squeeze empties the"
        + " chamber further, so one beat pushes out more and the whole body gets more blood,"
        + " at the same rate.",
      tryIt: "Try it: turn object 2 up and watch what one beat ejects.",
    },
  ],
  about: {
    child: "Your heart pushes blood around your body all day. Make a vessel narrow or the heart beat faster, and watch what the body does.",
    adult: "The heart pushes five to six litres of blood through the body every minute. Narrow a vessel or change the beat, and the pressures and the flows of the whole body settle somewhere new within a few beats.",
    expert: "The steady pressure network of the pkpdsim circulation, solved algebraically for the anatomy, with the compiled SBML heart beside it for the pulsatile numbers. Every value here is read out of the solution while the objects are turned.",
  },
  tries: [
    {
      child: "Turn object 1: the heart beats faster, and you can see it in the picture.",
      adult: "Turn 1 up: the heart beats faster, and the ventricle empties and fills with it.",
      expert: "Turn 1 up: the rate rises, the filling time falls, and the stroke volume follows the compiled heart.",
    },
    {
      child: "Turn object 3: the vessels of the body get narrow, and the heart has to push harder.",
      adult: "Turn 3 up: the vessels of the body narrow, the pressure rises and the heart moves less blood.",
      expert: "Turn 3 up: the systemic resistance rises, the afterload with it, and the cardiac output falls.",
    },
  ],
  stats: {
    systolic: {
      label: {child: "Push", adult: "Systolic"},
      info: {
        child: "How hard the blood pushes while the heart squeezes.",
        adult: "The highest pressure in the arteries, while the heart is squeezing. It is the first of the two numbers a blood pressure cuff reads.",
        expert: "Peak arterial pressure over the cycle, the upper reading of a cuff.",
      },
    },
    diastolic: {
      label: {child: "Rest", adult: "Diastolic"},
      info: {
        child: "How hard it still pushes between two beats.",
        adult: "The pressure that is left between two beats, while the heart fills again.",
        expert: "Minimum arterial pressure over the cycle, during ventricular filling.",
      },
    },
    co: {
      label: {child: "Blood a minute", adult: "Cardiac output"},
      info: {
        child: "How much blood the heart moves in one minute.",
        adult: "The blood the heart moves in a minute: the rate times what one beat ejects. Five to six litres at rest, four to five times that in an athlete at full effort.",
        expert: "Cardiac output, the product of the heart rate and the stroke volume, integrated over the last beats of the solution.",
      },
    },
    stroke: {
      label: {child: "One beat", adult: "Stroke volume"},
      info: {
        child: "How much blood goes out with one beat of the heart.",
        adult: "What one beat ejects. A failing heart moves less with every beat and makes it up with a faster rate.",
        expert: "Stroke volume of the left ventricle, the cardiac output divided by the rate.",
      },
    },
    ppo: {
      label: {child: "Pressure at the liver", adult: "Portal pressure"},
      info: {
        child: "How hard the blood pushes in the pipe which goes from the gut to the liver.",
        adult: "The pressure in the vein which carries the blood of the gut to the liver. When the liver obstructs it, the blood backs up here: that is portal hypertension.",
        expert: "Mean portal venous pressure, 8 to 10 mmHg in health, and the number which rises first in an obstructed liver.",
      },
    },
    gradient: {
      label: {child: "Lost in the liver", adult: "Portal gradient"},
      info: {
        child: "How much of the push is used up on the way through the liver.",
        adult: "The pressure the blood loses on its way through the liver. A clinician measures it to tell how far a cirrhosis has gone.",
        expert: "The portal to hepatic venous gradient, the HVPG: above 10 mmHg is clinically significant portal hypertension, above 12 the threshold for variceal bleeding.",
      },
    },
  },
  roles: {
    systemic: {
      label: {child: "All the vessels", adult: "Systemic resistance"},
      info: {
        child: "How narrow all the vessels of the body are at once.",
        adult: "Resistance of every systemic organ at once, the afterload of the heart.",
        expert: "The total systemic vascular resistance, the afterload against which the ventricle ejects.",
      },
    },
    renal: {
      label: {child: "The kidneys", adult: "Renal resistance"},
      info: {
        child: "How much blood the kidneys get.",
        adult: "Resistance of the kidneys, on top of the systemic resistance.",
        expert: "The renal vascular resistance, in series with the systemic one, which sets the renal fraction of the cardiac output.",
      },
    },
    heartRate: {
      label: {child: "How fast the heart beats", adult: "Heart rate"},
      info: {
        child: "How often your heart beats in a minute. Running makes it fast.",
        adult: "How often the heart beats. The beat on the table is the one the compiled heart is solved with, so the numbers belong to that rate.",
        expert: "The heart rate the compiled SBML heart is solved at, from 40 to 150 a minute. The filling time follows it.",
      },
    },
    contractility: {
      label: {child: "How hard the heart squeezes", adult: "Contractility"},
      info: {
        child: "How strongly the heart squeezes. A tired heart squeezes weakly.",
        adult: "How hard the ventricles squeeze. Turning it down is a heart which is failing: it moves less blood with every beat.",
        expert: "The contractility of the ventricles. Lowering it is systolic heart failure: the stroke volume falls and the end systolic volume rises.",
      },
    },
  },
  notes: {
    systemic: value => `blood pressure ${value}`,
    renal: value => `renal flow ${value} l/min`,
    heartRate: value => `cardiac output ${value} l/min`,
    contractility: value => `stroke volume ${value} ml`,
  },
  pulse: {title: "The beat of the heart", aorta: "aorta", ventricle: "ventricle",
    baseline: "at rest"},
  beats: {
    title: "The beats of the last minute",
    count: beats => `${beats} beats`,
  },
  hepatic: {
    title: "The liver, over the last minute",
    flowTitle: "blood through the liver",
    gradient: "pressure across it",
    total: "liver", portal: "portal vein", artery: "artery",
    portalPressure: "in front of the liver", liverPressure: "inside it",
    window: seconds => `${seconds} s`,
  },
  organNote: (name, flow, share, portal) => `${name}: ${flow} litres a minute, ${share} out of `
    + `every 100 the heart moves`
    + (portal ? ". Its blood goes on through the portal vein to the liver before it returns." : "."),
  lungNote: flow => `The lungs take everything the heart moves: ${flow} litres a minute.`,
  reading: facts => {
    const body = facts.body;
    const said: Record<CardioDone, string> = {
      systemicUp: "the vessels of the body are narrowed",
      systemicDown: "the vessels of the body are wide open",
      renalUp: "the kidneys get less blood",
      rate: `the heart beats ${facts.rate} times a minute`,
      weak: "the heart squeezes weakly",
      strong: "the heart squeezes harder",
    };
    const pressure = `${facts.pressure}, ${facts.output} litres a minute.`;
    if (facts.done.length === 0) return `${body} at rest: ${pressure}`;
    const first = facts.done.slice(0, 2).map(key => said[key]);
    const sentence = first.length === 1 ? first[0] : `${first[0]} and ${first[1]}`;
    return `${body} in whom ${sentence}: ${pressure}`;
  },
  body: ({sex, child, weight}) => `${child ? (sex === "female" ? "A girl" : "A boy")
    : (sex === "female" ? "A woman" : "A man")} of ${weight} kg`,
  loadingCirculation: "Loading the circulation...",
  startingHeart: "Starting the heart...",
};

const DE: CardioCopy = {
  quiz: [
    {
      id: "pump",
      ask: "Das Herz schlägt schneller. Was passiert mit dem Blut im Körper?",
      choices: [
        {id: "more", label: "Es fließt mehr pro Minute"},
        {id: "less", label: "Es fließt weniger pro Minute"},
        {id: "same", label: "Es ändert sich nichts"},
      ],
      answer: "more",
      because: "Jeder Schlag pumpt ungefähr gleich viel heraus, also fließt bei mehr Schlägen mehr"
        + " Blut. Das ist das Herzzeitvolumen, und daraus werden alle Organe versorgt.",
      tryIt: "Probier es: Dreh Objekt 1 hoch und sieh dir den Fluss durch die Leber an.",
    },
    {
      id: "resistance",
      ask: "Ein Gefäß zu einem Organ wird enger. Was bekommt dieses Organ?",
      choices: [
        {id: "less", label: "Weniger Blut"},
        {id: "more", label: "Mehr Blut"},
        {id: "same", label: "Gleich viel, es dauert nur länger"},
      ],
      answer: "less",
      because: "Ein enges Gefäß ist ein hoher Widerstand, und Blut nimmt den leichteren Weg. Das"
        + " Organ dahinter bekommt weniger, und der Druck davor steigt.",
      tryIt: "Probier es: Dreh einen Widerstand hoch und sieh zu, wie sein Organ blau wird.",
    },
    {
      id: "squeeze",
      ask: "Objekt 2 lässt das Herz kräftiger drücken. Was macht ein Schlag dann?",
      choices: [
        {id: "more", label: "Er pumpt mehr Blut aus"},
        {id: "less", label: "Er pumpt weniger Blut aus"},
        {id: "faster", label: "Er schlägt schneller"},
      ],
      answer: "more",
      because: "Dieses Objekt ist, wie kräftig der Muskel drückt. Kräftiger drücken leert die"
        + " Kammer weiter, ein Schlag pumpt mehr aus, und der ganze Körper bekommt mehr Blut -"
        + " bei gleichem Takt.",
      tryIt: "Probier es: Dreh Objekt 2 hoch und sieh, was ein Schlag auswirft.",
    },
  ],
  about: {
    child: "Dein Herz pumpt den ganzen Tag Blut durch deinen Körper. Mach ein Gefäß enger oder das Herz schneller und schau, was der Körper macht.",
    adult: "Das Herz pumpt fünf bis sechs Liter Blut pro Minute durch den Körper. Verengen Sie ein Gefäß oder ändern Sie den Herzschlag, und Drücke und Flüsse des ganzen Körpers stellen sich innerhalb weniger Schläge neu ein.",
    expert: "Das stationäre Drucknetzwerk des Kreislaufs von pkpdsim, algebraisch für die Anatomie gelöst, daneben das kompilierte SBML-Herz für die pulsatilen Zahlen. Jeder Wert hier wird aus der Lösung abgelesen, während die Objekte gedreht werden.",
  },
  tries: [
    {
      child: "Dreh Objekt 1: das Herz schlägt schneller, und du siehst es im Bild.",
      adult: "Drehen Sie 1 hoch: das Herz schlägt schneller, und die Kammer leert und füllt sich im selben Takt.",
      expert: "Drehen Sie 1 hoch: die Frequenz steigt, die Füllungszeit sinkt, und das Schlagvolumen folgt dem kompilierten Herzen.",
    },
    {
      child: "Dreh Objekt 3: die Gefäße des Körpers werden eng, und das Herz muss stärker drücken.",
      adult: "Drehen Sie 3 hoch: die Gefäße des Körpers werden enger, der Druck steigt und das Herz bewegt weniger Blut.",
      expert: "Drehen Sie 3 hoch: der systemische Widerstand steigt, mit ihm die Nachlast, und das Herzzeitvolumen fällt.",
    },
  ],
  stats: {
    systolic: {
      label: {child: "Druck beim Schlag", adult: "Systolisch"},
      info: {
        child: "Wie stark das Blut drückt, während das Herz zusammenpresst.",
        adult: "Der höchste Druck in den Arterien, während das Herz zusammenpresst. Das ist die erste der beiden Zahlen einer Blutdruckmanschette.",
        expert: "Der Spitzendruck in der Aorta über den Zyklus, der obere Wert der Manschette.",
      },
    },
    diastolic: {
      label: {child: "Druck in der Pause", adult: "Diastolisch"},
      info: {
        child: "Wie stark es zwischen zwei Schlägen noch drückt.",
        adult: "Der Druck, der zwischen zwei Schlägen übrig bleibt, während sich das Herz wieder füllt.",
        expert: "Der minimale arterielle Druck über den Zyklus, während der Kammerfüllung.",
      },
    },
    co: {
      label: {child: "Blut pro Minute", adult: "Herzzeitvolumen"},
      info: {
        child: "Wie viel Blut das Herz in einer Minute bewegt.",
        adult: "Das Blut, das das Herz in einer Minute bewegt: die Frequenz mal das, was ein Schlag auswirft. In Ruhe fünf bis sechs Liter, bei voller Anstrengung das Vier- bis Fünffache.",
        expert: "Das Herzzeitvolumen, Produkt aus Herzfrequenz und Schlagvolumen, integriert über die letzten Schläge der Lösung.",
      },
    },
    stroke: {
      label: {child: "Ein Schlag", adult: "Schlagvolumen"},
      info: {
        child: "Wie viel Blut mit einem Herzschlag hinausgeht.",
        adult: "Was ein Schlag auswirft. Ein schwaches Herz bewegt pro Schlag weniger und gleicht es mit einer höheren Frequenz aus.",
        expert: "Das Schlagvolumen der linken Kammer, Herzzeitvolumen geteilt durch die Frequenz.",
      },
    },
    ppo: {
      label: {child: "Druck an der Leber", adult: "Pfortaderdruck"},
      info: {
        child: "Wie stark das Blut in dem Rohr drückt, das vom Darm zur Leber geht.",
        adult: "Der Druck in der Vene, die das Blut des Darms zur Leber bringt. Wenn die Leber sie behindert, staut sich das Blut hier: das ist portale Hypertension.",
        expert: "Mittlerer Pfortaderdruck, gesund 8 bis 10 mmHg, und die Zahl, die bei behindertem Abfluss zuerst steigt.",
      },
    },
    gradient: {
      label: {child: "In der Leber verloren", adult: "Pfortadergradient"},
      info: {
        child: "Wie viel vom Druck auf dem Weg durch die Leber verbraucht wird.",
        adult: "Der Druck, den das Blut auf seinem Weg durch die Leber verliert. Ärztinnen und Ärzte messen ihn, um zu sagen, wie weit eine Zirrhose fortgeschritten ist.",
        expert: "Der portal-hepatovenöse Gradient, der HVPG: über 10 mmHg klinisch signifikante portale Hypertension, über 12 die Schwelle für Varizenblutungen.",
      },
    },
  },
  roles: {
    systemic: {
      label: {child: "Alle Gefäße", adult: "Systemischer Widerstand"},
      info: {
        child: "Wie eng alle Gefäße des Körpers auf einmal sind.",
        adult: "Widerstand aller systemischen Organe auf einmal, die Nachlast des Herzens.",
        expert: "Der totale periphere Widerstand, die Nachlast, gegen die die Kammer auswirft.",
      },
    },
    renal: {
      label: {child: "Die Nieren", adult: "Nierenwiderstand"},
      info: {
        child: "Wie viel Blut die Nieren bekommen.",
        adult: "Widerstand der Nieren, zusätzlich zum systemischen Widerstand.",
        expert: "Der renale Gefäßwiderstand, in Reihe mit dem systemischen, der den Nierenanteil am Herzzeitvolumen bestimmt.",
      },
    },
    heartRate: {
      label: {child: "Wie schnell das Herz schlägt", adult: "Herzfrequenz"},
      info: {
        child: "Wie oft dein Herz in einer Minute schlägt. Beim Rennen wird es schnell.",
        adult: "Wie oft das Herz schlägt. Der Schlag auf dem Tisch ist der, mit dem das kompilierte Herz gerechnet wird, also gehören die Zahlen zu dieser Frequenz.",
        expert: "Die Herzfrequenz, mit der das kompilierte SBML-Herz gelöst wird, 40 bis 150 pro Minute. Die Füllungszeit folgt ihr.",
      },
    },
    contractility: {
      label: {child: "Wie stark das Herz drückt", adult: "Kontraktilität"},
      info: {
        child: "Wie kräftig das Herz zusammenpresst. Ein müdes Herz drückt schwach.",
        adult: "Wie kräftig die Kammern zusammenpressen. Nach unten gedreht ist es ein versagendes Herz: es bewegt mit jedem Schlag weniger Blut.",
        expert: "Die Kontraktilität der Kammern. Sie zu senken ist systolische Herzinsuffizienz: das Schlagvolumen fällt, das endsystolische Volumen steigt.",
      },
    },
  },
  notes: {
    systemic: value => `Blutdruck ${value}`,
    renal: value => `Nierenfluss ${value} l/min`,
    heartRate: value => `Herzzeitvolumen ${value} l/min`,
    contractility: value => `Schlagvolumen ${value} ml`,
  },
  pulse: {title: "Der Herzschlag", aorta: "Aorta", ventricle: "Kammer",
    baseline: "in Ruhe"},
  beats: {
    title: "Die Schläge der letzten Minute",
    count: beats => `${beats} Schläge`,
  },
  hepatic: {
    title: "Die Leber, letzte Minute",
    flowTitle: "Blut durch die Leber",
    gradient: "Druckunterschied",
    total: "Leber", portal: "Pfortader", artery: "Arterie",
    portalPressure: "vor der Leber", liverPressure: "in der Leber",
    window: seconds => `${seconds} s`,
  },
  organNote: (name, flow, share, portal) => `${name}: ${flow} Liter pro Minute, ${share} von je `
    + "100, die das Herz bewegt"
    + (portal ? ". Sein Blut fließt durch die Pfortader weiter zur Leber, bevor es zurückkommt." : "."),
  lungNote: flow => `Die Lunge nimmt alles auf, was das Herz bewegt: ${flow} Liter pro Minute.`,
  reading: facts => {
    const body = facts.body;
    const said: Record<CardioDone, string> = {
      systemicUp: "die Gefäße des Körpers verengt sind",
      systemicDown: "die Gefäße des Körpers weit offen sind",
      renalUp: "die Nieren weniger Blut bekommen",
      rate: `das Herz ${facts.rate} mal pro Minute schlägt`,
      weak: "das Herz schwach drückt",
      strong: "das Herz kräftiger drückt",
    };
    const pressure = `${facts.pressure}, ${facts.output} Liter pro Minute.`;
    if (facts.done.length === 0) return `${body} in Ruhe: ${pressure}`;
    const first = facts.done.slice(0, 2).map(key => said[key]);
    const sentence = first.length === 1 ? first[0] : `${first[0]} und ${first[1]}`;
    return `${body}, bei dem ${sentence}: ${pressure}`;
  },
  body: ({sex, child, weight}) => `${child ? (sex === "female" ? "Ein Mädchen" : "Ein Junge")
    : (sex === "female" ? "Eine Frau" : "Ein Mann")} von ${weight} kg`,
  loadingCirculation: "Der Kreislauf wird geladen...",
  startingHeart: "Das Herz wird gestartet...",
};

const ES: CardioCopy = {
  quiz: [
    {
      id: "pump",
      ask: "El corazón late más rápido. ¿Qué pasa con la sangre del cuerpo?",
      choices: [
        {id: "more", label: "Circula más cada minuto"},
        {id: "less", label: "Circula menos cada minuto"},
        {id: "same", label: "No cambia nada"},
      ],
      answer: "more",
      because: "Cada latido expulsa más o menos lo mismo, así que con más latidos circula más"
        + " sangre. Eso es el gasto cardíaco, y de ahí se sirven todos los órganos.",
      tryIt: "Pruébalo: sube el objeto 1 y mira el flujo por el hígado.",
    },
    {
      id: "resistance",
      ask: "Un vaso que lleva a un órgano se estrecha. ¿Qué recibe ese órgano?",
      choices: [
        {id: "less", label: "Menos sangre"},
        {id: "more", label: "Más sangre"},
        {id: "same", label: "Lo mismo, solo que más lento"},
      ],
      answer: "less",
      because: "Un vaso estrecho es una resistencia alta, y la sangre toma el camino más fácil. El"
        + " órgano de detrás recibe menos y la presión delante sube.",
      tryIt: "Pruébalo: sube una de las resistencias y mira cómo su órgano se vuelve azul.",
    },
    {
      id: "squeeze",
      ask: "El objeto 2 hace que el corazón apriete más fuerte. ¿Qué hace entonces un latido?",
      choices: [
        {id: "more", label: "Expulsa más sangre"},
        {id: "less", label: "Expulsa menos sangre"},
        {id: "faster", label: "Late más rápido"},
      ],
      answer: "more",
      because: "Ese objeto es la fuerza con la que aprieta el músculo. Apretar más vacía más la"
        + " cámara, así que un latido expulsa más y todo el cuerpo recibe más sangre, al mismo"
        + " ritmo.",
      tryIt: "Pruébalo: sube el objeto 2 y mira lo que expulsa un latido.",
    },
  ],
  about: {
    child: "Tu corazón empuja sangre por todo tu cuerpo todo el día. Estrecha un vaso o haz que lata más rápido y mira qué hace el cuerpo.",
    adult: "El corazón empuja de cinco a seis litros de sangre por el cuerpo cada minuto. Estreche un vaso o cambie el latido, y las presiones y los flujos de todo el cuerpo se asientan en otro punto en pocos latidos.",
    expert: "La red de presiones estacionaria de la circulación de pkpdsim, resuelta algebraicamente para la anatomía, con el corazón SBML compilado al lado para los números pulsátiles. Cada valor se lee de la solución mientras se giran los objetos.",
  },
  tries: [
    {
      child: "Gira el objeto 1: el corazón late más rápido y se ve en el dibujo.",
      adult: "Gire el 1 hacia arriba: el corazón late más rápido, y el ventrículo se vacía y se llena a ese ritmo.",
      expert: "Gire el 1 hacia arriba: la frecuencia sube, el tiempo de llenado baja, y el volumen sistólico sigue al corazón compilado.",
    },
    {
      child: "Gira el objeto 3: los vasos del cuerpo se estrechan y el corazón tiene que empujar más.",
      adult: "Gire el 3 hacia arriba: los vasos del cuerpo se estrechan, la presión sube y el corazón mueve menos sangre.",
      expert: "Gire el 3 hacia arriba: la resistencia sistémica sube, con ella la poscarga, y el gasto cardíaco cae.",
    },
  ],
  stats: {
    systolic: {
      label: {child: "Empuje", adult: "Sistólica"},
      info: {
        child: "Con cuánta fuerza empuja la sangre mientras el corazón aprieta.",
        adult: "La presión más alta en las arterias, mientras el corazón aprieta. Es el primero de los dos números que lee un tensiómetro.",
        expert: "Presión arterial máxima del ciclo, la cifra superior del manguito.",
      },
    },
    diastolic: {
      label: {child: "Descanso", adult: "Diastólica"},
      info: {
        child: "Con cuánta fuerza sigue empujando entre dos latidos.",
        adult: "La presión que queda entre dos latidos, mientras el corazón vuelve a llenarse.",
        expert: "Presión arterial mínima del ciclo, durante el llenado ventricular.",
      },
    },
    co: {
      label: {child: "Sangre por minuto", adult: "Gasto cardíaco"},
      info: {
        child: "Cuánta sangre mueve el corazón en un minuto.",
        adult: "La sangre que el corazón mueve en un minuto: la frecuencia por lo que expulsa un latido. Cinco o seis litros en reposo, cuatro o cinco veces más en un atleta a tope.",
        expert: "Gasto cardíaco, producto de la frecuencia por el volumen sistólico, integrado sobre los últimos latidos de la solución.",
      },
    },
    stroke: {
      label: {child: "Un latido", adult: "Volumen sistólico"},
      info: {
        child: "Cuánta sangre sale con un latido del corazón.",
        adult: "Lo que expulsa un latido. Un corazón que falla mueve menos en cada latido y lo compensa latiendo más rápido.",
        expert: "Volumen sistólico del ventrículo izquierdo, el gasto cardíaco dividido por la frecuencia.",
      },
    },
    ppo: {
      label: {child: "Presión en el hígado", adult: "Presión portal"},
      info: {
        child: "Con cuánta fuerza empuja la sangre en el tubo que va del intestino al hígado.",
        adult: "La presión en la vena que lleva la sangre del intestino al hígado. Cuando el hígado la obstruye, la sangre se acumula aquí: eso es la hipertensión portal.",
        expert: "Presión portal media, 8 a 10 mmHg en salud, y el número que sube primero con un flujo de salida obstruido.",
      },
    },
    gradient: {
      label: {child: "Perdido en el hígado", adult: "Gradiente portal"},
      info: {
        child: "Cuánto empuje se gasta al pasar por el hígado.",
        adult: "La presión que pierde la sangre al atravesar el hígado. Se mide en la clínica para saber cuánto ha avanzado una cirrosis.",
        expert: "El gradiente de presión venosa hepática, el HVPG: por encima de 10 mmHg hipertensión portal clínicamente significativa, por encima de 12 el umbral de sangrado por varices.",
      },
    },
  },
  roles: {
    systemic: {
      label: {child: "Todos los vasos", adult: "Resistencia sistémica"},
      info: {
        child: "Cómo de estrechos están todos los vasos del cuerpo a la vez.",
        adult: "Resistencia de todos los órganos sistémicos a la vez, la poscarga del corazón.",
        expert: "La resistencia vascular sistémica total, la poscarga contra la que eyecta el ventrículo.",
      },
    },
    renal: {
      label: {child: "Los riñones", adult: "Resistencia renal"},
      info: {
        child: "Cuánta sangre reciben los riñones.",
        adult: "Resistencia de los riñones, además de la resistencia sistémica.",
        expert: "La resistencia vascular renal, en serie con la sistémica, que fija la fracción renal del gasto cardíaco.",
      },
    },
    heartRate: {
      label: {child: "Cómo de rápido late", adult: "Frecuencia cardíaca"},
      info: {
        child: "Cuántas veces late tu corazón en un minuto. Corriendo late rápido.",
        adult: "Cada cuánto late el corazón. El latido de la mesa es aquel con el que se resuelve el corazón compilado, así que los números pertenecen a esa frecuencia.",
        expert: "La frecuencia a la que se resuelve el corazón SBML compilado, de 40 a 150 por minuto. El tiempo de llenado la sigue.",
      },
    },
    contractility: {
      label: {child: "Con cuánta fuerza aprieta", adult: "Contractilidad"},
      info: {
        child: "Con cuánta fuerza aprieta el corazón. Un corazón cansado aprieta poco.",
        adult: "Con cuánta fuerza aprietan los ventrículos. Girarlo hacia abajo es un corazón que falla: mueve menos sangre en cada latido.",
        expert: "La contractilidad de los ventrículos. Bajarla es insuficiencia cardíaca sistólica: el volumen sistólico cae y el volumen telesistólico sube.",
      },
    },
  },
  notes: {
    systemic: value => `tensión arterial ${value}`,
    renal: value => `flujo renal ${value} l/min`,
    heartRate: value => `gasto cardíaco ${value} l/min`,
    contractility: value => `volumen sistólico ${value} ml`,
  },
  pulse: {title: "El latido del corazón", aorta: "aorta", ventricle: "ventrículo",
    baseline: "en reposo"},
  beats: {
    title: "Los latidos del último minuto",
    count: beats => `${beats} latidos`,
  },
  hepatic: {
    title: "El hígado, último minuto",
    flowTitle: "sangre por el hígado",
    gradient: "diferencia de presión",
    total: "hígado", portal: "vena porta", artery: "arteria",
    portalPressure: "antes del hígado", liverPressure: "dentro de él",
    window: seconds => `${seconds} s`,
  },
  organNote: (name, flow, share, portal) => `${name}: ${flow} litros por minuto, ${share} de `
    + "cada 100 que mueve el corazón"
    + (portal ? ". Su sangre sigue por la vena porta hasta el hígado antes de volver." : "."),
  lungNote: flow => `Los pulmones reciben todo lo que mueve el corazón: ${flow} litros por minuto.`,
  reading: facts => {
    const body = facts.body;
    const said: Record<CardioDone, string> = {
      systemicUp: "los vasos del cuerpo están estrechados",
      systemicDown: "los vasos del cuerpo están bien abiertos",
      renalUp: "los riñones reciben menos sangre",
      rate: `el corazón late ${facts.rate} veces por minuto`,
      weak: "el corazón aprieta débilmente",
      strong: "el corazón aprieta con más fuerza",
    };
    const pressure = `${facts.pressure}, ${facts.output} litros por minuto.`;
    if (facts.done.length === 0) return `${body} en reposo: ${pressure}`;
    const first = facts.done.slice(0, 2).map(key => said[key]);
    const sentence = first.length === 1 ? first[0] : `${first[0]} y ${first[1]}`;
    return `${body} en quien ${sentence}: ${pressure}`;
  },
  body: ({sex, child, weight}) => `${child ? (sex === "female" ? "Una niña" : "Un niño")
    : (sex === "female" ? "Una mujer" : "Un hombre")} de ${weight} kg`,
  loadingCirculation: "Cargando la circulación...",
  startingHeart: "Arrancando el corazón...",
};

export const CARDIO_TEXT: Readonly<Record<Locale, CardioCopy>> = {en: EN, de: DE, es: ES};
