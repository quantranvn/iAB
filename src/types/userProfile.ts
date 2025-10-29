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
  customScenarioAnimationId?: string | null;
  timestamp: number;
}

export interface MotorbikeProfile {
  bikeId: string;
  brand: string;
  model: string;
  year: number;
  licensePlate: string;
  color: string;
  status: string;
  presets: Preset[];
}

export interface UserSettings {
  notifications: boolean;
  language: string;
  theme: string;
}

export interface UserLocation {
  country: string;
  city: string;
}

export interface UserProfile {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  status: string;
  role: string;
  profileImageUrl: string;
  turnIndicator: LightSettings;
  lowBeam: LightSettings;
  highBeam: LightSettings;
  brakeLight: LightSettings;
  animation: LightSettings;
  animationScenario: number;
  customScenarioAnimationId: string | null;
  userAnimations: string[];
  motorbikes: MotorbikeProfile[];
  settings: UserSettings;
  location: UserLocation;
  createdAt: string;
  lastLogin: string;
  ownedAnimations: string[];
}

export const FALLBACK_USER_PROFILE: UserProfile = {
  uid: "uid12345",
  firstName: "John",
  lastName: "Tuan",
  email: "tuan.nguyen@example.com",
  phoneNumber: "+15551234567",
  status: "active",
  role: "rider",
  profileImageUrl:
    "https://firebasestorage.googleapis.com/v0/b/appname/o/users/uid12345/profile.jpg",
  turnIndicator: { red: 255, green: 140, blue: 0, intensity: 80 },
  lowBeam: { red: 255, green: 255, blue: 180, intensity: 60 },
  highBeam: { red: 255, green: 255, blue: 255, intensity: 90 },
  brakeLight: { red: 200, green: 0, blue: 0, intensity: 100 },
  animation: { red: 80, green: 120, blue: 255, intensity: 75 },
  animationScenario: 1,
  customScenarioAnimationId: "aurora-veil",
  userAnimations: ["nebula-drift", "sunset-rush", "aurora-veil"],
  motorbikes: [
    {
      bikeId: "bike001",
      brand: "Yamaha",
      model: "MT-15",
      year: 2023,
      licensePlate: "AB123CD",
      color: "Blue",
      status: "active",
      presets: [
        {
          id: "preset-1",
          name: "City Cruise",
          turnIndicator: { red: 255, green: 140, blue: 0, intensity: 80 },
          lowBeam: { red: 255, green: 255, blue: 200, intensity: 65 },
          highBeam: { red: 255, green: 255, blue: 255, intensity: 90 },
          brakeLight: { red: 220, green: 0, blue: 0, intensity: 100 },
          animation: { red: 100, green: 100, blue: 255, intensity: 70 },
          animationScenario: 3,
          customScenarioAnimationId: "aurora-veil",
          timestamp: Date.now() - 86400000,
        },
      ],
    },
    {
      bikeId: "bike002",
      brand: "Honda",
      model: "CB300R",
      year: 2022,
      licensePlate: "XY987ZT",
      color: "Red",
      status: "active",
      presets: [
        {
          id: "preset-2",
          name: "Track Ready",
          turnIndicator: { red: 255, green: 50, blue: 0, intensity: 100 },
          lowBeam: { red: 255, green: 255, blue: 255, intensity: 100 },
          highBeam: { red: 255, green: 255, blue: 255, intensity: 100 },
          brakeLight: { red: 255, green: 0, blue: 0, intensity: 100 },
          animation: { red: 255, green: 0, blue: 0, intensity: 100 },
          animationScenario: 2,
          customScenarioAnimationId: "starlight-chase",
          timestamp: Date.now() - 172800000,
        },
      ],
    },
  ],
  settings: {
    notifications: true,
    language: "en",
    theme: "dark",
  },
  location: {
    country: "Vietnam",
    city: "Ho Chi Minh",
  },
  createdAt: "2025-10-27T12:00:00Z",
  lastLogin: "2025-10-27T18:30:00Z",
  ownedAnimations: ["aurora-veil", "starlight-chase"],
};
