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

const normalizeAnimId = (raw: unknown): string =>
  String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const hexToRgb = (hex: unknown, fallback: RGB): RGB => {
  if (typeof hex !== "string") return fallback;
  const raw = hex.trim().replace("#", "");
  if (!(raw.length === 6 || raw.length === 3)) return fallback;

  const expanded = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const n = Number.parseInt(expanded, 16);
  if (Number.isNaN(n)) return fallback;

  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
};

const specialCmdFromAnimId = (animIdNorm: string): number =>
  animIdNorm === "police" ? 0x40
  : animIdNorm === "beat" ? 0x41
  : animIdNorm === "breathing" ? 0x42
  : animIdNorm === "strobe" ? 0x43
  : animIdNorm === "running" ? 0x44
  : animIdNorm === "water" ? 0x45
  : animIdNorm === "larson" ? 0x46
  : animIdNorm === "twinkle" ? 0x47
  : animIdNorm === "theater" ? 0x48
  : animIdNorm === "smoothfade" ? 0x49
  : animIdNorm === "rainbow" ? 0x4a
  : animIdNorm === "plasma" ? 0x4b
  : 0xff;


const packDirMirror = (props: any): number => {
  const direction2b = props?.direction === "right" ? 0x01 : 0x00; // 2-bit
  const mirror2b = props?.mirror ? 0x01 : 0x00; // 2-bit
  return (direction2b & 0x03) | ((mirror2b & 0x03) << 2);
};


const encodeSpeedByte = (config: DesignerConfig, props: any): number => {
  if (typeof props?.speed === "number") return clampByte(props.speed, 0, 255);

  const gs = typeof config.globalSpeed === "number" ? config.globalSpeed : 1;
  const mapped = Math.round(clampNumber(gs, 0, 1, 1) * 255);
  return clampByte(mapped, 0, 255);
};

const encodePhaseByte = (props: any): number => {
  if (typeof props?.phase === "number") return clampByte(props.phase, 0, 255);

  const phaseMs = typeof props?.phaseMs === "number" ? props.phaseMs : 0;
  const ms = clampNumber(phaseMs, 0, 5000, 0);
  const byte = Math.round((ms / 5000) * 255);
  return clampByte(byte, 0, 255);
};

const convertAnimationLocally = (config: DesignerConfig): DesignerCommandResult | null => {
  const entry = config.configs?.[0];
  if (!entry) return null;

  const animIdNorm = normalizeAnimId(entry.animId);
  const props = entry.props ?? {};

  const specialCmd = specialCmdFromAnimId(animIdNorm);
  if (specialCmd === 0xff) return null;

  const ledCount = clampByte(config.ledCount, 1, 255);
  if (ledCount <= 0) return null;

  const startIndex = clampByte(entry.start ?? 0, 0, ledCount - 1);
  const maxLen = ledCount - startIndex;
  const length = clampByte(entry.length ?? ledCount, 1, maxLen);

  const brightness01 = clampNumber(config.globalBrightness, 0, 1, 1);
  const intensity = clampByte(Math.round(brightness01 * 0x64), 0, 0x64);

  const baseColor: RGB =
    animIdNorm === "police"
      ? hexToRgb(props.leftColor, { r: 255, g: 0, b: 0 })
      : animIdNorm === "strobe"
        ? { r: 255, g: 255, b: 255 }
        : hexToRgb(props.color, { r: 255, g: 0, b: 0 });

  const speedByte = encodeSpeedByte(config, props);
  const phaseByte = encodePhaseByte(props);
  const dirMirrorByte = packDirMirror(props);

  const bytes: number[] = [];

  bytes.push(0x01, 0x00);

  bytes.push(clampByte(specialCmd), startIndex, length);

  bytes.push(
    clampByte(baseColor.r),
    clampByte(baseColor.g),
    clampByte(baseColor.b),
    intensity,
  );

  bytes.push(speedByte, phaseByte, dirMirrorByte);

  bytes.push(0x03);

  return {
    bytes,
    hexString: toHexString(bytes),
    source: "local",
    note: `new-format(local) 01 00 | cmd=0x${specialCmd
      .toString(16)
      .toUpperCase()} range=${startIndex}+${length} RGBI=(${baseColor.r},${baseColor.g},${baseColor.b},0x${intensity
      .toString(16)
      .toUpperCase()
      .padStart(2, "0")}) | speed=${speedByte} phase=${phaseByte} dirMir=0x${dirMirrorByte
      .toString(16)
      .toUpperCase()
      .padStart(2, "0")} | 03`,
  };
};

const SAMPLE_DESIGNER_JSON: DesignerConfig = {
  ledCount: 16,
  globalBrightness: 1,
  globalSpeed: 255,
  configs: [
    {
      start: 0,
      length: 16,
      animId: "beat",
      props: {
        direction: "left",
        mirror: false,
        phase: 0,
        color: "#ff0000",
        speed: 1,
      },
    },
  ],
};

const SAMPLE_COMMAND_BYTES =
  convertAnimationLocally(SAMPLE_DESIGNER_JSON)?.bytes ??
  [
    0x01, 0x00,
    0x41, 0x00, 0x10,
    0xff, 0x00, 0x00, 0x14,
    0x01, 0x00, 0x00,
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
