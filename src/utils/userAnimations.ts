import { FALLBACK_USER_ANIMATIONS } from "../components/AppStore";
import type { StoreAnimation } from "./firebase";

export const computeUserAnimations = (
  animationIds: string[],
  catalog: StoreAnimation[]
): StoreAnimation[] => {
  const lookup = new Map(
    [...catalog, ...FALLBACK_USER_ANIMATIONS].map((animation) => [animation.id, animation])
  );

  const resolved = animationIds
    .map((animationId) => lookup.get(animationId))
    .filter((animation): animation is StoreAnimation => Boolean(animation));

  return resolved.length > 0 ? resolved : FALLBACK_USER_ANIMATIONS;
};
