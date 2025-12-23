import { convertDesignerConfigViaFirebase } from "./firebase";
import type { DesignerConfig } from "../types/designer";

export type DesignerCommandSource = "cloud" | "sample" | "local";

export interface DesignerCommandResult {
  bytes: number[];
  hexString: string;
  source: DesignerCommandSource;
  note?: string;
}

export interface DesignerConversionOptions {
  userId?: string | null;
  preferFirebase?: boolean;
  timeoutMs?: number;
}

const toHexString = (bytes: number[]): string =>
  bytes.map((b) => b.toString(16).padStart(2, "0").toUpperCase()).join(" ");

const clampNumber = (value: unknown, min: number, max: number, fallback: number): number => {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.max(min, Math.min(max, value));
};

const clampByte = (value: unknown, min = 0, max = 255): number => {
  if (typeof value !== "number" || Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
};

const sanitizeBytes = (input: unknown): number[] => {
  if (!Array.isArray(input)) return [];
  return input
    .map((v) => {
      const n = typeof v === "number" ? v : Number.parseInt(String(v), 10);
      if (Number.isNaN(n)) return null;
      return Math.max(0, Math.min(255, n));
    })
    .filter((v): v is number => v !== null);
};

type RGB = { r: number; g: number; b: number };
const BLACK: RGB = { r: 0, g: 0, b: 0 };

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

const hexToRgb = (hex: unknown, fallback: RGB): RGB => {
  if (typeof hex !== "string") return fallback;
  const raw = hex.trim().replace("#", "");
  if (!(raw.length === 6 || raw.length === 3)) return fallback;

  const expanded = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const n = Number.parseInt(expanded, 16);
  if (Number.isNaN(n)) return fallback;

  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
};

// HSV [0..1], [0..1], [0..1] -> RGB [0..255]
const hsvToRgb = (h: number, s: number, v: number): RGB => {
  const hh = ((h % 1) + 1) % 1;
  const ss = clamp01(s);
  const vv = clamp01(v);

  const i = Math.floor(hh * 6);
  const f = hh * 6 - i;
  const p = vv * (1 - ss);
  const q = vv * (1 - f * ss);
  const t = vv * (1 - (1 - f) * ss);

  let r = 0,
    g = 0,
    b = 0;
  switch (i % 6) {
    case 0:
      (r = vv), (g = t), (b = p);
      break;
    case 1:
      (r = q), (g = vv), (b = p);
      break;
    case 2:
      (r = p), (g = vv), (b = t);
      break;
    case 3:
      (r = p), (g = q), (b = vv);
      break;
    case 4:
      (r = t), (g = p), (b = vv);
      break;
    case 5:
      (r = vv), (g = p), (b = q);
      break;
  }

  return {
    r: clampByte(Math.round(r * 255)),
    g: clampByte(Math.round(g * 255)),
    b: clampByte(Math.round(b * 255)),
  };
};

// stable pseudo-random 0..1 from int seed
const rand01 = (seed: number): number => {
  // xorshift-ish
  let x = seed | 0;
  x ^= x << 13;
  x ^= x >> 17;
  x ^= x << 5;
  // map to [0..1)
  return ((x >>> 0) % 1_000_000) / 1_000_000;
};

// ✅ Fixed physical map (per your rule)
// logical 0..7 (left)  -> physical 3..10
// logical 8..15 (right)-> physical 0..2 and 11..15
const RIGHT_PHYSICAL: number[] = [0, 1, 2, 11, 12, 13, 14, 15];
const mapLogicalToPhysical = (logicalIndex: number): number => {
  if (logicalIndex < 8) return 3 + logicalIndex; // 3..10
  return RIGHT_PHYSICAL[logicalIndex - 8] ?? 0;
};

const getEffectiveIndex = (i: number, len: number, props: any): number => {
  const direction = props?.direction === "right" ? "right" : "left";
  const mirror = Boolean(props?.mirror);

  let idx = direction === "right" ? len - 1 - i : i;

  if (mirror && len >= 2) {
    const half = Math.floor(len / 2);
    if (idx < half) idx = half - 1 - idx;
    else idx = half + (len - 1 - idx);
  }

  return idx;
};

const isBlack = (c: RGB) => c.r === 0 && c.g === 0 && c.b === 0;

// Build contiguous segments in physical index space (0..ledCount-1),
// ONLY for non-black LEDs. Contiguous = consecutive physical indices.
const buildSparseSegments = (
  physicalColors: RGB[],
): Array<{ start: number; colors: RGB[] }> => {
  const segments: Array<{ start: number; colors: RGB[] }> = [];

  let runStart: number | null = null;
  let run: RGB[] = [];

  const flush = () => {
    if (runStart !== null && run.length > 0) segments.push({ start: runStart, colors: run });
    runStart = null;
    run = [];
  };

  for (let p = 0; p < physicalColors.length; p += 1) {
    const c = physicalColors[p] ?? BLACK;
    if (!isBlack(c)) {
      if (runStart === null) runStart = p;
      run.push(c);
    } else {
      flush();
    }
  }

  flush();
  return segments;
};

const appendSegments = (
  bytes: number[],
  segments: Array<{ start: number; colors: RGB[] }>,
  intensity: number,
) => {
  for (const seg of segments) {
    const len = seg.colors.length;
    if (len <= 0) continue;

    bytes.push(0x37, clampByte(seg.start), clampByte(len));
    for (const c of seg.colors) {
      bytes.push(clampByte(c.r), clampByte(c.g), clampByte(c.b), clampByte(intensity));
    }
  }
};

const normalizeAnimId = (raw: unknown): string =>
  String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ""); // "smoothFade" -> "smoothfade"

const scenarioFromAnimId = (animIdNorm: string): number => {
  // IMPORTANT: set these bytes to EXACTLY what FW expects.
  // This is a clean mapping matching your UI list order.
  return animIdNorm === "police" ? 0x00
    : animIdNorm === "larson" ? 0x01
    : animIdNorm === "breathing" ? 0x02
    : animIdNorm === "rainbow" ? 0x03
    : animIdNorm === "smoothfade" ? 0x04
    : animIdNorm === "theater" ? 0x05
    : animIdNorm === "strobe" ? 0x06
    : animIdNorm === "running" ? 0x07
    : animIdNorm === "water" ? 0x08
    : animIdNorm === "plasma" ? 0x09
    : animIdNorm === "twinkle" ? 0x0a
    : animIdNorm === "beat" ? 0x0b
    : 0x10; // unknown
};

type PixelFn = (tMs: number, i: number, len: number, props: any, globalSpeed: number) => RGB;

const pixelFnFor = (animIdNorm: string): PixelFn => {
  switch (animIdNorm) {
    case "rainbow":
      return (t, i, len, props, globalSpeed) => {
        const idx = getEffectiveIndex(i, len, props);
        const tShift = t + (typeof props?.phaseMs === "number" ? props.phaseMs : 0);
        const localSpeed = (typeof props?.speed === "number" ? props.speed : 1) * globalSpeed;
        const pos = idx / Math.max(1, len - 1) + tShift * 0.00015 * localSpeed;
        return hsvToRgb(pos % 1, 1, 1);
      };

    case "smoothfade":
      return (t, _i, _len, props, globalSpeed) => {
        const tShift = t + (typeof props?.phaseMs === "number" ? props.phaseMs : 0);
        const localSpeed = (typeof props?.speed === "number" ? props.speed : 1) * globalSpeed;
        const hue = (tShift * 0.0002 * localSpeed) % 1;
        return hsvToRgb(hue, 0.9, 1);
      };

    case "theater":
      return (t, i, len, props, globalSpeed) => {
        const idx = getEffectiveIndex(i, len, props);
        const tShift = t + (typeof props?.phaseMs === "number" ? props.phaseMs : 0);
        const localSpeed = (typeof props?.speed === "number" ? props.speed : 1) * globalSpeed;
        const step = Math.floor(tShift * 0.00035 * localSpeed);
        if ((idx + step) % 3 === 0) return { r: 255, g: 255, b: 255 };
        return BLACK;
      };

    case "larson":
      return (t, i, len, props, globalSpeed) => {
        const idx = getEffectiveIndex(i, len, props);
        const base = hexToRgb(props?.color, { r: 255, g: 40, b: 40 });
        const tShift = t + (typeof props?.phaseMs === "number" ? props.phaseMs : 0);
        const localSpeed = (typeof props?.speed === "number" ? props.speed : 1) * globalSpeed;

        const period = 2200 / Math.max(0.1, localSpeed);
        const phase = ((tShift % period) / period) * 2 * Math.PI;
        const pos = (Math.sin(phase) * 0.5 + 0.5) * Math.max(0, len - 1);

        const dist = Math.abs(idx - pos);
        let intensity = Math.max(0, 1.4 - dist);
        intensity = intensity * intensity;

        return {
          r: clampByte(Math.round(base.r * intensity)),
          g: clampByte(Math.round(base.g * intensity)),
          b: clampByte(Math.round(base.b * intensity)),
        };
      };

    case "breathing":
      return (t, _i, _len, props, globalSpeed) => {
        const base = hexToRgb(props?.color, { r: 0, g: 255, b: 255 });
        const tShift = t + (typeof props?.phaseMs === "number" ? props.phaseMs : 0);
        const localSpeed = (typeof props?.speed === "number" ? props.speed : 1) * globalSpeed;

        const period = 3000 / Math.max(0.1, localSpeed);
        const phase = ((tShift % period) / period) * 2 * Math.PI;
        let v = (Math.sin(phase - Math.PI / 2) + 1) / 2;
        v = v * 0.9 + 0.1;

        return {
          r: clampByte(Math.round(base.r * v)),
          g: clampByte(Math.round(base.g * v)),
          b: clampByte(Math.round(base.b * v)),
        };
      };

    case "strobe":
      return (t, _i, _len, props, globalSpeed) => {
        const tShift = t + (typeof props?.phaseMs === "number" ? props.phaseMs : 0);
        const localSpeed = (typeof props?.speed === "number" ? props.speed : 1) * globalSpeed;

        const period = 260 / Math.max(0.1, localSpeed);
        const phase = (tShift % period) / period;
        if (phase < 0.12) return { r: 255, g: 255, b: 255 };
        return BLACK;
      };

    case "running":
      return (t, i, len, props, globalSpeed) => {
        const base = hexToRgb(props?.color, { r: 255, g: 0, b: 0 });
        const idx = getEffectiveIndex(i, len, props);
        const tShift = t + (typeof props?.phaseMs === "number" ? props.phaseMs : 0);
        const localSpeed = (typeof props?.speed === "number" ? props.speed : 1) * globalSpeed;

        const phase = (idx / Math.max(1, len) * 2 * Math.PI) + tShift * 0.012 * localSpeed;
        const v = (Math.sin(phase) + 1) / 2;

        return {
          r: clampByte(Math.round(base.r * v)),
          g: clampByte(Math.round(base.g * v)),
          b: clampByte(Math.round(base.b * v)),
        };
      };

    case "water":
      return (t, i, len, props, globalSpeed) => {
        const idx = getEffectiveIndex(i, len, props);
        const tShift = t + (typeof props?.phaseMs === "number" ? props.phaseMs : 0);
        const localSpeed = (typeof props?.speed === "number" ? props.speed : 1) * globalSpeed;

        const center = (len - 1) / 2;
        const dist = Math.abs(idx - center);
        const period = 2000 / Math.max(0.1, localSpeed);
        const wavePhase = ((tShift % period) / period) * 2 * Math.PI;
        const ripple = Math.sin(wavePhase - dist * 0.55) * Math.exp(-dist * 0.2);
        const intensity = clamp01((ripple + 1) / 2) * 0.9 + 0.1;
        return hsvToRgb(0.58, 0.7, intensity);
      };

    case "plasma":
      return (t, i, len, props, globalSpeed) => {
        const idx = getEffectiveIndex(i, len, props);
        const tShift = t + (typeof props?.phaseMs === "number" ? props.phaseMs : 0);
        const localSpeed = (typeof props?.speed === "number" ? props.speed : 1) * globalSpeed;

        const x = idx / Math.max(1, len);
        const tf = tShift * 0.001 * localSpeed;
        const v = Math.sin(6 * x + tf) + Math.sin(4 * x - tf * 1.3) + Math.cos(5 * x + tf * 0.7);
        const normalized = (v + 3) / 6;
        const hue = (normalized + tf * 0.08) % 1;
        return hsvToRgb(hue, 1, 1);
      };

    case "twinkle":
      return (t, i, len, props, globalSpeed) => {
        const base = hexToRgb(props?.color, { r: 255, g: 255, b: 255 });
        const idx = getEffectiveIndex(i, len, props);
        const tShift = t + (typeof props?.phaseMs === "number" ? props.phaseMs : 0);
        const localSpeed = (typeof props?.speed === "number" ? props.speed : 1) * globalSpeed;

        const frame = Math.floor(tShift / (120 / Math.max(0.1, localSpeed)));
        const r = rand01(idx * 9283 + frame * 173);
        if (r > 0.85) {
          const strength = (r - 0.85) / 0.15;
          const v = 0.3 + strength * 0.7;
          return {
            r: clampByte(Math.round(base.r * v)),
            g: clampByte(Math.round(base.g * v)),
            b: clampByte(Math.round(base.b * v)),
          };
        }
        return BLACK;
      };

    case "beat":
      return (t, _i, _len, props, globalSpeed) => {
        const base = hexToRgb(props?.color, { r: 255, g: 0, b: 128 });
        const tShift = t + (typeof props?.phaseMs === "number" ? props.phaseMs : 0);
        const localSpeed = (typeof props?.speed === "number" ? props.speed : 1) * globalSpeed;

        const period = 900 / Math.max(0.1, localSpeed);
        const beatPhase = (tShift % period) / period;
        let v: number;
        if (beatPhase < 0.2) v = beatPhase / 0.2;
        else v = Math.exp(-(beatPhase - 0.2) * 4.5);
        v = clampNumber(v, 0.05, 1, 0.2);

        return {
          r: clampByte(Math.round(base.r * v)),
          g: clampByte(Math.round(base.g * v)),
          b: clampByte(Math.round(base.b * v)),
        };
      };

    default:
      // unknown -> off
      return () => BLACK;
  }
};

// ===============================
// ✅ LOCAL CONVERTER (Option A style for ALL animations)
// Header: 01 00 <scenario>
// Then multiple cycles: 01 <hold> ... 03 inside the infinite loop
// End loop: 03
// ===============================
const convertAnimationLocally = (config: DesignerConfig): DesignerCommandResult | null => {
  const entry = config.configs?.[0];
  if (!entry) return null;

  const animIdNorm = normalizeAnimId(entry.animId);
  const props = entry.props ?? {};
  const scenarioByte = scenarioFromAnimId(animIdNorm);

  const ledCount = clampByte(config.ledCount, 1, 255);
  if (ledCount <= 0) return null;

  const logicalLen = Math.min(16, ledCount); // your physical mapping assumes 16 logical
  const clampedBrightness = clampNumber(config.globalBrightness, 0, 1, 1);
  const intensity = clampByte(Math.round(clampedBrightness * 20), 0, 0x14);

  // Speed -> hold (repeat count), each repeat = 20ms
  const LOOP_MS = 20;
  const BASE_REPEATS_AT_SPEED_1 = 10; // 200ms @ speed=1
  const perAnimSpeed = typeof props.speed === "number" ? props.speed : 1;
  const globalSpeed = typeof config.globalSpeed === "number" ? config.globalSpeed : 1;
  const effectiveSpeed = perAnimSpeed * globalSpeed;
  const normalizedSpeed = clampNumber(effectiveSpeed, 0.1, 10, 1);
  const hold = clampByte(Math.max(1, Math.round(BASE_REPEATS_AT_SPEED_1 / normalizedSpeed)));

  const bytes: number[] = [0x01, 0x00, clampByte(scenarioByte)];

  // logical -> physical array (size ledCount)
  const toPhysicalColors = (logicalColors: RGB[]): RGB[] => {
    const phys: RGB[] = Array.from({ length: ledCount }, () => BLACK);

    for (let i = 0; i < logicalColors.length; i += 1) {
      // NOTE: direction+mirror should affect physical placement too,
      // so we map by "effective index" into the physical wiring map.
      const effective = getEffectiveIndex(i, logicalColors.length, props);
      const physical = mapLogicalToPhysical(effective);
      if (physical >= 0 && physical < ledCount) {
        phys[physical] = logicalColors[i] ?? BLACK;
      }
    }
    return phys;
  };

  const pushFrameSegments = (physicalColors: RGB[], forceSingleLedSegments = false) => {
    bytes.push(0x01, hold);

    if (forceSingleLedSegments) {
      for (let p = 0; p < physicalColors.length; p += 1) {
        const c = physicalColors[p] ?? BLACK;
        if (isBlack(c)) continue;
        bytes.push(0x37, clampByte(p), 0x01, c.r, c.g, c.b, intensity);
      }
    } else {
      const segments = buildSparseSegments(physicalColors);
      appendSegments(bytes, segments, intensity);
    }

    bytes.push(0x03);
  };

  // ===== Special: POLICE (2 frames left/right) =====
  if (animIdNorm === "police") {
    const leftRgb = hexToRgb(props.leftColor, { r: 255, g: 0, b: 0 });
    const rightRgb = hexToRgb(props.rightColor, { r: 0, g: 0, b: 255 });

    const logicalA: RGB[] = Array.from({ length: logicalLen }, (_, i) => (i < 8 ? leftRgb : BLACK));
    const logicalB: RGB[] = Array.from({ length: logicalLen }, (_, i) => (i < 8 ? BLACK : rightRgb));

    pushFrameSegments(toPhysicalColors(logicalA));
    pushFrameSegments(toPhysicalColors(logicalB));

    bytes.push(0x03);
    return {
      bytes,
      hexString: toHexString(bytes),
      source: "local",
      note: `Police(local) header=01 00 ${scenarioByte} hold=${hold} intensity=0x${intensity
        .toString(16)
        .toUpperCase()
        .padStart(2, "0")}`,
    };
  }

  // ===== Frame strategy (keep under ~2KB) =====
  // Full-strip animations: 24 frames is usually safe (≈ 24 * ~76 bytes = ~1824 bytes + overhead)
  // Sparse animations: can use more frames
  const isSparseAnim = animIdNorm === "larson" || animIdNorm === "twinkle";
  const frames =
    animIdNorm === "larson" ? clampByte(44, 8, 80)
      : animIdNorm === "twinkle" ? clampByte(40, 12, 80)
      : animIdNorm === "strobe" ? clampByte(20, 8, 40)
      : animIdNorm === "theater" ? clampByte(24, 8, 60)
      : clampByte(24, 8, 60);

  const pixelFn = pixelFnFor(animIdNorm);

  for (let f = 0; f < frames; f += 1) {
    const phaseMs = typeof props.phaseMs === "number" ? props.phaseMs : 0;
    const t = f * hold * LOOP_MS + phaseMs;

    // Build logical colors
    const logical: RGB[] = Array.from({ length: logicalLen }, (_, i) => pixelFn(t, i, logicalLen, props, globalSpeed));

    // For "larson", enforce topK sparse (best for bytes)
    if (animIdNorm === "larson") {
      const base = hexToRgb(props.color, { r: 255, g: 40, b: 40 });

      // recompute "larson-ish" intensities to choose topK
      const period = 2200 / Math.max(0.1, normalizedSpeed);
      const ph = ((t % period) / period) * 2 * Math.PI;
      const pos = (Math.sin(ph) * 0.5 + 0.5) * Math.max(0, logicalLen - 1);

      const logicalIntensities = Array.from({ length: logicalLen }, (_, i) => {
        const idx = getEffectiveIndex(i, logicalLen, props);
        const dist = Math.abs(idx - pos);
        let v = Math.max(0, 1.4 - dist);
        v = v * v;
        return v;
      });

      const TOP_K = 3;
      const ranked = logicalIntensities
        .map((v, i) => ({ i, v }))
        .filter((x) => x.v > 0.02)
        .sort((a, b) => b.v - a.v)
        .slice(0, TOP_K);

      const sparseLogical: RGB[] = Array.from({ length: logicalLen }, () => BLACK);
      for (const { i, v } of ranked) {
        sparseLogical[i] = {
          r: clampByte(Math.round(base.r * v)),
          g: clampByte(Math.round(base.g * v)),
          b: clampByte(Math.round(base.b * v)),
        };
      }

      const physical = toPhysicalColors(sparseLogical);
      // force 1-LED segments (clean & tiny)
      pushFrameSegments(physical, true);
      continue;
    }

    // For "twinkle", already sparse per-pixel; just do sparse segments
    const physical = toPhysicalColors(logical);

    // If it’s sparse, normal segment builder already helps a lot
    // If it’s full-strip, segment builder will produce the 3 segments (left + right split)
    pushFrameSegments(physical, isSparseAnim);
  }

  bytes.push(0x03);

  return {
    bytes,
    hexString: toHexString(bytes),
    source: "local",
    note: `${animIdNorm}(local) header=01 00 ${scenarioByte} frames=${frames} hold=${hold} intensity=0x${intensity
      .toString(16)
      .toUpperCase()
      .padStart(2, "0")}`,
  };
};

// --- SAMPLE JSON ---
const SAMPLE_DESIGNER_JSON: DesignerConfig = {
  ledCount: 16,
  globalBrightness: 1,
  globalSpeed: 1,
  configs: [
    {
      start: 0,
      length: 16,
      animId: "police",
      props: {
        direction: "left",
        mirror: false,
        phaseMs: 0,
        leftColor: "#ff0000",
        rightColor: "#0000ff",
        speed: 1,
      },
    },
  ],
};

const SAMPLE_COMMAND_BYTES =
  convertAnimationLocally(SAMPLE_DESIGNER_JSON)?.bytes ?? [
    0x01, 0x00, 0x00,
    0x01, 0x0a,
    0x37, 0x03, 0x08,
    0xff, 0x00, 0x00, 0x14,
    0xff, 0x00, 0x00, 0x14,
    0xff, 0x00, 0x00, 0x14,
    0xff, 0x00, 0x00, 0x14,
    0xff, 0x00, 0x00, 0x14,
    0xff, 0x00, 0x00, 0x14,
    0xff, 0x00, 0x00, 0x14,
    0xff, 0x00, 0x00, 0x14,
    0x03,
    0x01, 0x0a,
    0x37, 0x00, 0x03,
    0x00, 0x00, 0xff, 0x14,
    0x00, 0x00, 0xff, 0x14,
    0x00, 0x00, 0xff, 0x14,
    0x37, 0x0b, 0x05,
    0x00, 0x00, 0xff, 0x14,
    0x00, 0x00, 0xff, 0x14,
    0x00, 0x00, 0xff, 0x14,
    0x00, 0x00, 0xff, 0x14,
    0x00, 0x00, 0xff, 0x14,
    0x03,
    0x03,
  ];

const buildSampleResult = (note?: string): DesignerCommandResult => ({
  bytes: SAMPLE_COMMAND_BYTES,
  hexString: toHexString(SAMPLE_COMMAND_BYTES),
  source: "sample",
  note: note ?? "Using built-in sample bytes while converter is unavailable.",
});

export const convertDesignerConfigToCommand = async (
  config: DesignerConfig,
  options?: DesignerConversionOptions,
): Promise<DesignerCommandResult> => {
  // ✅ Local conversion for ALL animations (Option A-style)
  const localConversion = convertAnimationLocally(config);
  if (localConversion) return localConversion;

  const preferFirebase = options?.preferFirebase ?? true;

  if (preferFirebase) {
    const firebaseResult = await convertDesignerConfigViaFirebase(config, {
      userId: options?.userId ?? null,
      timeoutMs: options?.timeoutMs,
    });

    if (firebaseResult) {
      return {
        bytes: firebaseResult.bytes,
        hexString: firebaseResult.hexString,
        note:
          firebaseResult.note ??
          "Animation toolkit JSON converted through Firebase and ready for your scooter.",
        source: "cloud",
      };
    }
  }

  const endpoint =
    import.meta.env.VITE_ANIMATION_CONVERTER_URL ??
    import.meta.env.VITE_FIREBASE_ANIMATION_CONVERTER_URL ??
    "";

  if (!endpoint) {
    console.warn("Animation converter endpoint not configured. Falling back to sample command.");
    return buildSampleResult();
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        animation: config,
        metadata: {
          source: "animation-toolkit",
          requestedAt: new Date().toISOString(),
        },
        sample: SAMPLE_DESIGNER_JSON,
      }),
    });

    if (!response.ok) throw new Error(`Converter responded with ${response.status}`);

    const payload = await response.json();
    const bytes = sanitizeBytes(payload?.bytes ?? payload?.command ?? payload?.data ?? payload?.commandBytes ?? []);

    if (bytes.length === 0) throw new Error("Converter did not return any byte data.");

    return {
      bytes,
      hexString: toHexString(bytes),
      source: "cloud",
      note: payload?.message ?? "Converted with Firebase Cloud function.",
    };
  } catch (error) {
    console.error("Failed to convert designer config, using sample command instead", error);
    return buildSampleResult(error instanceof Error ? error.message : undefined);
  }
};
