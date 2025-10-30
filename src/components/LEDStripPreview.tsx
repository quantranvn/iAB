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
}

export function LEDStripPreview({ settings, scenarioName }: LEDStripPreviewProps) {
  const { red, green, blue, intensity } = settings;
  const alpha = Math.max(intensity / 100, 0.25);
  const baseColor = `rgb(${red}, ${green}, ${blue})`;
  const glowColor = `rgba(${red}, ${green}, ${blue}, ${Math.min(alpha + 0.2, 1)})`;
  const animationDuration = 2.4 - alpha;
  const normalizedScenario = scenarioName.trim().toLowerCase();

  const baseLedStyle = useMemo<CSSVarProperties>(() => {
    return {
      backgroundColor: baseColor,
      boxShadow: `0 0 18px ${glowColor}`,
      filter: `brightness(${0.85 + alpha * 0.6})`,
      opacity: Math.max(0.6, alpha),
    };
  }, [alpha, baseColor, glowColor]);

  const scenarioConfig = useMemo<ScenarioAnimationConfig>(() => {
    const defaultConfig: ScenarioAnimationConfig = {
      ledClassName: "animate-led-dim",
      delayIncrement: 0.14,
      duration: Math.max(1.6, animationDuration),
    };

    if (normalizedScenario.includes("chase")) {
      return {
        ...defaultConfig,
        delayIncrement: 0.1,
        duration: 2.4,
      };
    }

    if (normalizedScenario.includes("aurora")) {
      return {
        ...defaultConfig,
        delayIncrement: 0.16,
        duration: 3.4,
      };
    }

    if (normalizedScenario.includes("rainbow")) {
      return {
        ...defaultConfig,
        delayIncrement: 0.08,
        duration: 2.8,
      };
    }

    if (normalizedScenario.includes("lightning") || normalizedScenario.includes("pulse")) {
      return {
        ...defaultConfig,
        delayIncrement: 0.06,
        duration: 1.8,
      };
    }

    if (normalizedScenario.includes("ocean") || normalizedScenario.includes("wave")) {
      return {
        ...defaultConfig,
        delayIncrement: 0.12,
        duration: 3.1,
      };
    }

    if (normalizedScenario.includes("starlight")) {
      return {
        ...defaultConfig,
        delayIncrement: 0.18,
        duration: 3.6,
      };
    }

    return defaultConfig;
  }, [animationDuration, normalizedScenario]);

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
