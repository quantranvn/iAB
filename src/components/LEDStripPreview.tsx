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

const TOTAL_LEDS = LED_GROUPS.reduce((total, group) => total + group.count, 0);

type CSSVarProperties = CSSProperties & Record<`--${string}`, string | number>;

interface ScenarioAnimationConfig {
  ledClassName: string;
  delayIncrement: number;
  duration: number;
  styleForIndex?: (position: number) => CSSVarProperties;
}

const RAINBOW_PALETTE = ["#ff4d6d", "#ffb347", "#fff166", "#4bd4ff", "#6c63ff", "#ff8ce6"] as const;
const AURORA_PALETTE = ["#2dd4bf", "#22c55e", "#a855f7", "#0ea5e9"] as const;

function buildGradient(colors: readonly string[]) {
  if (colors.length === 0) {
    return "";
  }

  const stopSize = colors.length > 1 ? 100 / (colors.length - 1) : 100;
  return colors
    .map((color, index) => `${color} ${Math.round(index * stopSize * 100) / 100}%`)
    .join(", ");
}

function lightenChannel(value: number, amount: number) {
  return Math.min(255, Math.round(value + (255 - value) * amount));
}

export function LEDStripPreview({ settings, scenarioName }: LEDStripPreviewProps) {
  const { red, green, blue, intensity } = settings;
  const alpha = Math.max(intensity / 100, 0.25);
  const baseColor = `rgb(${red}, ${green}, ${blue})`;
  const highlightColor = `rgb(${lightenChannel(red, 0.45)}, ${lightenChannel(green, 0.45)}, ${lightenChannel(blue, 0.45)})`;
  const glowColor = `rgba(${red}, ${green}, ${blue}, ${Math.min(alpha + 0.2, 1)})`;
  const animationDuration = 2.4 - alpha;
  const normalizedScenario = scenarioName.trim().toLowerCase();

  const baseLedStyle = useMemo<CSSVarProperties>(() => {
    const restingOpacity = Math.max(0.65, alpha);
    const peakOpacity = Math.min(1, restingOpacity + 0.25);
    return {
      background: `radial-gradient(circle at 30% 30%, ${highlightColor} 0%, ${baseColor} 60%, rgba(0, 0, 0, 0.35) 100%)`,
      boxShadow: `0 0 18px ${glowColor}`,
      filter: `brightness(${0.85 + alpha * 0.6})`,
      "--led-opacity-rest": restingOpacity,
      "--led-opacity-mid": Math.min(1, (restingOpacity + peakOpacity) / 2),
      "--led-opacity-peak": peakOpacity,
    };
  }, [alpha, baseColor, glowColor, highlightColor]);

  const scenarioConfig = useMemo<ScenarioAnimationConfig>(() => {
    const defaultConfig: ScenarioAnimationConfig = {
      ledClassName: "animate-led-dim",
      delayIncrement: 0.14,
      duration: Math.max(1.6, animationDuration),
    };

    if (normalizedScenario.includes("chase")) {
      return {
        ledClassName: "animate-led-starlight-chase",
        delayIncrement: 0.1,
        duration: 2.4,
        styleForIndex: (position) => {
          const brightness = 1.05 + ((position + 2) % 4) * 0.18;
          const blur = 16 + ((position + 1) % 4) * 6;
          const restingOpacity = 0.72 + ((position + 2) % 4) * 0.06;
          return {
            background: `radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.95) 0%, ${highlightColor} 34%, ${baseColor} 68%, rgba(12, 16, 40, 0.75) 100%)`,
            boxShadow: `0 0 ${blur}px rgba(255, 255, 255, 0.75)`,
            filter: `brightness(${brightness})`,
            "--led-opacity-rest": Math.min(1, restingOpacity),
            "--led-opacity-mid": Math.min(1, restingOpacity + 0.12),
            "--led-opacity-peak": Math.min(1, restingOpacity + 0.22),
          };
        },
      };
    }

    if (normalizedScenario.includes("aurora")) {
      return {
        ledClassName: "animate-led-aurora",
        delayIncrement: 0.16,
        duration: 4,
        styleForIndex: (position) => {
          const offset = position % AURORA_PALETTE.length;
          const colors = AURORA_PALETTE.map(
            (_, index) => AURORA_PALETTE[(offset + index) % AURORA_PALETTE.length],
          );
          const gradient = buildGradient(colors);
          const shift = Math.sin((position / TOTAL_LEDS) * Math.PI);
          const restingOpacity = Math.max(0.7, alpha + 0.1 + Math.abs(shift) * 0.05);
          return {
            background: `linear-gradient(120deg, ${gradient})`,
            backgroundSize: "220% 220%",
            boxShadow: `0 0 ${22 + Math.abs(shift) * 10}px rgba(125, 255, 206, 0.65)`,
            filter: `brightness(${1.05 + alpha * 0.35}) saturate(${1.05 + Math.abs(shift) * 0.12})`,
            "--led-opacity-rest": Math.min(1, restingOpacity),
            "--led-opacity-mid": Math.min(1, restingOpacity + 0.1),
            "--led-opacity-peak": Math.min(1, restingOpacity + 0.22),
          };
        },
      };
    }

    if (normalizedScenario.includes("rainbow")) {
      return {
        ledClassName: "animate-led-rainbow-flow",
        delayIncrement: 0.08,
        duration: 2.8,
        styleForIndex: (position) => {
          const offset = position % RAINBOW_PALETTE.length;
          const colors = RAINBOW_PALETTE.map(
            (_, index) => RAINBOW_PALETTE[(offset + index) % RAINBOW_PALETTE.length],
          );
          const restingOpacity = Math.max(0.75, alpha + 0.2);
          return {
            background: `linear-gradient(135deg, ${buildGradient(colors)})`,
            backgroundSize: "200% 200%",
            boxShadow: `0 0 20px rgba(255, 255, 255, 0.6)`,
            filter: `brightness(${1.05 + alpha * 0.45}) saturate(1.12)`,
            "--led-opacity-rest": restingOpacity,
            "--led-opacity-mid": Math.min(1, restingOpacity + 0.12),
            "--led-opacity-peak": Math.min(1, restingOpacity + 0.24),
          };
        },
      };
    }

    if (normalizedScenario.includes("lightning") || normalizedScenario.includes("pulse")) {
      return {
        ledClassName: "animate-led-lightning",
        delayIncrement: 0.05,
        duration: 1.15,
        styleForIndex: (position) => {
          const flashBoost = 1.25 + ((position + 1) % 3) * 0.22;
          const blur = 18 + ((position + 2) % 4) * 6;
          const restingOpacity = 0.78 + ((position + 1) % 3) * 0.04;
          return {
            background: `radial-gradient(circle at 50% 40%, rgba(255, 255, 255, 0.96) 0%, ${highlightColor} 38%, ${baseColor} 70%, rgba(0, 0, 0, 0.75) 100%)`,
            boxShadow: `0 0 ${blur}px rgba(255, 255, 255, 0.8)`,
            filter: `brightness(${flashBoost})`,
            "--led-opacity-rest": Math.min(1, restingOpacity),
            "--led-opacity-mid": Math.min(1, restingOpacity + 0.14),
            "--led-opacity-peak": Math.min(1, restingOpacity + 0.26),
          };
        },
      };
    }

    if (normalizedScenario.includes("ocean") || normalizedScenario.includes("wave")) {
      return {
        ledClassName: "animate-led-wave",
        delayIncrement: 0.12,
        duration: 3.1,
        styleForIndex: (position) => {
          const progress = position / Math.max(1, TOTAL_LEDS - 1);
          const wave = Math.sin(progress * Math.PI * 2);
          const restingOpacity = Math.max(0.6, alpha - 0.05 + Math.abs(wave) * 0.12);
          const style: CSSVarProperties = {
            background: `radial-gradient(circle at 50% ${40 + wave * 20}%, ${highlightColor} 0%, ${baseColor} 55%, rgba(0, 40, 80, 0.55) 100%)`,
            boxShadow: `0 0 18px rgba(32, 150, 255, 0.45)`,
            filter: `brightness(${0.9 + (wave + 1) * 0.2}) saturate(${1 + wave * 0.1})`,
            "--led-opacity-rest": restingOpacity,
            "--led-opacity-mid": Math.min(1, restingOpacity + 0.14),
            "--led-opacity-peak": Math.min(1, restingOpacity + 0.26),
          };
          return style;
        },
      };
    }

    if (normalizedScenario.includes("starlight")) {
      return {
        ledClassName: "animate-led-starlight",
        delayIncrement: 0.18,
        duration: 3.6,
        styleForIndex: (position) => {
          const shimmer = ((position + 1) % 5) / 5;
          const sparkle = 1 + shimmer * 0.7;
          const restingOpacity = Math.min(1, 0.7 + shimmer * 0.18);
          return {
            background: `radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.96) 0%, ${highlightColor} 36%, ${baseColor} 72%, rgba(8, 12, 40, 0.75) 100%)`,
            boxShadow: `0 0 ${18 + shimmer * 18}px rgba(255, 255, 255, 0.78)`,
            filter: `brightness(${sparkle})`,
            "--led-opacity-rest": restingOpacity,
            "--led-opacity-mid": Math.min(1, restingOpacity + 0.12),
            "--led-opacity-peak": Math.min(1, restingOpacity + 0.24),
          };
        },
      };
    }

    return defaultConfig;
  }, [alpha, animationDuration, baseColor, glowColor, highlightColor, normalizedScenario]);

  const getNumericValue = (value: string | number | undefined): number | null => {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }

    if (typeof value === "string") {
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  };

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
                const delay = ledIndex * scenarioConfig.delayIncrement;
                ledIndex ++;
                const styleOverrides =
                  scenarioConfig.styleForIndex?.(ledIndex - 1) ?? ({} as CSSVarProperties);
                const ledStyle: CSSVarProperties = {
                  ...baseLedStyle,
                  ...styleOverrides,
                };

                const restOpacity =
                  getNumericValue(ledStyle["--led-opacity-rest"]) ?? Math.max(0.6, alpha);
                const peakOpacity = Math.min(
                  1,
                  getNumericValue(ledStyle["--led-opacity-peak"]) ?? restOpacity + 0.22,
                );
                const midOpacity = Math.min(
                  1,
                  getNumericValue(ledStyle["--led-opacity-mid"]) ?? (restOpacity + peakOpacity) / 2,
                );

                ledStyle["--led-opacity-rest"] = restOpacity;
                ledStyle["--led-opacity-peak"] = peakOpacity;
                ledStyle["--led-opacity-mid"] = midOpacity;
                ledStyle.opacity = restOpacity;
                ledStyle.animationDelay = `${delay}s`;
                ledStyle.animationDuration = `${scenarioConfig.duration}s`;
                ledStyle["--led-animation-duration"] = `${scenarioConfig.duration}s`;
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
