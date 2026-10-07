export interface AppConfig {
  format_version: number;
  app: AppIdentity;
  window: WindowConfig;
  appearance: AppearanceConfig;
  shell: ShellConfig;
}

export interface AppIdentity {
  name: string;
}

export interface WindowConfig {
  width_px: number;
  height_px: number;
}

export type AppearancePreference = "system" | "light" | "dark";

export interface AppearanceConfig {
  mode: AppearancePreference;
}

export interface ShellConfig {
  left_sidebar?: RegionConfig | null;
  center: RegionConfig;
  right_sidebar?: RegionConfig | null;
}

export type RegionPosition = "left" | "center" | "right";

export type Dimension = 
  | { kind: "px"; value: number }
  | { kind: "fill" }
  | { kind: "content" };

export interface RegionConfig {
  position: RegionPosition;
  label: string;
  width: Dimension;
  height: Dimension;
  background_color: ModeColors;
  foreground_color: ModeColors;
  padding: Edges;
  border?: BorderConfig | null;
  border_radius?: CornerRadii | null;
  header?: HeaderConfig | null;
}

export interface HeaderConfig {
  title: string;
  height: Dimension;
  background_color: ModeColors;
  foreground_color: ModeColors;
  padding: Edges;
  border?: BorderConfig | null;
  border_radius?: CornerRadii | null;
}

export interface Edges {
  top_px: number;
  right_px: number;
  bottom_px: number;
  left_px: number;
}

export interface BorderConfig {
  width_px: number;
  edges: BorderEdges;
  color: ModeColors;
}

export interface BorderEdges {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}

export interface CornerRadii {
  top_left_px: number;
  top_right_px: number;
  bottom_right_px: number;
  bottom_left_px: number;
}

export interface ModeColors {
  light: HexColor;
  dark: HexColor;
}

export type HexColor = string;

// ==========================================
// Core Layout & Styling Helper Functions
// ==========================================


/** Formats CornerRadii into standard CSS border-radius shorthand */
export function getRadiusStyle(r?: CornerRadii | null): string {
  if (!r) return "0px";
  return `${r.top_left_px}px ${r.top_right_px}px ${r.bottom_right_px}px ${r.bottom_left_px}px`;
}

/** Resolves color mode based on preference and system state */
export function resolveColorMode(pref: AppearancePreference, systemIsDark: boolean): ColorMode {
  if (pref === "system") return systemIsDark ? "dark" : "light";
  return pref;
}

// ... (keep all your interfaces: AppConfig, RegionConfig, ModeColors, etc.)

export type ColorMode = "light" | "dark";

/** Resolves a HexColor from ModeColors based on the current color mode */
export function resolveModeColor(colors: ModeColors, mode: ColorMode): HexColor {
  return colors[mode];
}

/** Computes the exact CSS grid-template-columns string for the shell */
export function getShellGridColumns(shell: ShellConfig): string {
  const left = shell.left_sidebar ? getDimensionCss(shell.left_sidebar.width) : "";
  const center = getDimensionCss(shell.center.width);
  const right = shell.right_sidebar ? getDimensionCss(shell.right_sidebar.width) : "";
  
  return [left, center, right].filter(Boolean).join(" ");
}

export function getDimensionCss(dim: Dimension): string {
  switch (dim.kind) {
    case "px": return `${dim.value}px`;
    case "fill": return "1fr";
    case "content": return "auto";
  }
}

export function getPaddingStyle(p: Edges): string {
  return `${p.top_px}px ${p.right_px}px ${p.bottom_px}px ${p.left_px}px`;
}