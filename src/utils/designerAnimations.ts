import type {
  DesignerAnimationProps,
  DesignerConfig,
  DesignerConfigEntry,
  DesignerFrameColor,
} from "../types/designer";

interface DesignerAnimation {
  id: string;
  fn: (
    timestamp: number,
    localIndex: number,
    segmentLength: number,
    config: DesignerConfigEntry,
    globalSpeed: number,
  ) => DesignerFrameColor;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const hexToRgb = (hex: string) => {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3
    ? normalized.split("").map((char) => char + char).join("")
    : normalized;
  const intVal = parseInt(value, 16);
  return {
    r: (intVal >> 16) & 255,
    g: (intVal >> 8) & 255,
    b: intVal & 255,
  };
};

const hsvToRgb = (h: number, s: number, v: number): DesignerFrameColor => {
  let r = 0;
  let g = 0;
  let b = 0;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    case 5:
      r = v;
      g = p;
      b = q;
      break;
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
};

const rand01 = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const getEffectiveIndex = (
  localIndex: number,
  segmentLength: number,
  config: DesignerConfigEntry,
) => {
  const props: DesignerAnimationProps = config.props || {};
  let idx = localIndex;

  if (props.direction === "right") {
    idx = segmentLength - 1 - idx;
  }

  if (props.mirror && segmentLength > 1) {
    const last = segmentLength - 1;
    idx = Math.min(idx, last - idx);
  }

  return idx;
};

const animations: DesignerAnimation[] = [
  {
    id: "rainbow",
    fn: (t, i, len, conf, globalSpeed) => {
      const props = conf.props || {};
      const idx = getEffectiveIndex(i, len, conf);
      const tShift = t + (props.phaseMs ?? 0);
      const localSpeed = (props.speed ?? 1) * globalSpeed;
      const pos = idx / Math.max(1, len - 1) + tShift * 0.00015 * localSpeed;
      const hue = pos % 1;
      return hsvToRgb(hue, 1, 1);
    },
  },
  {
    id: "smoothFade",
    fn: (t, _i, _len, conf, globalSpeed) => {
      const props = conf.props || {};
      const tShift = t + (props.phaseMs ?? 0);
      const localSpeed = (props.speed ?? 1) * globalSpeed;
      const hue = (tShift * 0.0002 * localSpeed) % 1;
      return hsvToRgb(hue, 0.9, 1);
    },
  },
  {
    id: "theater",
    fn: (t, i, len, conf, globalSpeed) => {
      const props = conf.props || {};
      const idx = getEffectiveIndex(i, len, conf);
      const tShift = t + (props.phaseMs ?? 0);
      const localSpeed = (props.speed ?? 1) * globalSpeed;
      const step = Math.floor(tShift * 0.00035 * localSpeed);
      if ((idx + step) % 3 === 0) return { r: 255, g: 255, b: 255 };
      return { r: 0, g: 0, b: 0 };
    },
  },
  {
    id: "larson",
    fn: (t, i, len, conf, globalSpeed) => {
      const props = conf.props || {};
      const idx = getEffectiveIndex(i, len, conf);
      const tShift = t + (props.phaseMs ?? 0);
      const localSpeed = (props.speed ?? 1) * globalSpeed;
      const period = 2200 / localSpeed;
      const phase = ((tShift % period) / period) * 2 * Math.PI;
      const pos = (Math.sin(phase) * 0.5 + 0.5) * Math.max(0, len - 1);
      const dist = Math.abs(idx - pos);
      let intensity = Math.max(0, 1.4 - dist);
      intensity *= intensity;
      return {
        r: Math.round(255 * intensity),
        g: Math.round(40 * intensity),
        b: Math.round(40 * intensity),
      };
    },
  },
  {
    id: "breathing",
    fn: (t, _i, _len, conf, globalSpeed) => {
      const props = conf.props || {};
      const base = hexToRgb((props as DesignerAnimationProps).color || "#00ffff");
      const tShift = t + (props.phaseMs ?? 0);
      const localSpeed = (props.speed ?? 1) * globalSpeed;
      const period = 3000 / localSpeed;
      const phase = ((tShift % period) / period) * 2 * Math.PI;
      let v = (Math.sin(phase - Math.PI / 2) + 1) / 2;
      v = v * 0.9 + 0.1;
      return {
        r: Math.round(base.r * v),
        g: Math.round(base.g * v),
        b: Math.round(base.b * v),
      };
    },
  },
  {
    id: "police",
    fn: (t, i, len, conf, globalSpeed) => {
      const props = conf.props || {};
      const tShift = t + (props.phaseMs ?? 0);
      const localSpeed = (props.speed ?? 1) * globalSpeed;
      const half = Math.floor(len / 2);
      const period = 800 / localSpeed;
      const phase = (tShift % period) / period;
      const leftOn = phase < 0.5;
      if (i < half) return leftOn ? { r: 255, g: 0, b: 0 } : { r: 0, g: 0, b: 0 };
      return !leftOn ? { r: 0, g: 0, b: 255 } : { r: 0, g: 0, b: 0 };
    },
  },
  {
    id: "strobe",
    fn: (t, _i, _len, conf, globalSpeed) => {
      const props = conf.props || {};
      const tShift = t + (props.phaseMs ?? 0);
      const localSpeed = (props.speed ?? 1) * globalSpeed;
      const period = 260 / localSpeed;
      const phase = (tShift % period) / period;
      if (phase < 0.12) return { r: 255, g: 255, b: 255 };
      return { r: 0, g: 0, b: 0 };
    },
  },
  {
    id: "running",
    fn: (t, i, len, conf, globalSpeed) => {
      const props = conf.props || {};
      const base = hexToRgb((props as DesignerAnimationProps).color || "#ff0000");
      const idx = getEffectiveIndex(i, len, conf);
      const tShift = t + (props.phaseMs ?? 0);
      const localSpeed = (props.speed ?? 1) * globalSpeed;
      const phase = (idx / Math.max(1, len) * 2 * Math.PI) + tShift * 0.012 * localSpeed;
      const v = (Math.sin(phase) + 1) / 2;
      return {
        r: Math.round(base.r * v),
        g: Math.round(base.g * v),
        b: Math.round(base.b * v),
      };
    },
  },
  {
    id: "water",
    fn: (t, i, len, conf, globalSpeed) => {
      const props = conf.props || {};
      const idx = getEffectiveIndex(i, len, conf);
      const tShift = t + (props.phaseMs ?? 0);
      const localSpeed = (props.speed ?? 1) * globalSpeed;
      const center = (len - 1) / 2;
      const dist = Math.abs(idx - center);
      const period = 2000 / localSpeed;
      const wavePhase = ((tShift % period) / period) * 2 * Math.PI;
      const ripple = Math.sin(wavePhase - dist * 0.55) * Math.exp(-dist * 0.2);
      const intensity = clamp((ripple + 1) / 2, 0, 1) * 0.9 + 0.1;
      return hsvToRgb(0.58, 0.7, intensity);
    },
  },
  {
    id: "plasma",
    fn: (t, i, len, conf, globalSpeed) => {
      const props = conf.props || {};
      const idx = getEffectiveIndex(i, len, conf);
      const tShift = t + (props.phaseMs ?? 0);
      const localSpeed = (props.speed ?? 1) * globalSpeed;
      const x = idx / Math.max(1, len);
      const tf = tShift * 0.001 * localSpeed;
      const v = Math.sin(6 * x + tf) + Math.sin(4 * x - tf * 1.3) + Math.cos(5 * x + tf * 0.7);
      const normalized = (v + 3) / 6;
      const hue = (normalized + tf * 0.08) % 1;
      return hsvToRgb(hue, 1, 1);
    },
  },
  {
    id: "twinkle",
    fn: (t, i, len, conf, globalSpeed) => {
      const props = conf.props || {};
      const base = hexToRgb((props as DesignerAnimationProps).color || "#ffffff");
      const tShift = t + (props.phaseMs ?? 0);
      const localSpeed = (props.speed ?? 1) * globalSpeed;
      const frame = Math.floor(tShift / (120 / localSpeed));
      const idx = getEffectiveIndex(i, len, conf);
      const r = rand01(idx * 9283 + frame * 173);
      if (r > 0.85) {
        const strength = (r - 0.85) / 0.15;
        const v = 0.3 + strength * 0.7;
        return {
          r: Math.round(base.r * v),
          g: Math.round(base.g * v),
          b: Math.round(base.b * v),
        };
      }
      return { r: 0, g: 0, b: 0 };
    },
  },
  {
    id: "beat",
    fn: (t, _i, _len, conf, globalSpeed) => {
      const props = conf.props || {};
      const base = hexToRgb((props as DesignerAnimationProps).color || "#ff0080");
      const tShift = t + (props.phaseMs ?? 0);
      const localSpeed = (props.speed ?? 1) * globalSpeed;
      const period = 900 / localSpeed;
      const beatPhase = (tShift % period) / period;
      let v;
      if (beatPhase < 0.2) v = beatPhase / 0.2;
      else v = Math.exp(-(beatPhase - 0.2) * 4.5);
      v = clamp(v, 0.05, 1);
      return {
        r: Math.round(base.r * v),
        g: Math.round(base.g * v),
        b: Math.round(base.b * v),
      };
    },
  },
];

const animationLookup = new Map(animations.map((animation) => [animation.id, animation]));

const addColorAt = (target: DesignerFrameColor, color: DesignerFrameColor) => {
  target.r = clamp(target.r + color.r, 0, 255);
  target.g = clamp(target.g + color.g, 0, 255);
  target.b = clamp(target.b + color.b, 0, 255);
};

export const evaluateDesignerFrame = (
  config: DesignerConfig,
  timestamp: number,
): DesignerFrameColor[] => {
  const ledCount = clamp(Math.round(config.ledCount ?? 0), 1, 256);
  const brightness = clamp(config.globalBrightness ?? 1, 0, 1);
  const globalSpeed = clamp(config.globalSpeed ?? 1, 0.01, 10);
  const frame: DesignerFrameColor[] = Array.from({ length: ledCount }, () => ({
    r: 0,
    g: 0,
    b: 0,
  }));

  const configs = Array.isArray(config.configs) ? config.configs : [];

  for (const raw of configs) {
    if (!raw || typeof raw !== "object") {
      continue;
    }

    const conf = raw as DesignerConfigEntry;
    const animId = typeof conf.animId === "string" ? conf.animId : animations[0].id;
    const anim = animationLookup.get(animId) || animations[0];
    const start = clamp(Math.round(conf.start ?? 0), 0, ledCount - 1);
    const len = clamp(Math.round(conf.length ?? 0), 1, ledCount - start);

    for (let localIndex = 0; localIndex < len; localIndex++) {
      const globalIndex = start + localIndex;
      const color = anim.fn(timestamp, localIndex, len, conf, globalSpeed);
      addColorAt(frame[globalIndex], color);
    }
  }

  return frame.map((color) => ({
    r: Math.round(color.r * brightness),
    g: Math.round(color.g * brightness),
    b: Math.round(color.b * brightness),
  }));
};
