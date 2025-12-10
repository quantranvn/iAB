export interface DesignerAnimationProps {
  direction?: "left" | "right";
  mirror?: boolean;
  phaseMs?: number;
  speed?: number;
  color?: string;
}

export interface DesignerConfigEntry {
  start: number;
  length: number;
  animId: string;
  props?: DesignerAnimationProps & Record<string, unknown>;
}

export interface DesignerConfig {
  ledCount: number;
  globalBrightness: number;
  globalSpeed: number;
  configs: DesignerConfigEntry[];
}

export interface DesignerFrameColor {
  r: number;
  g: number;
  b: number;
}
