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

type CSSVarProperties = CSSProperties & Record<`--${string}`, string | number>;

interface ScenarioAnimationConfig {
  ledClassName: string;
  delayIncrement: number;
  duration: number;
  styleOverrides?: Partial<CSSVarProperties>;
}

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
  const deepShadowColor = darkenColor(0.45);
  const animationDuration = 2.4 - alpha;
  const normalizedScenario = scenarioName.trim().toLowerCase();

  const baseLedStyle = useMemo<CSSVarProperties>(() => {
    return {
      backgroundColor: baseColor,
      backgroundImage: `radial-gradient(circle at 50% 45%, ${softGlowColor}, ${baseColor} 55%, ${shadowColor})`,
      backgroundSize: "140% 140%",
      boxShadow: `0 0 18px ${glowColor}`,
      filter: `brightness(${0.9 + alpha * 0.45}) saturate(${1 + alpha * 0.18})`,
      opacity: Math.max(0.55, alpha * 0.95),
    };
  }, [alpha, baseColor, glowColor, shadowColor, softGlowColor]);

  const scenarioConfig = useMemo<ScenarioAnimationConfig>(() => {
    const defaultConfig: ScenarioAnimationConfig = {
      ledClassName: "animate-led-dim",
      delayIncrement: 0.14,
      duration: Math.max(1.6, animationDuration),
      styleOverrides: {},
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
          backgroundImage: `radial-gradient(circle at 45% 40%, ${highlightColor}, ${accentColor}, ${shadowColor})`,
          backgroundSize: "200% 200%",
          boxShadow: `0 0 26px ${highlightColor}`,
          filter: `brightness(${0.9 + alpha * 0.35}) saturate(${1 + alpha * 0.2})`,
        },
      });
    }

    if (normalizedScenario.includes("chase")) {
      return createConfig({
        ledClassName: "animate-led-starlight-chase",
        delayIncrement: 0.1,
        duration: 2.4,
        styleOverrides: {
          backgroundImage: `conic-gradient(from 160deg at 50% 50%, ${highlightColor}, ${accentColor}, ${baseColor}, ${shadowColor})`,
          backgroundSize: "220% 220%",
          boxShadow: `0 0 28px ${highlightColor}`,
        },
      });
    }

    if (normalizedScenario.includes("aurora")) {
      return createConfig({
        ledClassName: "animate-led-aurora",
        delayIncrement: 0.16,
        duration: 3.4,
        styleOverrides: {
          backgroundImage: `linear-gradient(135deg, ${accentColor}, rgba(120, 255, 214, 0.85), rgba(90, 150, 255, 0.8))`,
          backgroundSize: "260% 260%",
          boxShadow: `0 0 30px ${accentColor}`,
        },
      });
    }

    if (normalizedScenario.includes("rainbow")) {
      return createConfig({
        ledClassName: "animate-led-rainbow-flow",
        delayIncrement: 0.08,
        duration: 2.8,
        styleOverrides: {
          backgroundImage: `linear-gradient(120deg, ${highlightColor}, #ff6ec7, #7fd1ff, ${accentColor})`,
          backgroundSize: "280% 280%",
          boxShadow: `0 0 32px ${highlightColor}`,
        },
      });
    }

    if (normalizedScenario.includes("lightning") || normalizedScenario.includes("pulse")) {
      return createConfig({
        ledClassName: "animate-led-lightning",
        delayIncrement: 0.06,
        duration: 1.8,
        styleOverrides: {
          backgroundImage: `radial-gradient(circle at 50% 30%, ${highlightColor}, ${accentColor}, ${deepShadowColor})`,
          backgroundSize: "200% 200%",
          boxShadow: `0 0 34px ${highlightColor}`,
          filter: `brightness(${1.05 + alpha * 0.65}) saturate(${1.2 + alpha * 0.3})`,
        },
      });
    }

    if (normalizedScenario.includes("ocean") || normalizedScenario.includes("wave")) {
      return createConfig({
        ledClassName: "animate-led-wave",
        delayIncrement: 0.12,
        duration: 3.1,
        styleOverrides: {
          backgroundImage: `linear-gradient(160deg, ${shadowColor}, ${baseColor}, ${highlightColor})`,
          backgroundSize: "240% 240%",
        },
      });
    }

    if (normalizedScenario.includes("starlight")) {
      return createConfig({
        ledClassName: "animate-led-starlight",
        delayIncrement: 0.18,
        duration: 3.6,
        styleOverrides: {
          backgroundImage: `radial-gradient(circle at 20% 20%, ${highlightColor}, ${accentColor}, ${shadowColor})`,
          backgroundSize: "200% 200%",
          boxShadow: `0 0 30px ${highlightColor}`,
        },
      });
    }

    return defaultConfig;
  }, [
    accentColor,
    alpha,
    animationDuration,
    baseColor,
    deepShadowColor,
    highlightColor,
    normalizedScenario,
    shadowColor,
  ]);

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
                ledIndex++;
                const ledStyle: CSSVarProperties = {
                  ...baseLedStyle,
                };
                if (scenarioConfig.styleOverrides) {
                  Object.assign(ledStyle, scenarioConfig.styleOverrides);
                }
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
