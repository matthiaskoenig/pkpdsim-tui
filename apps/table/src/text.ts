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
  /** What a body is, behind it. Both of them stand on the landing page, side by side. */
  readonly bodyInfo: Readonly<Record<"male" | "female", Phrase>>;
  /** The object which picks a table: what it is called and what it does. */
  readonly topic: {readonly label: string; readonly info: Phrase};
  /** What stands in the box at the right while no table is picked. */
  readonly pickTitle: string;
  readonly pickText: Phrase;
  /** What the box says under a table the object is pointing at. */
  readonly holdToOpen: string;
  /** What the boot screen says while the bodies are loading, and when nothing can be shown. */
  readonly loadingBodies: string;
  readonly loadingTable: string;
  readonly failed: string;
  readonly failedHint: string;
  /** The laboratory at the foot of the page, and the square which points at it. */
  readonly labName: string;
  readonly labPlace: string;
  readonly labInfo: string;
  /** The page about the models, the software, the licences and the laboratory. */
  readonly about: AboutCopy;
  readonly entries: Readonly<Record<string, EntryCopy>>;
}

/** What the about page says. It is the same page in every language, with no levels: a licence
 * and an address say the same thing to a six year old and to a hepatologist. */
export interface AboutCopy {
  readonly title: string;
  readonly intro: string;
  readonly open: string;
  readonly groupTitle: string;
  readonly groupLines: readonly string[];
  readonly modelsTitle: string;
  readonly modelsText: string;
  readonly softwareTitle: string;
  readonly software: readonly {readonly name: string; readonly line: string}[];
  readonly licenceTitle: string;
  readonly licenceLines: readonly string[];
  readonly fundingTitle: string;
  readonly fundingText: string;
}

const EN: HubCopy = {
  about: {
    title: "About these tables",
    intro: "Four working models of the human body, built from the open models of our laboratory and solved while you move the objects on the glass.",
    open: "About these tables",
    groupTitle: "The laboratory",
    groupLines: [
      "Prof. Dr. Matthias König",
      "Systems Medicine of the Liver",
      "University of Lübeck and Humboldt-Universität zu Berlin",
      "livermetabolism.com",
    ],
    modelsTitle: "The models",
    modelsText: "Every table is a model of pkpdsim: physiologically based pharmacokinetics in SBML, built against the studies curated in PK-DB. The models and the code are open and free to use.",
    softwareTitle: "The software",
    software: [
      {name: "pkpdsim", line: "the models of the body, in SBML"},
      {name: "sbmlsim", line: "which solves them, in the browser as WebAssembly"},
      {name: "sbmlutils", line: "which writes and annotates the SBML"},
      {name: "TUIO", line: "the protocol the table speaks to the objects with"},
      {name: "Piper", line: "the voice which reads the tables aloud, offline"},
    ],
    licenceTitle: "Licences",
    licenceLines: [
      "The code of these tables and of pkpdsim: MIT.",
      "The words and the figures: CC BY-SA 4.0.",
      "The bodies: adapted from the EMBL-EBI Expression Atlas anatomograms, CC BY 4.0, with the physiology figures of pkpdsim.",
    ],
    fundingTitle: "Funding",
    fundingText: "German Research Foundation (DFG) within the Research Unit Programme FOR 5151 QuaLiPerF, grant 436883643, and grant 465194077 (SPP 2311, SimLivA); Federal Ministry of Education and Research (BMBF) within LiSyM, grant 031L0054.",
  },
  labName: "Prof. Dr. Matthias König",
  labPlace: "University of Lübeck and Humboldt-Universität zu Berlin",
  labInfo: "The laboratory these models come from. The square takes a phone to",
  heading: "The body on the table",
  motivation: {
    child: [
      "Four models of the human body you can move with your hands.",
      "Follow the blood, meet the liver, and see where a tablet goes.",
    ],
    adult: [
      "Four working models of the human body, solved while you move the objects on the glass.",
      "How the blood reaches every organ, what the liver does with it, and where a tablet goes.",
    ],
    expert: [
      "Four pkpdsim models, solved live: the circulation, hepatectomy and regeneration, a glimepiride PBPK, and a liver in machine perfusion.",
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
      child: "A grown man. The tables know where everything in him is.",
      adult: "The male reference body of pkpdsim, which the tables are solved on.",
      expert: "The male reference individual of the pkpdsim physiology, 73 kg at 176 cm. Every table is solved on its export, and each one can be switched to the other body.",
    },
    female: {
      child: "A grown woman. The tables know where everything in her is.",
      adult: "The female reference body of pkpdsim, which the tables are solved on.",
      expert: "The female reference individual of the pkpdsim physiology, 60 kg at 163 cm, with its own organ volumes and blood flows.",
    },
  },
  topic: {
    label: "The table",
    info: {
      child: "Turn it, and it walks around the cards. Hold it still, and that table opens.",
      adult: "Turn this object to walk around the four tables. Hold it still on one, and it opens.",
      expert: "The first object of the surface, marker 0, is the table switch: its angle picks one of the four tables and holding it still opens that one.",
    },
  },
  pickTitle: "Four tables, one body",
  pickText: {
    child: "Put the round object on the table and turn it. Every card is one thing you can try out.",
    adult: "Put the first object on the glass and turn it to walk around the four tables, or press a card. Each one opens a model of the same body.",
    expert: "Each card opens a model of pkpdsim, solved in this browser: the circulation, the liver, the lobes of the liver, a drug through the body, and a liver on a machine.",
  },
  holdToOpen: "Hold the object still to open it",
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
    lobes: {
      label: "Surgery", title: "Liver surgery",
      blurb: {child: "Take a piece away and watch it grow back.", adult: "Operate, and watch the liver grow back."},
      about: {
        child: "A liver is built of eight pieces. A doctor can take some away, and the rest grows until the liver is big enough again. Every operation grows back at its own speed.",
        adult: "A liver is built of eight pieces, each with its own blood supply. Turn the knife through the operations a surgeon does, from one segment to the whole right side, and watch what each of them leaves and how fast it grows back.",
        expert: "The resections of the pkpdsim model on the Couinaud segments, from a segmentectomy to an extended right hepatectomy, with the regeneration curve of every one of them drawn against the others.",
      },
    },
    glimepiride: {
      label: "Glimepiride", title: "How a drug is broken down",
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
  about: {
    title: "Über diese Tische",
    intro: "Vier Modelle des menschlichen Körpers, gebaut aus den offenen Modellen unseres Labors und gerechnet, während Sie die Objekte auf dem Glas bewegen.",
    open: "Über diese Tische",
    groupTitle: "Das Labor",
    groupLines: [
      "Prof. Dr. Matthias König",
      "Systems Medicine of the Liver",
      "Universität zu Lübeck und Humboldt-Universität zu Berlin",
      "livermetabolism.com",
    ],
    modelsTitle: "Die Modelle",
    modelsText: "Jeder Tisch ist ein Modell aus pkpdsim: physiologisch basierte Pharmakokinetik in SBML, gebaut gegen die in PK-DB kuratierten Studien. Die Modelle und der Code sind offen und frei verwendbar.",
    softwareTitle: "Die Software",
    software: [
      {name: "pkpdsim", line: "die Modelle des Körpers, in SBML"},
      {name: "sbmlsim", line: "rechnet sie, im Browser als WebAssembly"},
      {name: "sbmlutils", line: "schreibt und annotiert das SBML"},
      {name: "TUIO", line: "die Sprache, in der der Tisch über die Objekte spricht"},
      {name: "Piper", line: "die Stimme, die die Tische vorliest, ohne Netz"},
    ],
    licenceTitle: "Lizenzen",
    licenceLines: [
      "Der Code dieser Tische und von pkpdsim: MIT.",
      "Die Texte und die Abbildungen: CC BY-SA 4.0.",
      "Die Körper: nach den Anatomogrammen des EMBL-EBI Expression Atlas, CC BY 4.0, mit den Physiologie-Abbildungen von pkpdsim.",
    ],
    fundingTitle: "Förderung",
    fundingText: "Deutsche Forschungsgemeinschaft (DFG), Forschungsgruppe FOR 5151 QuaLiPerF, Projektnummer 436883643, und Projektnummer 465194077 (SPP 2311, SimLivA); Bundesministerium für Bildung und Forschung (BMBF), LiSyM, Förderkennzeichen 031L0054.",
  },
  labName: "Prof. Dr. Matthias König",
  labPlace: "Universität zu Lübeck und Humboldt-Universität zu Berlin",
  labInfo: "Das Labor, aus dem diese Modelle kommen. Das Quadrat bringt ein Telefon zu",
  heading: "Der Körper auf dem Tisch",
  motivation: {
    child: [
      "Vier Modelle des menschlichen Körpers, die du mit den Händen bewegen kannst.",
      "Folge dem Blut, lerne die Leber kennen und schau, wohin eine Tablette geht.",
    ],
    adult: [
      "Vier arbeitende Modelle des menschlichen Körpers, gerechnet während Sie die Objekte auf dem Glas bewegen.",
      "Wie das Blut zu jedem Organ kommt, was die Leber damit macht, und wohin eine Tablette geht.",
    ],
    expert: [
      "Vier Modelle aus pkpdsim, live gerechnet: der Kreislauf, Leberresektion und Regeneration, ein PBPK-Modell von Glimepirid und eine Leber in Maschinenperfusion.",
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
      child: "Ein erwachsener Mann. Die Tische wissen, wo alles in ihm liegt.",
      adult: "Der männliche Referenzkörper von pkpdsim, auf dem die Tische rechnen.",
      expert: "Das männliche Referenzindividuum der Physiologie von pkpdsim, 73 kg bei 176 cm. Jeder Tisch rechnet auf dessen Export und lässt sich auf den anderen Körper umstellen.",
    },
    female: {
      child: "Eine erwachsene Frau. Die Tische wissen, wo alles in ihr liegt.",
      adult: "Der weibliche Referenzkörper von pkpdsim, auf dem die Tische rechnen.",
      expert: "Das weibliche Referenzindividuum der Physiologie von pkpdsim, 60 kg bei 163 cm, mit eigenen Organvolumina und Blutflüssen.",
    },
  },
  topic: {
    label: "Der Tisch",
    info: {
      child: "Dreh es, dann wandert es um die Karten. Halt es still, dann geht der Tisch auf.",
      adult: "Drehen Sie dieses Objekt, um durch die vier Tische zu wandern. Halten Sie es still, dann öffnet sich der Tisch.",
      expert: "Das erste Objekt der Oberfläche, Marker 0, ist der Tischwähler: sein Winkel wählt einen der vier Tische, Stillhalten öffnet ihn.",
    },
  },
  pickTitle: "Vier Tische, ein Körper",
  pickText: {
    child: "Stell das runde Objekt auf den Tisch und dreh es. Jede Karte ist etwas zum Ausprobieren.",
    adult: "Stellen Sie das erste Objekt auf das Glas und drehen Sie es, um durch die vier Tische zu wandern, oder berühren Sie eine Karte. Jede öffnet ein Modell desselben Körpers.",
    expert: "Jede Karte öffnet ein Modell aus pkpdsim, gelöst in diesem Browser: der Kreislauf, die Leber, die Leberlappen, ein Medikament durch den Körper und eine Leber an der Maschine.",
  },
  holdToOpen: "Objekt stillhalten, dann geht der Tisch auf",
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
    lobes: {
      label: "Chirurgie", title: "Operation der Leber",
      blurb: {child: "Nimm ein Stück weg und sieh zu, wie es nachwächst.", adult: "Operieren und die Leber nachwachsen sehen."},
      about: {
        child: "Eine Leber besteht aus acht Stücken. Ärzte können etwas davon wegnehmen, und der Rest wächst, bis die Leber wieder groß genug ist. Jede Operation wächst unterschiedlich schnell nach.",
        adult: "Eine Leber ist aus acht Stücken gebaut, jedes mit eigener Blutversorgung. Drehen Sie das Messer durch die Operationen, die Chirurgen machen, von einem Segment bis zur ganzen rechten Seite, und sehen Sie, was jede übrig lässt und wie schnell sie nachwächst.",
        expert: "Die Resektionen des pkpdsim-Modells auf den Couinaud-Segmenten, von der Segmentresektion bis zur erweiterten rechten Hepatektomie, mit der Regenerationskurve jeder einzelnen neben den anderen.",
      },
    },
    glimepiride: {
      label: "Glimepirid", title: "Medikamentenabbau",
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
  about: {
    title: "Sobre estas mesas",
    intro: "Cuatro modelos del cuerpo humano, hechos con los modelos abiertos de nuestro laboratorio y resueltos mientras mueves los objetos sobre el cristal.",
    open: "Sobre estas mesas",
    groupTitle: "El laboratorio",
    groupLines: [
      "Prof. Dr. Matthias König",
      "Systems Medicine of the Liver",
      "Universidad de Lübeck y Humboldt-Universität zu Berlin",
      "livermetabolism.com",
    ],
    modelsTitle: "Los modelos",
    modelsText: "Cada mesa es un modelo de pkpdsim: farmacocinética con base fisiológica en SBML, construida con los estudios curados en PK-DB. Los modelos y el código son abiertos y de uso libre.",
    softwareTitle: "El software",
    software: [
      {name: "pkpdsim", line: "los modelos del cuerpo, en SBML"},
      {name: "sbmlsim", line: "los resuelve, en el navegador como WebAssembly"},
      {name: "sbmlutils", line: "escribe y anota el SBML"},
      {name: "TUIO", line: "el protocolo con el que la mesa habla con los objetos"},
      {name: "Piper", line: "la voz que lee las mesas en voz alta, sin red"},
    ],
    licenceTitle: "Licencias",
    licenceLines: [
      "El código de estas mesas y de pkpdsim: MIT.",
      "Los textos y las figuras: CC BY-SA 4.0.",
      "Los cuerpos: adaptados de los anatomogramas del EMBL-EBI Expression Atlas, CC BY 4.0, con las figuras de fisiología de pkpdsim.",
    ],
    fundingTitle: "Financiación",
    fundingText: "Deutsche Forschungsgemeinschaft (DFG), FOR 5151 QuaLiPerF, proyecto 436883643, y proyecto 465194077 (SPP 2311, SimLivA); Bundesministerium für Bildung und Forschung (BMBF), LiSyM, 031L0054.",
  },
  labName: "Prof. Dr. Matthias König",
  labPlace: "Universidad de Lübeck y Humboldt-Universität zu Berlin",
  labInfo: "El laboratorio del que vienen estos modelos. El cuadrado lleva un teléfono a",
  heading: "El cuerpo sobre la mesa",
  motivation: {
    child: [
      "Cuatro modelos del cuerpo humano que puedes mover con las manos.",
      "Sigue la sangre, conoce el hígado y mira adónde va una pastilla.",
    ],
    adult: [
      "Cuatro modelos vivos del cuerpo humano, resueltos mientras usted mueve los objetos sobre el cristal.",
      "Cómo llega la sangre a cada órgano, qué hace el hígado con ella y adónde va una pastilla.",
    ],
    expert: [
      "Cuatro modelos de pkpdsim, resueltos en vivo: la circulación, la resección hepática y la regeneración, un PBPK de glimepirida y un hígado en perfusión de máquina.",
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
      child: "Un hombre adulto. Las mesas saben dónde está cada cosa dentro de él.",
      adult: "El cuerpo masculino de referencia de pkpdsim, sobre el que se resuelven las mesas.",
      expert: "El individuo masculino de referencia de la fisiología de pkpdsim, 73 kg y 176 cm. Cada mesa se resuelve sobre su exportación y puede cambiarse al otro cuerpo.",
    },
    female: {
      child: "Una mujer adulta. Las mesas saben dónde está cada cosa dentro de ella.",
      adult: "El cuerpo femenino de referencia de pkpdsim, sobre el que se resuelven las mesas.",
      expert: "El individuo femenino de referencia de la fisiología de pkpdsim, 60 kg y 163 cm, con sus propios volúmenes de órganos y flujos sanguíneos.",
    },
  },
  topic: {
    label: "La mesa",
    info: {
      child: "Gíralo y recorre las tarjetas. Mantenlo quieto y esa mesa se abre.",
      adult: "Gire este objeto para recorrer las cuatro mesas. Manténgalo quieto sobre una y se abre.",
      expert: "El primer objeto de la superficie, el marcador 0, es el selector de mesa: su ángulo elige una de las cuatro y mantenerlo quieto la abre.",
    },
  },
  pickTitle: "Cuatro mesas, un cuerpo",
  pickText: {
    child: "Pon el objeto redondo sobre la mesa y gíralo. Cada tarjeta es algo para probar.",
    adult: "Ponga el primer objeto sobre el cristal y gírelo para recorrer las cuatro mesas, o toque una tarjeta. Cada una abre un modelo del mismo cuerpo.",
    expert: "Cada tarjeta abre un modelo de pkpdsim, resuelto en este navegador: la circulación, el hígado, los lóbulos del hígado, un fármaco por el cuerpo y un hígado en una máquina.",
  },
  holdToOpen: "Mantenga el objeto quieto para abrirla",
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
    lobes: {
      label: "Cirugía", title: "Cirugía del hígado",
      blurb: {child: "Quita un trozo y mira cómo vuelve a crecer.", adult: "Opere y vea crecer el hígado de nuevo."},
      about: {
        child: "Un hígado está hecho de ocho piezas. Los médicos pueden quitar algunas y el resto crece hasta que el hígado vuelve a ser bastante grande.",
        adult: "Un hígado está construido de ocho piezas, cada una con su propio aporte de sangre. Gire el cuchillo por las operaciones que hacen los cirujanos, de un segmento a todo el lado derecho, y vea qué deja cada una y con qué rapidez vuelve a crecer.",
        expert: "Las resecciones del modelo de pkpdsim sobre los segmentos de Couinaud, de la segmentectomía a la hepatectomía derecha ampliada, con la curva de regeneración de cada una junto a las demás.",
      },
    },
    glimepiride: {
      label: "Glimepirida", title: "Cómo se degrada un fármaco",
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
