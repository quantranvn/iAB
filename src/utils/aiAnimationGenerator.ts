import type { LightSettings } from "../types/userProfile";
import type { StoreAnimation } from "./firebase";

interface ColorProfile {
  label: string;
  keywords: string[];
  rgb: [number, number, number];
  gradientStops: [string, string, string];
}

interface VibeProfile {
  label: string;
  keywords: string[];
  intensity: number;
}

const COLOR_PROFILES: ColorProfile[] = [
  {
    label: "Aurora Teal",
    keywords: ["teal", "aqua", "ocean", "wave", "lagoon", "turquoise", "sea"],
    rgb: [28, 190, 195],
    gradientStops: ["emerald-400", "teal-400", "sky-400"],
  },
  {
    label: "Sunset Ember",
    keywords: ["sunset", "sunrise", "dawn", "gold", "amber", "fire", "warm"],
    rgb: [238, 118, 58],
    gradientStops: ["orange-500", "rose-500", "purple-500"],
  },
  {
    label: "Violet Storm",
    keywords: ["violet", "purple", "storm", "electric", "neon", "magenta"],
    rgb: [140, 56, 255],
    gradientStops: ["violet-500", "purple-500", "indigo-500"],
  },
  {
    label: "Midnight Sky",
    keywords: ["night", "midnight", "galaxy", "space", "cosmic", "starlit"],
    rgb: [68, 88, 200],
    gradientStops: ["indigo-700", "blue-700", "slate-800"],
  },
  {
    label: "Forest Trail",
    keywords: ["forest", "nature", "moss", "evergreen", "trail", "earth"],
    rgb: [46, 148, 96],
    gradientStops: ["emerald-500", "green-500", "lime-400"],
  },
  {
    label: "Frost Drift",
    keywords: ["ice", "frost", "glacier", "snow", "frozen", "arctic", "frosted"],
    rgb: [160, 215, 255],
    gradientStops: ["sky-300", "cyan-300", "blue-400"],
  },
  {
    label: "Solar Flare",
    keywords: ["solar", "flare", "blaze", "meteor", "radiant", "flare"],
    rgb: [252, 162, 48],
    gradientStops: ["amber-400", "orange-500", "rose-500"],
  },
  {
    label: "Crimson Pulse",
    keywords: ["crimson", "scarlet", "red", "ruby", "ember", "lava"],
    rgb: [226, 66, 66],
    gradientStops: ["rose-500", "red-500", "orange-400"],
  },
  {
    label: "Cyber Neon",
    keywords: ["cyber", "future", "neon", "hologram", "cyberpunk", "digital"],
    rgb: [90, 110, 255],
    gradientStops: ["violet-500", "fuchsia-500", "cyan-400"],
  },
  {
    label: "Desert Mirage",
    keywords: ["desert", "sand", "mirage", "canyon", "sahara", "dune"],
    rgb: [236, 168, 92],
    gradientStops: ["amber-400", "orange-400", "yellow-300"],
  },
];

const DEFAULT_COLOR_PROFILE: ColorProfile = {
  label: "Electric Violet",
  keywords: ["default"],
  rgb: [125, 70, 255],
  gradientStops: ["fuchsia-500", "purple-500", "indigo-500"],
};

const VIBE_PROFILES: VibeProfile[] = [
  { label: "Calm glow", keywords: ["calm", "serene", "relax", "chill", "soothing", "gentle", "ambient"], intensity: 60 },
  { label: "Midnight cruise", keywords: ["night", "midnight", "storm", "shadow", "eclipse", "stealth"], intensity: 70 },
  { label: "Hype energy", keywords: ["hype", "party", "rave", "intense", "energetic", "neon", "pulse"], intensity: 94 },
  { label: "Adventure run", keywords: ["trail", "forest", "mountain", "ride", "journey", "adventure"], intensity: 82 },
  { label: "City sprint", keywords: ["city", "urban", "street", "cyber", "future", "tech", "metro"], intensity: 88 },
];

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "with",
  "into",
  "into",
  "for",
  "your",
  "my",
  "our",
  "ride",
  "light",
  "lights",
]);

const clampChannel = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

const getPaletteForPrompt = (prompt: string) => {
  const matches = COLOR_PROFILES.filter((profile) =>
    profile.keywords.some((keyword) => prompt.includes(keyword)),
  );

  const palette = matches.length > 0 ? matches.slice(0, 3) : [DEFAULT_COLOR_PROFILE];
  const color = palette.reduce<[
    number,
    number,
    number,
  ]>((accumulator, profile) => {
    return [
      accumulator[0] + profile.rgb[0],
      accumulator[1] + profile.rgb[1],
      accumulator[2] + profile.rgb[2],
    ];
  }, [0, 0, 0]).map((value) => value / palette.length) as [number, number, number];

  const gradientStops = [
    palette[0].gradientStops[0],
    (palette[1] ?? palette[0]).gradientStops[1],
    (palette[2] ?? palette[1] ?? palette[0]).gradientStops[2],
  ];

  const gradient = `from-${gradientStops[0]} via-${gradientStops[1]} to-${gradientStops[2]}`;

  return {
    palette,
    gradient,
    color: [
      clampChannel(color[0]),
      clampChannel(color[1]),
      clampChannel(color[2]),
    ] as [number, number, number],
  };
};

const adjustColorForMood = (color: [number, number, number], prompt: string) => {
  let [red, green, blue] = color;

  if (/(pastel|soft|dream|mist|glow|haze)/.test(prompt)) {
    red = clampChannel(red + (255 - red) * 0.2);
    green = clampChannel(green + (255 - green) * 0.2);
    blue = clampChannel(blue + (255 - blue) * 0.2);
  }

  if (/(night|shadow|storm|midnight|stealth|deep)/.test(prompt)) {
    red = clampChannel(red * 0.75);
    green = clampChannel(green * 0.75);
    blue = clampChannel(blue * 0.75);
  }

  if (/(neon|electric|cyber|hyper|intense)/.test(prompt)) {
    red = clampChannel(red * 1.08);
    green = clampChannel(green * 1.08);
    blue = clampChannel(blue * 1.08);
  }

  return [red, green, blue] as [number, number, number];
};

const resolveVibe = (prompt: string) => {
  for (const profile of VIBE_PROFILES) {
    if (profile.keywords.some((keyword) => prompt.includes(keyword))) {
      return profile;
    }
  }

  return { label: "Dynamic ride", keywords: [], intensity: 80 } satisfies VibeProfile;
};

const buildAnimationName = (prompt: string, paletteLabels: string[], vibeLabel: string) => {
  const cleanWords = prompt
    .replace(/[^a-z0-9\s]/gi, " ")
    .split(/\s+/)
    .map((word) => word.trim().toLowerCase())
    .filter((word) => word.length > 0 && !STOP_WORDS.has(word));

  const primaryWords = cleanWords.slice(0, 2).map(capitalize);

  let baseName = primaryWords.join(" ");

  if (!baseName) {
    baseName = paletteLabels[0] ?? "AI";
  }

  const suffix =
    /(storm|burst|pulse|rush|surge)/.test(prompt)
      ? "Surge"
      : /(breeze|drift|calm|float|glide)/.test(prompt)
        ? "Drift"
        : vibeLabel.includes("Calm")
          ? "Glow"
          : "Pulse";

  return `${baseName} ${suffix}`.trim();
};

export interface AiGeneratedAnimationIdea {
  animation: StoreAnimation;
  settings: LightSettings;
  prompt: string;
  palette: string[];
  vibe: string;
  keywords: string[];
}

const sleep = (duration: number) => new Promise((resolve) => setTimeout(resolve, duration));

export const runPromptThroughSLM = async (
  prompt: string,
): Promise<AiGeneratedAnimationIdea> => {
  const trimmedPrompt = prompt.trim();

  if (trimmedPrompt.length === 0) {
    throw new Error("Enter a prompt to describe your animation.");
  }

  await sleep(450 + Math.random() * 400);

  const normalizedPrompt = trimmedPrompt.toLowerCase();
  const { palette, gradient, color } = getPaletteForPrompt(normalizedPrompt);
  const vibeProfile = resolveVibe(normalizedPrompt);
  let [red, green, blue] = adjustColorForMood(color, normalizedPrompt);

  if (/(sunset|dawn|golden)/.test(normalizedPrompt)) {
    red = clampChannel(red + 12);
    green = clampChannel(green + 6);
  }

  if (/(forest|nature|trail)/.test(normalizedPrompt)) {
    green = clampChannel(green + 16);
  }

  const paletteLabels = palette.map((profile) => profile.label);
  const animationName = buildAnimationName(trimmedPrompt, paletteLabels, vibeProfile.label);

  const interestingWords = Array.from(
    new Set(
      trimmedPrompt
        .replace(/[^a-z0-9\s]/gi, " ")
        .split(/\s+/)
        .map((word) => word.trim().toLowerCase())
        .filter((word) => word.length > 0 && !STOP_WORDS.has(word))
        .slice(0, 6),
    ),
  );

  const keywords = Array.from(new Set([...paletteLabels.map((label) => label.split(" ")[0].toLowerCase()), ...interestingWords]));

  const intensityAdjustment = Math.min(8, palette.length * 2.5);
  const baseIntensity = vibeProfile.intensity + intensityAdjustment;
  const finalIntensity = clampChannel(
    /(calm|ambient|soft)/.test(normalizedPrompt)
      ? baseIntensity - 10
      : /(storm|rave|hyper|neon|electric)/.test(normalizedPrompt)
        ? baseIntensity + 6
        : baseIntensity,
  );

  const animation: StoreAnimation = {
    id: `ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: animationName,
    description: `${vibeProfile.label} with ${paletteLabels.join(", ").toLowerCase()} hues inspired by \"${trimmedPrompt}\".`,
    gradient,
  };

  const settings: LightSettings = {
    red,
    green,
    blue,
    intensity: Math.max(35, Math.min(100, finalIntensity)),
  };

  return {
    animation,
    settings,
    prompt: trimmedPrompt,
    palette: paletteLabels,
    vibe: vibeProfile.label,
    keywords,
  };
};

