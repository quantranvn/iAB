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
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, value));
};

const clampByte = (value: unknown, min = 0, max = 255): number => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return min;
  }

  return Math.max(min, Math.min(max, Math.round(value)));
};

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

const convertPoliceAnimationLocally = (config: DesignerConfig): DesignerCommandResult | null => {
  const policeEntry = config.configs.find((entry) => entry.animId?.toLowerCase() === "police");
  if (!policeEntry) {
    return null;
  }

  const ledCount = clampByte(config.ledCount, 1, 255);
  if (ledCount <= 0) {
    return null;
  }

  // Red block always starts at LED 3 (clamped if ledCount < 4)
  const redStart = clampByte(3, 0, ledCount - 1);
  const requestedLength = Math.floor(ledCount / 2);
  const redLength = clampByte(requestedLength, 1, ledCount - redStart);
  const redEndIndex = redStart + redLength - 1;

  // ✅ Brightness in your protocol is INTENSITY (4th byte), not RGB scaling.
  // Map globalBrightness 0..1 -> 0x00..0x14 (5% steps).
  const clampedBrightness = clampNumber(config.globalBrightness, 0, 1, 1);
  const intensity = clampByte(Math.round(clampedBrightness * 20), 0, 0x14);

  // Speed -> repeat count (each repeat = 20ms)
  const LOOP_MS = 20;
  const BASE_REPEATS_AT_SPEED_1 = 10; // => 200ms at speed=1 (matches 0x0A sample)
  
  const perConfigSpeed =
    typeof policeEntry.props?.speed === "number" ? policeEntry.props.speed : 1;
  
  const global =
    typeof config.globalSpeed === "number" ? config.globalSpeed : 1;
  
  const effectiveSpeed = perConfigSpeed * global; // ✅ toolkit behavior
  const normalizedSpeed = clampNumber(effectiveSpeed, 0.1, 10, 1);
  
  // faster speed => smaller repeat count
  const loopCount = clampByte(Math.max(1, Math.round(BASE_REPEATS_AT_SPEED_1 / normalizedSpeed)));


  // ✅ Keep pure RGB colors; intensity controls brightness
  const redColor: [number, number, number] = [0xFF, 0x00, 0x00];
  const blueColor: [number, number, number] = [0x00, 0x00, 0xFF];

  // 01 00 = infinite loop start, 01 <loopCount> = cycle start
  const bytes: number[] = [0x01, 0x00, 0x01, loopCount];

  const appendSegment = (start: number, length: number, [r, g, b]: [number, number, number]) => {
    if (length <= 0) return;

    // 0x37 (55) mask, then start index, then length
    bytes.push(0x37, clampByte(start), clampByte(length));

    // Per LED tuple: R G B INTENSITY (0x00..0x14)
    for (let index = 0; index < length; index += 1) {
      bytes.push(r, g, b, intensity);
    }
  };

  // RED segment
  appendSegment(redStart, redLength, redColor);
  bytes.push(0x03); // end cycle

  // BLUE segments (LEDs outside the red block)
  const firstBlueLength = redStart;
  const secondBlueLength = Math.max(0, ledCount - (redEndIndex + 1));

  // Start next cycle
  bytes.push(0x01, loopCount);
  appendSegment(0, firstBlueLength, blueColor);
  appendSegment(redEndIndex + 1, secondBlueLength, blueColor);

  // End cycle + end infinite loop
  bytes.push(0x03, 0x03);

  return {
    bytes,
    hexString: toHexString(bytes),
    source: "local",
    note: `Converted locally using the built-in police animation mapper. intensity=0x${intensity
      .toString(16)
      .toUpperCase()
      .padStart(2, "0")} loop=${loopCount}`,
  };
};

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
        speed: 1,
      },
    },
  ],
};

// Uses local converter if available; otherwise fallback sample bytes.
// NOTE: With globalBrightness=1, intensity becomes 0x14 (not 0x32).
const SAMPLE_POLICE_COMMAND_BYTES =
  convertPoliceAnimationLocally(SAMPLE_DESIGNER_JSON)?.bytes ?? [
    0x01, 0x00,
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
  bytes: SAMPLE_POLICE_COMMAND_BYTES,
  hexString: toHexString(SAMPLE_POLICE_COMMAND_BYTES),
  source: "sample",
  note:
    note ??
    "Using the built-in police animation example while the converter is unavailable.",
});

export const convertDesignerConfigToCommand = async (
  config: DesignerConfig,
  options?: DesignerConversionOptions,
): Promise<DesignerCommandResult> => {
  const localConversion = convertPoliceAnimationLocally(config);
  if (localConversion) {
    return localConversion;
  }

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
