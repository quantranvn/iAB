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

export interface AnimationDetails {
  uid: string;
  name: string;
  description?: string;
  base64?: string;
  gradient?: string;
  price?: number;
  status?: string;
  featured?: boolean;
}

export interface MotorbikeProfile {
  bikeId: string;
  brand: string;
  model: string;
  plateNumber: string;
  status: string;
  lastUpdated?: string;
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

export interface UserAccountDetails {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: string;
  profileImageUrl: string;
}

export interface UserProfile {
  userId: string;
  username: string;
  vehicles: VehicleProfile[];
  ownedAnimations: Record<string, AnimationDetails>;
  account?: UserAccountDetails;
  motorbikes?: Record<string, MotorbikeProfile>;
  settings?: UserSettings;
  location?: UserLocation;
  createdAt?: string;
  lastLogin?: string;
}

const createTimestamp = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString();

export const FALLBACK_USER_PROFILE: UserProfile = {
  userId: "rider-001",
  username: "Night Rider",
  account: {
    firstName: "Night",
    lastName: "Rider",
    email: "nightrider@example.com",
    phoneNumber: "+15555550100",
    role: "rider",
    profileImageUrl:
      "https://firebasestorage.googleapis.com/v0/b/appname/o/users%2Frider-001%2Favatar.png?alt=media",
  },
  motorbikes: {
    "SCT-042": {
      bikeId: "SCT-042",
      brand: "Lunar",
      model: "Glide XR",
      plateNumber: "XR042",
      status: "active",
      lastUpdated: createTimestamp(1),
    },
    "SCT-099": {
      bikeId: "SCT-099",
      brand: "Solar",
      model: "Burst RS",
      plateNumber: "RS099",
      status: "active",
      lastUpdated: createTimestamp(2),
    },
  },
  settings: {
    notifications: true,
    language: "en",
    theme: "dark",
  },
  location: {
    country: "USA",
    city: "Neo City",
  },
  createdAt: createTimestamp(30),
  lastLogin: createTimestamp(0),
  ownedAnimations: {
    "aurora-veil": {
      uid: "aurora-veil",
      name: "Aurora Veil",
      status: "active",
    },
    "starlight-chase": {
      uid: "starlight-chase",
      name: "Starlight Chase",
      status: "active",
    },
  },
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
