import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import {
  AI_SCENARIO_OPTION,
  BASE_ANIMATION_SCENARIOS,
  CUSTOM_ANIMATION_SCENARIO_ID,
  USER_ANIMATION_GRADIENTS,
} from "../utils/animationConstants";
import { ANIMATION_TOOLKIT_SLOT_ID } from "../components/AppStore";
import type { AnimationScenarioOption } from "../types/animation";
import type { DesignerConfig } from "../types/designer";
import type { StoreAnimation } from "../utils/firebase";

interface UseAnimationScenariosParams {
  animationLookup: Map<string, StoreAnimation>;
  animationScenario: number;
  customScenarioAnimationId: string | null;
  designerConfig: DesignerConfig | null;
}

export const useAnimationScenarios = ({
  animationLookup,
  animationScenario,
  customScenarioAnimationId,
  designerConfig,
}: UseAnimationScenariosParams) => {
  const userAnimationScenarioData = useMemo(() => {
    const options: AnimationScenarioOption[] = [];
    const sourceToId = new Map<string, number>();
    const idToSource = new Map<number, string>();

    const customAnimation =
      customScenarioAnimationId
        ? animationLookup.get(customScenarioAnimationId) ?? null
        : null;

    options.push({
      id: CUSTOM_ANIMATION_SCENARIO_ID,
      name: customAnimation?.name ?? "Custom Scenario",
      icon: customAnimation?.icon ?? Sparkles,
      gradient: customAnimation?.gradient ?? USER_ANIMATION_GRADIENTS[0],
      sourceId: customAnimation?.id,
      supportsLibrarySelection: true,
      subtitle: customAnimation ? "Custom selection" : "Select from your library",
      disabled: !customAnimation,
    });

    if (customAnimation) {
      sourceToId.set(customAnimation.id, CUSTOM_ANIMATION_SCENARIO_ID);
      idToSource.set(CUSTOM_ANIMATION_SCENARIO_ID, customAnimation.id);
    }

    options.push(AI_SCENARIO_OPTION);

    return { options, sourceToId, idToSource };
  }, [animationLookup, customScenarioAnimationId]);

  const animationScenarioOptions = useMemo(
    () => [...BASE_ANIMATION_SCENARIOS, ...userAnimationScenarioData.options],
    [userAnimationScenarioData.options]
  );

  const userAnimationIdToScenarioId = userAnimationScenarioData.sourceToId;
  const scenarioIdToUserAnimationId = userAnimationScenarioData.idToSource;

  const selectedAnimationOption = useMemo(
    () => animationScenarioOptions.find((option) => option.id === animationScenario),
    [animationScenarioOptions, animationScenario]
  );

  const selectedUserAnimationId = useMemo(() => {
    if (animationScenario === CUSTOM_ANIMATION_SCENARIO_ID) {
      return customScenarioAnimationId;
    }

    return scenarioIdToUserAnimationId.get(animationScenario) ?? null;
  }, [animationScenario, customScenarioAnimationId, scenarioIdToUserAnimationId]);

  const selectedUserAnimation = useMemo(() => {
    if (!selectedUserAnimationId) {
      return null;
    }

    return animationLookup.get(selectedUserAnimationId) ?? null;
  }, [animationLookup, selectedUserAnimationId]);

  const usingDesignerAnimation =
    selectedUserAnimation?.id === ANIMATION_TOOLKIT_SLOT_ID && Boolean(designerConfig);

  const selectedToolkitAnimId = usingDesignerAnimation
    ? null
    : selectedUserAnimation?.toolkitAnimId ?? null;

  const designerPreviewConfig = useMemo(
    () => (usingDesignerAnimation ? designerConfig : null),
    [designerConfig, usingDesignerAnimation]
  );

  return {
    animationScenarioOptions,
    selectedAnimationOption,
    selectedUserAnimation,
    selectedUserAnimationId,
    selectedToolkitAnimId,
    designerPreviewConfig,
    userAnimationIdToScenarioId,
    scenarioIdToUserAnimationId,
  };
};
