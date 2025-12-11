import { Sparkles, Zap, Waves, Star, Bot } from "lucide-react";
import type { AnimationScenarioOption } from "../types/animation";

export const BASE_ANIMATION_SCENARIOS: AnimationScenarioOption[] = [
  { id: 1, name: "Rainbow Flow", icon: Sparkles, gradient: "from-red-500 to-purple-500" },
  { id: 2, name: "Lightning Pulse", icon: Zap, gradient: "from-yellow-400 to-orange-500" },
  { id: 3, name: "Ocean Wave", icon: Waves, gradient: "from-blue-400 to-cyan-500" },
  { id: 4, name: "Starlight", icon: Star, gradient: "from-indigo-400 to-pink-500" },
];

export const CUSTOM_ANIMATION_SCENARIO_ID = BASE_ANIMATION_SCENARIOS.length + 1;
export const AI_PLACEHOLDER_SCENARIO_ID = BASE_ANIMATION_SCENARIOS.length + 2;

export const USER_ANIMATION_GRADIENTS = [
  "from-emerald-500 via-teal-500 to-cyan-500",
  "from-rose-500 via-purple-500 to-indigo-500",
  "from-amber-400 via-orange-500 to-rose-500",
  "from-blue-400 via-sky-500 to-indigo-500",
];

export const AI_SCENARIO_OPTION: AnimationScenarioOption = {
  id: AI_PLACEHOLDER_SCENARIO_ID,
  name: "AI Generated Animation",
  icon: Bot,
  gradient: "from-slate-700 via-purple-600 to-indigo-500",
  subtitle: "Coming soon",
  disabled: true,
};
