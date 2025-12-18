import type { DesignerConfig } from "../types/designer";
import type { UserProfile } from "../types/userProfile";

export interface StoreAnimation {
  id: string;
  name: string;
  description: string;
  price?: number;
  gradient?: string;
  featured?: boolean;
  toolkitAnimId?: string;
}

type FirebaseCompat = {
  initializeApp: (config: Record<string, unknown>) => unknown;
  apps: unknown[];
  firestore: (app?: unknown) => FirestoreCompat;
};

type FirestoreCompat = {
  collection: (name: string) => {
    doc: (id?: string) => FirestoreDoc;
    get: () => Promise<FirestoreCollectionSnapshot>;
  };
};

type FirestoreDoc = {
  id?: string;
  get: () => Promise<{ exists: boolean; data: () => unknown }>;
  set: (data: unknown, options?: { merge?: boolean }) => Promise<void>;
  onSnapshot: (
    onNext: (snapshot: FirestoreDocSnapshot) => void,
    onError?: (error: unknown) => void,
  ) => () => void;
};

type FirestoreCollectionSnapshot = {
  docs: { id: string; data: () => unknown }[];
};

type FirestoreDocSnapshot = {
  id?: string;
  exists: boolean;
  data: () => unknown;
};

type FirestoreFieldValue = {
  arrayUnion: (...values: unknown[]) => unknown;
};

type FirebaseNamespace = FirebaseCompat & {
  firestore: ((app?: unknown) => FirestoreCompat) & {
    FieldValue: FirestoreFieldValue;
  };
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const firebaseConfigValid = Object.values(firebaseConfig).every((value) => Boolean(value));
const ACTIVE_USER_STORAGE_KEY = "iab-active-user-id";
const firebaseCompatVersion = "10.12.4";
const DEFAULT_CONVERSION_COLLECTION = "animationConversions";
const DEFAULT_CONVERSION_TIMEOUT_MS = 15000;

const toHexString = (bytes: number[]): string =>
  bytes
    .map((byte) => byte.toString(16).padStart(2, "0").toUpperCase())
    .join(" ");

const sanitizeBytes = (input: unknown): number[] => {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((value) => {
      const numeric = typeof value === "number" ? value : Number.parseInt(String(value), 10);

      if (Number.isNaN(numeric)) {
        return null;
      }

      return Math.max(0, Math.min(255, numeric));
    })
    .filter((value): value is number => value !== null);
};

const createConversionRequestId = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `conversion-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`);

let firebaseNamespace: FirebaseNamespace | null = null;
let firestoreInstance: FirestoreCompat | null = null;
let firebaseLoader: Promise<FirebaseNamespace | null> | null = null;
let firebaseInitialized = false;
let firebaseInitializationPromise: Promise<boolean> | null = null;

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
  if (!firebaseConfigValid) {
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

  firebaseInitialized = true;

  return { firebase: firebaseNamespace, firestore: firestoreInstance };
};

export const initializeFirebaseIfReady = async () => {
  if (!firebaseConfigValid) {
    return false;
  }

  if (firebaseInitialized && firebaseNamespace && firestoreInstance) {
    return true;
  }

  if (!firebaseInitializationPromise) {
    firebaseInitializationPromise = ensureFirebase().then((context) => {
      if (!context) {
        firebaseInitializationPromise = null;
        return false;
      }

      firebaseInitialized = true;
      return true;
    });
  }

  return firebaseInitializationPromise;
};

export const isFirebaseConfigured = () => firebaseConfigValid;

const readStoredActiveUserId = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
  } catch (error) {
    console.warn("Unable to read stored user id", error);
    return null;
  }
};

export const setActiveUserId = (userId: string | null) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (userId) {
      window.localStorage.setItem(ACTIVE_USER_STORAGE_KEY, userId);
    } else {
      window.localStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
    }
  } catch (error) {
    console.warn("Unable to persist user id", error);
  }
};

export const getActiveUserId = () =>
  readStoredActiveUserId() ?? import.meta.env.VITE_FIREBASE_USER_ID ?? "rider-001";

export const getFirestoreInstance = () => firestoreInstance;

type ConversionPayload = Record<string, unknown> | undefined;

const getConversionCollectionName = () =>
  import.meta.env.VITE_FIREBASE_ANIMATION_CONVERTER_COLLECTION ??
  import.meta.env.VITE_FIREBASE_CONVERSION_COLLECTION ??
  DEFAULT_CONVERSION_COLLECTION;

const getConversionNote = (payload: ConversionPayload) => {
  const payloadNote = payload?.message ?? payload?.note ?? payload?.statusMessage;
  return typeof payloadNote === "string" && payloadNote.trim().length > 0 ? payloadNote : undefined;
};

const extractConversionBytes = (payload: ConversionPayload) =>
  sanitizeBytes(
    payload?.bytes ??
      payload?.command ??
      payload?.commandBytes ??
      (payload?.result as ConversionPayload)?.bytes ??
      (payload?.result as ConversionPayload)?.commandBytes ??
      (payload?.payload as ConversionPayload)?.bytes ??
      (payload?.payload as ConversionPayload)?.commandBytes ??
      [],
  );

const extractHexString = (payload: ConversionPayload, fallback: number[]) => {
  const hexCandidate =
    payload?.hexString ??
    (payload?.result as ConversionPayload)?.hexString ??
    (payload?.payload as ConversionPayload)?.hexString;

  if (typeof hexCandidate === "string" && hexCandidate.trim().length > 0) {
    return hexCandidate;
  }

  return toHexString(fallback);
};

export interface FirebaseConversionResult {
  bytes: number[];
  hexString: string;
  note?: string;
  requestId: string;
}

export interface FirebaseConversionOptions {
  timeoutMs?: number;
  collectionName?: string;
  userId?: string | null;
}

export const convertDesignerConfigViaFirebase = async (
  config: DesignerConfig,
  options?: FirebaseConversionOptions,
): Promise<FirebaseConversionResult | null> => {
  const context = await ensureFirebase();
  if (!context) {
    return null;
  }

  const { firestore } = context;
  const collectionName = options?.collectionName ?? getConversionCollectionName();
  const requestId = createConversionRequestId();
  const now = new Date().toISOString();

  const docRef = firestore.collection(collectionName).doc(requestId);

  try {
    await docRef.set({
      id: requestId,
      status: "pending",
      source: "smartlight-app",
      createdAt: now,
      updatedAt: now,
      userId: options?.userId ?? null,
      payload: {
        animation: config,
        requestedAt: now,
      },
    });
  } catch (error) {
    console.error("Failed to submit designer config to Firebase", error);
    return null;
  }

  const timeoutMs = options?.timeoutMs ?? DEFAULT_CONVERSION_TIMEOUT_MS;

  return new Promise((resolve) => {
    let settled = false;
    let unsubscribe: (() => void) | null = null;
    const finish = (result: FirebaseConversionResult | null) => {
      if (settled) {
        return;
      }
      settled = true;
      if (unsubscribe) {
        unsubscribe();
      }
      resolve(result);
    };

    unsubscribe = docRef.onSnapshot(
      (snapshot) => {
        const data = snapshot.data() as ConversionPayload;
        if (!data) {
          return;
        }

        const status = typeof data.status === "string" ? data.status.toLowerCase() : "pending";
        const resultPayload = (data.result as ConversionPayload) ?? data.payload ?? data;
        const bytes = extractConversionBytes(resultPayload);

        if ((status === "completed" || status === "ready" || status === "done") && bytes.length > 0) {
          const hexString = extractHexString(resultPayload, bytes);
          finish({
            bytes,
            hexString,
            note: getConversionNote(resultPayload),
            requestId,
          });
          return;
        }

        if (status === "failed" || status === "error") {
          finish(null);
        }
      },
      (error) => {
        console.error("Conversion listener failed", error);
        finish(null);
      },
    );

    const scheduleTimeout =
      typeof window !== "undefined" && typeof window.setTimeout === "function"
        ? window.setTimeout
        : setTimeout;

    scheduleTimeout(() => finish(null), timeoutMs);
  });
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

  return snapshot.data() as UserProfile;
}

export async function saveUserProfile(
  profile: UserProfile,
  documentId?: string
) {
  const context = await ensureFirebase();
  if (!context) {
    return;
  }

  const { firestore } = context;
  const docRef = firestore.collection("users").doc(documentId ?? profile.uid);
  await docRef.set(profile, { merge: true });
}

export async function fetchStoreAnimations(): Promise<StoreAnimation[]> {
  const context = await ensureFirebase();
  if (!context) {
    return [];
  }

  const { firestore } = context;
  const snapshot = await firestore.collection("animations").get();

  return snapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    ...(docSnapshot.data() as Omit<StoreAnimation, "id">),
  }));
}

export async function recordAnimationPurchase(userId: string, animationId: string) {
  const context = await ensureFirebase();
  if (!context) {
    return;
  }

  const { firebase, firestore } = context;
  const docRef = firestore.collection("users").doc(userId);
  await docRef.set(
    {
      ownedAnimations: firebase.firestore.FieldValue.arrayUnion(animationId),
    },
    { merge: true }
  );
}
