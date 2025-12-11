import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { DesignerConfig } from "../types/designer";
import type { LightSettings } from "../types/userProfile";

interface LEDStripPreviewProps {
  settings: LightSettings;
  scenarioName: string;
  scenarioId?: number;
  toolkitAnimId?: string;
  designerConfig?: DesignerConfig | null;
}

type ToolkitWindow = Window & {
  iab_applyDesignerConfig?: (config: DesignerConfig) => boolean;
  clearConfigs?: () => void;
  addConfig?: (config: {
    start: number;
    length: number;
    animId: string;
    props?: Record<string, unknown>;
  }) => void;
  NUM_LEDS?: number;
  brightness?: number;
  globalSpeed?: number;
  running?: boolean;
};

const SCENARIO_TOOLKIT_MAPPING: Record<number, string> = {
  1: "rainbow",
  2: "strobe",
  3: "water",
  4: "twinkle",
};

const DEFAULT_TOOLKIT_ANIMATION = "smoothFade";

export function LEDStripPreview({
  settings,
  scenarioName,
  scenarioId,
  toolkitAnimId,
  designerConfig,
}: LEDStripPreviewProps) {
  const [toolkitLoaded, setToolkitLoaded] = useState(false);
  const [previewApplied, setPreviewApplied] = useState(false);
  const toolkitIframeRef = useRef<HTMLIFrameElement | null>(null);

  const { red, green, blue, intensity } = settings;
  const normalizedScenario = scenarioName.trim().toLowerCase();

  const toolkitAnimationId = useMemo(() => {
    if (toolkitAnimId) return toolkitAnimId;
    if (scenarioId && SCENARIO_TOOLKIT_MAPPING[scenarioId]) {
      return SCENARIO_TOOLKIT_MAPPING[scenarioId];
    }
    if (normalizedScenario.includes("rainbow")) return "rainbow";
    if (normalizedScenario.includes("lightning")) return "strobe";
    if (normalizedScenario.includes("wave") || normalizedScenario.includes("ocean")) return "water";
    if (normalizedScenario.includes("star")) return "twinkle";
    return DEFAULT_TOOLKIT_ANIMATION;
  }, [normalizedScenario, scenarioId, toolkitAnimId]);

  const toolkitColorHex = useMemo(() => {
    const toHex = (value: number) => value.toString(16).padStart(2, "0");
    return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
  }, [blue, green, red]);

  const previewConfig = useMemo<DesignerConfig>(() => {
    const normalizedBrightness = Math.max(0.05, Math.min(1, intensity / 100));
    const ledCount = 16;

    return {
      ledCount,
      globalBrightness: normalizedBrightness,
      globalSpeed: 1,
      configs: [
        {
          start: 0,
          length: ledCount,
          animId: toolkitAnimationId,
          props: {
            direction: "left",
            mirror: false,
            color: toolkitColorHex,
            speed: 1,
            phaseMs: 0,
          },
        },
      ],
    };
  }, [intensity, toolkitAnimationId, toolkitColorHex]);

  const syncPreview = useCallback(() => {
    const iframeWindow = toolkitIframeRef.current?.contentWindow as ToolkitWindow | null;
    if (!iframeWindow || !toolkitLoaded) return;

    const targetConfig = designerConfig ?? previewConfig;
    if (!targetConfig) return;

    if (typeof iframeWindow.iab_applyDesignerConfig === "function") {
      const success = iframeWindow.iab_applyDesignerConfig(targetConfig);
      if (success) {
        setPreviewApplied(true);
        return;
      }
    }

    const { clearConfigs, addConfig } = iframeWindow;
    if (typeof clearConfigs !== "function" || typeof addConfig !== "function") {
      return;
    }

    iframeWindow.NUM_LEDS = targetConfig.ledCount ?? iframeWindow.NUM_LEDS ?? 16;
    iframeWindow.brightness = targetConfig.globalBrightness;
    iframeWindow.globalSpeed = targetConfig.globalSpeed;
    iframeWindow.running = true;

    clearConfigs();
    targetConfig.configs.forEach((entry) =>
      addConfig({
        start: entry.start,
        length: entry.length,
        animId: entry.animId,
        props: entry.props ?? {},
      }),
    );
    setPreviewApplied(true);
  }, [designerConfig, previewConfig, toolkitLoaded]);

  useEffect(() => {
    const iframe = toolkitIframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      setToolkitLoaded(true);
      setPreviewApplied(false);
    };

    iframe.addEventListener("load", handleLoad);
    return () => iframe.removeEventListener("load", handleLoad);
  }, []);

  useEffect(() => {
    setPreviewApplied(false);
  }, [designerConfig, previewConfig]);

  useEffect(() => {
    if (!toolkitLoaded) return;
    syncPreview();
  }, [syncPreview, toolkitLoaded]);

  const statusLabel = designerConfig
    ? `Designer config (${designerConfig.configs.length} layers)`
    : `${scenarioName}`;

  return (
    <div className="h-[85vh] w-full space-y-4">
      <div className="toolkit-strip" role="img" aria-label={`${scenarioName} animation preview`}>
        <div className="toolkit-strip__header">
          <span className="toolkit-strip__status">{statusLabel}</span>
        </div>
        <iframe
            ref={toolkitIframeRef}
            title="Toolkit animation preview"
            src="/Animation_Toolkit.html?embedPreview=1"
            className="min-h-[600px] h-full w-full border-0 bg-background"
            loading="lazy"
        />
        {!previewApplied && (
          <p className="px-3 pb-3 text-sm text-muted-foreground">Syncing animation with the toolkit…</p>
        )}
      </div>
    </div>
  );
}
