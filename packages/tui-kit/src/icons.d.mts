/** The types of `icons.mjs`, which is plain JavaScript because the simulator reads it too. */

export type GlyphKind =
  | "vessel" | "heart" | "tablet" | "enzyme" | "liver" | "kidney" | "body" | "clamp" | "scalpel"
  | "clock" | "pump" | "bubble" | "thermometer";

export declare const ICONS: Readonly<Record<GlyphKind, readonly string[]>>;

export declare function vesselPaths(level: number): {
  readonly walls: readonly string[];
  readonly lumen: string;
};

export declare function fillOf(kind: GlyphKind, level: number): number;
