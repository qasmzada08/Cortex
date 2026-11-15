import {
  type User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  type FieldValue,
  type Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import type { CustomThemeDefinition, PresentationDeck } from '../types/presentation';
import { normalizeGeneratedDeck } from './deckLogic';
import { normalizeCustomTheme } from './themeLogic';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function sanitizeFirestoreId(raw: string, prefix: string): string {
  const clean = raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120);
  if (clean && /^[a-zA-Z0-9_-]+$/.test(clean)) {
    return clean;
  }
  return `${prefix}-${Date.now().toString(36)}`;
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    }
    return out as T;
  }
  return value;
}

function toIsoString(val: unknown): string {
  if (val && typeof (val as Timestamp).toDate === 'function') {
    return (val as Timestamp).toDate().toISOString();
  }
  if (typeof val === 'string' && val) return val;
  return new Date().toISOString();
}

export async function signInWithGoogleCloud(): Promise<User> {
  const credential = await signInWithPopup(auth, googleProvider);
  await upsertUserProfile(credential.user);
  return credential.user;
}

export async function signOutCloud(): Promise<void> {
  await signOut(auth);
}

export function subscribeAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export async function upsertUserProfile(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  const docRef = doc(db, 'users', user.uid);
  const payload: {
    uid: string;
    displayName?: string;
    photoURL?: string;
    updatedAt: FieldValue;
  } = {
    uid: user.uid,
    updatedAt: serverTimestamp(),
  };
  if (user.displayName) {
    payload.displayName = user.displayName.slice(0, 120);
  }
  if (user.photoURL) {
    payload.photoURL = user.photoURL.slice(0, 500);
  }

  try {
    const existing = await getDoc(docRef);
    if (existing.exists()) {
      const updateData = stripUndefinedDeep({
        displayName: payload.displayName,
        photoURL: payload.photoURL,
        updatedAt: serverTimestamp(),
      });
      await updateDoc(docRef, updateData);
    } else {
      await setDoc(docRef, stripUndefinedDeep(payload));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeCloudDecks(
  uid: string,
  onData: (decks: PresentationDeck[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = `users/${uid}/decks`;
  const q = query(collection(db, 'users', uid, 'decks'), where('ownerId', '==', uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const decks = snapshot.docs
        .map((docSnap) => {
          const raw = docSnap.data() as Record<string, unknown>;
          const normalized = normalizeGeneratedDeck(
            {
              id: String(raw.id || docSnap.id),
              title: String(raw.title || 'Untitled Presentation'),
              subtitle: typeof raw.subtitle === 'string' ? raw.subtitle : '',
              language: String(raw.language || 'English'),
              languageCode: String(raw.languageCode || 'en'),
              rtl: Boolean(raw.rtl),
              tone: String(raw.tone || 'Executive'),
              theme: String(raw.theme || 'matrix'),
              customTheme: raw.customTheme as CustomThemeDefinition | undefined,
              thinkingSummary:
                typeof raw.thinkingSummary === 'string' ? raw.thinkingSummary : undefined,
              slides: Array.isArray(raw.slides) ? raw.slides : [],
            },
            String(raw.theme || 'matrix'),
            String(raw.language || 'English'),
            String(raw.tone || 'Executive')
          );
          return {
            ...normalized,
            updatedAt: toIsoString(raw.updatedAt),
          };
        })
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      onData(decks);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

export async function saveCloudDeck(
  uid: string,
  deck: PresentationDeck
): Promise<PresentationDeck> {
  const safeId = sanitizeFirestoreId(deck.id, 'deck');
  const path = `users/${uid}/decks/${safeId}`;
  const docRef = doc(db, 'users', uid, 'decks', safeId);

  const normalizedCustom =
    deck.customTheme && typeof deck.customTheme === 'object'
      ? {
          ...normalizeCustomTheme(deck.customTheme, deck.customTheme.id),
          ...(deck.customTheme.thinkingSummary
            ? { thinkingSummary: deck.customTheme.thinkingSummary.slice(0, 3500) }
            : {}),
        }
      : undefined;

  const basePayload = stripUndefinedDeep({
    title: (deck.title || 'Untitled Presentation').slice(0, 240),
    subtitle: (deck.subtitle || '').slice(0, 400),
    language: (deck.language || 'English').slice(0, 80),
    languageCode: (deck.languageCode || 'en').slice(0, 32),
    rtl: Boolean(deck.rtl),
    tone: (deck.tone || 'Executive').slice(0, 64),
    theme: (deck.theme || 'matrix').slice(0, 128),
    customTheme: normalizedCustom,
    thinkingSummary: deck.thinkingSummary ? deck.thinkingSummary.slice(0, 3500) : undefined,
    slides: deck.slides.slice(0, 30).map((slide, idx) => ({
      ...slide,
      title: (slide.title || `Slide ${idx + 1}`).slice(0, 300),
    })),
    updatedAt: serverTimestamp(),
  });

  const estimatedBytes = new Blob([JSON.stringify(basePayload)]).size;
  if (estimatedBytes > 900_000) {
    throw new Error(
      'Deck exceeds Firestore 1 MB document limit (likely a large embedded photo). Compress or switch to a web photo URL before saving to cloud.'
    );
  }

  try {
    const existing = await getDoc(docRef);
    if (existing.exists()) {
      await updateDoc(docRef, basePayload);
    } else {
      await setDoc(docRef, {
        ...basePayload,
        id: safeId,
        ownerId: uid,
        createdAt: serverTimestamp(),
      });
    }
    return {
      ...deck,
      id: safeId,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCloudDeck(uid: string, deckId: string): Promise<void> {
  const safeId = sanitizeFirestoreId(deckId, 'deck');
  const path = `users/${uid}/decks/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'decks', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeCloudThemes(
  uid: string,
  onData: (themes: CustomThemeDefinition[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = `users/${uid}/themes`;
  const q = query(collection(db, 'users', uid, 'themes'), where('ownerId', '==', uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const themes = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>;
          return {
            theme: normalizeCustomTheme(data as Partial<CustomThemeDefinition>, docSnap.id),
            updatedAt: toIsoString(data.updatedAt),
          };
        })
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map((item) => item.theme);
      onData(themes);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

export async function saveCloudTheme(
  uid: string,
  theme: CustomThemeDefinition
): Promise<CustomThemeDefinition> {
  const normalized = normalizeCustomTheme(theme, theme.id);
  const safeId = sanitizeFirestoreId(normalized.id, 'custom');
  const finalTheme = { ...normalized, id: safeId };
  const path = `users/${uid}/themes/${safeId}`;
  const docRef = doc(db, 'users', uid, 'themes', safeId);

  const updateFields = stripUndefinedDeep({
    name: finalTheme.name,
    description: finalTheme.description,
    hexBg: finalTheme.hexBg,
    hexSurface: finalTheme.hexSurface,
    hexInk: finalTheme.hexInk,
    hexMuted: finalTheme.hexMuted,
    hexAccent: finalTheme.hexAccent,
    displayFont: finalTheme.displayFont,
    bodyFont: finalTheme.bodyFont,
    accentStyle: finalTheme.accentStyle,
    cornerStyle: finalTheme.cornerStyle,
    thinkingSummary: finalTheme.thinkingSummary ? finalTheme.thinkingSummary.slice(0, 3500) : undefined,
    updatedAt: serverTimestamp(),
  });

  try {
    const existing = await getDoc(docRef);
    if (existing.exists()) {
      await updateDoc(docRef, updateFields);
    } else {
      await setDoc(docRef, {
        ...updateFields,
        id: safeId,
        ownerId: uid,
        createdAt: serverTimestamp(),
      });
    }
    return finalTheme;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCloudTheme(uid: string, themeId: string): Promise<void> {
  const safeId = sanitizeFirestoreId(themeId, 'custom');
  const path = `users/${uid}/themes/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'themes', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
