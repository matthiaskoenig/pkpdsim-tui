/**
 * What the application says about itself, in the three languages and at the three levels: the
 * heading of the landing page, the card of every table, and the words of the switches. A table
 * says its own numbers; this is what a visitor reads before they have opened anything.
 */

import type {Level, Locale, Phrase} from "@pkpdsim-tui/tui-kit";

/** What one table is called and what it is, on its card and behind it. */
export interface EntryCopy {
  /** The line under the name: what a visitor will do at this table, in their own words. */
  readonly tagline: string;
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
  /** The two questions of the first screen: the language, and who the visitor is. */
  readonly askLanguage: string;
  readonly askLevel: string;
  /** The button of the landing page which asks both of them again. */
  readonly startAgain: string;
  readonly startAgainInfo: string;
  /** The third question of the first screen: who the tables are solved for. */
  readonly person: {
    readonly ask: string;
    readonly note: Phrase;
    readonly age: string;
    readonly years: string;
    readonly weight: string;
    readonly height: string;
    readonly ready: string;
    readonly readyInfo: string;
    readonly change: string;
    readonly changeInfo: string;
    readonly reference: string;
    /** What the figure of the landing page is: the body every table is run with. */
    readonly solvedFor: string;
    readonly ageInfo: string;
    readonly weightInfo: string;
    readonly heightInfo: string;
  };
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
  /** The object which picks a table: what it is called and what it does. */
  /** What stands in the box at the right while no table is picked. */
  readonly pickTitle: string;
  readonly pickText: Phrase;
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
  /** The two houses of the laboratory, as the footer of livermetabolism.com gives them. */
  readonly contacts: readonly {
    readonly city: string;
    readonly lines: readonly string[];
  }[];
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
      "Prof. Dr. rer. nat. Matthias König",
      "Professor of Metabolic Inflammation and Carcinogenesis of the Liver",
      "Systems Medicine, Digital Twins & AI",
      "livermetabolism.com",
    ],
    contacts: [
      {
        city: "Lübeck",
        lines: [
          "University Hospital Schleswig-Holstein, Campus Lübeck",
          "First Department of Medicine",
          "Ratzeburger Allee 160, 23562 Lübeck, Germany",
          "matthias.koenig@uni-luebeck.de",
          "+49 451 3101-7845",
        ],
      },
      {
        city: "Berlin",
        lines: [
          "Humboldt-Universität zu Berlin",
          "Institute for Biology, Institute for Theoretical Biology (ITB)",
          "Philippstraße 13, 10115 Berlin, Germany",
          "koenigmx@hu-berlin.de",
          "+49 30 2093-98435",
        ],
      },
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
  heading: "The interactive body, focused on the liver",
  askLanguage: "Choose your language",
  askLevel: "Who is looking?",
  startAgain: "Restart the table",
  startAgainInfo: "Back to the very start: the language, the body and the stars of the quizzes are forgotten, and the next visitor is asked again.",
  person: {
    ask: "Whose body should it be?",
    note: {
      child: "Say how old you are and whether the body is a girl or a boy. Then everything you see is a body like yours.",
      adult: "Everything you see is solved for this body. The age gives its size, the weight and the height move it from there, and every model of the collection is run again for it.",
      expert: "The age and the sex give the reference body of ICRP 89, the weight and the height move it from there, and BW and HEIGHT go into every model of the collection. The physiology is scaled, not matured: this is a body of that size, not a validated paediatric model.",
    },
    age: "Age",
    years: "years",
    weight: "Weight",
    height: "Height",
    ready: "That is me",
    readyInfo: "Takes this body to the tables. It can be changed again at any time.",
    change: "The person",
    changeInfo: "Changes the age, the body, the weight and the height everything is solved for.",
    reference: "reference",
    solvedFor: "Every table of the collection is solved for this body.",
    ageInfo: "Three to a hundred years. The body of a child is the reference child of ICRP 89 of that age.",
    weightInfo: "What this body weighs. It starts at the reference of that age and that body, and the organs and their blood flows follow it.",
    heightInfo: "How tall this body is. It starts at the reference of that age and moves from there, and the organs are scaled with it.",
  },
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
  pickTitle: "Four tables, one body",
  pickText: {
    child: "Press one of the four big circles. Every one of them is something you can try out.",
    adult: "Press one of the four circles, or the organ it points at on the body. Each one opens a model of the same body, and the objects of the surface belong to the table it opens.",
    expert: "Each card opens a model of pkpdsim, solved in this browser: the circulation, the operations of the liver, a drug through the body, and a liver on a machine.",
  },
  loadingBodies: "Loading the bodies...",
  loadingTable: "Loading the table...",
  failed: "The table could not start",
  failedHint: "The exported models and reference data are copied in with \"npm run sync\".",
  entries: {
    cardiovascular: {
      label: "Circulation", title: "Circulation", tagline: "Follow the blood",
      blurb: {child: "Where does your blood go?", adult: "How the blood reaches every organ."},
      about: {
        child: "Your heart pushes blood to every part of you, again and again. Make a vessel narrow, or the heart beat faster, and see what changes.",
        adult: "The heart pushes five to six litres of blood through the body every minute. Narrow the vessels of an organ or change the beat, and watch the pressures and the flows of the whole body settle somewhere new.",
        expert: "The steady pressure network of the pkpdsim cardiovascular model, with four organ resistances, the heart rate and the contractility as objects. The pressures, the flows and the cardiac output follow from the algebraic solution, and the compiled SBML heart beats beside it.",
      },
    },
    lobes: {
      label: "Surgery", title: "Liver surgery", tagline: "The liver grows back",
      blurb: {child: "Take a piece away and watch it grow back.", adult: "Operate, and watch the liver grow back."},
      about: {
        child: "A liver is built of eight pieces. A doctor can take some away, and the rest grows until the liver is big enough again. Every operation grows back at its own speed.",
        adult: "A liver is built of eight pieces, each with its own blood supply. Turn the knife through the operations a surgeon does, from one segment to the whole right side, and watch what each of them leaves and how fast it grows back.",
        expert: "The resections of the pkpdsim model on the Couinaud segments, from a segmentectomy to an extended right hepatectomy, with the regeneration curve of every one of them drawn against the others.",
      },
    },
    glimepiride: {
      label: "Glimepiride", title: "Drug breakdown", tagline: "One tablet, one day",
      blurb: {child: "What happens to a tablet?", adult: "What the liver does to a tablet."},
      about: {
        child: "Swallow a tablet and it travels: into the gut, to the liver, into the blood, and out again. In two people the same tablet does different things.",
        adult: "Swallow a tablet of a diabetes drug and follow it through the gut, the liver and the kidneys. Change who the person is, and the same tablet does something else.",
        expert: "The whole body PBPK model of glimepiride: the dose, the CYP2C9 genotype, the liver and kidney function and the body weight of one individual, solved with SUNDIALS IDA on the compiled SBML.",
      },
    },
    perfusion: {
      label: "Perfusion", title: "Machine perfusion", tagline: "A liver without a body",
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
      "Prof. Dr. rer. nat. Matthias König",
      "Professor für metabolische Entzündung und Karzinogenese der Leber",
      "Systems Medicine, Digital Twins & AI",
      "livermetabolism.com",
    ],
    contacts: [
      {
        city: "Lübeck",
        lines: [
          "Universitätsklinikum Schleswig-Holstein, Campus Lübeck",
          "Medizinische Klinik I",
          "Ratzeburger Allee 160, 23562 Lübeck",
          "matthias.koenig@uni-luebeck.de",
          "+49 451 3101-7845",
        ],
      },
      {
        city: "Berlin",
        lines: [
          "Humboldt-Universität zu Berlin",
          "Institut für Biologie, Institut für Theoretische Biologie (ITB)",
          "Philippstraße 13, 10115 Berlin",
          "koenigmx@hu-berlin.de",
          "+49 30 2093-98435",
        ],
      },
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
  heading: "Der interaktive Körper mit Fokus auf der Leber",
  askLanguage: "Sprache wählen",
  askLevel: "Wer schaut?",
  startAgain: "Tisch neu starten",
  startAgainInfo: "Ganz zurück an den Anfang: Sprache, Körper und die Sterne der Quizze werden vergessen, und der nächste Besuch wird wieder gefragt.",
  person: {
    ask: "Welcher Körper soll es sein?",
    note: {
      child: "Sag, wie alt du bist und ob der Körper ein Mädchen oder ein Junge ist. Dann ist alles, was du siehst, ein Körper wie deiner.",
      adult: "Alles, was Sie sehen, wird für diesen Körper gerechnet. Das Alter gibt den Ausgangspunkt, Gewicht und Größe verschieben ihn, und jedes Modell der Sammlung läuft damit neu.",
      expert: "Alter und Geschlecht geben den Referenzkörper der ICRP 89, Gewicht und Größe verschieben ihn von dort aus, und BW und HEIGHT gehen in jedes Modell der Sammlung. Die Physiologie wird skaliert, nicht gereift: das ist ein Körper dieser Größe, kein validiertes pädiatrisches Modell.",
    },
    age: "Alter",
    years: "Jahre",
    weight: "Gewicht",
    height: "Größe",
    ready: "Das bin ich",
    readyInfo: "Übernimmt diesen Körper. Er lässt sich jederzeit wieder ändern.",
    change: "Die Person",
    changeInfo: "Ändert Alter, Körper, Gewicht und Größe, für die alles gerechnet wird.",
    reference: "Referenz",
    solvedFor: "Für diesen Körper wird alles in der Sammlung gerechnet.",
    ageInfo: "Drei bis hundert Jahre. Der Körper eines Kindes ist das Referenzkind der ICRP 89 dieses Alters.",
    weightInfo: "Was dieser Körper wiegt. Er beginnt bei der Referenz dieses Alters und dieses Körpers, und die Organe und ihre Durchblutung folgen ihm.",
    heightInfo: "Wie groß dieser Körper ist. Er beginnt bei der Referenz dieses Alters, lässt sich von dort verschieben, und die Organe werden damit skaliert.",
  },
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
  pickTitle: "Vier Tische, ein Körper",
  pickText: {
    child: "Drück einen der vier großen Kreise. Jeder ist etwas zum Ausprobieren.",
    adult: "Berühren Sie einen der vier Kreise oder das Organ, auf das er zeigt. Jeder öffnet ein Modell desselben Körpers; die Objekte der Oberfläche gehören zum geöffneten Tisch.",
    expert: "Jede Karte öffnet ein Modell aus pkpdsim, gelöst in diesem Browser: der Kreislauf, die Operationen der Leber, ein Medikament durch den Körper und eine Leber an der Maschine.",
  },
  loadingBodies: "Die Körper werden geladen...",
  loadingTable: "Der Tisch wird geladen...",
  failed: "Der Tisch konnte nicht starten",
  failedHint: "Die exportierten Modelle und Referenzdaten werden mit \"npm run sync\" kopiert.",
  entries: {
    cardiovascular: {
      label: "Kreislauf", title: "Kreislauf", tagline: "Dem Blut hinterher",
      blurb: {child: "Wohin fließt dein Blut?", adult: "Wie das Blut zu jedem Organ kommt."},
      about: {
        child: "Dein Herz pumpt Blut in jeden Teil von dir, immer wieder. Mach ein Gefäß enger oder das Herz schneller und schau, was sich ändert.",
        adult: "Das Herz pumpt fünf bis sechs Liter Blut pro Minute durch den Körper. Verengen Sie die Gefäße eines Organs oder ändern Sie den Herzschlag, und sehen Sie zu, wie sich Drücke und Flüsse im ganzen Körper neu einstellen.",
        expert: "Das stationäre Drucknetzwerk des Kreislaufmodells von pkpdsim, mit vier Organwiderständen, Herzfrequenz und Kontraktilität als Objekten. Drücke, Flüsse und Herzzeitvolumen folgen aus der algebraischen Lösung, und daneben schlägt das kompilierte SBML-Herz.",
      },
    },
    lobes: {
      label: "Chirurgie", title: "Operation der Leber", tagline: "Die Leber wächst nach",
      blurb: {child: "Nimm ein Stück weg und sieh zu, wie es nachwächst.", adult: "Operieren und die Leber nachwachsen sehen."},
      about: {
        child: "Eine Leber besteht aus acht Stücken. Ärzte können etwas davon wegnehmen, und der Rest wächst, bis die Leber wieder groß genug ist. Jede Operation wächst unterschiedlich schnell nach.",
        adult: "Eine Leber ist aus acht Stücken gebaut, jedes mit eigener Blutversorgung. Drehen Sie das Messer durch die Operationen, die Chirurgen machen, von einem Segment bis zur ganzen rechten Seite, und sehen Sie, was jede übrig lässt und wie schnell sie nachwächst.",
        expert: "Die Resektionen des pkpdsim-Modells auf den Couinaud-Segmenten, von der Segmentresektion bis zur erweiterten rechten Hepatektomie, mit der Regenerationskurve jeder einzelnen neben den anderen.",
      },
    },
    glimepiride: {
      label: "Glimepirid", title: "Medikamentenabbau", tagline: "Eine Tablette, ein Tag",
      blurb: {child: "Was passiert mit einer Tablette?", adult: "Was die Leber mit einer Tablette macht."},
      about: {
        child: "Eine Tablette macht eine Reise: in den Darm, zur Leber, ins Blut und wieder hinaus. Bei zwei Menschen wirkt dieselbe Tablette verschieden.",
        adult: "Schlucken Sie eine Tablette eines Diabetesmedikaments und folgen Sie ihr durch Darm, Leber und Nieren. Ändern Sie, wer die Person ist, und dieselbe Tablette tut etwas anderes.",
        expert: "Das Ganzkörper-PBPK-Modell von Glimepirid: Dosis, CYP2C9-Genotyp, Leber- und Nierenfunktion und Körpergewicht eines Individuums, gelöst mit SUNDIALS IDA auf dem kompilierten SBML.",
      },
    },
    perfusion: {
      label: "Perfusion", title: "Maschinenperfusion", tagline: "Leber ohne Körper",
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
      "Prof. Dr. rer. nat. Matthias König",
      "Catedrático de inflamación metabólica y carcinogénesis del hígado",
      "Systems Medicine, Digital Twins & AI",
      "livermetabolism.com",
    ],
    contacts: [
      {
        city: "Lübeck",
        lines: [
          "Hospital Universitario Schleswig-Holstein, Campus Lübeck",
          "Primera Clínica de Medicina",
          "Ratzeburger Allee 160, 23562 Lübeck, Alemania",
          "matthias.koenig@uni-luebeck.de",
          "+49 451 3101-7845",
        ],
      },
      {
        city: "Berlin",
        lines: [
          "Humboldt-Universität zu Berlin",
          "Instituto de Biología, Instituto de Biología Teórica (ITB)",
          "Philippstraße 13, 10115 Berlin, Alemania",
          "koenigmx@hu-berlin.de",
          "+49 30 2093-98435",
        ],
      },
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
  heading: "El cuerpo interactivo, centrado en el hígado",
  askLanguage: "Elige tu idioma",
  askLevel: "¿Quién mira?",
  startAgain: "Reiniciar la mesa",
  startAgainInfo: "De vuelta al principio: el idioma, el cuerpo y las estrellas de los concursos se olvidan, y a la próxima visita se le pregunta de nuevo.",
  person: {
    ask: "¿Qué cuerpo quieres?",
    note: {
      child: "Di cuántos años tienes y si el cuerpo es de una niña o de un niño. Entonces todo lo que ves es un cuerpo como el tuyo.",
      adult: "Todo lo que ves se resuelve para este cuerpo. La edad da el punto de partida, el peso y la altura lo mueven, y cada modelo de la colección vuelve a correr con él.",
      expert: "La edad y el sexo dan el cuerpo de referencia de la ICRP 89, el peso y la altura lo mueven desde ahí, y BW y HEIGHT entran en cada modelo de la colección. La fisiología se escala, no se madura: es un cuerpo de ese tamaño, no un modelo pediátrico validado.",
    },
    age: "Edad",
    years: "años",
    weight: "Peso",
    height: "Altura",
    ready: "Ese soy yo",
    readyInfo: "Lleva este cuerpo a las mesas. Se puede cambiar otra vez cuando quieras.",
    change: "La persona",
    changeInfo: "Cambia la edad, el cuerpo, el peso y la altura con los que se resuelve todo.",
    reference: "referencia",
    solvedFor: "Cada mesa de la colección se resuelve para este cuerpo.",
    ageInfo: "De tres a cien años. El cuerpo de un niño es el niño de referencia de la ICRP 89 de esa edad.",
    weightInfo: "Lo que pesa este cuerpo. Empieza en la referencia de esa edad y ese cuerpo, y los órganos y su flujo de sangre lo siguen.",
    heightInfo: "Lo que mide este cuerpo. Empieza en la referencia de esa edad, se mueve desde ahí, y los órganos se escalan con ella.",
  },
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
  pickTitle: "Cuatro mesas, un cuerpo",
  pickText: {
    child: "Toca uno de los cuatro círculos grandes. Cada uno es algo para probar.",
    adult: "Toque uno de los cuatro círculos, o el órgano al que apunta. Cada uno abre un modelo del mismo cuerpo, y los objetos de la superficie pertenecen a la mesa que abre.",
    expert: "Cada tarjeta abre un modelo de pkpdsim, resuelto en este navegador: la circulación, las operaciones del hígado, un fármaco por el cuerpo y un hígado en una máquina.",
  },
  loadingBodies: "Cargando los cuerpos...",
  loadingTable: "Cargando la mesa...",
  failed: "La mesa no pudo arrancar",
  failedHint: "Los modelos exportados y los datos de referencia se copian con \"npm run sync\".",
  entries: {
    cardiovascular: {
      label: "Circulación", title: "Circulación", tagline: "Sigue la sangre",
      blurb: {child: "¿Adónde va tu sangre?", adult: "Cómo llega la sangre a cada órgano."},
      about: {
        child: "Tu corazón empuja la sangre a todas las partes de ti, una y otra vez. Estrecha un vaso, o haz latir el corazón más rápido, y mira qué cambia.",
        adult: "El corazón empuja de cinco a seis litros de sangre por el cuerpo cada minuto. Estreche los vasos de un órgano o cambie el latido, y vea cómo las presiones y los flujos de todo el cuerpo se asientan en otro punto.",
        expert: "La red de presiones estacionaria del modelo cardiovascular de pkpdsim, con cuatro resistencias de órgano, la frecuencia cardíaca y la contractilidad como objetos. Presiones, flujos y gasto cardíaco salen de la solución algebraica, y al lado late el corazón SBML compilado.",
      },
    },
    lobes: {
      label: "Cirugía", title: "Cirugía del hígado", tagline: "El hígado vuelve a crecer",
      blurb: {child: "Quita un trozo y mira cómo vuelve a crecer.", adult: "Opere y vea crecer el hígado de nuevo."},
      about: {
        child: "Un hígado está hecho de ocho piezas. Los médicos pueden quitar algunas y el resto crece hasta que el hígado vuelve a ser bastante grande.",
        adult: "Un hígado está construido de ocho piezas, cada una con su propio aporte de sangre. Gire el cuchillo por las operaciones que hacen los cirujanos, de un segmento a todo el lado derecho, y vea qué deja cada una y con qué rapidez vuelve a crecer.",
        expert: "Las resecciones del modelo de pkpdsim sobre los segmentos de Couinaud, de la segmentectomía a la hepatectomía derecha ampliada, con la curva de regeneración de cada una junto a las demás.",
      },
    },
    glimepiride: {
      label: "Glimepirida", title: "Degradación del fármaco", tagline: "Una pastilla, un día",
      blurb: {child: "¿Qué le pasa a una pastilla?", adult: "Qué hace el hígado con una pastilla."},
      about: {
        child: "Una pastilla hace un viaje: al intestino, al hígado, a la sangre y otra vez fuera. En dos personas la misma pastilla hace cosas distintas.",
        adult: "Trague una pastilla de un medicamento para la diabetes y sígala por el intestino, el hígado y los riñones. Cambie quién es la persona, y la misma pastilla hace otra cosa.",
        expert: "El modelo PBPK de cuerpo entero de la glimepirida: la dosis, el genotipo CYP2C9, la función hepática y renal y el peso corporal de un individuo, resueltos con SUNDIALS IDA sobre el SBML compilado.",
      },
    },
    perfusion: {
      label: "Perfusión", title: "Perfusión de máquina", tagline: "Un hígado sin cuerpo",
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
