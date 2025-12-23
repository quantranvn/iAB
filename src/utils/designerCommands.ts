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

type RGB = { r: number; g: number; b: number };
const BLACK: RGB = { r: 0, g: 0, b: 0 };

const hexToRgb = (hex: unknown, fallback: RGB): RGB => {
  if (typeof hex !== "string") return fallback;
  const raw = hex.trim().replace("#", "");
  if (!(raw.length === 6 || raw.length === 3)) return fallback;

  const expanded =
    raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;

  const n = Number.parseInt(expanded, 16);
  if (Number.isNaN(n)) return fallback;

  return {
    r: (n >> 16) & 0xff,
    g: (n >> 8) & 0xff,
    b: n & 0xff,
  };
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
  // mirrors toolkit-ish behavior (direction + mirror)
  const direction = props?.direction === "right" ? "right" : "left";
  const mirror = Boolean(props?.mirror);

  // direction flips the whole strip
  let idx = direction === "right" ? len - 1 - i : i;

  // mirror reflects within halves (0..7 and 8..15)
  if (mirror && len >= 2) {
    const half = Math.floor(len / 2);
    if (idx < half) idx = half - 1 - idx;
    else idx = half + (len - 1 - idx);
  }

  return idx;
};

const isBlack = (c: RGB) => c.r === 0 && c.g === 0 && c.b === 0;

// Build contiguous segments in physical index space (0..ledCount-1),
// but ONLY for non-black LEDs. Contiguous means consecutive physical indices.
const buildSparseSegments = (
  physicalColors: RGB[],
  intensityByte: number,
): Array<{ start: number; colors: RGB[] }> => {
  const segments: Array<{ start: number; colors: RGB[] }> = [];

  let runStart: number | null = null;
  let run: RGB[] = [];

  const flush = () => {
    if (runStart !== null && run.length > 0) {
      segments.push({ start: runStart, colors: run });
    }
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
      bytes.push(clampByte(c.r), clampByte(c.g), clampByte(c.b), intensity);
    }
  }
};

// ===============================
// ✅ LOCAL CONVERTER (Police/Larson/Breathing) using Option A
// Header: 01 00 <scenario>
// Then multiple cycles: 01 <hold> ... 03 inside the infinite loop
// Fixed map always: left=3..10, right=0..2 & 11..15
// ===============================
const convertAnimationLocally = (config: DesignerConfig): DesignerCommandResult | null => {
  // pick the first known anim in configs (you can change selection logic if needed)
  const entry = config.configs.find((e) => {
    const id = e.animId?.toLowerCase();
    return id === "police" || id === "larson" || id === "breathing";
  });

  if (!entry) return null;

  const animId = (entry.animId ?? "").toLowerCase();
  const props = entry.props ?? {};

  // Your firmware scenario byte mapping
  const scenarioByte = animId === "police" ? 0x00 : animId === "larson" ? 0x01 : 0x02;

  // ledCount: your examples assume 16 and fixed mapping relies on 16
  // We’ll still clamp, but if not 16, we do best-effort on first ledCount indices.
  const ledCount = clampByte(config.ledCount, 1, 255);
  if (ledCount <= 0) return null;

  // Brightness -> intensity byte (0x00..0x14)
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

  // Start infinite loop with scenario in header
  const bytes: number[] = [0x01, 0x00, scenarioByte];

  // Helper to push one frame (one 01 <hold> ... 03 cycle)
  const pushFrame = (physicalColors: RGB[]) => {
    bytes.push(0x01, hold);

    // Option A: sparse segments (only non-black)
    const segments = buildSparseSegments(physicalColors, intensity);
    appendSegments(bytes, segments, intensity);

    bytes.push(0x03);
  };

  // Build logical frame colors (0..15), then map to physical index space (0..15)
  const logicalLen = Math.min(16, ledCount);
  const toPhysicalColors = (logicalColors: RGB[]): RGB[] => {
    const phys: RGB[] = Array.from({ length: ledCount }, () => BLACK);

    for (let i = 0; i < logicalColors.length; i += 1) {
      const effective = getEffectiveIndex(i, logicalColors.length, props);
      const physical = mapLogicalToPhysical(effective);

      if (physical >= 0 && physical < ledCount) {
        phys[physical] = logicalColors[i] ?? BLACK;
      }
    }
    return phys;
  };

  // =========================
  // POLICE (2 frames: left on, then right on)
  // =========================
  if (animId === "police") {
    const leftRgb = hexToRgb(props.leftColor, { r: 255, g: 0, b: 0 });
    const rightRgb = hexToRgb(props.rightColor, { r: 0, g: 0, b: 255 });

    // Frame A: left half ON, right half OFF
    const logicalA: RGB[] = Array.from({ length: logicalLen }, (_, i) =>
      i < 8 ? leftRgb : BLACK,
    );
    pushFrame(toPhysicalColors(logicalA));

    // Frame B: left half OFF, right half ON
    const logicalB: RGB[] = Array.from({ length: logicalLen }, (_, i) =>
      i < 8 ? BLACK : rightRgb,
    );
    pushFrame(toPhysicalColors(logicalB));

    // end infinite loop
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

  // =========================
  // BREATHING (color) — still "full strip", but we keep frames small enough for 2KB
  // Option A here means: we still send segments, but all LEDs are non-black, so it becomes 3 segments
  // (left 8, right 3, right 5). Reduce frames to fit.
  // =========================
  if (animId === "breathing") {
    const base = hexToRgb(props.color, { r: 0, g: 255, b: 255 });
    const phaseMs = typeof props.phaseMs === "number" ? props.phaseMs : 0;

    // Keep it safe for 2KB: 24 frames is usually fine even with full 16 LEDs.
    // You can tune this up/down.
    const frames = clampByte(24, 4, 60);

    for (let f = 0; f < frames; f += 1) {
      // emulate toolkit-ish breathing curve
      const t = f * hold * LOOP_MS + phaseMs;
      const period = 3000 / normalizedSpeed;
      const phase = ((t % period) / period) * 2 * Math.PI;
      let v = (Math.sin(phase - Math.PI / 2) + 1) / 2;
      v = v * 0.9 + 0.1;

      const c: RGB = {
        r: clampByte(Math.round(base.r * v)),
        g: clampByte(Math.round(base.g * v)),
        b: clampByte(Math.round(base.b * v)),
      };

      const logical: RGB[] = Array.from({ length: logicalLen }, () => c);
      pushFrame(toPhysicalColors(logical));
    }

    bytes.push(0x03);

    return {
      bytes,
      hexString: toHexString(bytes),
      source: "local",
      note: `Breathing(local) header=01 00 ${scenarioByte} frames=${clampByte(
        24,
      )} hold=${hold} intensity=0x${intensity.toString(16).toUpperCase().padStart(2, "0")}`,
    };
  }

  // =========================
  // LARSON (scanner) — make it color-configurable + Option A sparse frames
  // We send ONLY top K LEDs per frame (typically 2–3), as 1-LED segments.
  // This is what keeps it well under 2KB.
  // =========================
  if (animId === "larson") {
    // ✅ NEW: allow configurable color in designer JSON (props.color)
    // default matches your original reddish look
    const base = hexToRgb(props.color, { r: 255, g: 40, b: 40 });
    const phaseMs = typeof props.phaseMs === "number" ? props.phaseMs : 0;

    // Frames count: keep moderate. 44 worked in your example; still safe with sparse K LEDs.
    const frames = clampByte(44, 8, 80);

    // How many LEDs to send per frame (Option A)
    const TOP_K = 3;

    for (let f = 0; f < frames; f += 1) {
      const t = f * hold * LOOP_MS + phaseMs;

      const period = 2200 / normalizedSpeed;
      const phase = ((t % period) / period) * 2 * Math.PI;

      // position along logical strip
      const pos = (Math.sin(phase) * 0.5 + 0.5) * Math.max(0, logicalLen - 1);

      // compute intensity per logical index
      const logicalIntensities = Array.from({ length: logicalLen }, (_, i) => {
        const dist = Math.abs(i - pos);
        let v = Math.max(0, 1.4 - dist);
        v = v * v; // sharpen
        return v;
      });

      // pick top K indices
      const ranked = logicalIntensities
        .map((v, i) => ({ i, v }))
        .filter((x) => x.v > 0.02) // threshold to avoid sending near-black
        .sort((a, b) => b.v - a.v)
        .slice(0, TOP_K);

      // build sparse logical colors (mostly black)
      const logical: RGB[] = Array.from({ length: logicalLen }, () => BLACK);
      for (const { i, v } of ranked) {
        logical[i] = {
          r: clampByte(Math.round(base.r * v)),
          g: clampByte(Math.round(base.g * v)),
          b: clampByte(Math.round(base.b * v)),
        };
      }

      // Convert to physical
      const physical = toPhysicalColors(logical);

      // Force 1-LED segments to avoid “contiguous run” accidentally sending many LEDs
      // (because physical indices for right side are split)
      bytes.push(0x01, hold);
      for (let p = 0; p < physical.length; p += 1) {
        const c = physical[p] ?? BLACK;
        if (isBlack(c)) continue;
        bytes.push(0x37, clampByte(p), 0x01, c.r, c.g, c.b, intensity);
      }
      bytes.push(0x03);
    }

    bytes.push(0x03);

    return {
      bytes,
      hexString: toHexString(bytes),
      source: "local",
      note: `Larson(local) header=01 00 ${scenarioByte} frames=${frames} hold=${hold} topK=${TOP_K} intensity=0x${intensity
        .toString(16)
        .toUpperCase()
        .padStart(2, "0")}`,
    };
  }

  return null;
};

// --- SAMPLE JSON (update larson + breathing to support color props if you want) ---
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
    // Fallback stays here (optional)
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
  // ✅ Local conversion for police/larson/breathing (Option A)
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
    const bytes = sanitizeBytes(
      payload?.bytes ?? payload?.command ?? payload?.data ?? payload?.commandBytes ?? [],
    );

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
