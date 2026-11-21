/** What the machine perfusion table says, in the three languages and at the three levels. */

import type {Locale, Phrase} from "@pkpdsim-tui/tui-kit";

export interface Named {
  readonly label: Phrase;
  readonly info: Phrase;
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
  readonly stats: Readonly<Record<
    "taken" | "outflow" | "bile" | "alive" | "alt" | "lactate", Named>>;
  readonly roles: Readonly<Record<"flow" | "oxygen" | "temperature" | "hour", Named>>;
  readonly traces: Readonly<Record<"outflow" | "bile" | "alive", string>>;
  readonly parts: Readonly<Record<
    "reservoir" | "pump" | "oxygenator" | "liver" | "bile", string>>;
  readonly partInfo: Readonly<Record<
    "tube" | "return" | "reservoir" | "pump" | "oxygenator" | "organ" | "bile", Phrase>>;
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
      label: {child: "The pump", adult: "Pump"},
      info: {
        child: "How much liquid the pump pushes through the liver every minute.",
        adult: "The pump, which pushes the perfusate through the organ. Too little, and the cells furthest from the inflow are starved of oxygen.",
        expert: "The pump flow through the organ. With a fixed pO2 it sets the oxygen delivery, and with it the gradient along the sinusoid.",
      },
    },
    oxygen: {
      label: {child: "The oxygen", adult: "Oxygen"},
      info: {
        child: "How much oxygen is put into the liquid. It is all the liver gets.",
        adult: "How much oxygen the oxygenator puts into the fluid. It is the only oxygen the organ gets: there are no red blood cells in the circuit.",
        expert: "The pO2 the oxygenator holds the perfusate at. Without haemoglobin the dissolved oxygen is the whole supply.",
      },
    },
    temperature: {
      label: {child: "Warm or cold", adult: "Temperature"},
      info: {
        child: "How warm the machine keeps the liver. Warm means it works, cold means it sleeps.",
        adult: "How warm the circuit is kept. Warm means the organ works and has to be fed; cold slows everything down, which is how an organ is carried to a transplant.",
        expert: "The temperature of the circuit, from hypothermic storage to normothermia. It enters before the initial values are resolved, because the solubility and the rates are initial assignments of it.",
      },
    },
    hour: {
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
    reservoir: "Reservoir", pump: "Pump", oxygenator: "Oxygenator", liver: "Liver", bile: "Bile",
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
      label: {child: "Die Pumpe", adult: "Pumpe"},
      info: {
        child: "Wie viel Flüssigkeit die Pumpe jede Minute durch die Leber schiebt.",
        adult: "Die Pumpe, die das Perfusat durch das Organ schiebt. Zu wenig, und die Zellen am weitesten vom Zufluss hungern nach Sauerstoff.",
        expert: "Der Pumpenfluss durch das Organ. Bei festem pO2 bestimmt er das Sauerstoffangebot und damit den Gradienten entlang des Sinusoids.",
      },
    },
    oxygen: {
      label: {child: "Der Sauerstoff", adult: "Sauerstoff"},
      info: {
        child: "Wie viel Sauerstoff in die Flüssigkeit kommt. Mehr bekommt die Leber nicht.",
        adult: "Wie viel Sauerstoff der Oxygenator in die Flüssigkeit bringt. Es ist der einzige Sauerstoff, den das Organ bekommt: im Kreislauf sind keine roten Blutkörperchen.",
        expert: "Der pO2, auf dem der Oxygenator das Perfusat hält. Ohne Hämoglobin ist der gelöste Sauerstoff das ganze Angebot.",
      },
    },
    temperature: {
      label: {child: "Warm oder kalt", adult: "Temperatur"},
      info: {
        child: "Wie warm die Maschine die Leber hält. Warm heißt, sie arbeitet, kalt heißt, sie schläft.",
        adult: "Wie warm der Kreislauf gehalten wird. Warm heißt, das Organ arbeitet und muss versorgt werden; kalt verlangsamt alles, und so wird ein Organ zur Transplantation gebracht.",
        expert: "Die Temperatur des Kreislaufs, von hypothermer Lagerung bis zur Normothermie. Sie geht vor der Auflösung der Initialwerte ein, weil Löslichkeit und Raten initial assignments von ihr sind.",
      },
    },
    hour: {
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
    reservoir: "Reservoir", pump: "Pumpe", oxygenator: "Oxygenator", liver: "Leber",
    bile: "Galle",
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
      label: {child: "La bomba", adult: "Bomba"},
      info: {
        child: "Cuánto líquido empuja la bomba por el hígado cada minuto.",
        adult: "La bomba, que empuja el perfundido por el órgano. Si es poco, las células más lejanas a la entrada se quedan sin oxígeno.",
        expert: "El flujo de la bomba por el órgano. Con una pO2 fija fija el aporte de oxígeno y con él el gradiente del sinusoide.",
      },
    },
    oxygen: {
      label: {child: "El oxígeno", adult: "Oxígeno"},
      info: {
        child: "Cuánto oxígeno se pone en el líquido. Es todo lo que recibe el hígado.",
        adult: "Cuánto oxígeno pone el oxigenador en el líquido. Es el único oxígeno que recibe el órgano: en el circuito no hay glóbulos rojos.",
        expert: "La pO2 a la que el oxigenador mantiene el perfundido. Sin hemoglobina, el oxígeno disuelto es todo el aporte.",
      },
    },
    temperature: {
      label: {child: "Frío o caliente", adult: "Temperatura"},
      info: {
        child: "Cómo de caliente mantiene la máquina el hígado. Caliente trabaja, frío duerme.",
        adult: "Cómo de caliente se mantiene el circuito. Caliente significa que el órgano trabaja y hay que alimentarlo; frío lo ralentiza todo, y así se lleva un órgano a un trasplante.",
        expert: "La temperatura del circuito, de la conservación hipotérmica a la normotermia. Entra antes de resolver los valores iniciales, porque la solubilidad y las velocidades son asignaciones iniciales suyas.",
      },
    },
    hour: {
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
    reservoir: "Depósito", pump: "Bomba", oxygenator: "Oxigenador", liver: "Hígado",
    bile: "Bilis",
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
