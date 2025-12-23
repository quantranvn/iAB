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
  bytes
    .map((byte) => byte.toString(16).padStart(2, "0").toUpperCase())
    .join(" ");

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
    .map((value) => {
      const numeric = typeof value === "number" ? value : Number.parseInt(String(value), 10);
      if (Number.isNaN(numeric)) return null;
      return Math.max(0, Math.min(255, numeric));
    })
    .filter((value): value is number => value !== null);
};

const hexColorToRgb = (value: unknown, fallback: [number, number, number]): [number, number, number] => {
  if (typeof value !== "string") return fallback;
  let hex = value.trim();
  if (hex.startsWith("#")) hex = hex.slice(1);
  if (hex.length === 3) hex = `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
  if (hex.length !== 6) return fallback;

  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return fallback;
  return [r, g, b];
};

// ----------------------------
// Fixed LED map
// ----------------------------
const LEFT_INDEXES = [3, 4, 5, 6, 7, 8, 9, 10]; // 8 LEDs
const RIGHT_INDEXES = [0, 1, 2, 11, 12, 13, 14, 15]; // 8 LEDs split

type ScenarioId = 0 | 1 | 2;
const scenarioIdForAnim = (animId: string): ScenarioId | null => {
  const id = animId.toLowerCase();
  if (id === "police") return 0;
  if (id === "larson") return 1;
  if (id === "breathing") return 2;
  return null;
};

const buildIntensity = (config: DesignerConfig): number => {
  // globalBrightness 0..1 -> 0..0x14
  const b = clampNumber(config.globalBrightness, 0, 1, 1);
  return clampByte(Math.round(b * 20), 0, 0x14);
};

const buildLoopCountFromSpeed = (config: DesignerConfig, perConfigSpeed: unknown): number => {
  // repeat count (each repeat = 20ms)
  const BASE_REPEATS_AT_SPEED_1 = 10; // 0x0A => 200ms
  const p = typeof perConfigSpeed === "number" ? perConfigSpeed : 1;
  const g = typeof config.globalSpeed === "number" ? config.globalSpeed : 1;
  const effectiveSpeed = p * g;
  const normalized = clampNumber(effectiveSpeed, 0.1, 10, 1);
  return clampByte(Math.max(1, Math.round(BASE_REPEATS_AT_SPEED_1 / normalized)));
};

const writeSolidSegment = (
  bytes: number[],
  start: number,
  length: number,
  rgb: [number, number, number],
  intensity: number,
  ledCount: number,
) => {
  const safeStart = clampByte(start, 0, ledCount - 1);
  const safeLength = clampByte(length, 0, ledCount - safeStart);
  if (safeLength <= 0) return;

  bytes.push(0x37, safeStart, safeLength);
  for (let i = 0; i < safeLength; i += 1) {
    bytes.push(clampByte(rgb[0]), clampByte(rgb[1]), clampByte(rgb[2]), clampByte(intensity));
  }
};

const writeFullStripFrame = (
  bytes: number[],
  colors: Array<[number, number, number]>,
  intensity: number,
  loopCount: number,
) => {
  // cycle start
  bytes.push(0x01, clampByte(loopCount));

  // one full-strip segment
  bytes.push(0x37, 0x00, clampByte(colors.length));
  for (let i = 0; i < colors.length; i += 1) {
    const [r, g, b] = colors[i];
    bytes.push(clampByte(r), clampByte(g), clampByte(b), clampByte(intensity));
  }

  // end cycle
  bytes.push(0x03);
};

// ----------------------------
// Police: 2 colors, 2 frames
// ----------------------------
const convertPoliceLocally = (config: DesignerConfig, entry: any): DesignerCommandResult | null => {
  const ledCount = clampByte(config.ledCount, 1, 255);
  if (ledCount <= 0) return null;

  const scenarioId: ScenarioId = 0;
  const intensity = buildIntensity(config);
  const loopCount = buildLoopCountFromSpeed(config, entry.props?.speed);

  const leftColor = hexColorToRgb(entry.props?.leftColor, [0xff, 0x00, 0x00]);
  const rightColor = hexColorToRgb(entry.props?.rightColor, [0x00, 0x00, 0xff]);

  // Header: 01 00 <scenarioId>
  const bytes: number[] = [0x01, 0x00, scenarioId];

  // Frame A: LEFT ON (3..10) as one segment
  // start cycle
  bytes.push(0x01, loopCount);
  // segment start 3 len 8
  writeSolidSegment(bytes, 3, 8, leftColor, intensity, ledCount);
  bytes.push(0x03);

  // Frame B: RIGHT ON (0..2 and 11..15) as two segments
  bytes.push(0x01, loopCount);
  writeSolidSegment(bytes, 0, 3, rightColor, intensity, ledCount);
  writeSolidSegment(bytes, 11, 5, rightColor, intensity, ledCount);
  bytes.push(0x03);

  // End infinite loop
  bytes.push(0x03);

  return {
    bytes,
    hexString: toHexString(bytes),
    source: "local",
    note: `Police(local) header=01 00 00 intensity=0x${intensity.toString(16).toUpperCase().padStart(2, "0")} loop=${loopCount}`,
  };
};

// ----------------------------
// Breathing: base color, sampled frames
// ----------------------------
const convertBreathingLocally = (config: DesignerConfig, entry: any): DesignerCommandResult | null => {
  const ledCount = clampByte(config.ledCount, 1, 255);
  if (ledCount <= 0) return null;

  const scenarioId: ScenarioId = 2;
  const intensity = buildIntensity(config);

  const globalSpeed = typeof config.globalSpeed === "number" ? config.globalSpeed : 1;
  const props = entry.props || {};
  const perSpeed = typeof props.speed === "number" ? props.speed : 1;
  const localSpeed = clampNumber(perSpeed * globalSpeed, 0.1, 10, 1);

  const phaseMs = typeof props.phaseMs === "number" ? props.phaseMs : 0;
  const base = hexColorToRgb(props.color, [0x00, 0xff, 0xff]);

  // Sampling controls (tune if you want)
  const FRAMES = 40;
  const FRAME_HOLD_REPEATS = 2; // 40ms per frame
  const frameLoopCount = clampByte(FRAME_HOLD_REPEATS);

  // Header: 01 00 <scenarioId>
  const bytes: number[] = [0x01, 0x00, scenarioId];

  const period = 3000 / localSpeed;

  for (let f = 0; f < FRAMES; f += 1) {
    const tMs = f * (20 * FRAME_HOLD_REPEATS) + phaseMs;
    const phase = ((tMs % period) / period) * 2 * Math.PI;

    let v = (Math.sin(phase - Math.PI / 2) + 1) / 2;
    v = v * 0.9 + 0.1;

    const rgb: [number, number, number] = [
      Math.round(base[0] * v),
      Math.round(base[1] * v),
      Math.round(base[2] * v),
    ];

    // build full-strip colors with fixed map
    const colors: Array<[number, number, number]> = new Array(ledCount).fill(0).map(() => [0, 0, 0]);

    for (const idx of LEFT_INDEXES) if (idx < ledCount) colors[idx] = rgb;
    for (const idx of RIGHT_INDEXES) if (idx < ledCount) colors[idx] = rgb;

    writeFullStripFrame(bytes, colors, intensity, frameLoopCount);
  }

  // End infinite loop
  bytes.push(0x03);

  return {
    bytes,
    hexString: toHexString(bytes),
    source: "local",
    note: `Breathing(local) header=01 00 02 frames=${FRAMES} hold=${FRAME_HOLD_REPEATS} intensity=0x${intensity
      .toString(16)
      .toUpperCase()
      .padStart(2, "0")}`,
  };
};

// ----------------------------
// Larson: sampled frames, fixed map
// ----------------------------
const convertLarsonLocally = (config: DesignerConfig, entry: any): DesignerCommandResult | null => {
  const ledCount = clampByte(config.ledCount, 1, 255);
  if (ledCount <= 0) return null;

  const scenarioId: ScenarioId = 1;
  const intensityByte = buildIntensity(config);

  const globalSpeed = typeof config.globalSpeed === "number" ? config.globalSpeed : 1;
  const props = entry.props || {};
  const perSpeed = typeof props.speed === "number" ? props.speed : 1;
  const localSpeed = clampNumber(perSpeed * globalSpeed, 0.1, 10, 1);
  const phaseMs = typeof props.phaseMs === "number" ? props.phaseMs : 0;

  // Sampling controls
  const FRAMES = 44;
  const FRAME_HOLD_REPEATS = 2; // 40ms per frame
  const frameLoopCount = clampByte(FRAME_HOLD_REPEATS);

  // We'll run larson across the 8 LEDs of each side (left & right simultaneously)
  const len = 8;
  const period = 2200 / localSpeed;

  const bytes: number[] = [0x01, 0x00, scenarioId];

  for (let f = 0; f < FRAMES; f += 1) {
    const tMs = f * (20 * FRAME_HOLD_REPEATS) + phaseMs;

    const phase = (((tMs % period) / period) * 2 * Math.PI);
    const pos = (Math.sin(phase) * 0.5 + 0.5) * Math.max(0, len - 1);

    const sideRgb: Array<[number, number, number]> = new Array(len).fill(0).map(() => [0, 0, 0]);

    for (let i = 0; i < len; i += 1) {
      const dist = Math.abs(i - pos);
      let inten = Math.max(0, 1.4 - dist);
      inten = inten * inten;

      sideRgb[i] = [
        Math.round(255 * inten),
        Math.round(40 * inten),
        Math.round(40 * inten),
      ];
    }

    // Map the 8 computed values onto fixed indexes
    const colors: Array<[number, number, number]> = new Array(ledCount).fill(0).map(() => [0, 0, 0]);

    for (let i = 0; i < len; i += 1) {
      const li = LEFT_INDEXES[i];
      if (li < ledCount) colors[li] = sideRgb[i];

      const ri = RIGHT_INDEXES[i];
      if (ri < ledCount) colors[ri] = sideRgb[i];
    }

    writeFullStripFrame(bytes, colors, intensityByte, frameLoopCount);
  }

  bytes.push(0x03);

  return {
    bytes,
    hexString: toHexString(bytes),
    source: "local",
    note: `Larson(local) header=01 00 01 frames=${FRAMES} hold=${FRAME_HOLD_REPEATS} intensity=0x${intensityByte
      .toString(16)
      .toUpperCase()
      .padStart(2, "0")}`,
  };
};

// ----------------------------
// Dispatcher (local)
// ----------------------------
const convertFixedScenarioLocally = (config: DesignerConfig): DesignerCommandResult | null => {
  const entry = config.configs[0];
  if (!entry || typeof entry.animId !== "string") return null;

  const scenarioId = scenarioIdForAnim(entry.animId);
  if (scenarioId === null) return null;

  if (scenarioId === 0) return convertPoliceLocally(config, entry);
  if (scenarioId === 1) return convertLarsonLocally(config, entry);
  if (scenarioId === 2) return convertBreathingLocally(config, entry);

  return null;
};

// ----------------------------
// Sample config
// ----------------------------
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
        speed: 1,
        phaseMs: 0,
        direction: "left",
        mirror: false,
        leftColor: "#FF0000",
        rightColor: "#0000FF",
      },
    },
  ],
};

const SAMPLE_COMMAND_BYTES =
  convertFixedScenarioLocally(SAMPLE_DESIGNER_JSON)?.bytes ?? [
    // fallback to old police sample if something goes wrong
    0x01, 0x00, 0x00,
    0x01, 0x0A,
    0x37, 0x03, 0x08,
    0xFF, 0x00, 0x00, 0x14,
    0xFF, 0x00, 0x00, 0x14,
    0xFF, 0x00, 0x00, 0x14,
    0xFF, 0x00, 0x00, 0x14,
    0xFF, 0x00, 0x00, 0x14,
    0xFF, 0x00, 0x00, 0x14,
    0xFF, 0x00, 0x00, 0x14,
    0xFF, 0x00, 0x00, 0x14,
    0x03,
    0x01, 0x0A,
    0x37, 0x00, 0x03,
    0x00, 0x00, 0xFF, 0x14,
    0x00, 0x00, 0xFF, 0x14,
    0x00, 0x00, 0xFF, 0x14,
    0x37, 0x0B, 0x05,
    0x00, 0x00, 0xFF, 0x14,
    0x00, 0x00, 0xFF, 0x14,
    0x00, 0x00, 0xFF, 0x14,
    0x00, 0x00, 0xFF, 0x14,
    0x00, 0x00, 0xFF, 0x14,
    0x03,
    0x03
  ];

const buildSampleResult = (note?: string): DesignerCommandResult => ({
  bytes: SAMPLE_COMMAND_BYTES,
  hexString: toHexString(SAMPLE_COMMAND_BYTES),
  source: "sample",
  note: note ?? "Using sample command bytes.",
});

// ----------------------------
// Main export
// ----------------------------
export const convertDesignerConfigToCommand = async (
  config: DesignerConfig,
  options?: DesignerConversionOptions,
): Promise<DesignerCommandResult> => {
  // ✅ Local supports police/larson/breathing with fixed map + scenarioId header
  const local = convertFixedScenarioLocally(config);
  if (local) return local;

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
        note: firebaseResult.note ?? "Converted through Firebase.",
        source: "cloud",
      };
    }
  }

  const endpoint =
    import.meta.env.VITE_ANIMATION_CONVERTER_URL ??
    import.meta.env.VITE_FIREBASE_ANIMATION_CONVERTER_URL ??
    "";

  if (!endpoint) {
    console.warn("Converter endpoint not configured. Falling back to sample bytes.");
    return buildSampleResult();
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        animation: config,
        metadata: { source: "animation-toolkit", requestedAt: new Date().toISOString() },
        sample: SAMPLE_DESIGNER_JSON,
      }),
    });

    if (!response.ok) throw new Error(`Converter responded with ${response.status}`);

    const payload = await response.json();
    const bytes = sanitizeBytes(
      payload?.bytes ?? payload?.command ?? payload?.data ?? payload?.commandBytes ?? [],
    );

    if (bytes.length === 0) throw new Error("Converter did not return any byte data.");

    return {
      bytes,
      hexString: toHexString(bytes),
      source: "cloud",
      note: payload?.message ?? "Converted with cloud function.",
    };
  } catch (error) {
    console.error("Failed to convert designer config, using sample command instead", error);
    return buildSampleResult(error instanceof Error ? error.message : undefined);
  }
};
