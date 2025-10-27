import { FALLBACK_USER_PROFILE } from "../types/userProfile";
import type {
  AnimationDetails,
  LightSettings,
  Preset,
  UserProfile,
  VehicleProfile,
} from "../types/userProfile";

export interface StoreAnimation {
  id: string;
  uid: string;
  name: string;
  description: string;
  price?: number;
  gradient?: string;
  featured?: boolean;
  base64?: string;
  status?: string;
}

type FirebaseCompat = {
  initializeApp: (config: Record<string, unknown>) => unknown;
  apps: unknown[];
  firestore: (app?: unknown) => FirestoreCompat;
};

type FirestoreCompat = {
  collection: (name: string) => {
    doc: (id: string) => FirestoreDoc;
    get: () => Promise<FirestoreCollectionSnapshot>;
  };
};

type FirestoreDoc = {
  get: () => Promise<{ exists: boolean; data: () => unknown }>;
  set: (data: unknown, options?: { merge?: boolean }) => Promise<void>;
};

type FirestoreCollectionSnapshot = {
  docs: { id: string; data: () => unknown }[];
};

type FirebaseNamespace = FirebaseCompat & {
  firestore: (app?: unknown) => FirestoreCompat;
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const firebaseReady = Object.values(firebaseConfig).every((value) => Boolean(value));
const firebaseCompatVersion = "10.12.4";

let firebaseNamespace: FirebaseNamespace | null = null;
let firestoreInstance: FirestoreCompat | null = null;
let firebaseLoader: Promise<FirebaseNamespace | null> | null = null;

const loadScript = (src: string) =>
  new Promise<void>((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("Script loading is only supported in browser environments"));
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existingScript) {
      if (existingScript.dataset.loaded === "true") {
        resolve();
        return;
      }

      existingScript.addEventListener("load", () => {
        existingScript.dataset.loaded = "true";
        resolve();
      });
      existingScript.addEventListener("error", () => reject(new Error(`Failed to load script ${src}`)));
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.loaded = "false";
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load script ${src}`));
    document.head.appendChild(script);
  });

const loadFirebaseCompat = async (): Promise<FirebaseNamespace | null> => {
  if (typeof window === "undefined") {
    return null;
  }

  const existing = (window as typeof window & { firebase?: FirebaseNamespace }).firebase;
  if (existing) {
    return existing;
  }

  if (!firebaseLoader) {
    firebaseLoader = (async () => {
      try {
        await loadScript(`https://www.gstatic.com/firebasejs/${firebaseCompatVersion}/firebase-app-compat.js`);
        await loadScript(`https://www.gstatic.com/firebasejs/${firebaseCompatVersion}/firebase-firestore-compat.js`);
        return (window as typeof window & { firebase?: FirebaseNamespace }).firebase ?? null;
      } catch (error) {
        console.error("Failed to load Firebase SDK", error);
        return null;
      }
    })();
  }

  return firebaseLoader;
};

const ensureFirebase = async () => {
  if (!firebaseReady) {
    return null;
  }

  if (firebaseNamespace && firestoreInstance) {
    return { firebase: firebaseNamespace, firestore: firestoreInstance };
  }

  const namespace = await loadFirebaseCompat();
  if (!namespace) {
    return null;
  }

  if (!namespace.apps || namespace.apps.length === 0) {
    namespace.initializeApp(firebaseConfig);
  }

  firebaseNamespace = namespace;
  firestoreInstance = namespace.firestore();

  return { firebase: firebaseNamespace, firestore: firestoreInstance };
};

export const isFirebaseConfigured = () => firebaseReady;

export const getActiveUserId = () => import.meta.env.VITE_FIREBASE_USER_ID ?? "rider-001";

export const getFirestoreInstance = () => firestoreInstance;

type FirestoreUserDoc = Partial<
  Omit<
    UserProfile,
    | "ownedAnimations"
    | "vehicles"
    | "motorbikes"
    | "settings"
    | "location"
    | "account"
  >
> & {
  ownedAnimations?: unknown;
  userAnimations?: unknown;
  vehicles?: unknown;
  motorbikes?: unknown;
  settings?: unknown;
  location?: unknown;
  account?: unknown;
};

type FirestoreAnimationDoc = Partial<AnimationDetails> & {
  animations?: Record<string, Partial<AnimationDetails>>;
};

const normalizeAnimation = (
  animation: Partial<AnimationDetails> | undefined,
  fallbackId: string
): AnimationDetails => ({
  uid: animation?.uid ?? fallbackId,
  name: animation?.name ?? fallbackId,
  description: animation?.description ?? "",
  base64: animation?.base64,
  gradient: animation?.gradient,
  price: animation?.price,
  status: animation?.status,
  featured: animation?.featured,
});

const normalizeAnimationMap = (
  data: unknown
): Record<string, AnimationDetails> => {
  if (!data) {
    return {};
  }

  if (Array.isArray(data)) {
    return data.reduce<Record<string, AnimationDetails>>((acc, value) => {
      if (typeof value === "string") {
        acc[value] = normalizeAnimation({ uid: value, name: value }, value);
      }
      return acc;
    }, {});
  }

  if (typeof data === "object") {
    return Object.entries(data as Record<string, unknown>).reduce<
      Record<string, AnimationDetails>
    >((acc, [key, value]) => {
      if (value && typeof value === "object") {
        acc[key] = normalizeAnimation(value as Partial<AnimationDetails>, key);
      } else {
        acc[key] = normalizeAnimation({ uid: key, name: key }, key);
      }
      return acc;
    }, {});
  }

  return {};
};

const cloneLightSettings = (settings: LightSettings): LightSettings => ({
  red: settings.red,
  green: settings.green,
  blue: settings.blue,
  intensity: settings.intensity,
});

const clonePreset = (preset: Preset): Preset => ({
  ...preset,
  turnIndicator: cloneLightSettings(preset.turnIndicator),
  lowBeam: cloneLightSettings(preset.lowBeam),
  highBeam: cloneLightSettings(preset.highBeam),
  brakeLight: cloneLightSettings(preset.brakeLight),
  animation: cloneLightSettings(preset.animation),
});

const cloneVehicleProfile = (vehicle: VehicleProfile): VehicleProfile => ({
  ...vehicle,
  presets: vehicle.presets.map(clonePreset),
});

const cloneAnimationMap = (animations: Record<string, AnimationDetails>) =>
  Object.entries(animations).reduce<Record<string, AnimationDetails>>((acc, [key, value]) => {
    acc[key] = { ...value };
    return acc;
  }, {});

const cloneMotorbikeMap = (
  motorbikes: NonNullable<UserProfile["motorbikes"]> | undefined
) => {
  if (!motorbikes) {
    return undefined;
  }

  return Object.entries(motorbikes).reduce<NonNullable<UserProfile["motorbikes"]>>(
    (acc, [key, value]) => {
      acc[key] = { ...value };
      return acc;
    },
    {}
  );
};

const coerceLightSettings = (value: unknown): LightSettings => {
  const settings = value as Partial<LightSettings> | undefined;

  return {
    red: Number(settings?.red ?? 0),
    green: Number(settings?.green ?? 0),
    blue: Number(settings?.blue ?? 0),
    intensity: Number(settings?.intensity ?? 0),
  };
};

const normalizeVehicles = (vehicles: unknown): VehicleProfile[] => {
  if (!Array.isArray(vehicles)) {
    return [];
  }

  return vehicles.map((vehicle) => {
    const rawVehicle = vehicle as Record<string, unknown>;
    const rawPresets = Array.isArray(rawVehicle.presets)
      ? (rawVehicle.presets as Record<string, unknown>[])
      : [];

    return {
      id: String(rawVehicle.id ?? ""),
      presets: rawPresets.map((preset) => ({
        id: String(preset.id ?? ""),
        name: String(preset.name ?? ""),
        turnIndicator: coerceLightSettings(preset.turnIndicator),
        lowBeam: coerceLightSettings(preset.lowBeam),
        highBeam: coerceLightSettings(preset.highBeam),
        brakeLight: coerceLightSettings(preset.brakeLight),
        animation: coerceLightSettings(preset.animation),
        animationScenario: Number(preset.animationScenario ?? 0),
        timestamp: Number(preset.timestamp ?? Date.now()),
      })),
    };
  });
};

const cloneIfObject = <T>(value: unknown): T | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  return { ...(value as T) };
};

export async function loadUserProfile(userId: string): Promise<UserProfile | null> {
  const context = await ensureFirebase();
  if (!context) {
    return null;
  }

  const { firestore } = context;
  const docRef = firestore.collection("users").doc(userId);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data() as FirestoreUserDoc;
  const normalizedOwned = normalizeAnimationMap(data.userAnimations ?? data.ownedAnimations);
  const normalizedVehicles = normalizeVehicles(data.vehicles);
  const normalizedMotorbikes =
    data.motorbikes && typeof data.motorbikes === "object"
      ? Object.entries(data.motorbikes as Record<string, unknown>).reduce<
          NonNullable<UserProfile["motorbikes"]>
        >((acc, [key, value]) => {
          if (value && typeof value === "object") {
            acc[key] = { ...(value as Record<string, unknown>), bikeId: key } as never;
          }
          return acc;
        }, {})
      : undefined;

  return {
    userId: data.userId ?? userId,
    username: data.username ?? FALLBACK_USER_PROFILE.username,
    vehicles:
      normalizedVehicles.length > 0
        ? normalizedVehicles
        : FALLBACK_USER_PROFILE.vehicles.map(cloneVehicleProfile),
    ownedAnimations:
      Object.keys(normalizedOwned).length > 0
        ? normalizedOwned
        : cloneAnimationMap(FALLBACK_USER_PROFILE.ownedAnimations),
    motorbikes:
      normalizedMotorbikes && Object.keys(normalizedMotorbikes).length > 0
        ? normalizedMotorbikes
        : cloneMotorbikeMap(FALLBACK_USER_PROFILE.motorbikes),
    settings:
      cloneIfObject<UserProfile["settings"]>(data.settings) ??
      (FALLBACK_USER_PROFILE.settings
        ? { ...FALLBACK_USER_PROFILE.settings }
        : undefined),
    location:
      cloneIfObject<UserProfile["location"]>(data.location) ??
      (FALLBACK_USER_PROFILE.location
        ? { ...FALLBACK_USER_PROFILE.location }
        : undefined),
    account:
      cloneIfObject<UserProfile["account"]>(data.account) ??
      (FALLBACK_USER_PROFILE.account
        ? { ...FALLBACK_USER_PROFILE.account }
        : undefined),
    createdAt: data.createdAt ?? FALLBACK_USER_PROFILE.createdAt,
    lastLogin: data.lastLogin ?? FALLBACK_USER_PROFILE.lastLogin,
  };
}

export async function saveUserProfile(profile: UserProfile, documentId?: string) {
  const context = await ensureFirebase();
  if (!context) {
    return;
  }

  const { firestore } = context;
  const docRef = firestore.collection("users").doc(documentId ?? profile.userId);
  await docRef.set(
    {
      ...profile,
      ownedAnimations: profile.ownedAnimations,
      userAnimations: profile.ownedAnimations,
    },
    { merge: true }
  );
}

export async function fetchStoreAnimations(): Promise<StoreAnimation[]> {
  const context = await ensureFirebase();
  if (!context) {
    return [];
  }

  const { firestore } = context;
  const snapshot = await firestore.collection("animations").get();

  const animations: StoreAnimation[] = [];

  snapshot.docs.forEach((docSnapshot) => {
    const data = docSnapshot.data() as FirestoreAnimationDoc;

    if (data.animations && typeof data.animations === "object") {
      Object.entries(data.animations).forEach(([key, value]) => {
        const normalized = normalizeAnimation(value, key);
        animations.push({ id: key, ...normalized });
      });
      return;
    }

    const normalized = normalizeAnimation(data, docSnapshot.id);
    animations.push({ id: docSnapshot.id, ...normalized });
  });

  return animations;
}

export async function recordAnimationPurchase(userId: string, animation: StoreAnimation) {
  const context = await ensureFirebase();
  if (!context) {
    return;
  }

  const { firestore } = context;
  const docRef = firestore.collection("users").doc(userId);
  const snapshot = await docRef.get();
  const existingData = snapshot.exists ? (snapshot.data() as FirestoreUserDoc) : {};
  const currentAnimations = normalizeAnimationMap(
    existingData.userAnimations ?? existingData.ownedAnimations
  );

  currentAnimations[animation.id] = {
    uid: animation.uid ?? animation.id,
    name: animation.name,
    description: animation.description,
    base64: animation.base64,
    gradient: animation.gradient,
    price: animation.price,
    status: "owned",
    featured: animation.featured,
  };

  await docRef.set(
    {
      ownedAnimations: currentAnimations,
      userAnimations: currentAnimations,
      lastLogin: new Date().toISOString(),
    },
    { merge: true }
  );
}
