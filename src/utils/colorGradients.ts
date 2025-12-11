import type { CSSProperties } from "react";
import type { LightSettings } from "../types/userProfile";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const lightenChannel = (value: number) => Math.min(255, Math.round(value + (255 - value) * 0.35));
const darkenChannel = (value: number) => Math.max(0, Math.round(value * 0.65));

export const getButtonGradientStyle = (settings?: LightSettings): CSSProperties | undefined => {
  if (!settings) {
    return undefined;
  }

  const alpha = clamp(settings.intensity / 100, 0.25, 1);
  const start = `rgba(${lightenChannel(settings.red)}, ${lightenChannel(settings.green)}, ${lightenChannel(
    settings.blue
  )}, ${clamp(alpha + 0.15, 0.35, 1)})`;
  const end = `rgba(${darkenChannel(settings.red)}, ${darkenChannel(settings.green)}, ${darkenChannel(
    settings.blue
  )}, ${alpha})`;

  return {
    backgroundColor: end,
    backgroundImage: `linear-gradient(135deg, ${start}, ${end})`,
  };
};
