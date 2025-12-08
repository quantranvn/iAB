import type { UserProfile } from "../types/userProfile";

export interface StoreAnimation {
  id: string;
  name: string;
  description: string;
  price?: number;
  gradient?: string;
  featured?: boolean;
  designerConfigJson?: string;
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
