import type {
  LightSettings,
  MotorbikeProfile,
  Preset,
  UserProfile,
} from "../types/userProfile";
import { FALLBACK_USER_PROFILE } from "../types/userProfile";

export const cloneLightSettings = (settings: LightSettings): LightSettings => ({
  ...settings,
});

export const clonePreset = (preset: Preset): Preset => ({
  ...preset,
  turnIndicator: cloneLightSettings(preset.turnIndicator),
  lowBeam: cloneLightSettings(preset.lowBeam),
  highBeam: cloneLightSettings(preset.highBeam),
  brakeLight: cloneLightSettings(preset.brakeLight),
  animation: cloneLightSettings(preset.animation),
  customScenarioAnimationId: preset.customScenarioAnimationId ?? null,
});

export const cloneMotorbike = (motorbike: MotorbikeProfile): MotorbikeProfile => ({
  ...motorbike,
  presets: motorbike.presets.map(clonePreset),
});

export const cloneUserProfile = (profile: UserProfile): UserProfile => ({
  ...profile,
  ownedAnimations: [...profile.ownedAnimations],
  userAnimations: [...profile.userAnimations],
  tokenBalance: profile.tokenBalance,
  motorbikes: profile.motorbikes.map(cloneMotorbike),
  settings: { ...profile.settings },
  location: { ...profile.location },
  turnIndicator: cloneLightSettings(profile.turnIndicator),
  lowBeam: cloneLightSettings(profile.lowBeam),
  highBeam: cloneLightSettings(profile.highBeam),
  brakeLight: cloneLightSettings(profile.brakeLight),
  animation: cloneLightSettings(profile.animation),
  customScenarioAnimationId: profile.customScenarioAnimationId ?? null,
});

export const buildFallbackProfile = (userUid: string): UserProfile => ({
  ...cloneUserProfile(FALLBACK_USER_PROFILE),
  uid: userUid,
});

export const normalizeUserProfile = (
  profile: Partial<UserProfile> | null | undefined,
  fallback: UserProfile,
): UserProfile => {
  const base = cloneUserProfile(fallback);
  if (!profile) {
    return base;
  }

  return {
    ...base,
    ...profile,
    ownedAnimations: profile.ownedAnimations
      ? [...profile.ownedAnimations]
      : base.ownedAnimations,
    tokenBalance:
      typeof profile.tokenBalance === "number"
        ? profile.tokenBalance
        : base.tokenBalance,
    userAnimations: profile.userAnimations
      ? [...profile.userAnimations]
      : base.userAnimations,
    motorbikes: profile.motorbikes
      ? profile.motorbikes.map(cloneMotorbike)
      : base.motorbikes,
    settings: profile.settings ? { ...profile.settings } : base.settings,
    location: profile.location ? { ...profile.location } : base.location,
    turnIndicator: profile.turnIndicator
      ? cloneLightSettings(profile.turnIndicator)
      : base.turnIndicator,
    lowBeam: profile.lowBeam
      ? cloneLightSettings(profile.lowBeam)
      : base.lowBeam,
    highBeam: profile.highBeam
      ? cloneLightSettings(profile.highBeam)
      : base.highBeam,
    brakeLight: profile.brakeLight
      ? cloneLightSettings(profile.brakeLight)
      : base.brakeLight,
    animation: profile.animation
      ? cloneLightSettings(profile.animation)
      : base.animation,
    customScenarioAnimationId:
      profile.customScenarioAnimationId ?? base.customScenarioAnimationId,
  };
};
