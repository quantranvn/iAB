import type { LucideIcon } from "lucide-react";

export interface AnimationScenarioOption {
  id: number;
  name: string;
  icon: LucideIcon;
  gradient: string;
  sourceId?: string;
  subtitle?: string;
  supportsLibrarySelection?: boolean;
  disabled?: boolean;
}
