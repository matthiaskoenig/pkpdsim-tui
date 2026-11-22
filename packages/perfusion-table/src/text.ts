/** What the machine perfusion table says, in the three languages and at the three levels. */

import type {Locale, Phrase, QuizQuestion} from "@pkpdsim-tui/tui-kit";

export interface Named {
  readonly label: Phrase;
  readonly info: Phrase;
  /** What this object is in the body, behind the light bulb of the page the table opens with. */
  readonly more?: Phrase;
}

/** What the sentence of the panel is built from. */
export interface PerfusionFacts {
  readonly flow: string;
  readonly oxygen: string;
  readonly hour: string;
  readonly alive: number;
  readonly bile: string;
  /** The temperature, when the circuit is being kept cold. */
  readonly cold: string | undefined;
}

export interface PerfusionCopy {
  readonly about: Phrase;
  readonly tries: readonly Phrase[];
  /** The three questions of the quiz, which send a visitor back to the objects. */
  readonly quiz: readonly QuizQuestion[];
  readonly stats: Readonly<Record<
    "taken" | "outflow" | "bile" | "alive" | "alt" | "lactate", Named>>;
  readonly roles: Readonly<Record<"flow" | "oxygen" | "temperature" | "hour", Named>>;
  readonly traces: Readonly<Record<"outflow" | "bile" | "alive", string>>;
  readonly parts: Readonly<Record<
    "reservoir" | "pump" | "oxygenator" | "heater" | "liver" | "bile", string>>;
  readonly partInfo: Readonly<Record<
    "tube" | "return" | "reservoir" | "pump" | "oxygenator" | "heater" | "organ" | "bile",
    Phrase>>;
  /** The units the machine writes on itself, beside the part each of them belongs to. */
  readonly units: Readonly<Record<"flow" | "oxygen" | "temperature" | "bile", string>>;
  /** The two ends of the zonation, which the sinusoid runs between. */
  readonly zones: Readonly<Record<"periportal" | "pericentral", string>>;
  /** Why a liver is put on a machine at all, under the drawing of one. */
  readonly motivation: Phrase;
  readonly zoneInfo: {
    readonly first: Phrase;
    readonly last: Phrase;
    readonly middle: (zone: number) => string;
  };
  readonly notes: {
    readonly leaving: (value: string) => string;
    readonly alive: (value: string) => string;
    readonly bile: (value: string) => string;
    readonly ofThePerfusion: string;
  };
  readonly reading: (facts: PerfusionFacts) => string;
  readonly loading: string;
  readonly startingSolver: string;
  readonly solvingReference: string;
}

const EN: PerfusionCopy = {
  quiz: [
    {
      id: "why",
      ask: "Why is a liver put on a machine at all?",
      choices: [
        {id: "alive", label: "To keep it alive until somebody needs it"},
        {id: "clean", label: "To wash it"},
        {id: "cool", label: "To freeze it"},
      ],
      answer: "alive",
      because: "A liver out of a body has no blood. The machine pumps a warm, oxygen rich fluid"
        + " through it, so it keeps working and can be looked at before it is transplanted.",
      tryIt: "Try it: turn the pump down and watch what the organ does.",
    },
    {
      id: "oxygen",
      ask: "The oxygen in the fluid is turned down. What does the liver do?",
      choices: [
        {id: "suffers", label: "Its cells start to take damage"},
        {id: "faster", label: "It works faster"},
        {id: "nothing", label: "Nothing, it does not need oxygen"},
      ],
      answer: "suffers",
      because: "Liver cells burn oxygen all the time. Without enough of it they stop making bile"
        + " and start leaking the enzyme ALT, which is what the machine measures.",
      tryIt: "Try it: turn the oxygen down and watch ALT climb.",
    },
    {
      id: "cold",
      ask: "The machine is run cold instead of warm. What changes?",
      choices: [
        {id: "slower", label: "Everything in the liver runs slower"},
        {id: "stops", label: "The liver stops at once"},
        {id: "same", label: "Nothing, temperature does not matter"},
      ],
      answer: "slower",
      because: "Cold slows every process down, so the liver needs less oxygen and keeps longer."
        + " Warm is how you see whether it still works; cold is how you carry it.",
      tryIt: "Try it: turn the temperature down and read the bile.",
    },
  ],
  about: {
    child: "A liver can live outside the body if a machine keeps feeding it: warm liquid with oxygen, pumped through it without stopping.",
    adult: "A liver taken out of a body stays alive if it is perfused: warm fluid, full of oxygen, pumped through it without stopping. It is how a donor organ is carried and tested, and how a liver is studied on its own.",
    expert: "A normothermic machine perfusion of the rat liver of the perfusion library of pkpdsim, with four zones along its sinusoid. The perfusate carries no red blood cells, so all of its oxygen is dissolved and the gradient along the sinusoid is steep.",
  },
  tries: [
    {
      child: "Turn the oxygen down: the cells at the far end die first and the bile stops.",
      adult: "Turn the oxygen down: the far end of the sinusoid dies first, and the bile stops.",
      expert: "Turn the oxygen down: pericentral necrosis first, with the bile falling and the ALT rising.",
    },
    {
      child: "Turn the pump down and see how little oxygen reaches the last zone.",
      adult: "Turn the pump down and watch how little oxygen reaches the last zone.",
      expert: "Turn the pump down: the delivery falls at constant pO2 and the last zone is starved.",
    },
  ],
  stats: {
    taken: {
      label: {child: "Oxygen used", adult: "Oxygen taken"},
      info: {
        child: "How much oxygen the liver used up on the way through.",
        adult: "How much of the oxygen the organ took out of the fluid on its way through. A living liver breathes.",
        expert: "The oxygen extraction over the organ, the difference between the inflow and the outflow, which is the respiration of the graft.",
      },
    },
    outflow: {
      label: {child: "Oxygen left", adult: "Oxygen leaving"},
      info: {
        child: "How much oxygen is still in the liquid when it comes out again.",
        adult: "What is left in the fluid when it leaves the organ. When it reaches zero, the cells at the far end get nothing.",
        expert: "The pO2 of the outflow. At zero the pericentral zone is anoxic, whatever the inflow says.",
      },
    },
    bile: {
      label: {child: "Bile", adult: "Bile"},
      info: {
        child: "Liver juice. A liver which is well keeps making it.",
        adult: "A liver makes bile as long as it is working, so the drop which comes out of the bile duct is the sign that it is alive.",
        expert: "Bile production, the functional readout a transplant centre judges a graft by during perfusion.",
      },
    },
    alive: {
      label: {child: "Cells alive", adult: "Cells alive"},
      info: {
        child: "How many cells at the far end are still alive.",
        adult: "The cells still alive at the far end of the sinusoid, the ones which are served last.",
        expert: "The viable fraction of the pericentral zone, which is where hypoxic injury starts.",
      },
    },
    alt: {
      label: {child: "Damage", adult: "ALT released"},
      info: {
        child: "Something which only comes out when cells break. The more of it, the worse.",
        adult: "An enzyme from inside the liver cells. It only reaches the fluid when cells break open, so it is the measure of the damage.",
        expert: "Alanine aminotransferase in the perfusate, the cytolysis marker of the circuit.",
      },
    },
    lactate: {
      label: {child: "Lactate", adult: "Lactate"},
      info: {
        child: "A healthy liver eats it up. A struggling one makes more of it.",
        adult: "A healthy liver eats lactate. A struggling one makes it instead, so a rising lactate is a bad sign.",
        expert: "Perfusate lactate. Clearance is a viability criterion in normothermic perfusion; production means the organ is anaerobic.",
      },
    },
  },
  roles: {
    flow: {
      more: "Machine perfusion keeps an organ alive outside the body by pushing fluid through the vessels it used in the body. The flow carries the oxygen in and the waste out, and the cells at the end of the path live on what the cells before them have left, so too little flow starves the far end first. Too much is no better: a vessel built for the pressure of a body is damaged by being pushed harder than that.",
      label: {child: "The pump", adult: "Pump"},
      info: {
        child: "Turn it and the pump pushes more or less liquid through the liver every minute.",
        adult: "Changes how much perfusate the pump pushes through the organ. Turn it down and the cells furthest from the inflow are starved of oxygen.",
        expert: "The pump flow through the organ. With a fixed pO2 it sets the oxygen delivery, and with it the gradient along the sinusoid.",
      },
    },
    oxygen: {
      more: "There are no red blood cells in the circuit, so the only oxygen the organ gets is what is dissolved in the fluid, a small fraction of what the same volume of blood would carry. The oxygenator holds the fluid at a chosen pressure of oxygen, and the liver draws on it along the sinusoid, so the cells at the inflow are always better supplied than those at the outflow. That difference is the gradient the liver lives with in the body as well, and a perfusion makes it sharper.",
      label: {child: "The oxygen", adult: "Oxygen"},
      info: {
        child: "Turn it and more or less oxygen goes into the liquid. It is all the liver gets.",
        adult: "Changes how much oxygen the oxygenator puts into the fluid. It is the only oxygen the organ gets: there are no red blood cells in the circuit.",
        expert: "The pO2 the oxygenator holds the perfusate at. Without haemoglobin the dissolved oxygen is the whole supply.",
      },
    },
    temperature: {
      more: "Cold is how an organ is carried: at four degrees the chemistry of a cell runs at a fraction of its speed, so it survives hours without much oxygen, which is what a transport box is for. Warm is the other bargain: at body temperature the organ works, makes bile and clears what is given to it, which is the only way to find out whether it works at all, and it has to be fed and oxygenated the whole time. Everything else on this table turns on that choice, because the solubility of the gases, the speed of the enzymes and the demand of the cells all move with the temperature.",
      label: {child: "Warm or cold", adult: "Temperature"},
      info: {
        child: "Turn it and the machine keeps the liver warmer or colder. Warm means it works, cold means it sleeps.",
        adult: "Changes how warm the circuit is kept. Warm means the organ works and has to be fed; cold slows everything down, which is how an organ is carried to a transplant.",
        expert: "The temperature of the circuit, from hypothermic storage to normothermia. It enters before the initial values are resolved, because the solubility and the rates are initial assignments of it.",
      },
    },
    hour: {
      more: "A perfusion is a course and not a state: the organ warms, the resistance of its vessels settles, the bile starts, and the markers of damage rise or they do not. Walking back through the hours is how it is read, because a number at the end says little without the shape it arrived on. This dial changes nothing in the model: it only moves where in the solved run you are standing.",
      label: {child: "Hours on the machine", adult: "Hours on the machine"},
      info: {
        child: "Turn it to travel through the hours of the perfusion.",
        adult: "Turn it back to walk through the perfusion, from the end to the moment the organ was mounted.",
        expert: "The hour of the solved course, from the end back to the mounting of the organ. The dial is relative and solves nothing.",
      },
    },
  },
  traces: {outflow: "oxygen leaving", bile: "bile", alive: "cells alive"},
  parts: {
    reservoir: "Reservoir", pump: "Pump", oxygenator: "Oxygenator", heater: "Heater",
    liver: "Liver", bile: "Bile",
  },
  units: {flow: "ml/min", oxygen: "kPa", temperature: "C", bile: "ul/min"},
  zones: {periportal: "periportal", pericentral: "pericentral"},
  motivation: {
    child: "A liver on its way to somebody must stay alive. Here you can watch it.",
    adult: "A donor liver has to stay alive until it is transplanted, and a machine keeps it working and lets it be tested.",
    expert: "Normothermic machine perfusion keeps a donor organ working until implantation, and makes inflow, outflow and bile measurable at once.",
  },
  partInfo: {
    tube: {
      child: "The tubes. The liquid goes round and round, through the liver and back.",
      adult: "The tubing. The perfusate is pumped out of the reservoir, through the oxygenator, and into the organ.",
    },
    return: {
      child: "What has been through the liver goes back and round again.",
      adult: "What has been through the organ goes back to the reservoir, and round again.",
    },
    reservoir: {
      child: "The tank which holds the liquid the liver is fed with.",
      adult: "The reservoir, which holds the fluid the organ is perfused with. It carries no red blood cells: all of its oxygen is dissolved.",
    },
    pump: {
      child: "The pump. It decides how much liquid goes through the liver.",
      adult: "The pump. It sets how much fluid goes through the organ every minute.",
    },
    oxygenator: {
      child: "Here the liquid gets its oxygen. It is the lung of the machine.",
      adult: "The oxygenator, where the fluid meets the gas and takes its oxygen up. It is the lung of the circuit.",
    },
    heater: {
      child: "This keeps the liquid as warm as a body.",
      adult: "The heat exchanger, which holds the perfusate at the temperature of the bath. A warm liver works and a cold one waits.",
    },
    organ: {
      child: "The liver on the machine.",
      adult: "The organ on the machine: a rat liver, the model of the perfusion library of pkpdsim. The same machines keep human livers alive on the way to a transplant.",
    },
    bile: {
      child: "The little tube the liver juice drips out of.",
      adult: "The bile duct. What drips out of it is the surest sign that the organ is still doing its work.",
    },
  },
  zoneInfo: {
    first: {
      child: "Here the liquid arrives. These cells get the oxygen first.",
      adult: "Zone 1, where the fluid arrives. These cells see the oxygen first.",
    },
    last: {
      child: "The far end. Only what is left over arrives here, so these cells die first.",
      adult: "Zone 4, the far end of the sinusoid. Whatever is left of the oxygen reaches here, which is why these cells die first.",
    },
    middle: zone => `Zone ${zone}, between the inflow and the outflow.`,
  },
  notes: {
    leaving: value => `${value} kPa leaving`,
    alive: value => `${value}% of the cells alive`,
    bile: value => `${value} ul/min of bile`,
    ofThePerfusion: "of the perfusion",
  },
  reading: facts => {
    const state = facts.alive >= 95
      ? "the organ is well"
      : facts.alive >= 60 ? "the far end of the sinusoid is suffering" : "the far end has died";
    const cold = facts.cold === undefined ? "" : `, kept at ${facts.cold} degrees`;
    return `${facts.flow} ml a minute at ${facts.oxygen} kPa of oxygen${cold}: after `
      + `${facts.hour} hours ${state}, ${facts.alive}% of the last cells are alive and the `
      + `liver makes ${facts.bile} microlitres of bile a minute.`;
  },
  loading: "Loading the perfusion...",
  startingSolver: "Starting the solver...",
  solvingReference: "Solving the reference perfusion...",
};

const DE: PerfusionCopy = {
  quiz: [
    {
      id: "why",
      ask: "Warum legt man eine Leber überhaupt an eine Maschine?",
      choices: [
        {id: "alive", label: "Um sie am Leben zu halten, bis jemand sie braucht"},
        {id: "clean", label: "Um sie zu waschen"},
        {id: "cool", label: "Um sie einzufrieren"},
      ],
      answer: "alive",
      because: "Eine Leber außerhalb des Körpers bekommt kein Blut. Die Maschine pumpt eine warme,"
        + " sauerstoffreiche Flüssigkeit hindurch, damit sie weiterarbeitet und geprüft werden kann.",
      tryIt: "Probier es: Dreh die Pumpe herunter und sieh zu, was das Organ macht.",
    },
    {
      id: "oxygen",
      ask: "Der Sauerstoff in der Flüssigkeit wird heruntergedreht. Was macht die Leber?",
      choices: [
        {id: "suffers", label: "Ihre Zellen nehmen Schaden"},
        {id: "faster", label: "Sie arbeitet schneller"},
        {id: "nothing", label: "Nichts, sie braucht keinen Sauerstoff"},
      ],
      answer: "suffers",
      because: "Leberzellen verbrauchen ständig Sauerstoff. Ohne genug davon machen sie keine"
        + " Galle mehr und lassen das Enzym ALT ins Blut, und genau das misst die Maschine.",
      tryIt: "Probier es: Dreh den Sauerstoff herunter und sieh zu, wie ALT steigt.",
    },
    {
      id: "cold",
      ask: "Die Maschine läuft kalt statt warm. Was ändert sich?",
      choices: [
        {id: "slower", label: "Alles in der Leber läuft langsamer"},
        {id: "stops", label: "Die Leber hört sofort auf"},
        {id: "same", label: "Nichts, die Temperatur ist egal"},
      ],
      answer: "slower",
      because: "Kälte bremst jeden Vorgang, also braucht die Leber weniger Sauerstoff und hält"
        + " länger. Warm prüft man, ob sie noch arbeitet; kalt transportiert man sie.",
      tryIt: "Probier es: Dreh die Temperatur herunter und lies die Galle ab.",
    },
  ],
  about: {
    child: "Eine Leber kann außerhalb des Körpers leben, wenn eine Maschine sie weiter versorgt: warme Flüssigkeit mit Sauerstoff, ohne Pause hindurchgepumpt.",
    adult: "Eine Leber, die aus dem Körper genommen wurde, bleibt am Leben, wenn sie perfundiert wird: warme, sauerstoffreiche Flüssigkeit, ohne Unterbrechung hindurchgepumpt. So wird ein Spenderorgan transportiert und geprüft, und so wird eine Leber für sich untersucht.",
    expert: "Eine normotherme Maschinenperfusion der Rattenleber aus der Perfusionsbibliothek von pkpdsim, mit vier Zonen entlang des Sinusoids. Das Perfusat enthält keine Erythrozyten, der ganze Sauerstoff ist gelöst, und der Gradient entlang des Sinusoids ist entsprechend steil.",
  },
  tries: [
    {
      child: "Dreh den Sauerstoff herunter: die Zellen am Ende sterben zuerst, und die Galle hört auf.",
      adult: "Drehen Sie den Sauerstoff herunter: das hintere Ende des Sinusoids stirbt zuerst, und die Galle versiegt.",
      expert: "Drehen Sie den Sauerstoff herunter: zuerst perizentrale Nekrose, mit fallender Galle und steigendem ALT.",
    },
    {
      child: "Dreh die Pumpe herunter und sieh, wie wenig Sauerstoff die letzte Zone erreicht.",
      adult: "Drehen Sie die Pumpe herunter und sehen Sie, wie wenig Sauerstoff die letzte Zone erreicht.",
      expert: "Drehen Sie die Pumpe herunter: das Angebot fällt bei gleichem pO2, und die letzte Zone hungert.",
    },
  ],
  stats: {
    taken: {
      label: {child: "Sauerstoff verbraucht", adult: "Sauerstoff aufgenommen"},
      info: {
        child: "Wie viel Sauerstoff die Leber unterwegs verbraucht hat.",
        adult: "Wie viel vom Sauerstoff das Organ der Flüssigkeit auf dem Weg entnommen hat. Eine lebende Leber atmet.",
        expert: "Die Sauerstoffextraktion über das Organ, die Differenz zwischen Zu- und Abfluss, also die Atmung des Transplantats.",
      },
    },
    outflow: {
      label: {child: "Sauerstoff übrig", adult: "Sauerstoff im Abfluss"},
      info: {
        child: "Wie viel Sauerstoff noch in der Flüssigkeit ist, wenn sie wieder herauskommt.",
        adult: "Was in der Flüssigkeit übrig ist, wenn sie das Organ verlässt. Bei null bekommen die Zellen am hinteren Ende nichts mehr.",
        expert: "Der pO2 des Abflusses. Bei null ist die perizentrale Zone anoxisch, gleich was der Zufluss sagt.",
      },
    },
    bile: {
      label: {child: "Galle", adult: "Galle"},
      info: {
        child: "Lebersaft. Eine Leber, der es gut geht, macht ihn weiter.",
        adult: "Eine Leber macht Galle, solange sie arbeitet, und der Tropfen aus dem Gallengang ist das Zeichen, dass sie lebt.",
        expert: "Die Galleproduktion, der funktionelle Parameter, an dem ein Zentrum ein Transplantat während der Perfusion beurteilt.",
      },
    },
    alive: {
      label: {child: "Zellen am Leben", adult: "Zellen am Leben"},
      info: {
        child: "Wie viele Zellen am hinteren Ende noch leben.",
        adult: "Die Zellen, die am hinteren Ende des Sinusoids noch leben, also die, die zuletzt versorgt werden.",
        expert: "Der vitale Anteil der perizentralen Zone, wo der hypoxische Schaden beginnt.",
      },
    },
    alt: {
      label: {child: "Schaden", adult: "ALT freigesetzt"},
      info: {
        child: "Etwas, das nur herauskommt, wenn Zellen kaputtgehen. Je mehr, desto schlimmer.",
        adult: "Ein Enzym aus dem Inneren der Leberzellen. Es gelangt nur in die Flüssigkeit, wenn Zellen aufbrechen, und ist damit das Maß des Schadens.",
        expert: "Alanin-Aminotransferase im Perfusat, der Zytolysemarker des Kreislaufs.",
      },
    },
    lactate: {
      label: {child: "Laktat", adult: "Laktat"},
      info: {
        child: "Eine gesunde Leber verbraucht es. Eine, der es schlecht geht, macht mehr davon.",
        adult: "Eine gesunde Leber verbraucht Laktat. Eine angeschlagene bildet es stattdessen, ein steigendes Laktat ist also ein schlechtes Zeichen.",
        expert: "Laktat im Perfusat. Die Clearance ist ein Vitalitätskriterium der normothermen Perfusion; Produktion heißt, das Organ arbeitet anaerob.",
      },
    },
  },
  roles: {
    flow: {
      more: "Die Maschinenperfusion hält ein Organ außerhalb des Körpers am Leben, indem sie Flüssigkeit durch die Gefäße drückt, die es im Körper benutzt hat. Der Fluss trägt den Sauerstoff hinein und die Abfallstoffe hinaus, und die Zellen am Ende des Weges leben von dem, was die Zellen davor übrig gelassen haben, also hungert zu wenig Fluss zuerst das hintere Ende aus. Zu viel ist nicht besser: Ein Gefäß, das für den Druck eines Körpers gebaut ist, nimmt Schaden, wenn stärker hindurchgedrückt wird.",
      label: {child: "Die Pumpe", adult: "Pumpe"},
      info: {
        child: "Dreh daran, dann schiebt die Pumpe mehr oder weniger Flüssigkeit durch die Leber.",
        adult: "Ändert, wie viel Perfusat die Pumpe durch das Organ schiebt. Herunterdrehen, und die Zellen am weitesten vom Zufluss hungern nach Sauerstoff.",
        expert: "Der Pumpenfluss durch das Organ. Bei festem pO2 bestimmt er das Sauerstoffangebot und damit den Gradienten entlang des Sinusoids.",
      },
    },
    oxygen: {
      more: "Im Kreislauf gibt es keine roten Blutkörperchen, also ist der einzige Sauerstoff, den das Organ bekommt, der in der Flüssigkeit gelöste, ein kleiner Bruchteil dessen, was dasselbe Volumen Blut trüge. Der Oxygenator hält die Flüssigkeit auf einem gewählten Sauerstoffdruck, und die Leber zehrt entlang des Sinusoids davon, also sind die Zellen am Zufluss immer besser versorgt als die am Abfluss. Dieser Unterschied ist das Gefälle, mit dem die Leber auch im Körper lebt, und eine Perfusion macht es schärfer.",
      label: {child: "Der Sauerstoff", adult: "Sauerstoff"},
      info: {
        child: "Dreh daran, dann kommt mehr oder weniger Sauerstoff in die Flüssigkeit. Mehr bekommt die Leber nicht.",
        adult: "Ändert, wie viel Sauerstoff der Oxygenator in die Flüssigkeit bringt. Es ist der einzige Sauerstoff, den das Organ bekommt: im Kreislauf sind keine roten Blutkörperchen.",
        expert: "Der pO2, auf dem der Oxygenator das Perfusat hält. Ohne Hämoglobin ist der gelöste Sauerstoff das ganze Angebot.",
      },
    },
    temperature: {
      more: "Kalt ist, wie ein Organ transportiert wird: Bei vier Grad läuft die Chemie einer Zelle nur noch mit einem Bruchteil ihrer Geschwindigkeit, also übersteht sie Stunden ohne viel Sauerstoff, und genau dafür ist eine Transportbox da. Warm ist der andere Handel: Bei Körpertemperatur arbeitet das Organ, bildet Galle und klärt, was man ihm gibt, und nur so findet man heraus, ob es überhaupt arbeitet; dafür muss es die ganze Zeit versorgt und mit Sauerstoff beliefert werden. Alles andere auf diesem Tisch hängt an dieser Wahl, denn die Löslichkeit der Gase, das Tempo der Enzyme und der Bedarf der Zellen gehen mit der Temperatur.",
      label: {child: "Warm oder kalt", adult: "Temperatur"},
      info: {
        child: "Dreh daran, dann hält die Maschine die Leber wärmer oder kälter. Warm heißt, sie arbeitet, kalt heißt, sie schläft.",
        adult: "Ändert, wie warm der Kreislauf gehalten wird. Warm heißt, das Organ arbeitet und muss versorgt werden; kalt verlangsamt alles, und so wird ein Organ zur Transplantation gebracht.",
        expert: "Die Temperatur des Kreislaufs, von hypothermer Lagerung bis zur Normothermie. Sie geht vor der Auflösung der Initialwerte ein, weil Löslichkeit und Raten initial assignments von ihr sind.",
      },
    },
    hour: {
      more: "Eine Perfusion ist ein Verlauf und kein Zustand: Das Organ wärmt sich auf, der Widerstand seiner Gefäße pendelt sich ein, die Galle setzt ein, und die Schadensmarker steigen oder eben nicht. Durch die Stunden zurückzugehen ist, wie man das liest, denn eine Zahl am Ende sagt wenig ohne den Weg, auf dem sie zustande kam. Dieser Regler ändert nichts am Modell: Er verschiebt nur, wo im gerechneten Lauf man steht.",
      label: {child: "Stunden an der Maschine", adult: "Stunden an der Maschine"},
      info: {
        child: "Dreh daran, um durch die Stunden der Perfusion zu reisen.",
        adult: "Drehen Sie zurück, um durch die Perfusion zu gehen, vom Ende bis zu dem Moment, in dem das Organ angeschlossen wurde.",
        expert: "Die Stunde des gelösten Verlaufs, vom Ende zurück zum Anschluss des Organs. Das Rad ist relativ und rechnet nichts neu.",
      },
    },
  },
  traces: {outflow: "Sauerstoff im Abfluss", bile: "Galle", alive: "Zellen am Leben"},
  parts: {
    reservoir: "Reservoir", pump: "Pumpe", oxygenator: "Oxygenator", heater: "Heizung",
    liver: "Leber", bile: "Galle",
  },
  units: {flow: "ml/min", oxygen: "kPa", temperature: "C", bile: "ul/min"},
  zones: {periportal: "periportal", pericentral: "perivenös"},
  motivation: {
    child: "Eine Leber auf dem Weg zu jemandem muss am Leben bleiben. Hier kann man ihr zusehen.",
    adult: "Eine Spenderleber muss bis zur Transplantation am Leben bleiben; die Maschine hält sie in Funktion und macht sie prüfbar.",
    expert: "Die normotherme Maschinenperfusion hält ein Spenderorgan bis zur Implantation in Funktion und macht Zufluss, Abfluss und Galle gleichzeitig messbar.",
  },
  partInfo: {
    tube: {
      child: "Die Schläuche. Die Flüssigkeit läuft im Kreis, durch die Leber und zurück.",
      adult: "Die Schläuche. Das Perfusat wird aus dem Reservoir durch den Oxygenator in das Organ gepumpt.",
    },
    return: {
      child: "Was durch die Leber war, geht zurück und wieder von vorn.",
      adult: "Was durch das Organ war, geht zurück ins Reservoir und wieder von vorn.",
    },
    reservoir: {
      child: "Der Behälter mit der Flüssigkeit, mit der die Leber versorgt wird.",
      adult: "Das Reservoir mit der Flüssigkeit, mit der das Organ perfundiert wird. Es enthält keine roten Blutkörperchen: der ganze Sauerstoff ist gelöst.",
    },
    pump: {
      child: "Die Pumpe. Sie bestimmt, wie viel Flüssigkeit durch die Leber geht.",
      adult: "Die Pumpe. Sie bestimmt, wie viel Flüssigkeit jede Minute durch das Organ geht.",
    },
    oxygenator: {
      child: "Hier bekommt die Flüssigkeit ihren Sauerstoff. Das ist die Lunge der Maschine.",
      adult: "Der Oxygenator, wo die Flüssigkeit auf das Gas trifft und seinen Sauerstoff aufnimmt. Er ist die Lunge des Kreislaufs.",
    },
    heater: {
      child: "Das hält die Flüssigkeit so warm wie einen Körper.",
      adult: "Der Wärmetauscher, der das Perfusat auf der Temperatur des Bades hält. Eine warme Leber arbeitet, eine kalte wartet.",
    },
    organ: {
      child: "Die Leber an der Maschine.",
      adult: "Das Organ an der Maschine: eine Rattenleber, das Modell der Perfusionsbibliothek von pkpdsim. Dieselben Maschinen halten menschliche Lebern auf dem Weg zur Transplantation am Leben.",
    },
    bile: {
      child: "Das Röhrchen, aus dem der Lebersaft tropft.",
      adult: "Der Gallengang. Was aus ihm tropft, ist das sicherste Zeichen, dass das Organ noch arbeitet.",
    },
  },
  zoneInfo: {
    first: {
      child: "Hier kommt die Flüssigkeit an. Diese Zellen bekommen den Sauerstoff zuerst.",
      adult: "Zone 1, wo die Flüssigkeit ankommt. Diese Zellen sehen den Sauerstoff zuerst.",
    },
    last: {
      child: "Das hintere Ende. Hier kommt nur noch an, was übrig ist, also sterben diese Zellen zuerst.",
      adult: "Zone 4, das hintere Ende des Sinusoids. Hier kommt an, was vom Sauerstoff übrig ist, und darum sterben diese Zellen zuerst.",
    },
    middle: zone => `Zone ${zone}, zwischen Zufluss und Abfluss.`,
  },
  notes: {
    leaving: value => `${value} kPa im Abfluss`,
    alive: value => `${value}% der Zellen leben`,
    bile: value => `${value} ul/min Galle`,
    ofThePerfusion: "der Perfusion",
  },
  reading: facts => {
    const state = facts.alive >= 95
      ? "geht es dem Organ gut"
      : facts.alive >= 60
        ? "leidet das hintere Ende des Sinusoids"
        : "ist das hintere Ende abgestorben";
    const cold = facts.cold === undefined ? "" : `, bei ${facts.cold} Grad gehalten`;
    return `${facts.flow} ml pro Minute bei ${facts.oxygen} kPa Sauerstoff${cold}: nach `
      + `${facts.hour} Stunden ${state}, ${facts.alive}% der letzten Zellen leben, und die Leber `
      + `macht ${facts.bile} Mikroliter Galle pro Minute.`;
  },
  loading: "Die Perfusion wird geladen...",
  startingSolver: "Der Solver wird gestartet...",
  solvingReference: "Die Referenzperfusion wird gerechnet...",
};

const ES: PerfusionCopy = {
  quiz: [
    {
      id: "why",
      ask: "¿Para qué se pone un hígado en una máquina?",
      choices: [
        {id: "alive", label: "Para mantenerlo vivo hasta que alguien lo necesite"},
        {id: "clean", label: "Para lavarlo"},
        {id: "cool", label: "Para congelarlo"},
      ],
      answer: "alive",
      because: "Un hígado fuera del cuerpo no recibe sangre. La máquina bombea un líquido templado"
        + " y rico en oxígeno para que siga trabajando y se pueda comprobar antes del trasplante.",
      tryIt: "Pruébalo: baja la bomba y mira qué hace el órgano.",
    },
    {
      id: "oxygen",
      ask: "Se baja el oxígeno del líquido. ¿Qué hace el hígado?",
      choices: [
        {id: "suffers", label: "Sus células empiezan a dañarse"},
        {id: "faster", label: "Trabaja más rápido"},
        {id: "nothing", label: "Nada, no necesita oxígeno"},
      ],
      answer: "suffers",
      because: "Las células del hígado queman oxígeno todo el tiempo. Sin suficiente dejan de"
        + " hacer bilis y sueltan la enzima ALT, que es lo que mide la máquina.",
      tryIt: "Pruébalo: baja el oxígeno y mira cómo sube la ALT.",
    },
    {
      id: "cold",
      ask: "La máquina funciona en frío en vez de templada. ¿Qué cambia?",
      choices: [
        {id: "slower", label: "Todo en el hígado va más lento"},
        {id: "stops", label: "El hígado se para de golpe"},
        {id: "same", label: "Nada, la temperatura da igual"},
      ],
      answer: "slower",
      because: "El frío frena todos los procesos, así que el hígado necesita menos oxígeno y"
        + " aguanta más. En caliente se comprueba si funciona; en frío se transporta.",
      tryIt: "Pruébalo: baja la temperatura y lee la bilis.",
    },
  ],
  about: {
    child: "Un hígado puede vivir fuera del cuerpo si una máquina lo sigue alimentando: líquido caliente con oxígeno, bombeado sin parar.",
    adult: "Un hígado sacado del cuerpo sigue vivo si se perfunde: líquido caliente, lleno de oxígeno, bombeado por él sin parar. Así se transporta y se evalúa un órgano donado, y así se estudia un hígado por separado.",
    expert: "Una perfusión de máquina normotérmica del hígado de rata de la biblioteca de perfusión de pkpdsim, con cuatro zonas a lo largo del sinusoide. El perfundido no lleva glóbulos rojos, todo su oxígeno está disuelto y el gradiente del sinusoide es pronunciado.",
  },
  tries: [
    {
      child: "Baja el oxígeno: las células del extremo mueren primero y la bilis se para.",
      adult: "Baje el oxígeno: el extremo final del sinusoide muere primero, y la bilis se detiene.",
      expert: "Baje el oxígeno: primero necrosis pericentral, con la bilis cayendo y la ALT subiendo.",
    },
    {
      child: "Baja la bomba y mira qué poco oxígeno llega a la última zona.",
      adult: "Baje la bomba y observe qué poco oxígeno llega a la última zona.",
      expert: "Baje la bomba: el aporte cae con el mismo pO2 y la última zona se queda sin oxígeno.",
    },
  ],
  stats: {
    taken: {
      label: {child: "Oxígeno usado", adult: "Oxígeno captado"},
      info: {
        child: "Cuánto oxígeno gastó el hígado al pasar el líquido.",
        adult: "Cuánto del oxígeno sacó el órgano del líquido a su paso. Un hígado vivo respira.",
        expert: "La extracción de oxígeno del órgano, la diferencia entre entrada y salida, que es la respiración del injerto.",
      },
    },
    outflow: {
      label: {child: "Oxígeno que queda", adult: "Oxígeno a la salida"},
      info: {
        child: "Cuánto oxígeno queda en el líquido cuando vuelve a salir.",
        adult: "Lo que queda en el líquido cuando sale del órgano. Cuando llega a cero, las células del extremo no reciben nada.",
        expert: "La pO2 de salida. En cero la zona pericentral está anóxica, diga lo que diga la entrada.",
      },
    },
    bile: {
      label: {child: "Bilis", adult: "Bilis"},
      info: {
        child: "El jugo del hígado. Un hígado que está bien sigue haciéndolo.",
        adult: "Un hígado hace bilis mientras trabaja, así que la gota que sale del conducto biliar es la señal de que está vivo.",
        expert: "La producción de bilis, el parámetro funcional con el que un centro juzga un injerto durante la perfusión.",
      },
    },
    alive: {
      label: {child: "Células vivas", adult: "Células vivas"},
      info: {
        child: "Cuántas células del extremo siguen vivas.",
        adult: "Las células todavía vivas en el extremo final del sinusoide, las que se sirven las últimas.",
        expert: "La fracción viable de la zona pericentral, donde empieza el daño hipóxico.",
      },
    },
    alt: {
      label: {child: "Daño", adult: "ALT liberada"},
      info: {
        child: "Algo que solo sale cuando se rompen las células. Cuanto más, peor.",
        adult: "Una enzima del interior de las células del hígado. Solo llega al líquido cuando las células se rompen, así que es la medida del daño.",
        expert: "Alanina aminotransferasa en el perfundido, el marcador de citólisis del circuito.",
      },
    },
    lactate: {
      label: {child: "Lactato", adult: "Lactato"},
      info: {
        child: "Un hígado sano se lo come. Uno que lo pasa mal hace más.",
        adult: "Un hígado sano consume lactato. Uno que lo pasa mal lo produce, así que un lactato que sube es mala señal.",
        expert: "Lactato en el perfundido. Su aclaramiento es criterio de viabilidad en la perfusión normotérmica; producirlo significa que el órgano está en anaerobiosis.",
      },
    },
  },
  roles: {
    flow: {
      more: "La perfusión de máquina mantiene vivo un órgano fuera del cuerpo empujando líquido por los vasos que usaba dentro. El flujo lleva el oxígeno adentro y los desechos afuera, y las células del final del camino viven de lo que han dejado las de antes, así que un flujo escaso deja sin nada primero al extremo lejano. Demasiado tampoco es mejor: un vaso hecho para la presión de un cuerpo se daña si se empuja más fuerte que eso.",
      label: {child: "La bomba", adult: "Bomba"},
      info: {
        child: "Gíralo y la bomba empuja más o menos líquido por el hígado cada minuto.",
        adult: "Cambia cuánto perfundido empuja la bomba por el órgano. Si lo bajas, las células más lejanas a la entrada se quedan sin oxígeno.",
        expert: "El flujo de la bomba por el órgano. Con una pO2 fija fija el aporte de oxígeno y con él el gradiente del sinusoide.",
      },
    },
    oxygen: {
      more: "En el circuito no hay glóbulos rojos, así que el único oxígeno que recibe el órgano es el disuelto en el líquido, una fracción pequeña de lo que llevaría el mismo volumen de sangre. El oxigenador mantiene el líquido a una presión de oxígeno elegida, y el hígado tira de ella a lo largo del sinusoide, de modo que las células de la entrada están siempre mejor servidas que las de la salida. Esa diferencia es el gradiente con el que el hígado vive también dentro del cuerpo, y una perfusión lo hace más marcado.",
      label: {child: "El oxígeno", adult: "Oxígeno"},
      info: {
        child: "Gíralo y entra más o menos oxígeno en el líquido. Es todo lo que recibe el hígado.",
        adult: "Cambia cuánto oxígeno pone el oxigenador en el líquido. Es el único oxígeno que recibe el órgano: en el circuito no hay glóbulos rojos.",
        expert: "La pO2 a la que el oxigenador mantiene el perfundido. Sin hemoglobina, el oxígeno disuelto es todo el aporte.",
      },
    },
    temperature: {
      more: "El frío es como se transporta un órgano: a cuatro grados la química de una célula va a una fracción de su velocidad, así que aguanta horas sin mucho oxígeno, y para eso sirve una nevera de transporte. El calor es el otro trato: a temperatura corporal el órgano trabaja, hace bilis y elimina lo que se le da, que es la única forma de saber si funciona, y hay que alimentarlo y oxigenarlo todo el rato. Todo lo demás en esta mesa depende de esa elección, porque la solubilidad de los gases, la velocidad de las enzimas y lo que piden las células van con la temperatura.",
      label: {child: "Frío o caliente", adult: "Temperatura"},
      info: {
        child: "Gíralo y la máquina mantiene el hígado más caliente o más frío. Caliente trabaja, frío duerme.",
        adult: "Cambia cómo de caliente se mantiene el circuito. Caliente significa que el órgano trabaja y hay que alimentarlo; frío lo ralentiza todo, y así se lleva un órgano a un trasplante.",
        expert: "La temperatura del circuito, de la conservación hipotérmica a la normotermia. Entra antes de resolver los valores iniciales, porque la solubilidad y las velocidades son asignaciones iniciales suyas.",
      },
    },
    hour: {
      more: "Una perfusión es un curso y no un estado: el órgano se calienta, la resistencia de sus vasos se asienta, empieza la bilis, y los marcadores de daño suben o no suben. Recorrer las horas hacia atrás es como se lee, porque un número al final dice poco sin la forma con la que llegó. Esta barra no cambia nada del modelo: solo mueve en qué punto del recorrido ya resuelto te encuentras.",
      label: {child: "Horas en la máquina", adult: "Horas en la máquina"},
      info: {
        child: "Gíralo para viajar por las horas de la perfusión.",
        adult: "Gírelo hacia atrás para recorrer la perfusión, del final al momento en que se montó el órgano.",
        expert: "La hora del curso resuelto, del final al montaje del órgano. El dial es relativo y no resuelve nada.",
      },
    },
  },
  traces: {outflow: "oxígeno a la salida", bile: "bilis", alive: "células vivas"},
  parts: {
    reservoir: "Depósito", pump: "Bomba", oxygenator: "Oxigenador", heater: "Calentador",
    liver: "Hígado", bile: "Bilis",
  },
  units: {flow: "ml/min", oxygen: "kPa", temperature: "C", bile: "ul/min"},
  zones: {periportal: "periportal", pericentral: "perivenosa"},
  motivation: {
    child: "Un hígado de camino a alguien debe seguir vivo. Aquí se le puede mirar.",
    adult: "Un hígado donado debe seguir vivo hasta el trasplante; la máquina lo mantiene funcionando y permite evaluarlo.",
    expert: "La perfusión normotérmica mantiene funcionando un órgano donado hasta el implante y hace medibles a la vez la entrada, la salida y la bilis.",
  },
  partInfo: {
    tube: {
      child: "Los tubos. El líquido da vueltas, por el hígado y de vuelta.",
      adult: "Los tubos. El perfundido se bombea del depósito, por el oxigenador, hasta el órgano.",
    },
    return: {
      child: "Lo que ha pasado por el hígado vuelve y da otra vuelta.",
      adult: "Lo que ha pasado por el órgano vuelve al depósito y da otra vuelta.",
    },
    reservoir: {
      child: "El depósito con el líquido con el que se alimenta el hígado.",
      adult: "El depósito, que guarda el líquido con el que se perfunde el órgano. No lleva glóbulos rojos: todo su oxígeno está disuelto.",
    },
    pump: {
      child: "La bomba. Decide cuánto líquido pasa por el hígado.",
      adult: "La bomba. Fija cuánto líquido pasa por el órgano cada minuto.",
    },
    oxygenator: {
      child: "Aquí el líquido recibe su oxígeno. Es el pulmón de la máquina.",
      adult: "El oxigenador, donde el líquido se encuentra con el gas y toma su oxígeno. Es el pulmón del circuito.",
    },
    heater: {
      child: "Esto mantiene el líquido tan caliente como un cuerpo.",
      adult: "El intercambiador de calor, que mantiene el perfundido a la temperatura del baño. Un hígado caliente trabaja, uno frío espera.",
    },
    organ: {
      child: "El hígado en la máquina.",
      adult: "El órgano en la máquina: un hígado de rata, el modelo de la biblioteca de perfusión de pkpdsim. Las mismas máquinas mantienen vivos hígados humanos camino de un trasplante.",
    },
    bile: {
      child: "El tubito por el que gotea el jugo del hígado.",
      adult: "El conducto biliar. Lo que gotea de él es la señal más segura de que el órgano sigue trabajando.",
    },
  },
  zoneInfo: {
    first: {
      child: "Aquí llega el líquido. Estas células reciben el oxígeno primero.",
      adult: "Zona 1, donde llega el líquido. Estas células ven el oxígeno primero.",
    },
    last: {
      child: "El extremo final. Aquí solo llega lo que sobra, así que estas células mueren primero.",
      adult: "Zona 4, el extremo final del sinusoide. Aquí llega lo que quede del oxígeno, y por eso estas células mueren primero.",
    },
    middle: zone => `Zona ${zone}, entre la entrada y la salida.`,
  },
  notes: {
    leaving: value => `${value} kPa a la salida`,
    alive: value => `${value}% de las células vivas`,
    bile: value => `${value} ul/min de bilis`,
    ofThePerfusion: "de la perfusión",
  },
  reading: facts => {
    const state = facts.alive >= 95
      ? "el órgano está bien"
      : facts.alive >= 60
        ? "el extremo final del sinusoide está sufriendo"
        : "el extremo final ha muerto";
    const cold = facts.cold === undefined ? "" : `, mantenido a ${facts.cold} grados`;
    return `${facts.flow} ml por minuto con ${facts.oxygen} kPa de oxígeno${cold}: tras `
      + `${facts.hour} horas ${state}, el ${facts.alive}% de las últimas células vive y el `
      + `hígado hace ${facts.bile} microlitros de bilis por minuto.`;
  },
  loading: "Cargando la perfusión...",
  startingSolver: "Arrancando el solucionador...",
  solvingReference: "Resolviendo la perfusión de referencia...",
};

export const PERFUSION_TEXT: Readonly<Record<Locale, PerfusionCopy>> = {en: EN, de: DE, es: ES};
