/** What every table application of pkpdsim shares. */

export {createBriefing, createChrome, tableFoot} from "./chrome.ts";
export type {
  Briefing, Chrome, ChoiceGroup, ChoiceOption, ChromeOptions, ChromeUpdate,
} from "./chrome.ts";
export {
  clamp, describeArc, formatDelta, formatFactor, formatNumber, mixHex, organRadius, perfusionColor,
  PERFUSION_HIGH, PERFUSION_LOW, PERFUSION_NEUTRAL, polarPoint, vesselWidth,
} from "./format.ts";
export {createGlyph} from "./glyph.ts";
export {ICONS} from "./icons.mjs";
export type {Glyph, GlyphKind, TokenGlyph} from "./glyph.ts";
export type {TableApp, TableHost, TableIndividual, TableMark} from "./host.ts";
export {createLab, LAB_ROOM} from "./lab.ts";
export type {Lab, LabOptions} from "./lab.ts";
export {createMirror, MIRROR_SOURCE} from "./mirror.ts";
export type {Mirror, MirroredObject, MirrorState} from "./mirror.ts";
export {createInfo, pointerPoints, tokenPoints} from "./info.ts";
export type {InfoLayer, InfoPoint} from "./info.ts";
export {createPlot} from "./plot.ts";
export {chooseQuery} from "./query.ts";
export {createQuiz} from "./quiz.ts";
export type {Quiz, QuizChoice, QuizOptions, QuizQuestion} from "./quiz.ts";
export type {Box, Plot, PlotAxis, PlotSeries, PlotTrace, PlotView} from "./plot.ts";
export {createReadout, visibleStats} from "./readout.ts";
export {namedRole} from "./roles.ts";
export type {Named, NamedDial} from "./roles.ts";
export {createSettings, pictogram, reportStatus} from "./settings.ts";
export {clearStars, keepStars, readStars, starMarks, starsOf, watchStars} from "./stars.ts";
export type {Stars} from "./stars.ts";
export type {FigureKind, Pictogram, Settings, SettingsOptions} from "./settings.ts";
export {normalizeSpeech, speechFor, speechKey} from "./speech.ts";
export {sayHtml, sayLabel, SAY_PATH, SAY_WAVES, watchSay} from "./say.ts";
export type {Speech} from "./speech.ts";
export type {Readout, StatDefinition} from "./readout.ts";
export {attributes, clear, line, svg, SVG_NS} from "./svg.ts";
export type {Attributes} from "./svg.ts";
export {BAND, bandOf, clipLine, createTokenLayer, trackSpan} from "./tokens.ts";
export type {TokenBand, TokenCard, TokenCardKind, TokenLayer, TokenLayerUpdate} from "./tokens.ts";
export type {Viewport} from "./types.ts";
export {
  createVoice, isLevel, isLocale, LEVELS, levelRank, LOCALE_NAMES, LOCALES, say, shows, voiceOf,
} from "./voice.ts";
export type {Level, Locale, Phrase, PhraseLevels, Voice} from "./voice.ts";
export {
  bodyName, driveHint, GROWN_UP, keySpan, KIT_TEXT, languageOptions, markerSpan, organName,
  words,
} from "./words.ts";
export type {DriveState, KitCopy} from "./words.ts";
