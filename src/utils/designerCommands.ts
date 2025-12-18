import { convertDesignerConfigViaFirebase } from "./firebase";
import type { DesignerConfig } from "../types/designer";

export type DesignerCommandSource = "cloud" | "sample";

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

const SAMPLE_DESIGNER_JSON: DesignerConfig = {
  ledCount: 16,
  globalBrightness: 0.9,
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
        speed: 1,
      },
    },
  ],
};

const SAMPLE_POLICE_COMMAND_BYTES: number[] = [
  0x01,
  0x00,
  0x01,
  0x19,
  0x37,
  0x00,
  0x08,
  0xff,
  0x00,
  0x00,
  0x64,
  0xff,
  0x00,
  0x00,
  0x64,
  0xff,
  0x00,
  0x00,
  0x64,
  0xff,
  0x00,
  0x00,
  0x64,
  0xff,
  0x00,
  0x00,
  0x64,
  0xff,
  0x00,
  0x00,
  0x64,
  0xff,
  0x00,
  0x00,
  0x64,
  0xff,
  0x00,
  0x00,
  0x64,
  0x03,
  0x01,
  0x19,
  0x37,
  0x08,
  0x08,
  0x00,
  0x00,
  0xff,
  0x64,
  0x00,
  0x00,
  0xff,
  0x64,
  0x00,
  0x00,
  0xff,
  0x64,
  0x00,
  0x00,
  0xff,
  0x64,
  0x00,
  0x00,
  0xff,
  0x64,
  0x00,
  0x00,
  0xff,
  0x64,
  0x00,
  0x00,
  0xff,
  0x64,
  0x00,
  0x00,
  0xff,
  0x64,
  0x03,
  0x03,
];

const toHexString = (bytes: number[]): string =>
  bytes
    .map((byte) => byte.toString(16).padStart(2, "0").toUpperCase())
    .join(" ");

const sanitizeBytes = (input: unknown): number[] => {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((value) => {
      const numeric = typeof value === "number" ? value : Number.parseInt(String(value), 10);

      if (Number.isNaN(numeric)) {
        return null;
      }

      return Math.max(0, Math.min(255, numeric));
    })
    .filter((value): value is number => value !== null);
};

const buildSampleResult = (note?: string): DesignerCommandResult => ({
  bytes: SAMPLE_POLICE_COMMAND_BYTES,
  hexString: toHexString(SAMPLE_POLICE_COMMAND_BYTES),
  source: "sample",
  note:
    note ??
    "Using the built-in police animation example (500ms red, 500ms blue) while the converter is unavailable.",
});

export const convertDesignerConfigToCommand = async (
  config: DesignerConfig,
  options?: DesignerConversionOptions,
): Promise<DesignerCommandResult> => {
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
    console.warn(
      "Animation converter endpoint is not configured. Falling back to the sample police animation command.",
    );
    return buildSampleResult();
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        animation: config,
        metadata: {
          source: "animation-toolkit",
          requestedAt: new Date().toISOString(),
        },
        sample: SAMPLE_DESIGNER_JSON,
      }),
    });

    if (!response.ok) {
      throw new Error(`Converter responded with ${response.status}`);
    }

    const payload = await response.json();
    const bytes = sanitizeBytes(
      payload?.bytes ?? payload?.command ?? payload?.data ?? payload?.commandBytes ?? [],
    );

    if (bytes.length === 0) {
      throw new Error("Converter did not return any byte data.");
    }

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
