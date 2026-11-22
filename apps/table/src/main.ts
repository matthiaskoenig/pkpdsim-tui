/**
 * The one entry point of the table applications of pkpdsim. The page is the surface: it shows
 * the body, and `?app` opens one table on it. Everything else is the same page, so the whole
 * collection is one build, one deployment and one port.
 *
 * Query parameters:
 *   ?app=cardiovascular   a table of `tables.ts`; without it the body is shown
 *   ?app=about            the page about the models, the software and the laboratory
 *   ?tuio                 a tracker on ws://localhost:3333
 *   ?tuio=host:port       a tracker somewhere else, which is how a table is addressed
 *   ?tuio=/tuio           a tracker behind the server this page came from, on its port
 *   ?tuio-version=1.1     a tracker that speaks TUIO 1.1 rather than TUIO 2.0
 *   ?sex=female           the female reference body, on the body and in every table
 *   ?species=rat          the liver of a rat or a mouse, in the lobed liver table
 *   ?lang=de              the language of every word: en, de or es, and the browser otherwise
 *   ?level=child          how much is said: child, adult or expert
 */

import {
  chooseQuery, createSettings, createVoice, languageOptions, LEVELS, voiceOf, words,
} from "@pkpdsim-tui/tui-kit";
import type {
  ChoiceGroup, GlyphKind, TableApp, TableHost, Voice,
} from "@pkpdsim-tui/tui-kit";
import {startAbout} from "./about.ts";
import {askWelcome} from "./welcome.ts";
import {startOverview} from "./hub.ts";
import {
  ABOUT, entryCopy, OVERVIEW, OVERVIEW_PICTURE, selectedTable, TABLES, tableOf,
} from "./tables.ts";
import {HUB_TEXT} from "./text.ts";

function element<T extends Element>(id: string): T {
  const found = document.getElementById(id);
  if (found === null) throw new Error(`The page has no element "${id}".`);
  return found as unknown as T;
}

/**
 * The three settings of the application: which table this is, which language it speaks, and how
 * much it says. The last two are what makes one table readable by a child, by an adult who
 * knows nothing and by somebody of the field, in the language they brought with them.
 *
 * They are not in the panel, which says what the table is showing: they wait behind the button
 * in the far corner, and each of them is a picture, because a visitor who cannot read the
 * language the table is in is the visitor who needs the language switch most.
 */
function appSettings(voice: Voice, selected: string, overview: boolean): readonly ChoiceGroup[] {
  const copy = words(voice);
  // On the landing page the ring of cards is the table switch, so only the two switches which
  // change every page are shown, open, where a visitor sees them before they walk on.
  return [
    ...(overview ? [] : [{
      id: "app", label: copy.tableSwitch, selected,
      options: [
        {id: OVERVIEW, label: copy.bodySwitch, picture: OVERVIEW_PICTURE},
        ...TABLES.map(entry => ({
          id: entry.id, label: entryCopy(voice, entry.id).label, picture: entry.picture,
        })),
      ],
    }]),
    {
      id: "lang", label: copy.languageSwitch, selected: voice.locale,
      options: languageOptions().map(option => ({
        id: option.id, label: option.label, picture: `flag-${option.id}` as const,
      })),
    },
    {
      id: "level", label: copy.levelSwitch, selected: voice.level,
      options: LEVELS.map(level => ({
        id: level, label: copy.levelNames[level], picture: level,
      })),
    },
  ];
}

function fail(voice: Voice, message: string): void {
  const copy = voice.pick(HUB_TEXT);
  const boot = element<HTMLElement>("boot");
  boot.classList.add("boot--error");
  boot.hidden = false;
  const heading = boot.querySelector("h1");
  if (heading !== null) heading.textContent = copy.failed;
  element<HTMLElement>("boot-message").textContent = message;
}

let voice = voiceOf(
  new URLSearchParams(window.location.search), window.navigator.languages ?? []);

async function start(): Promise<void> {
  const parameters = new URLSearchParams(window.location.search);
  const entry = tableOf(parameters);
  // A visitor who walks up to the table says two things before anything is shown: which
  // language they read, and how much a table should say. The address carries both afterwards,
  // so a table which is opened from the landing page is in the language they chose, and a
  // link which already says them walks straight in.
  if (entry === undefined && parameters.get("app") !== ABOUT
    && (parameters.get("lang") === null || parameters.get("level") === null)) {
    element<HTMLElement>("boot").hidden = true;
    const picked = await askWelcome(element<HTMLElement>("chrome"));
    parameters.set("lang", picked.locale);
    parameters.set("level", picked.level);
    window.history.replaceState(
      null, "", `${window.location.pathname}?${parameters.toString()}`);
    voice = createVoice(picked.locale, picked.level);
    element<HTMLElement>("boot").hidden = false;
  }
  const assets = new URL("assets/", document.baseURI);
  const copy = voice.pick(HUB_TEXT);
  const about = entry === undefined && parameters.get("app") === ABOUT;
  const title = about
    ? copy.about.title
    : entry === undefined ? copy.heading : entryCopy(voice, entry.id).title;
  document.title = `${title} | pkpdsim-tui`;
  // The page says which language it is in, and how much it says, so that the type and the
  // spacing of a table for a six year old can be the type of a table for a six year old.
  document.documentElement.lang = voice.locale;
  document.documentElement.dataset["level"] = voice.level;
  const heading = element<HTMLElement>("boot").querySelector("h1");
  if (heading !== null) heading.textContent = title;
  element<HTMLElement>("boot-message").textContent = entry === undefined && !about
    ? copy.loadingBodies
    : copy.loadingTable;

  const choose = (group: string, option: string): void => {
    if (group === "app") chooseQuery("app", option, OVERVIEW);
    // The language and the level are in the address like the body is, so that a link says them
    // and a table which is opened from this one keeps them.
    if (group === "lang") chooseQuery("lang", option, "");
    if (group === "level") chooseQuery("level", option, "");
  };

  // One settings menu for the whole page: the body and every table are the same page, so the
  // button in the corner stays where it is while a visitor walks through all five of them.
  const overview = entry === undefined && parameters.get("app") !== ABOUT;
  createSettings(element<HTMLElement>("chrome"), {
    voice, groups: appSettings(voice, selectedTable(parameters), overview), onChoose: choose,
    // The landing page shows them open, so a visitor knows what can be changed; every table
    // keeps the same switches behind the button in the corner.
    pinned: overview,
  });

  // The landing page is where a visit ends as well as begins: the button in the corner asks the
  // two questions of the welcome again and forgets everything the last visitor did, so the next
  // one meets the table in their own language.
  if (overview) {
    const again = document.createElement("button");
    again.className = "again";
    again.type = "button";
    again.dataset["dwell"] = "again";
    again.dataset["info"] = copy.startAgainInfo;
    again.innerHTML = `<svg class="again-icon" viewBox="0 0 24 24" aria-hidden="true">`
      + `<path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1"></path>`
      + `<path d="M20.5 3.5v5.2h-5.2"></path></svg>`
      + `<span class="again-label"></span>`;
    const label = again.querySelector(".again-label");
    if (label !== null) label.textContent = copy.startAgain;
    again.addEventListener("click", () => {
      const kept = new URLSearchParams();
      for (const key of ["tuio", "tuio-version", "sex", "species"]) {
        const value = parameters.get(key);
        if (value !== null) kept.set(key, value);
      }
      const query = kept.toString();
      window.location.href = query === "" ? window.location.pathname
        : `${window.location.pathname}?${query}`;
    });
    element<HTMLElement>("chrome").appendChild(again);
  }

  const host: TableHost = {
    surface: element<HTMLElement>("surface"),
    scene: element<SVGSVGElement>("scene"),
    chrome: element<HTMLElement>("chrome"),
    parameters,
    voice,
    title,
    // Every table keeps its exported models and reference data in a folder of its own, so that
    // one page can serve all of them.
    assets: entry === undefined ? assets : new URL(entry.assets, assets),
    // The colour and the picture of the card which opened this table, which its panel wears.
    ...(entry === undefined ? {} : {mark: {picture: entry.picture as GlyphKind, color: entry.color}}),
    progress: message => {
      element<HTMLElement>("boot-message").textContent = message;
    },
    choose,
    back: () => chooseQuery("app", OVERVIEW, OVERVIEW),
    // A table starts again by loading itself again: the models come from the cache of the
    // browser, and nothing of the last visitor survives a reload, which is what makes it a
    // reset and not an undo. The language, the level and the tracker are of the booth and not
    // of the visitor, so they stay.
    reset: () => {
      const kept = new URLSearchParams();
      for (const key of ["app", "lang", "level", "tuio", "tuio-version"]) {
        const value = parameters.get(key);
        if (value !== null) kept.set(key, value);
      }
      const query = kept.toString();
      window.location.href = query === "" ? window.location.pathname
        : `${window.location.pathname}?${query}`;
    },
  };

  // A table is left by opening another one, which reloads the page: nothing of a table has to be
  // taken down, and a solver, a worker and a socket go with the page they belong to.
  window.addEventListener("keydown", event => {
    if (event.key === "Escape" && entry !== undefined) chooseQuery("app", OVERVIEW, OVERVIEW);
  });

  const app: TableApp = about
    ? startAbout
    : entry === undefined ? startOverview : await entry.load();
  await app(host);
  element<HTMLElement>("boot").hidden = true;
}

try {
  await start();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  fail(voice, `${message} ${voice.pick(HUB_TEXT).failedHint}`);
  console.error(error);
}
