import { useMemo } from "react";
import type { CSSProperties } from "react";

import type { LightSettings } from "../types/userProfile";

interface LEDStripPreviewProps {
  settings: LightSettings;
  scenarioName: string;
}

const LED_GROUPS = [
  { id: "left", count: 5, label: "Left" },
  { id: "center", count: 6, label: "Center" },
  { id: "right", count: 5, label: "Right" },
] as const;

const GROUP_OFFSETS = (() => {
  const offsets = new Map<(typeof LED_GROUPS)[number]["id"], number>();
  let runningTotal = 0;
  for (const group of LED_GROUPS) {
    offsets.set(group.id, runningTotal);
    runningTotal += group.count;
  }
  return offsets;
})();

const GROUP_INDEX_MAP = (() => {
  const indices = new Map<(typeof LED_GROUPS)[number]["id"], number>();
  LED_GROUPS.forEach((group, index) => indices.set(group.id, index));
  return indices;
})();

type CSSVarProperties = CSSProperties & Record<`--${string}`, string | number>;

interface ScenarioLedContext {
  globalIndex: number;
  groupId: (typeof LED_GROUPS)[number]["id"];
  groupSize: number;
  indexInGroup: number;
  total: number;
}

type ScenarioLedStyleGenerator = (
  context: ScenarioLedContext,
) => Partial<CSSVarProperties> | undefined;

type ScenarioDelayStrategy = (context: ScenarioLedContext) => number;

interface ScenarioAnimationConfig {
  ledClassName: string;
  delayIncrement: number;
  duration: number;
  styleOverrides?: Partial<CSSVarProperties>;
  perLedStyle?: ScenarioLedStyleGenerator;
  delayStrategy?: ScenarioDelayStrategy;
}

const pseudoRandom = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

export function LEDStripPreview({ settings, scenarioName }: LEDStripPreviewProps) {
  const { red, green, blue, intensity } = settings;
  const alpha = Math.max(intensity / 100, 0.25);
  const baseColor = `rgb(${red}, ${green}, ${blue})`;
  const glowColor = `rgba(${red}, ${green}, ${blue}, ${Math.min(alpha + 0.2, 1)})`;
  const clampChannel = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
  const lightenColor = (amount: number) =>
    `rgb(${clampChannel(red + (255 - red) * amount)}, ${clampChannel(green + (255 - green) * amount)}, ${clampChannel(
      blue + (255 - blue) * amount,
    )})`;
  const darkenColor = (amount: number) =>
    `rgb(${clampChannel(red * (1 - amount))}, ${clampChannel(green * (1 - amount))}, ${clampChannel(
      blue * (1 - amount),
    )})`;
  const accentColor = lightenColor(0.18);
  const highlightColor = lightenColor(0.32);
  const softGlowColor = lightenColor(0.08);
  const shadowColor = darkenColor(0.28);
  const animationDuration = 2.4 - alpha;
  const normalizedScenario = scenarioName.trim().toLowerCase();

  const animationMetrics = useMemo(
    () => {
      const offOpacity = Math.max(0.12, 0.22 - alpha * 0.08);
      const dimOpacity = Math.max(0.35, alpha * 0.5);
      const midOpacity = Math.min(0.85, 0.5 + alpha * 0.3);
      const peakOpacity = Math.min(1, 0.72 + alpha * 0.4);
      const glowStrength = 12 + alpha * 18;
      const baseBrightness = 0.85 + alpha * 0.3;
      const peakBrightness = Math.min(1.55, baseBrightness + 0.28);
      const dimBrightness = Math.max(0.45, baseBrightness - 0.25);
      const offBrightness = Math.max(0.35, baseBrightness - 0.38);
      const baseSaturation = 1 + alpha * 0.12;
      const peakSaturation = Math.min(1.6, baseSaturation + 0.35);
      const dimSaturation = Math.max(0.75, baseSaturation - 0.22);
      const offSaturation = Math.max(0.6, baseSaturation - 0.35);

      return {
        offOpacity,
        dimOpacity,
        midOpacity,
        peakOpacity,
        glowStrength,
        baseBrightness,
        peakBrightness,
        dimBrightness,
        offBrightness,
        baseSaturation,
        peakSaturation,
        dimSaturation,
        offSaturation,
      };
    },
    [alpha],
  );

  const baseLedStyle = useMemo<CSSVarProperties>(() => {
    const {
      offOpacity,
      dimOpacity,
      midOpacity,
      peakOpacity,
      glowStrength,
      baseBrightness,
      peakBrightness,
      dimBrightness,
      offBrightness,
      baseSaturation,
      peakSaturation,
      dimSaturation,
      offSaturation,
    } = animationMetrics;

    return {
      backgroundColor: `var(--led-color-primary, ${baseColor})`,
      boxShadow: `0 0 var(--led-glow-strength, ${glowStrength}px) var(--led-glow-color, ${glowColor})`,
      filter: `brightness(${baseBrightness.toFixed(2)}) saturate(${baseSaturation.toFixed(2)})`,
      opacity: peakOpacity,
      "--led-color-primary": baseColor,
      "--led-color-secondary": accentColor,
      "--led-color-tertiary": highlightColor,
      "--led-color-accent": softGlowColor,
      "--led-off-opacity": offOpacity,
      "--led-dim-opacity": dimOpacity,
      "--led-mid-opacity": midOpacity,
      "--led-peak-opacity": peakOpacity,
      "--led-off-scale": 0.84,
      "--led-dim-scale": 0.94,
      "--led-mid-scale": 1.02,
      "--led-peak-scale": 1.1,
      "--led-glow-color": glowColor,
      "--led-glow-strength": `${glowStrength}px`,
      "--led-off-brightness": offBrightness.toFixed(2),
      "--led-dim-brightness": dimBrightness.toFixed(2),
      "--led-base-brightness": baseBrightness.toFixed(2),
      "--led-peak-brightness": peakBrightness.toFixed(2),
      "--led-off-saturation": offSaturation.toFixed(2),
      "--led-dim-saturation": dimSaturation.toFixed(2),
      "--led-base-saturation": baseSaturation.toFixed(2),
      "--led-peak-saturation": peakSaturation.toFixed(2),
    };
  }, [
    accentColor,
    animationMetrics,
    baseColor,
    glowColor,
    highlightColor,
    softGlowColor,
  ]);

  const scenarioConfig = useMemo<ScenarioAnimationConfig>(() => {
    const {
      offOpacity,
      dimOpacity,
      midOpacity,
      peakOpacity,
      glowStrength,
      baseBrightness,
      peakBrightness,
      dimBrightness,
      offBrightness,
      baseSaturation,
      peakSaturation,
      dimSaturation,
      offSaturation,
    } = animationMetrics;

    const defaultConfig: ScenarioAnimationConfig = {
      ledClassName: "animate-led-dim",
      delayIncrement: 0.14,
      duration: Math.max(1.6, animationDuration),
      styleOverrides: {
        "--led-off-opacity": offOpacity,
        "--led-dim-opacity": dimOpacity,
        "--led-mid-opacity": midOpacity,
        "--led-peak-opacity": peakOpacity,
        "--led-glow-strength": `${glowStrength}px`,
        "--led-off-brightness": offBrightness.toFixed(2),
        "--led-dim-brightness": dimBrightness.toFixed(2),
        "--led-base-brightness": baseBrightness.toFixed(2),
        "--led-peak-brightness": peakBrightness.toFixed(2),
        "--led-off-saturation": offSaturation.toFixed(2),
        "--led-dim-saturation": dimSaturation.toFixed(2),
        "--led-base-saturation": baseSaturation.toFixed(2),
        "--led-peak-saturation": peakSaturation.toFixed(2),
      },
      delayStrategy: ({ globalIndex }) => globalIndex,
    };

    const createConfig = (config: Partial<ScenarioAnimationConfig>) => ({
      ...defaultConfig,
      ...config,
      styleOverrides: {
        ...defaultConfig.styleOverrides,
        ...(config.styleOverrides ?? {}),
      },
    });

    if (normalizedScenario.includes("follow")) {
      return createConfig({
        ledClassName: "animate-led-follow",
        delayIncrement: 0.12,
        duration: 2.6,
        styleOverrides: {
          "--led-color-secondary": highlightColor,
          "--led-color-tertiary": accentColor,
          "--led-color-accent": lightenColor(0.42),
          "--led-off-opacity": Math.max(0.14, offOpacity - 0.03),
          "--led-mid-opacity": Math.min(0.92, midOpacity + 0.1),
          "--led-peak-opacity": Math.min(1, peakOpacity + 0.08),
          "--led-peak-scale": 1.2,
          "--led-mid-scale": 1.06,
          "--led-dim-scale": 0.9,
          "--led-glow-strength": `${(glowStrength + 6).toFixed(2)}px`,
          "--led-peak-brightness": Math.min(1.7, peakBrightness + 0.15).toFixed(2),
          "--led-peak-saturation": Math.min(1.7, peakSaturation + 0.2).toFixed(2),
        },
        perLedStyle: ({ globalIndex, total }) => {
          if (total <= 1) {
            return {};
          }
          const normalized = globalIndex / (total - 1);
          return {
            "--led-follow-strength": (0.9 + normalized * 0.2).toFixed(2),
          };
        },
      });
    }

    if (normalizedScenario.includes("chase")) {
      return createConfig({
        ledClassName: "animate-led-starlight-chase",
        delayIncrement: 0.1,
        duration: 2.4,
        styleOverrides: {
          "--led-color-secondary": highlightColor,
          "--led-color-tertiary": accentColor,
          "--led-color-accent": shadowColor,
          "--led-off-scale": 0.82,
          "--led-dim-scale": 0.9,
          "--led-mid-scale": 1.05,
          "--led-peak-scale": 1.24,
          "--led-off-opacity": Math.max(0.12, offOpacity * 0.85),
          "--led-dim-opacity": Math.max(0.32, dimOpacity * 0.88),
          "--led-peak-opacity": Math.min(1, peakOpacity + 0.1),
          "--led-glow-strength": `${(glowStrength + 8).toFixed(2)}px`,
          "--led-peak-brightness": Math.min(1.65, peakBrightness + 0.2).toFixed(2),
          "--led-dim-brightness": Math.max(0.4, dimBrightness - 0.05).toFixed(2),
        },
        perLedStyle: ({ globalIndex, total }) => {
          if (total <= 1) {
            return {};
          }
          const normalized = globalIndex / (total - 1);
          return {
            "--led-chase-brightness": (1 + normalized * 0.4).toFixed(2),
            "--led-chase-glow": (0.6 + normalized * 0.4).toFixed(2),
          };
        },
      });
    }

    if (normalizedScenario.includes("aurora")) {
      return createConfig({
        ledClassName: "animate-led-aurora",
        delayIncrement: 0.16,
        duration: 3.4,
        styleOverrides: {
          "--led-color-secondary": accentColor,
          "--led-color-tertiary": highlightColor,
          "--led-color-accent": lightenColor(0.42),
          "--led-mid-scale": 1.07,
          "--led-peak-scale": 1.16,
          "--led-dim-scale": 0.92,
          "--led-mid-opacity": Math.min(0.92, midOpacity + 0.08),
          "--led-glow-strength": `${(glowStrength + 10).toFixed(2)}px`,
          "--led-peak-brightness": Math.min(1.6, peakBrightness + 0.18).toFixed(2),
          "--led-dim-brightness": Math.max(0.5, dimBrightness + 0.05).toFixed(2),
          "--led-aurora-drift": 0,
        },
        delayStrategy: ({ globalIndex, total }) => {
          if (total <= 1) {
            return 0;
          }
          const center = (total - 1) / 2;
          return Math.abs(globalIndex - center);
        },
      });
    }

    if (normalizedScenario.includes("rainbow")) {
      return createConfig({
        ledClassName: "animate-led-rainbow-flow",
        delayIncrement: 0.08,
        duration: 2.8,
        styleOverrides: {
          "--led-peak-scale": 1.18,
          "--led-mid-scale": 1.06,
          "--led-dim-scale": 0.92,
          "--led-glow-strength": `${(glowStrength + 12).toFixed(2)}px`,
          "--led-base-saturation": Math.min(1.6, baseSaturation + 0.15).toFixed(2),
          "--led-peak-saturation": Math.min(1.75, peakSaturation + 0.25).toFixed(2),
          "--led-peak-brightness": Math.min(1.65, peakBrightness + 0.22).toFixed(2),
          "--led-rainbow-mid-brightness": Math.min(
            1.45,
            peakBrightness + 0.12,
          ).toFixed(2),
        },
        delayStrategy: ({ groupId, groupSize, indexInGroup }) => {
          const baseOffset = GROUP_OFFSETS.get(groupId) ?? 0;
          const groupIndex = GROUP_INDEX_MAP.get(groupId) ?? 0;
          const direction = groupIndex % 2 === 0 ? 1 : -1;
          const withinGroup =
            direction > 0 ? indexInGroup : groupSize - 1 - indexInGroup;
          return baseOffset + withinGroup;
        },
        perLedStyle: ({ globalIndex, total }) => {
          if (total <= 0) {
            return {};
          }
          const normalized = total === 1 ? 0 : globalIndex / (total - 1);
          const hue = (normalized * 360) % 360;
          const primary = `hsl(${hue}deg, 92%, 56%)`;
          const secondary = `hsl(${(hue + 40) % 360}deg, 95%, 63%)`;
          const tertiary = `hsl(${(hue + 80) % 360}deg, 90%, 60%)`;
          const accent = `hsl(${(hue + 20) % 360}deg, 96%, 70%)`;
          const glow = `hsla(${hue}deg, 92%, 60%, 0.9)`;
          return {
            backgroundColor: primary,
            "--led-color-primary": primary,
            "--led-color-secondary": secondary,
            "--led-color-tertiary": tertiary,
            "--led-color-accent": accent,
            "--led-glow-color": glow,
            "--led-rainbow-brightness": (0.9 + normalized * 0.35).toFixed(2),
          };
        },
      });
    }

    if (normalizedScenario.includes("lightning") || normalizedScenario.includes("pulse")) {
      return createConfig({
        ledClassName: "animate-led-lightning",
        delayIncrement: 0.06,
        duration: 1.8,
        styleOverrides: {
          "--led-color-secondary": highlightColor,
          "--led-color-tertiary": accentColor,
          "--led-color-accent": lightenColor(0.45),
          "--led-off-opacity": Math.max(0.08, offOpacity * 0.6),
          "--led-dim-opacity": Math.max(0.4, dimOpacity),
          "--led-peak-opacity": 1,
          "--led-off-scale": 0.78,
          "--led-dim-scale": 0.92,
          "--led-peak-scale": 1.32,
          "--led-glow-strength": `${(glowStrength + 16).toFixed(2)}px`,
          "--led-peak-brightness": Math.min(1.8, peakBrightness + 0.35).toFixed(2),
          "--led-peak-saturation": Math.min(1.85, peakSaturation + 0.4).toFixed(2),
          "--led-off-brightness": Math.max(0.4, offBrightness - 0.05).toFixed(2),
          "--led-off-saturation": Math.max(0.6, offSaturation - 0.05).toFixed(2),
        },
        delayStrategy: ({ globalIndex, total }) =>
          pseudoRandom(globalIndex + 1) * Math.max(total, 1),
      });
    }

    if (normalizedScenario.includes("ocean") || normalizedScenario.includes("wave")) {
      return createConfig({
        ledClassName: "animate-led-wave",
        delayIncrement: 0.14,
        duration: 3.4,
        styleOverrides: {
          "--led-color-secondary": accentColor,
          "--led-color-tertiary": softGlowColor,
          "--led-color-accent": highlightColor,
          "--led-off-opacity": Math.max(0.12, offOpacity * 0.85),
          "--led-dim-opacity": Math.max(0.38, dimOpacity * 0.95),
          "--led-mid-opacity": Math.min(0.88, midOpacity + 0.05),
          "--led-peak-opacity": Math.min(1, peakOpacity + 0.06),
          "--led-peak-scale": 1.16,
          "--led-mid-scale": 1.04,
          "--led-dim-scale": 0.9,
          "--led-off-scale": 0.82,
          "--led-glow-strength": `${(glowStrength + 5).toFixed(2)}px`,
          "--led-off-brightness": Math.max(0.42, offBrightness * 0.9).toFixed(2),
          "--led-dim-brightness": Math.max(0.5, dimBrightness).toFixed(2),
          "--led-peak-brightness": Math.min(1.6, peakBrightness + 0.15).toFixed(2),
          "--led-off-saturation": Math.max(0.65, offSaturation * 0.92).toFixed(2),
        },
        delayStrategy: ({ groupId, groupSize, indexInGroup }) => {
          const baseOffset = GROUP_OFFSETS.get(groupId) ?? 0;
          const center = (groupSize - 1) / 2;
          const distance = Math.abs(indexInGroup - center);
          return baseOffset + distance;
        },
        perLedStyle: ({ indexInGroup, groupSize }) => {
          const offset = indexInGroup - (groupSize - 1) / 2;
          return {
            "--led-wave-offset": offset.toFixed(2),
            "--led-wave-depth": "0px",
          };
        },
      });
    }

    if (normalizedScenario.includes("starlight")) {
      return createConfig({
        ledClassName: "animate-led-starlight",
        delayIncrement: 0.18,
        duration: 3.6,
        styleOverrides: {
          "--led-color-secondary": highlightColor,
          "--led-color-tertiary": accentColor,
          "--led-color-accent": softGlowColor,
          "--led-off-opacity": Math.max(0.16, offOpacity + 0.02),
          "--led-dim-opacity": Math.max(0.42, dimOpacity + 0.05),
          "--led-peak-opacity": Math.min(1, peakOpacity + 0.08),
          "--led-peak-scale": 1.18,
          "--led-dim-scale": 0.92,
          "--led-glow-strength": `${(glowStrength + 6).toFixed(2)}px`,
          "--led-peak-brightness": Math.min(1.6, peakBrightness + 0.18).toFixed(2),
        },
        delayStrategy: ({ globalIndex, total }) =>
          pseudoRandom(globalIndex + 11) * Math.max(total, 1),
        perLedStyle: ({ globalIndex, total }) => {
          if (total <= 1) {
            return {};
          }
          const normalized = globalIndex / (total - 1);
          const twinkle = 0.85 + Math.sin(normalized * Math.PI * 2) * 0.15;
          return {
            "--led-twinkle-strength": twinkle.toFixed(2),
          };
        },
      });
    }

    return defaultConfig;
  }, [
    accentColor,
    animationDuration,
    animationMetrics,
    baseColor,
    highlightColor,
    normalizedScenario,
    shadowColor,
    softGlowColor,
  ]);

  const totalLedCount = LED_GROUPS.reduce((count, group) => count + group.count, 0);
  let ledIndex = 0;

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between text-[0.625rem] uppercase tracking-[0.45em] text-muted-foreground">
        {LED_GROUPS.map((group) => (
          <span key={group.id}>{group.label}</span>
        ))}
      </div>
      <div
        className="relative w-full overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-b from-background/40 via-background/10 to-background/50 px-8 py-6 shadow-inner"
        role="img"
        aria-label={`${scenarioName} animation preview`}
      >
        <div className="relative z-6 flex flex-wrap items-center justify-center gap-4">
          {LED_GROUPS.map((group) => (
            <div key={group.id} className="flex items-center gap-4">
              {Array.from({ length: group.count }).map((_, index) => {
                const currentIndex = ledIndex;
                const delayPosition =
                  scenarioConfig.delayStrategy?.({
                    globalIndex: currentIndex,
                    groupId: group.id,
                    groupSize: group.count,
                    indexInGroup: index,
                    total: totalLedCount,
                  }) ?? currentIndex;
                const delay = delayPosition * scenarioConfig.delayIncrement;
                ledIndex++;
                const normalizedPosition =
                  totalLedCount > 1 ? currentIndex / (totalLedCount - 1) : 0;
                const ledStyle: CSSVarProperties = {
                  ...baseLedStyle,
                };
                if (scenarioConfig.styleOverrides) {
                  Object.assign(ledStyle, scenarioConfig.styleOverrides);
                }
                ledStyle.animationDelay = `${delay}s`;
                ledStyle.animationDuration = `${scenarioConfig.duration}s`;
                ledStyle["--led-animation-duration"] = `${scenarioConfig.duration}s`;
                ledStyle["--led-position"] = normalizedPosition.toFixed(2);
                if (scenarioConfig.perLedStyle) {
                  Object.assign(
                    ledStyle,
                    scenarioConfig.perLedStyle({
                      globalIndex: currentIndex,
                      groupId: group.id,
                      groupSize: group.count,
                      indexInGroup: index,
                      total: totalLedCount,
                    }) ?? {},
                  );
                }
                return (
                  <span
                    key={`${group.id}-${index}`}
                    className="relative flex h-3 w-2 shrink-0 items-center justify-center rounded-full bg-black/60"
                    aria-hidden
                  >
                    <span
                      className={`h-6 w-6 rounded-full ${scenarioConfig.ledClassName}`}
                      style={ledStyle}
                    />
                  </span>
                );
              })}
            </div>
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background via-background/10 to-transparent" aria-hidden />
      </div>
      <p className="text-center text-sm text-muted-foreground">Demo animation preview</p>
    </div>
  );
}
