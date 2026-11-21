/**
 * What the liver table says, in the three languages and at the three levels. The numbers are
 * the same for everybody; the words around them are not.
 */

import type {Locale, Phrase} from "@pkpdsim-tui/tui-kit";

/** What the sentence of the panel is built from, which every language says its own way. */
export interface LiverFacts {
  readonly qh: string;
  readonly qpo: string;
  readonly qha: string;
  readonly share: number;
  /** Whether the gut is sending more or less than it does at rest. */
  readonly gut: "more" | "less" | "same";
  /** Whether the blood is backing up in the portal vein. */
  readonly backing: boolean;
}

export interface Named {
  readonly label: Phrase;
  readonly info: Phrase;
}

export interface LiverCopy {
  readonly about: Phrase;
  readonly tries: readonly Phrase[];
  readonly stats: Readonly<Record<
    "flow" | "portal" | "artery" | "share" | "ppo" | "lobule", Named>>;
  readonly roles: Readonly<Record<"portal" | "hepatic", Named>>;
  readonly supply: {
    readonly heart: string;
    readonly gut: string;
    readonly liver: string;
    readonly gutInfo: Phrase;
    readonly liverInfo: Phrase;
    readonly share: (percent: number) => string;
  };
  readonly lobule: {
    readonly title: string;
    readonly subtitle: Phrase;
    readonly zone1: string;
    readonly zone3: string;
    readonly triad: Phrase;
    readonly central: Phrase;
    readonly flow: (value: string) => string;
  };
  readonly chapters: Readonly<Record<"glimepiride" | "lobes" | "perfusion", {
    readonly title: string;
    readonly line: string;
    readonly info: Phrase;
  }>>;
  readonly reading: (facts: LiverFacts) => string;
  readonly cardNote: {
    readonly portal: (value: string) => string;
    readonly gradient: (value: string) => string;
  };
}

const EN: LiverCopy = {
  about: {
    child: "The liver gets blood from two pipes: one with oxygen, one with everything you ate. It looks at your food before the rest of you does.",
    adult: "The liver is the only organ with two blood supplies: oxygen from the artery, and everything the gut has absorbed from the portal vein. It sees your food, and every drug you take, before the rest of the body does.",
    expert: "The only organ with a dual afferent supply: about three quarters of its flow from the portal vein, already desaturated but carrying everything absorbed, and a quarter from the hepatic artery. Both end in the same sinusoids, which is what makes the first pass of an oral drug.",
  },
  tries: [
    {
      child: "Turn the gut object: after a meal more blood comes to the liver.",
      adult: "Turn the gut object: after a meal its vessels open and more blood arrives.",
      expert: "Turn the gut object: splanchnic vasodilation after a meal raises the portal flow.",
    },
    {
      child: "Turn the liver object: a hard liver is difficult to get through, and the blood piles up.",
      adult: "Turn the liver object up: a scarred liver holds the blood back, and the portal pressure rises.",
      expert: "Turn the liver object up: a cirrhotic sinusoidal resistance raises the portal pressure and the gradient over the liver.",
    },
  ],
  stats: {
    flow: {
      label: {child: "Blood in the liver", adult: "Through the liver"},
      info: {
        child: "All the blood the liver gets, from both pipes together.",
        adult: "Everything the liver gets, from both of its supplies together. About a litre and a half a minute in a person at rest.",
        expert: "Total hepatic blood flow, the sum of the portal and the arterial inflow. About 1.5 l/min, a quarter of the cardiac output, in a person at rest.",
      },
    },
    portal: {
      label: {child: "From the gut", adult: "From the gut"},
      info: {
        child: "The blood which comes from your stomach and gut, with everything you ate in it.",
        adult: "The blood the portal vein brings from the stomach, the gut and the spleen. It has already given its oxygen away, but it carries everything that was absorbed.",
        expert: "Portal venous inflow from the splanchnic bed. Low in oxygen, high in everything absorbed, and about three quarters of the hepatic flow.",
      },
    },
    artery: {
      label: {child: "From the heart", adult: "From the artery"},
      info: {
        child: "Fresh blood with oxygen in it, straight from the heart.",
        adult: "The blood the hepatic artery brings straight from the aorta: a quarter of the supply, and most of the oxygen.",
        expert: "Hepatic arterial inflow from the aorta, about a quarter of the flow and the larger part of the oxygen delivery, buffered against the portal flow in a real liver.",
      },
    },
    share: {
      label: {child: "Of all the blood", adult: "Of the heart"},
      info: {
        child: "How much of the blood of the whole body goes through the liver.",
        adult: "How much of everything the heart pumps goes through the liver. No other organ of its size takes as large a share.",
        expert: "The hepatic share of the cardiac output, about 25 percent for 2.5 percent of the body mass.",
      },
    },
    ppo: {
      label: {child: "Pressure in the pipe", adult: "Portal pressure"},
      info: {
        child: "How hard the blood pushes in the pipe which comes from the gut.",
        adult: "The pressure in the vein which carries the blood of the gut to the liver. When the liver obstructs it, the blood backs up here: that is portal hypertension.",
        expert: "Portal venous pressure, 8 to 10 mmHg in health. The gradient over the liver, which is what the HVPG measures, rises with the sinusoidal resistance and is what decides varices and ascites.",
      },
    },
    lobule: {
      label: {child: "One little piece gets", adult: "One lobule gets"},
      info: {
        child: "A liver is made of a million tiny pieces. This is what one of them gets.",
        adult: "A liver is built of about a million lobules. This is what one of them is served with, which is the flow of the whole liver divided among them.",
        expert: "Hepatic flow divided by about a million lobules, which is the scale at which the oxygen gradient along the sinusoid and the zonation of the metabolism happen.",
      },
    },
  },
  roles: {
    portal: {
      label: {child: "The gut", adult: "The gut"},
      info: {
        child: "How wide the pipes of your gut are. After a meal they open and more blood goes to the liver.",
        adult: "How open the vessels of the gut and of the portal vein are. After a meal they open and the gut sends more blood to the liver; turning the object up closes them.",
        expert: "The splanchnic resistance of the pressure network. Down is postprandial vasodilation, up is a constricted splanchnic bed.",
      },
    },
    hepatic: {
      label: {child: "The liver", adult: "The liver"},
      info: {
        child: "How easy it is for the blood to get through the liver. A hard liver is difficult.",
        adult: "How easily the blood gets through the liver itself. A scarred, cirrhotic liver resists it, the blood backs up in the portal vein and the pressure there rises.",
        expert: "The sinusoidal resistance of the liver. Raising it is the haemodynamics of cirrhosis: the portal pressure and the gradient rise while the hepatic flow falls.",
      },
    },
  },
  supply: {
    heart: "Heart", gut: "Gut", liver: "Liver",
    gutInfo: {
      child: "Your stomach and your gut. Everything you eat starts here.",
      adult: "The stomach and the gut. What is absorbed here, food and drugs alike, is handed to the liver before the body ever sees it.",
      expert: "The splanchnic bed. Everything absorbed here drains into the portal vein, which is what makes the hepatic first pass.",
    },
    liverInfo: {
      child: "The liver. It is the only part of you with two pipes bringing blood.",
      adult: "The liver. It is the only organ with two supplies: one of oxygen from the artery, one of everything that was eaten from the gut.",
      expert: "The liver, with its dual afferent supply and one efferent hepatic vein to the vena cava.",
    },
    share: percent => `${percent}% of the heart`,
  },
  lobule: {
    title: "One lobule",
    subtitle: {
      child: "The oxygen runs out on the way to the middle",
      adult: "The oxygen falls from the corners to the middle",
      expert: "The oxygen falls from the periportal corners to the pericentral middle",
    },
    zone1: "Zone 1, where the blood arrives",
    zone3: "zone 3",
    triad: {
      child: "Here the blood comes in, through three little pipes together.",
      adult: "A portal triad: a branch of the portal vein, a branch of the hepatic artery and a bile duct, which lie together at every corner of the hexagon.",
      expert: "The portal triad at each corner: portal venule, hepatic arteriole and bile duct, the periportal end of the sinusoid.",
    },
    central: {
      child: "Here the blood leaves again, on its way back to the heart.",
      adult: "The central vein. The blood of the whole hexagon leaves here, on its way back to the heart.",
      expert: "The central vein, the pericentral end of the sinusoid: least oxygen, most drug metabolism, and where damage begins.",
    },
    flow: value => `${value} microlitres a minute`,
  },
  chapters: {
    glimepiride: {
      title: "It takes drugs apart", line: "Follow a tablet through one.",
      info: {
        child: "The liver takes medicines apart so the body can get rid of them.",
        adult: "Almost every drug is changed by the liver before the body is rid of it. The glimepiride table follows one tablet through the gut, the liver and the kidneys.",
        expert: "Hepatic metabolism and elimination: the glimepiride table is the whole body PBPK of one tablet, with CYP2C9 and the organ functions as objects.",
      },
    },
    lobes: {
      title: "It grows back", line: "Cut a piece away.",
      info: {
        child: "You can take a piece of a liver away, and it grows back.",
        adult: "A liver is built of eight pieces which can be taken out one by one. The lobed liver table cuts them away and follows how the rest takes the work over.",
        expert: "The eight Couinaud segments, resection and portal vein ligation, and the regeneration of the remnant over the days after the operation.",
      },
    },
    perfusion: {
      title: "It lives outside the body", line: "Keep one alive on a machine.",
      info: {
        child: "A liver can live outside the body on a machine which feeds it.",
        adult: "A liver on a perfusion machine is kept warm and supplied with oxygen outside the body, which is how a donor organ is carried and tested today.",
        expert: "Normothermic machine perfusion: the organ is kept at temperature, pumped and oxygenated outside the body, which is how a graft is assessed before a transplant.",
      },
    },
  },
  reading: facts => {
    const made = facts.gut === "more" ? "the gut is sending more"
      : facts.gut === "less" ? "the gut is sending less" : "";
    const parts = [made, facts.backing ? "the blood is backing up in the portal vein" : ""]
      .filter(part => part !== "");
    const where = parts.length === 0 ? "" : `, where ${parts.join(" and ")}`;
    return `${facts.qh} litres a minute through the liver${where}: ${facts.qpo} from the gut, `
      + `${facts.qha} from the artery, ${facts.share}% of everything the heart pumps.`;
  },
  cardNote: {
    portal: value => `${value} l/min from the gut`,
    gradient: value => `portal gradient ${value} mmHg`,
  },
};

const DE: LiverCopy = {
  about: {
    child: "Die Leber bekommt Blut aus zwei Rohren: eines mit Sauerstoff, eines mit allem, was du gegessen hast. Sie sieht dein Essen vor dem Rest von dir.",
    adult: "Die Leber ist das einzige Organ mit zwei Blutzuflüssen: Sauerstoff aus der Arterie und alles, was der Darm aufgenommen hat, aus der Pfortader. Sie sieht Ihr Essen und jedes Medikament vor dem Rest des Körpers.",
    expert: "Das einzige Organ mit dualer afferenter Versorgung: etwa drei Viertel des Flusses aus der Pfortader, bereits entsättigt, aber mit allem Resorbierten beladen, ein Viertel aus der Leberarterie. Beide enden in denselben Sinusoiden, und genau das ist der First-Pass eines oral gegebenen Medikaments.",
  },
  tries: [
    {
      child: "Dreh das Darm-Objekt: nach dem Essen kommt mehr Blut zur Leber.",
      adult: "Drehen Sie das Darm-Objekt: nach einer Mahlzeit öffnen sich seine Gefäße und mehr Blut kommt an.",
      expert: "Drehen Sie das Darm-Objekt: die splanchnische Vasodilatation nach dem Essen erhöht den Pfortaderfluss.",
    },
    {
      child: "Dreh das Leber-Objekt: durch eine harte Leber kommt das Blut schwer, und es staut sich.",
      adult: "Drehen Sie das Leber-Objekt hoch: eine vernarbte Leber hält das Blut zurück, und der Pfortaderdruck steigt.",
      expert: "Drehen Sie das Leber-Objekt hoch: ein zirrhotischer sinusoidaler Widerstand hebt Pfortaderdruck und Gradienten über die Leber.",
    },
  ],
  stats: {
    flow: {
      label: {child: "Blut in der Leber", adult: "Durch die Leber"},
      info: {
        child: "Alles Blut, das die Leber bekommt, aus beiden Rohren zusammen.",
        adult: "Alles, was die Leber bekommt, aus beiden Zuflüssen zusammen. Etwa anderthalb Liter pro Minute bei einem ruhenden Menschen.",
        expert: "Der gesamte Leberblutfluss, die Summe aus portalem und arteriellem Zufluss. Etwa 1,5 l/min, ein Viertel des Herzzeitvolumens, in Ruhe.",
      },
    },
    portal: {
      label: {child: "Aus dem Darm", adult: "Aus dem Darm"},
      info: {
        child: "Das Blut, das aus Magen und Darm kommt, mit allem darin, was du gegessen hast.",
        adult: "Das Blut, das die Pfortader aus Magen, Darm und Milz bringt. Es hat seinen Sauerstoff schon abgegeben, trägt aber alles Aufgenommene.",
        expert: "Portalvenöser Zufluss aus dem Splanchnikusgebiet: sauerstoffarm, beladen mit allem Resorbierten, etwa drei Viertel des Leberflusses.",
      },
    },
    artery: {
      label: {child: "Vom Herzen", adult: "Aus der Arterie"},
      info: {
        child: "Frisches Blut mit Sauerstoff, direkt vom Herzen.",
        adult: "Das Blut, das die Leberarterie direkt aus der Aorta bringt: ein Viertel der Versorgung und der größte Teil des Sauerstoffs.",
        expert: "Hepatisch-arterieller Zufluss aus der Aorta, etwa ein Viertel des Flusses und der größere Teil des Sauerstoffangebots, in der realen Leber gegen den Pfortaderfluss gepuffert.",
      },
    },
    share: {
      label: {child: "Von allem Blut", adult: "Vom Herzen"},
      info: {
        child: "Wie viel vom Blut des ganzen Körpers durch die Leber geht.",
        adult: "Wie viel von allem, was das Herz pumpt, durch die Leber geht. Kein anderes Organ dieser Größe nimmt einen so großen Anteil.",
        expert: "Der hepatische Anteil am Herzzeitvolumen: etwa 25 Prozent für 2,5 Prozent der Körpermasse.",
      },
    },
    ppo: {
      label: {child: "Druck im Rohr", adult: "Pfortaderdruck"},
      info: {
        child: "Wie stark das Blut in dem Rohr drückt, das aus dem Darm kommt.",
        adult: "Der Druck in der Vene, die das Blut des Darms zur Leber bringt. Wenn die Leber sie behindert, staut sich das Blut hier: das ist portale Hypertension.",
        expert: "Pfortaderdruck, gesund 8 bis 10 mmHg. Der Gradient über die Leber, den der HVPG misst, steigt mit dem sinusoidalen Widerstand und entscheidet über Varizen und Aszites.",
      },
    },
    lobule: {
      label: {child: "Ein Stückchen bekommt", adult: "Ein Läppchen bekommt"},
      info: {
        child: "Eine Leber besteht aus einer Million winziger Stückchen. So viel bekommt eines davon.",
        adult: "Eine Leber ist aus etwa einer Million Läppchen gebaut. So viel bekommt eines davon, nämlich der Fluss der ganzen Leber auf alle verteilt.",
        expert: "Leberfluss geteilt durch etwa eine Million Läppchen: die Skala, auf der Sauerstoffgradient entlang des Sinusoids und Zonierung des Stoffwechsels stattfinden.",
      },
    },
  },
  roles: {
    portal: {
      label: {child: "Der Darm", adult: "Der Darm"},
      info: {
        child: "Wie weit die Gefäße deines Darms sind. Nach dem Essen öffnen sie sich und mehr Blut geht zur Leber.",
        adult: "Wie weit die Gefäße von Darm und Pfortader geöffnet sind. Nach einer Mahlzeit öffnen sie sich und der Darm schickt mehr Blut zur Leber; nach oben gedreht schließen sie sich.",
        expert: "Der splanchnische Widerstand des Drucknetzwerks. Nach unten ist postprandiale Vasodilatation, nach oben ein konstringiertes Splanchnikusgebiet.",
      },
    },
    hepatic: {
      label: {child: "Die Leber", adult: "Die Leber"},
      info: {
        child: "Wie leicht das Blut durch die Leber kommt. Durch eine harte Leber kommt es schwer.",
        adult: "Wie leicht das Blut durch die Leber selbst kommt. Eine vernarbte, zirrhotische Leber setzt ihm Widerstand entgegen, das Blut staut sich in der Pfortader und der Druck dort steigt.",
        expert: "Der sinusoidale Widerstand der Leber. Ihn zu erhöhen ist die Hämodynamik der Zirrhose: Pfortaderdruck und Gradient steigen, der Leberfluss fällt.",
      },
    },
  },
  supply: {
    heart: "Herz", gut: "Darm", liver: "Leber",
    gutInfo: {
      child: "Dein Magen und dein Darm. Alles, was du isst, fängt hier an.",
      adult: "Magen und Darm. Was hier aufgenommen wird, Essen wie Medikamente, geht zuerst an die Leber, bevor der Körper es je zu sehen bekommt.",
      expert: "Das Splanchnikusgebiet. Alles hier Resorbierte fließt in die Pfortader ab, und das ist der hepatische First-Pass.",
    },
    liverInfo: {
      child: "Die Leber. Sie ist der einzige Teil von dir mit zwei Rohren, die Blut bringen.",
      adult: "Die Leber. Sie ist das einzige Organ mit zwei Zuflüssen: einem mit Sauerstoff aus der Arterie, einem mit allem Gegessenen aus dem Darm.",
      expert: "Die Leber, mit dualer afferenter Versorgung und einer efferenten Lebervene zur Hohlvene.",
    },
    share: percent => `${percent}% vom Herzen`,
  },
  lobule: {
    title: "Ein Läppchen",
    subtitle: {
      child: "Auf dem Weg zur Mitte geht der Sauerstoff aus",
      adult: "Der Sauerstoff fällt von den Ecken zur Mitte hin ab",
      expert: "Der Sauerstoff fällt von den periportalen Ecken zur perizentralen Mitte",
    },
    zone1: "Zone 1, wo das Blut ankommt",
    zone3: "Zone 3",
    triad: {
      child: "Hier kommt das Blut herein, durch drei kleine Rohre nebeneinander.",
      adult: "Ein Periportalfeld: ein Ast der Pfortader, ein Ast der Leberarterie und ein Gallengang, die an jeder Ecke des Sechsecks beieinanderliegen.",
      expert: "Die Portaltrias an jeder Ecke: Portalvenole, Leberarteriole und Gallengang, das periportale Ende des Sinusoids.",
    },
    central: {
      child: "Hier geht das Blut wieder hinaus, zurück zum Herzen.",
      adult: "Die Zentralvene. Das Blut des ganzen Sechsecks verlässt es hier, auf dem Weg zurück zum Herzen.",
      expert: "Die Zentralvene, das perizentrale Ende des Sinusoids: am wenigsten Sauerstoff, am meisten Arzneistoffwechsel, und dort beginnt der Schaden.",
    },
    flow: value => `${value} Mikroliter pro Minute`,
  },
  chapters: {
    glimepiride: {
      title: "Sie zerlegt Medikamente", line: "Folge einer Tablette hindurch.",
      info: {
        child: "Die Leber zerlegt Medikamente, damit der Körper sie loswerden kann.",
        adult: "Fast jedes Medikament wird von der Leber verändert, bevor der Körper es los ist. Der Glimepirid-Tisch folgt einer Tablette durch Darm, Leber und Nieren.",
        expert: "Hepatischer Metabolismus und Elimination: der Glimepirid-Tisch ist das Ganzkörper-PBPK einer Tablette, mit CYP2C9 und den Organfunktionen als Objekten.",
      },
    },
    lobes: {
      title: "Sie wächst nach", line: "Nimm ein Stück weg.",
      info: {
        child: "Man kann ein Stück Leber wegnehmen, und es wächst nach.",
        adult: "Eine Leber ist aus acht Stücken gebaut, die einzeln entnommen werden können. Der Leberlappen-Tisch schneidet sie weg und zeigt, wie der Rest die Arbeit übernimmt.",
        expert: "Die acht Couinaud-Segmente, Resektion und Pfortaderligatur, und die Regeneration des Restes in den Tagen nach dem Eingriff.",
      },
    },
    perfusion: {
      title: "Sie lebt außerhalb des Körpers", line: "Halte eine an der Maschine am Leben.",
      info: {
        child: "Eine Leber kann an einer Maschine außerhalb des Körpers leben, die sie versorgt.",
        adult: "Eine Leber an einer Perfusionsmaschine wird außerhalb des Körpers warm gehalten und mit Sauerstoff versorgt, und genauso wird heute ein Spenderorgan transportiert und geprüft.",
        expert: "Normotherme Maschinenperfusion: das Organ wird außerhalb des Körpers temperiert, gepumpt und oxygeniert, und so wird ein Transplantat vor der Transplantation beurteilt.",
      },
    },
  },
  reading: facts => {
    const made = facts.gut === "more" ? "der Darm mehr schickt"
      : facts.gut === "less" ? "der Darm weniger schickt" : "";
    const parts = [made, facts.backing ? "sich das Blut in der Pfortader staut" : ""]
      .filter(part => part !== "");
    const where = parts.length === 0 ? "" : `, wobei ${parts.join(" und ")}`;
    return `${facts.qh} Liter pro Minute durch die Leber${where}: ${facts.qpo} aus dem Darm, `
      + `${facts.qha} aus der Arterie, ${facts.share}% von allem, was das Herz pumpt.`;
  },
  cardNote: {
    portal: value => `${value} l/min aus dem Darm`,
    gradient: value => `Pfortadergradient ${value} mmHg`,
  },
};

const ES: LiverCopy = {
  about: {
    child: "El hígado recibe sangre por dos tubos: uno con oxígeno y otro con todo lo que has comido. Ve tu comida antes que el resto de ti.",
    adult: "El hígado es el único órgano con dos aportes de sangre: oxígeno por la arteria y todo lo que el intestino ha absorbido por la vena porta. Ve su comida, y cada medicamento que toma, antes que el resto del cuerpo.",
    expert: "El único órgano con aporte aferente doble: unos tres cuartos del flujo por la vena porta, ya desaturada pero cargada con todo lo absorbido, y un cuarto por la arteria hepática. Ambos terminan en los mismos sinusoides, y eso es el primer paso de un fármaco oral.",
  },
  tries: [
    {
      child: "Gira el objeto del intestino: después de comer llega más sangre al hígado.",
      adult: "Gire el objeto del intestino: después de una comida sus vasos se abren y llega más sangre.",
      expert: "Gire el objeto del intestino: la vasodilatación esplácnica posprandial aumenta el flujo portal.",
    },
    {
      child: "Gira el objeto del hígado: por un hígado duro la sangre pasa mal y se acumula.",
      adult: "Gire el objeto del hígado hacia arriba: un hígado con cicatrices retiene la sangre y la presión portal sube.",
      expert: "Gire el objeto del hígado hacia arriba: una resistencia sinusoidal cirrótica eleva la presión portal y el gradiente a través del hígado.",
    },
  ],
  stats: {
    flow: {
      label: {child: "Sangre en el hígado", adult: "Por el hígado"},
      info: {
        child: "Toda la sangre que recibe el hígado, por los dos tubos juntos.",
        adult: "Todo lo que recibe el hígado, de sus dos aportes juntos. Alrededor de litro y medio por minuto en una persona en reposo.",
        expert: "Flujo sanguíneo hepático total, suma del aporte portal y el arterial. Unos 1,5 l/min, un cuarto del gasto cardíaco, en reposo.",
      },
    },
    portal: {
      label: {child: "Del intestino", adult: "De la vena porta"},
      info: {
        child: "La sangre que viene del estómago y del intestino, con todo lo que has comido.",
        adult: "La sangre que la vena porta trae del estómago, el intestino y el bazo. Ya ha entregado su oxígeno, pero lleva todo lo absorbido.",
        expert: "Aporte venoso portal del territorio esplácnico: pobre en oxígeno, cargado de todo lo absorbido, y unos tres cuartos del flujo hepático.",
      },
    },
    artery: {
      label: {child: "Del corazón", adult: "De la arteria"},
      info: {
        child: "Sangre fresca con oxígeno, directa del corazón.",
        adult: "La sangre que la arteria hepática trae directamente de la aorta: un cuarto del aporte y la mayor parte del oxígeno.",
        expert: "Aporte arterial hepático desde la aorta, cerca de un cuarto del flujo y la mayor parte del oxígeno entregado, amortiguado frente al flujo portal en un hígado real.",
      },
    },
    share: {
      label: {child: "De toda la sangre", adult: "Del corazón"},
      info: {
        child: "Cuánta sangre de todo el cuerpo pasa por el hígado.",
        adult: "Cuánto de todo lo que bombea el corazón pasa por el hígado. Ningún otro órgano de su tamaño se lleva una parte tan grande.",
        expert: "La fracción hepática del gasto cardíaco: cerca del 25 por ciento para el 2,5 por ciento de la masa corporal.",
      },
    },
    ppo: {
      label: {child: "Presión en el tubo", adult: "Presión portal"},
      info: {
        child: "Con cuánta fuerza empuja la sangre en el tubo que viene del intestino.",
        adult: "La presión en la vena que lleva la sangre del intestino al hígado. Cuando el hígado la obstruye, la sangre se acumula aquí: eso es la hipertensión portal.",
        expert: "Presión venosa portal, 8 a 10 mmHg en salud. El gradiente a través del hígado, que mide el HVPG, sube con la resistencia sinusoidal y decide varices y ascitis.",
      },
    },
    lobule: {
      label: {child: "Un trocito recibe", adult: "Un lobulillo recibe"},
      info: {
        child: "Un hígado está hecho de un millón de trocitos. Esto es lo que recibe uno.",
        adult: "Un hígado está construido de alrededor de un millón de lobulillos. Esto es lo que recibe uno de ellos: el flujo de todo el hígado repartido entre ellos.",
        expert: "Flujo hepático dividido entre cerca de un millón de lobulillos: la escala a la que ocurren el gradiente de oxígeno del sinusoide y la zonación del metabolismo.",
      },
    },
  },
  roles: {
    portal: {
      label: {child: "El intestino", adult: "El intestino"},
      info: {
        child: "Cómo de abiertos están los vasos de tu intestino. Después de comer se abren y va más sangre al hígado.",
        adult: "Cómo de abiertos están los vasos del intestino y de la vena porta. Después de una comida se abren y el intestino manda más sangre al hígado; girar el objeto hacia arriba los cierra.",
        expert: "La resistencia esplácnica de la red de presiones. Hacia abajo es vasodilatación posprandial, hacia arriba un territorio esplácnico constreñido.",
      },
    },
    hepatic: {
      label: {child: "El hígado", adult: "El hígado"},
      info: {
        child: "Cómo de fácil le resulta a la sangre pasar por el hígado. Por uno duro pasa mal.",
        adult: "Cómo de fácilmente pasa la sangre por el hígado mismo. Un hígado con cicatrices, cirrótico, se le resiste, la sangre se acumula en la vena porta y la presión allí sube.",
        expert: "La resistencia sinusoidal del hígado. Subirla es la hemodinámica de la cirrosis: la presión portal y el gradiente suben mientras el flujo hepático baja.",
      },
    },
  },
  supply: {
    heart: "Corazón", gut: "Intestino", liver: "Hígado",
    gutInfo: {
      child: "Tu estómago y tu intestino. Todo lo que comes empieza aquí.",
      adult: "El estómago y el intestino. Lo que se absorbe aquí, comida y fármacos por igual, se entrega al hígado antes de que el cuerpo lo vea.",
      expert: "El territorio esplácnico. Todo lo absorbido aquí drena a la vena porta, y eso es el primer paso hepático.",
    },
    liverInfo: {
      child: "El hígado. Es la única parte de ti con dos tubos que le traen sangre.",
      adult: "El hígado. Es el único órgano con dos aportes: uno de oxígeno por la arteria, otro de todo lo comido desde el intestino.",
      expert: "El hígado, con aporte aferente doble y una vena hepática eferente hacia la cava.",
    },
    share: percent => `${percent}% del corazón`,
  },
  lobule: {
    title: "Un lobulillo",
    subtitle: {
      child: "El oxígeno se acaba camino del centro",
      adult: "El oxígeno baja de las esquinas hacia el centro",
      expert: "El oxígeno baja de las esquinas periportales al centro pericentral",
    },
    zone1: "Zona 1, donde llega la sangre",
    zone3: "zona 3",
    triad: {
      child: "Por aquí entra la sangre, por tres tubitos juntos.",
      adult: "Una tríada portal: una rama de la vena porta, una rama de la arteria hepática y un conducto biliar, juntos en cada esquina del hexágono.",
      expert: "La tríada portal de cada esquina: vénula portal, arteriola hepática y conducto biliar, el extremo periportal del sinusoide.",
    },
    central: {
      child: "Por aquí sale la sangre otra vez, de vuelta al corazón.",
      adult: "La vena central. La sangre de todo el hexágono sale aquí, de vuelta al corazón.",
      expert: "La vena central, el extremo pericentral del sinusoide: menos oxígeno, más metabolismo de fármacos, y donde empieza el daño.",
    },
    flow: value => `${value} microlitros por minuto`,
  },
  chapters: {
    glimepiride: {
      title: "Desarma los fármacos", line: "Sigue una pastilla por dentro.",
      info: {
        child: "El hígado desarma las medicinas para que el cuerpo pueda deshacerse de ellas.",
        adult: "Casi todo fármaco es transformado por el hígado antes de que el cuerpo se deshaga de él. La mesa de la glimepirida sigue una pastilla por el intestino, el hígado y los riñones.",
        expert: "Metabolismo y eliminación hepáticos: la mesa de la glimepirida es el PBPK de cuerpo entero de una pastilla, con CYP2C9 y las funciones de órgano como objetos.",
      },
    },
    lobes: {
      title: "Vuelve a crecer", line: "Quita un trozo.",
      info: {
        child: "Se puede quitar un trozo de hígado y vuelve a crecer.",
        adult: "Un hígado está construido de ocho piezas que pueden quitarse una a una. La mesa de los lóbulos las corta y sigue cómo el resto asume el trabajo.",
        expert: "Los ocho segmentos de Couinaud, la resección y la ligadura portal, y la regeneración del remanente en los días posteriores a la intervención.",
      },
    },
    perfusion: {
      title: "Vive fuera del cuerpo", line: "Mantén uno vivo en una máquina.",
      info: {
        child: "Un hígado puede vivir fuera del cuerpo en una máquina que lo alimenta.",
        adult: "Un hígado en una máquina de perfusión se mantiene caliente y oxigenado fuera del cuerpo, y así se transporta y se evalúa hoy un órgano donado.",
        expert: "Perfusión de máquina normotérmica: el órgano se mantiene a temperatura, bombeado y oxigenado fuera del cuerpo, y así se evalúa un injerto antes del trasplante.",
      },
    },
  },
  reading: facts => {
    const made = facts.gut === "more" ? "el intestino manda más"
      : facts.gut === "less" ? "el intestino manda menos" : "";
    const parts = [made, facts.backing ? "la sangre se acumula en la vena porta" : ""]
      .filter(part => part !== "");
    const where = parts.length === 0 ? "" : `, y ${parts.join(" y ")}`;
    return `${facts.qh} litros por minuto por el hígado${where}: ${facts.qpo} del intestino, `
      + `${facts.qha} de la arteria, ${facts.share}% de todo lo que bombea el corazón.`;
  },
  cardNote: {
    portal: value => `${value} l/min del intestino`,
    gradient: value => `gradiente portal ${value} mmHg`,
  },
};

export const LIVER_TEXT: Readonly<Record<Locale, LiverCopy>> = {en: EN, de: DE, es: ES};
