/**
 * What the application says about itself, in the three languages and at the three levels: the
 * heading of the landing page, the card of every table, and the words of the switches. A table
 * says its own numbers; this is what a visitor reads before they have opened anything.
 */

import type {Level, Locale, Phrase} from "@pkpdsim-tui/tui-kit";

/** What one table is called and what it is, on its card and behind it. */
export interface EntryCopy {
  /** One or two words, for the switch in the panel of every table. */
  readonly label: string;
  /** The heading of the card and the title of the page. */
  readonly title: string;
  /** The one line on the card. */
  readonly blurb: Phrase;
  /** The whole of it, behind the card. */
  readonly about: Phrase;
}

export interface HubCopy {
  readonly heading: string;
  /** The two lines under the heading: what there is to learn here. */
  readonly motivation: Readonly<Record<Level, readonly string[]>>;
  readonly headingInfo: Phrase;
  /** What a visitor is invited to do, by what the page is driven by. */
  readonly clickToOpen: string;
  readonly touchToOpen: string;
  readonly bothToOpen: string;
  readonly clickHint: string;
  readonly touchHint: string;
  readonly bothHint: string;
  /** What a body is, behind it. */
  readonly bodyInfo: Readonly<Record<"male" | "female", Phrase>>;
  /** What the boot screen says while the bodies are loading, and when nothing can be shown. */
  readonly loadingBodies: string;
  readonly loadingTable: string;
  readonly failed: string;
  readonly failedHint: string;
  /** The laboratory at the foot of the page, and the square which points at it. */
  readonly labName: string;
  readonly labPlace: string;
  readonly labInfo: string;
  readonly entries: Readonly<Record<string, EntryCopy>>;
}

const EN: HubCopy = {
  labName: "Prof. Dr. Matthias König",
  labPlace: "University of Lübeck and Humboldt-Universität zu Berlin",
  labInfo: "The laboratory these models come from. The square takes a phone to",
  heading: "The body on the table",
  motivation: {
    child: [
      "Five models of the human body you can move with your hands.",
      "Follow the blood, meet the liver, and see where a tablet goes.",
    ],
    adult: [
      "Five working models of the human body, solved while you move the objects on the glass.",
      "How the blood reaches every organ, what the liver does with it, and where a tablet goes.",
    ],
    expert: [
      "Five pkpdsim models, solved live: the circulation, the liver and its two supplies, lobe resection and regeneration, a glimepiride PBPK, and a liver in machine perfusion.",
      "Every object on the glass is a parameter of the exported SBML, and every number is read out of the solution.",
    ],
  },
  headingInfo: {
    child: "Every table here is a model of the body. Move the objects and the body answers.",
    adult: "Every table here is one model of the human body of pkpdsim. The objects on the glass are its parameters, and the model is solved again while you turn them.",
    expert: "Every table is an export of pkpdsim: a compiled SBML model solved in the browser, or the algebraic reduction of one. The objects are parameters, and the band of numbers is read out of the solution.",
  },
  clickToOpen: "Click to open",
  touchToOpen: "Touch to open",
  bothToOpen: "Touch or click to open",
  clickHint: "Click a card to open its table.",
  touchHint: "Hold a finger on a card to open its table.",
  bothHint: "Hold a finger on a card, or click it, to open its table.",
  bodyInfo: {
    male: {
      child: "A grown man. Touch him, and every table uses his body.",
      adult: "The male reference body of pkpdsim. Touch it, and every table is solved for him.",
      expert: "The male reference individual of the pkpdsim physiology, 73 kg at 176 cm. Every table is solved on its export.",
    },
    female: {
      child: "A grown woman. Touch her, and every table uses her body.",
      adult: "The female reference body of pkpdsim. Touch it, and every table is solved for her.",
      expert: "The female reference individual of the pkpdsim physiology, 60 kg at 163 cm, with its own organ volumes and blood flows.",
    },
  },
  loadingBodies: "Loading the bodies...",
  loadingTable: "Loading the table...",
  failed: "The table could not start",
  failedHint: "The exported models and reference data are copied in with \"npm run sync\".",
  entries: {
    cardiovascular: {
      label: "Circulation", title: "The circulation",
      blurb: {child: "Where does your blood go?", adult: "How the blood reaches every organ."},
      about: {
        child: "Your heart pushes blood to every part of you, again and again. Make a vessel narrow, or the heart beat faster, and see what changes.",
        adult: "The heart pushes five to six litres of blood through the body every minute. Narrow the vessels of an organ or change the beat, and watch the pressures and the flows of the whole body settle somewhere new.",
        expert: "The steady pressure network of the pkpdsim cardiovascular model, with four organ resistances, the heart rate and the contractility as objects. The pressures, the flows and the cardiac output follow from the algebraic solution, and the compiled SBML heart beats beside it.",
      },
    },
    liver: {
      label: "Liver", title: "The liver",
      blurb: {child: "Why do you need a liver?", adult: "Why the body needs a liver."},
      about: {
        child: "Everything you eat goes to the liver first. It has two pipes bringing blood, and it checks what arrives before the rest of you gets it.",
        adult: "Everything the gut absorbs passes the liver before it reaches the rest of the body. See where its two blood supplies come from, what happens along one sinusoid, and what the liver does to a drug.",
        expert: "The dual supply of the liver: three quarters of its flow from the portal vein, one quarter from the hepatic artery, with the portal pressure and the gradient from the steady pressure network, and one lobule with its three zones.",
      },
    },
    lobes: {
      label: "Lobes", title: "The lobed liver",
      blurb: {child: "Cut a piece off and watch it grow back.", adult: "Cut a piece away, watch it grow back."},
      about: {
        child: "A liver is built of eight pieces. A doctor can take some away, and the rest grows until the liver is big enough again.",
        adult: "A liver is built of eight pieces, each with its own blood supply. Clamp them or cut them away, and see how much of its work the rest can still do, and how it grows back over the days which follow.",
        expert: "Couinaud segments as independent units: portal vein ligation and resection change the functional liver mass, and the regeneration follows the days after the operation on the model of pkpdsim.",
      },
    },
    glimepiride: {
      label: "Glimepiride", title: "One tablet, two people",
      blurb: {child: "What happens to a tablet?", adult: "What the liver does to a tablet."},
      about: {
        child: "Swallow a tablet and it travels: into the gut, to the liver, into the blood, and out again. In two people the same tablet does different things.",
        adult: "Swallow a tablet of a diabetes drug and follow it through the gut, the liver and the kidneys. Change who the person is, and the same tablet does something else.",
        expert: "The whole body PBPK model of glimepiride: the dose, the CYP2C9 genotype, the liver and kidney function and the body weight of one individual, solved with SUNDIALS IDA on the compiled SBML.",
      },
    },
    perfusion: {
      label: "Perfusion", title: "The liver on the machine",
      blurb: {child: "A liver that lives outside the body.", adult: "A liver kept alive outside the body."},
      about: {
        child: "A liver can live outside a body for a while. A machine pumps warm liquid with oxygen through it, and you decide how much it gets.",
        adult: "A liver taken out of the body stays alive on a machine which pumps warm, oxygen rich fluid through it. Set the pump, the oxygen and the temperature, and watch what the organ makes of them.",
        expert: "A normothermic machine perfusion of a rat liver from the perfusion library of pkpdsim: the pump, the oxygen of the perfusate and the temperature of the circuit over six hours, with the oxygen gradient along four zones of the sinusoid.",
      },
    },
  },
};

const DE: HubCopy = {
  labName: "Prof. Dr. Matthias König",
  labPlace: "Universität zu Lübeck und Humboldt-Universität zu Berlin",
  labInfo: "Das Labor, aus dem diese Modelle kommen. Das Quadrat bringt ein Telefon zu",
  heading: "Der Körper auf dem Tisch",
  motivation: {
    child: [
      "Fünf Modelle des menschlichen Körpers, die du mit den Händen bewegen kannst.",
      "Folge dem Blut, lerne die Leber kennen und schau, wohin eine Tablette geht.",
    ],
    adult: [
      "Fünf arbeitende Modelle des menschlichen Körpers, gerechnet während Sie die Objekte auf dem Glas bewegen.",
      "Wie das Blut zu jedem Organ kommt, was die Leber damit macht, und wohin eine Tablette geht.",
    ],
    expert: [
      "Fünf Modelle aus pkpdsim, live gerechnet: der Kreislauf, die Leber mit ihren zwei Zuflüssen, Resektion und Regeneration der Lappen, ein PBPK-Modell von Glimepirid und eine Leber in Maschinenperfusion.",
      "Jedes Objekt auf dem Glas ist ein Parameter des exportierten SBML, und jede Zahl wird aus der Lösung abgelesen.",
    ],
  },
  headingInfo: {
    child: "Jeder Tisch hier ist ein Modell des Körpers. Bewege die Objekte, und der Körper antwortet.",
    adult: "Jeder Tisch hier ist ein Modell des menschlichen Körpers aus pkpdsim. Die Objekte auf dem Glas sind seine Parameter, und das Modell wird neu gerechnet, während Sie sie drehen.",
    expert: "Jeder Tisch ist ein Export aus pkpdsim: ein kompiliertes SBML-Modell, das im Browser gelöst wird, oder dessen algebraische Reduktion. Die Objekte sind Parameter, und das Zahlenband wird aus der Lösung abgelesen.",
  },
  clickToOpen: "Zum Öffnen klicken",
  touchToOpen: "Zum Öffnen berühren",
  bothToOpen: "Berühren oder klicken",
  clickHint: "Klicken Sie eine Karte an, um ihren Tisch zu öffnen.",
  touchHint: "Halten Sie einen Finger auf eine Karte, um ihren Tisch zu öffnen.",
  bothHint: "Halten Sie einen Finger auf eine Karte oder klicken Sie sie an.",
  bodyInfo: {
    male: {
      child: "Ein erwachsener Mann. Berühre ihn, dann rechnet jeder Tisch mit seinem Körper.",
      adult: "Der männliche Referenzkörper von pkpdsim. Berühren Sie ihn, und jeder Tisch rechnet für ihn.",
      expert: "Das männliche Referenzindividuum der Physiologie von pkpdsim, 73 kg bei 176 cm. Jeder Tisch rechnet auf dessen Export.",
    },
    female: {
      child: "Eine erwachsene Frau. Berühre sie, dann rechnet jeder Tisch mit ihrem Körper.",
      adult: "Der weibliche Referenzkörper von pkpdsim. Berühren Sie ihn, und jeder Tisch rechnet für sie.",
      expert: "Das weibliche Referenzindividuum der Physiologie von pkpdsim, 60 kg bei 163 cm, mit eigenen Organvolumina und Blutflüssen.",
    },
  },
  loadingBodies: "Die Körper werden geladen...",
  loadingTable: "Der Tisch wird geladen...",
  failed: "Der Tisch konnte nicht starten",
  failedHint: "Die exportierten Modelle und Referenzdaten werden mit \"npm run sync\" kopiert.",
  entries: {
    cardiovascular: {
      label: "Kreislauf", title: "Der Kreislauf",
      blurb: {child: "Wohin fließt dein Blut?", adult: "Wie das Blut zu jedem Organ kommt."},
      about: {
        child: "Dein Herz pumpt Blut in jeden Teil von dir, immer wieder. Mach ein Gefäß enger oder das Herz schneller und schau, was sich ändert.",
        adult: "Das Herz pumpt fünf bis sechs Liter Blut pro Minute durch den Körper. Verengen Sie die Gefäße eines Organs oder ändern Sie den Herzschlag, und sehen Sie zu, wie sich Drücke und Flüsse im ganzen Körper neu einstellen.",
        expert: "Das stationäre Drucknetzwerk des Kreislaufmodells von pkpdsim, mit vier Organwiderständen, Herzfrequenz und Kontraktilität als Objekten. Drücke, Flüsse und Herzzeitvolumen folgen aus der algebraischen Lösung, und daneben schlägt das kompilierte SBML-Herz.",
      },
    },
    liver: {
      label: "Leber", title: "Die Leber",
      blurb: {child: "Wozu brauchst du eine Leber?", adult: "Warum der Körper eine Leber braucht."},
      about: {
        child: "Alles, was du isst, kommt zuerst zur Leber. Sie hat zwei Rohre, die Blut bringen, und prüft alles, bevor der Rest von dir es bekommt.",
        adult: "Alles, was der Darm aufnimmt, passiert die Leber, bevor es den Rest des Körpers erreicht. Sehen Sie, woher ihre zwei Blutzuflüsse kommen, was entlang eines Sinusoids geschieht, und was die Leber mit einem Medikament macht.",
        expert: "Die duale Blutversorgung der Leber: drei Viertel des Flusses aus der Pfortader, ein Viertel aus der Leberarterie, mit Pfortaderdruck und Gradient aus dem stationären Drucknetzwerk, und ein Läppchen mit seinen drei Zonen.",
      },
    },
    lobes: {
      label: "Lappen", title: "Die Leberlappen",
      blurb: {child: "Schneide ein Stück weg und sieh zu, wie es nachwächst.", adult: "Ein Stück wegnehmen und nachwachsen sehen."},
      about: {
        child: "Eine Leber besteht aus acht Stücken. Ärzte können etwas davon wegnehmen, und der Rest wächst, bis die Leber wieder groß genug ist.",
        adult: "Eine Leber ist aus acht Stücken gebaut, jedes mit eigener Blutversorgung. Klemmen Sie sie ab oder schneiden Sie sie weg, und sehen Sie, wie viel Arbeit der Rest noch schafft und wie er in den Tagen danach nachwächst.",
        expert: "Die Couinaud-Segmente als eigenständige Einheiten: Pfortaderligatur und Resektion ändern die funktionelle Lebermasse, und die Regeneration folgt den Tagen nach dem Eingriff im Modell von pkpdsim.",
      },
    },
    glimepiride: {
      label: "Glimepirid", title: "Eine Tablette, zwei Menschen",
      blurb: {child: "Was passiert mit einer Tablette?", adult: "Was die Leber mit einer Tablette macht."},
      about: {
        child: "Eine Tablette macht eine Reise: in den Darm, zur Leber, ins Blut und wieder hinaus. Bei zwei Menschen wirkt dieselbe Tablette verschieden.",
        adult: "Schlucken Sie eine Tablette eines Diabetesmedikaments und folgen Sie ihr durch Darm, Leber und Nieren. Ändern Sie, wer die Person ist, und dieselbe Tablette tut etwas anderes.",
        expert: "Das Ganzkörper-PBPK-Modell von Glimepirid: Dosis, CYP2C9-Genotyp, Leber- und Nierenfunktion und Körpergewicht eines Individuums, gelöst mit SUNDIALS IDA auf dem kompilierten SBML.",
      },
    },
    perfusion: {
      label: "Perfusion", title: "Die Leber an der Maschine",
      blurb: {child: "Eine Leber, die außerhalb des Körpers lebt.", adult: "Eine Leber, außerhalb des Körpers am Leben gehalten."},
      about: {
        child: "Eine Leber kann eine Weile außerhalb des Körpers leben. Eine Maschine pumpt warme Flüssigkeit mit Sauerstoff hindurch, und du bestimmst, wie viel sie bekommt.",
        adult: "Eine Leber, die aus dem Körper genommen wurde, bleibt an einer Maschine am Leben, die warme, sauerstoffreiche Flüssigkeit durch sie pumpt. Stellen Sie Pumpe, Sauerstoff und Temperatur ein und sehen Sie, was das Organ daraus macht.",
        expert: "Eine normotherme Maschinenperfusion einer Rattenleber aus der Perfusionsbibliothek von pkpdsim: Pumpe, Sauerstoff des Perfusats und Temperatur des Kreislaufs über sechs Stunden, mit dem Sauerstoffgradienten entlang vier Zonen des Sinusoids.",
      },
    },
  },
};

const ES: HubCopy = {
  labName: "Prof. Dr. Matthias König",
  labPlace: "Universidad de Lübeck y Humboldt-Universität zu Berlin",
  labInfo: "El laboratorio del que vienen estos modelos. El cuadrado lleva un teléfono a",
  heading: "El cuerpo sobre la mesa",
  motivation: {
    child: [
      "Cinco modelos del cuerpo humano que puedes mover con las manos.",
      "Sigue la sangre, conoce el hígado y mira adónde va una pastilla.",
    ],
    adult: [
      "Cinco modelos vivos del cuerpo humano, resueltos mientras usted mueve los objetos sobre el cristal.",
      "Cómo llega la sangre a cada órgano, qué hace el hígado con ella y adónde va una pastilla.",
    ],
    expert: [
      "Cinco modelos de pkpdsim, resueltos en vivo: la circulación, el hígado y sus dos aportes, la resección y la regeneración de los lóbulos, un PBPK de glimepirida y un hígado en perfusión de máquina.",
      "Cada objeto sobre el cristal es un parámetro del SBML exportado, y cada número se lee de la solución.",
    ],
  },
  headingInfo: {
    child: "Cada mesa es un modelo del cuerpo. Mueve los objetos y el cuerpo responde.",
    adult: "Cada mesa es un modelo del cuerpo humano de pkpdsim. Los objetos sobre el cristal son sus parámetros, y el modelo se vuelve a resolver mientras usted los gira.",
    expert: "Cada mesa es una exportación de pkpdsim: un modelo SBML compilado que se resuelve en el navegador, o su reducción algebraica. Los objetos son parámetros y la banda de números se lee de la solución.",
  },
  clickToOpen: "Haga clic para abrir",
  touchToOpen: "Toque para abrir",
  bothToOpen: "Toque o haga clic",
  clickHint: "Haga clic en una tarjeta para abrir su mesa.",
  touchHint: "Mantenga un dedo sobre una tarjeta para abrir su mesa.",
  bothHint: "Mantenga un dedo sobre una tarjeta, o haga clic en ella.",
  bodyInfo: {
    male: {
      child: "Un hombre adulto. Tócalo y todas las mesas usan su cuerpo.",
      adult: "El cuerpo masculino de referencia de pkpdsim. Tóquelo y todas las mesas se resuelven para él.",
      expert: "El individuo masculino de referencia de la fisiología de pkpdsim, 73 kg y 176 cm. Cada mesa se resuelve sobre su exportación.",
    },
    female: {
      child: "Una mujer adulta. Tócala y todas las mesas usan su cuerpo.",
      adult: "El cuerpo femenino de referencia de pkpdsim. Tóquelo y todas las mesas se resuelven para ella.",
      expert: "El individuo femenino de referencia de la fisiología de pkpdsim, 60 kg y 163 cm, con sus propios volúmenes de órganos y flujos sanguíneos.",
    },
  },
  loadingBodies: "Cargando los cuerpos...",
  loadingTable: "Cargando la mesa...",
  failed: "La mesa no pudo arrancar",
  failedHint: "Los modelos exportados y los datos de referencia se copian con \"npm run sync\".",
  entries: {
    cardiovascular: {
      label: "Circulación", title: "La circulación",
      blurb: {child: "¿Adónde va tu sangre?", adult: "Cómo llega la sangre a cada órgano."},
      about: {
        child: "Tu corazón empuja la sangre a todas las partes de ti, una y otra vez. Estrecha un vaso, o haz latir el corazón más rápido, y mira qué cambia.",
        adult: "El corazón empuja de cinco a seis litros de sangre por el cuerpo cada minuto. Estreche los vasos de un órgano o cambie el latido, y vea cómo las presiones y los flujos de todo el cuerpo se asientan en otro punto.",
        expert: "La red de presiones estacionaria del modelo cardiovascular de pkpdsim, con cuatro resistencias de órgano, la frecuencia cardíaca y la contractilidad como objetos. Presiones, flujos y gasto cardíaco salen de la solución algebraica, y al lado late el corazón SBML compilado.",
      },
    },
    liver: {
      label: "Hígado", title: "El hígado",
      blurb: {child: "¿Para qué sirve el hígado?", adult: "Por qué el cuerpo necesita un hígado."},
      about: {
        child: "Todo lo que comes llega primero al hígado. Tiene dos tubos que le traen sangre, y revisa lo que llega antes de que lo reciba el resto de ti.",
        adult: "Todo lo que el intestino absorbe pasa por el hígado antes de llegar al resto del cuerpo. Vea de dónde vienen sus dos aportes de sangre, qué ocurre a lo largo de un sinusoide y qué hace el hígado con un fármaco.",
        expert: "El doble aporte sanguíneo del hígado: tres cuartos del flujo por la vena porta y un cuarto por la arteria hepática, con la presión portal y el gradiente de la red de presiones estacionaria, y un lobulillo con sus tres zonas.",
      },
    },
    lobes: {
      label: "Lóbulos", title: "Los lóbulos del hígado",
      blurb: {child: "Corta un trozo y mira cómo vuelve a crecer.", adult: "Quite un trozo y véalo crecer de nuevo."},
      about: {
        child: "Un hígado está hecho de ocho piezas. Los médicos pueden quitar algunas, y el resto crece hasta que el hígado vuelve a ser bastante grande.",
        adult: "Un hígado está construido de ocho piezas, cada una con su propio aporte de sangre. Pínzelas o quítelas, y vea cuánto trabajo puede seguir haciendo el resto y cómo vuelve a crecer en los días siguientes.",
        expert: "Los segmentos de Couinaud como unidades propias: la ligadura de la vena porta y la resección cambian la masa hepática funcional, y la regeneración sigue los días posteriores a la intervención en el modelo de pkpdsim.",
      },
    },
    glimepiride: {
      label: "Glimepirida", title: "Una pastilla, dos personas",
      blurb: {child: "¿Qué le pasa a una pastilla?", adult: "Qué hace el hígado con una pastilla."},
      about: {
        child: "Una pastilla hace un viaje: al intestino, al hígado, a la sangre y otra vez fuera. En dos personas la misma pastilla hace cosas distintas.",
        adult: "Trague una pastilla de un medicamento para la diabetes y sígala por el intestino, el hígado y los riñones. Cambie quién es la persona, y la misma pastilla hace otra cosa.",
        expert: "El modelo PBPK de cuerpo entero de la glimepirida: la dosis, el genotipo CYP2C9, la función hepática y renal y el peso corporal de un individuo, resueltos con SUNDIALS IDA sobre el SBML compilado.",
      },
    },
    perfusion: {
      label: "Perfusión", title: "El hígado en la máquina",
      blurb: {child: "Un hígado que vive fuera del cuerpo.", adult: "Un hígado mantenido vivo fuera del cuerpo."},
      about: {
        child: "Un hígado puede vivir un rato fuera del cuerpo. Una máquina le bombea líquido caliente con oxígeno, y tú decides cuánto recibe.",
        adult: "Un hígado sacado del cuerpo sigue vivo en una máquina que bombea por él un líquido caliente y rico en oxígeno. Ajuste la bomba, el oxígeno y la temperatura, y vea qué hace el órgano con ellos.",
        expert: "Una perfusión de máquina normotérmica de un hígado de rata, de la biblioteca de perfusión de pkpdsim: la bomba, el oxígeno del perfundido y la temperatura del circuito durante seis horas, con el gradiente de oxígeno a lo largo de cuatro zonas del sinusoide.",
      },
    },
  },
};

export const HUB_TEXT: Readonly<Record<Locale, HubCopy>> = {en: EN, de: DE, es: ES};
