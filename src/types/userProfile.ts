export interface LightSettings {
  red: number;
  green: number;
  blue: number;
  intensity: number;
}

export interface Preset {
  id: string;
  name: string;
  turnIndicator: LightSettings;
  lowBeam: LightSettings;
  highBeam: LightSettings;
  brakeLight: LightSettings;
  animation: LightSettings;
  animationScenario: number;
  timestamp: number;
}

export interface VehicleProfile {
  id: string;
  presets: Preset[];
}

export interface UserProfile {
  userId: string;
  username: string;
  vehicles: VehicleProfile[];
  ownedAnimations: string[];
}

export const FALLBACK_USER_PROFILE: UserProfile = {
  userId: "rider-001",
  username: "Night Rider",
  ownedAnimations: ["aurora-veil", "starlight-chase"],
  vehicles: [
    {
      id: "SCT-042",
      presets: [
        {
          id: "1",
          name: "Night Mode",
          turnIndicator: { red: 255, green: 140, blue: 0, intensity: 80 },
          lowBeam: { red: 255, green: 255, blue: 180, intensity: 60 },
          highBeam: { red: 255, green: 255, blue: 255, intensity: 90 },
          brakeLight: { red: 200, green: 0, blue: 0, intensity: 100 },
          animation: { red: 100, green: 100, blue: 255, intensity: 70 },
          animationScenario: 3,
          timestamp: Date.now() - 86400000,
        },
      ],
    },
    {
      id: "SCT-099",
      presets: [
        {
          id: "2",
          name: "Racing",
          turnIndicator: { red: 255, green: 50, blue: 0, intensity: 100 },
          lowBeam: { red: 255, green: 255, blue: 255, intensity: 100 },
          highBeam: { red: 255, green: 255, blue: 255, intensity: 100 },
          brakeLight: { red: 255, green: 0, blue: 0, intensity: 100 },
          animation: { red: 255, green: 0, blue: 0, intensity: 100 },
          animationScenario: 2,
          timestamp: Date.now() - 172800000,
        },
      ],
    },
  ],
};
