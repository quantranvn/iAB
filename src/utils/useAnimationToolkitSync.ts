import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { LightSettings } from "../types/userProfile";

interface ToolkitConfig {
  ledCount: number;
  globalBrightness: number;
  globalSpeed: number;
  colorBlendMode: "average" | "additive";
  configs: {
    start: number;
    length: number;
    animId: string;
    props?: Record<string, unknown>;
  }[];
}

const TOOLKIT_LED_COUNT = 16;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`;

const buildToolkitConfig = (scenarioName: string, settings: LightSettings): ToolkitConfig => {
  const normalized = scenarioName.toLowerCase();
  const baseBrightness = clamp(settings.intensity / 100, 0.1, 1);
  const baseSpeed = clamp(0.6 + settings.intensity / 125, 0.6, 1.6);
  const colorHex = rgbToHex(settings.red, settings.green, settings.blue);

  if (normalized.includes("rainbow")) {
    return {
      ledCount: TOOLKIT_LED_COUNT,
      globalBrightness: baseBrightness,
      globalSpeed: baseSpeed,
      colorBlendMode: "additive",
      configs: [
        {
          start: 0,
          length: TOOLKIT_LED_COUNT,
          animId: "rainbowWave",
          props: { direction: "left", mirror: true, phaseMs: 0, speed: 1 },
        },
      ],
    };
  }

  if (normalized.includes("lightning") || normalized.includes("pulse")) {
    return {
      ledCount: TOOLKIT_LED_COUNT,
      globalBrightness: baseBrightness,
      globalSpeed: baseSpeed,
      colorBlendMode: "average",
      configs: [
        { start: 0, length: TOOLKIT_LED_COUNT, animId: "solid", props: { color: colorHex } },
        { start: 0, length: TOOLKIT_LED_COUNT, animId: "strobe", props: { speed: 1.35, phaseMs: 0 } },
        { start: 0, length: TOOLKIT_LED_COUNT, animId: "blink", props: { speed: 0.85, phaseMs: 200 } },
      ],
    };
  }

  if (normalized.includes("ocean") || normalized.includes("wave")) {
    return {
      ledCount: TOOLKIT_LED_COUNT,
      globalBrightness: baseBrightness,
      globalSpeed: baseSpeed,
      colorBlendMode: "additive",
      configs: [
        {
          start: 0,
          length: TOOLKIT_LED_COUNT,
          animId: "plasma",
          props: { direction: "left", mirror: true, phaseMs: 0, speed: 0.82 },
        },
        { start: 0, length: TOOLKIT_LED_COUNT, animId: "breath", props: { speed: 0.7, phaseMs: 140 } },
      ],
    };
  }

  if (normalized.includes("star")) {
    return {
      ledCount: TOOLKIT_LED_COUNT,
      globalBrightness: baseBrightness,
      globalSpeed: baseSpeed,
      colorBlendMode: "average",
      configs: [
        { start: 0, length: TOOLKIT_LED_COUNT, animId: "solid", props: { color: colorHex } },
        {
          start: 0,
          length: TOOLKIT_LED_COUNT,
          animId: "twinkle",
          props: { direction: "left", mirror: true, speed: 1, phaseMs: 240 },
        },
      ],
    };
  }

  return {
    ledCount: TOOLKIT_LED_COUNT,
    globalBrightness: baseBrightness,
    globalSpeed: baseSpeed,
    colorBlendMode: "average",
    configs: [
      { start: 0, length: TOOLKIT_LED_COUNT, animId: "solid", props: { color: colorHex } },
      { start: 0, length: TOOLKIT_LED_COUNT, animId: "breath", props: { speed: 0.9, phaseMs: 0 } },
    ],
  };
};

const colorsAreEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

export const useAnimationToolkitSync = (scenarioName: string, settings: LightSettings) => {
  const [ledColors, setLedColors] = useState<string[]>([]);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const rafRef = useRef<number>();
  const toolkitReadyRef = useRef(false);
  const latestScenario = useRef(scenarioName);
  const latestSettings = useRef(settings);

  useEffect(() => {
    latestScenario.current = scenarioName;
    latestSettings.current = settings;
  }, [scenarioName, settings]);

  const applyToolkitConfig = useCallback(() => {
    const iframeDoc = iframeRef.current?.contentDocument;
    const iframeWin = iframeRef.current?.contentWindow as (Window & typeof globalThis & { applyConfigFromText?: () => void }) | null;
    if (!iframeDoc || !iframeWin?.applyConfigFromText) {
      return;
    }

    const configJsonText = iframeDoc.getElementById("configJsonText") as HTMLTextAreaElement | null;
    if (!configJsonText) {
      return;
    }

    const config = buildToolkitConfig(latestScenario.current, latestSettings.current);
    configJsonText.value = JSON.stringify(config);
    iframeWin.applyConfigFromText();
  }, []);

  const readLedColors = useCallback(() => {
    const iframeDoc = iframeRef.current?.contentDocument;
    const iframeWin = iframeRef.current?.contentWindow as (Window & typeof globalThis) | null;

    if (!iframeDoc || !iframeWin) {
      return;
    }

    const ledElements = Array.from(iframeDoc.querySelectorAll<HTMLElement>(".led"));
    if (ledElements.length === 0) {
      return;
    }

    const nextColors = ledElements.map((led) => iframeWin.getComputedStyle(led).backgroundColor || "rgb(0, 0, 0)");
    setLedColors((previous) => (colorsAreEqual(previous, nextColors) ? previous : nextColors));

    rafRef.current = iframeWin.requestAnimationFrame(readLedColors);
  }, []);

  const startMirroring = useCallback(() => {
    if (rafRef.current !== undefined) {
      const iframeWin = iframeRef.current?.contentWindow as (Window & typeof globalThis) | null;
      if (iframeWin) {
        iframeWin.cancelAnimationFrame(rafRef.current);
      }
    }
    rafRef.current = (iframeRef.current?.contentWindow ?? window).requestAnimationFrame(readLedColors);
  }, [readLedColors]);

  const handleToolkitLoaded = useCallback(() => {
    toolkitReadyRef.current = true;
    applyToolkitConfig();
    startMirroring();
  }, [applyToolkitConfig, startMirroring]);

  useEffect(() => {
    const iframe = document.createElement("iframe");
    iframe.src = "/Animation_Toolkit.html";
    iframe.style.display = "none";
    iframe.setAttribute("aria-hidden", "true");
    iframeRef.current = iframe;

    iframe.addEventListener("load", handleToolkitLoaded);
    document.body.appendChild(iframe);

    return () => {
      const iframeWin = iframe.contentWindow ?? undefined;
      if (iframeWin && rafRef.current !== undefined) {
        iframeWin.cancelAnimationFrame(rafRef.current);
      }
      iframe.removeEventListener("load", handleToolkitLoaded);
      iframe.remove();
    };
  }, [handleToolkitLoaded]);

  useEffect(() => {
    if (toolkitReadyRef.current) {
      applyToolkitConfig();
    }
  }, [applyToolkitConfig, scenarioName, settings]);

  return useMemo(
    () => ({
      ledColors,
      isReady: toolkitReadyRef.current,
    }),
    [ledColors],
  );
};

