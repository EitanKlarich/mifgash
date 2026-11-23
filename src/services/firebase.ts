import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  deleteUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  getDocFromServer,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  deleteField,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  User,
  Group,
  Member,
  EventPlan,
  EventRsvp,
  EventComment,
  Poll,
  PollOption,
  NotificationItem,
  ChatMessage,
} from '../types';
import { createInitialsAvatarDataUrl } from '../utils/avatar';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: Firestore initialization with specific databaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Authentication Providers
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

// Error Handling per Firebase Integration Skill
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
    providerInfo?: {
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

// Connection health test
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Please check your Firebase configuration or network connectivity.');
    }
  }
}
testConnection();

// ---------------------------------------------------------------------------
// Formatting & Payload Validation Helpers (Synced with firebase-blueprint.json)
// ---------------------------------------------------------------------------
function clampStr(val: string | undefined | null, maxLen: number, fallback = ''): string {
  const s = (val ?? fallback).toString().trim();
  return s.slice(0, maxLen);
}

function clampAvatar(val: string | undefined | null, fallbackName: string): string {
  const raw = (val ?? '').trim();
  if (!raw || raw.length > 50000) {
    return createInitialsAvatarDataUrl(fallbackName);
  }
  return raw;
}

export function makeSafeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now()}-${rand}`;
}

const INVITE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

export function generateInviteCode(_name?: string): string {
  const length = 6;
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let code = '';
  for (let i = 0; i < length; i++) {
    code += INVITE_ALPHABET[bytes[i] % INVITE_ALPHABET.length];
  }
  return code;
}

export function buildGroupInviteUrl(inviteCode: string): string {
  const cleanCode = (inviteCode || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
  const envPublicUrl = (import.meta.env.VITE_PUBLIC_URL || '').trim().replace(/\/+$/, '');
  const envApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');

  let baseUrl = '';
  if (envPublicUrl && /^https?:\/\//i.test(envPublicUrl)) {
    baseUrl = envPublicUrl;
  } else if (
    typeof window !== 'undefined' &&
    window.location?.origin &&
    /^https?:\/\//i.test(window.location.origin)
  ) {
    baseUrl = window.location.origin.replace(/\/+$/, '');
  } else if (envApiUrl && /^https?:\/\//i.test(envApiUrl)) {
    baseUrl = envApiUrl;
  } else {
    baseUrl = 'https://mifgash.app';
  }

  return `${baseUrl}/${cleanCode}`;
}

export function extractInviteCode(rawInput: string): string {
  const trimmed = rawInput.trim();
  if (!trimmed) return '';
  try {
    if (
      trimmed.includes('://') ||
      trimmed.includes('/') ||
      trimmed.includes('?') ||
      trimmed.toLowerCase().includes('mifgash.app')
    ) {
      const normalizedInput = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)
        ? trimmed
        : `https://${trimmed.replace(/^\/+/, '')}`;
      const url = trimmed.startsWith('/')
        ? new URL(`https://mifgash.app${trimmed}`)
        : new URL(normalizedInput);

      const qJoin = url.searchParams.get('join');
      if (qJoin) return qJoin.trim().replace(/[^a-zA-Z0-9_-]/g, '');

      const segments = url.pathname.split('/').filter(Boolean);
      const joinIdx = segments.indexOf('join');
      if (joinIdx >= 0 && segments[joinIdx + 1]) {
        return segments[joinIdx + 1].trim().replace(/[^a-zA-Z0-9_-]/g, '');
      }
      if (segments.length > 0) {
        return segments[segments.length - 1].trim().replace(/[^a-zA-Z0-9_-]/g, '');
      }
      return '';
    }
  } catch {
    // Fallback to raw strip
  }
  return trimmed.replace(/[^a-zA-Z0-9_-]/g, '');
}

function formatTimestampReadable(ts: unknown): string {
  if (!ts) return 'Just now';
  if (ts instanceof Timestamp) {
    const d = ts.toDate();
    const diffMs = Date.now() - d.getTime();
    if (diffMs < 60_000) return 'Just now';
    if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
    if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  if (typeof ts === 'string') return ts;
  return 'Just now';
}

function timestampMillis(ts: unknown): number {
  if (ts instanceof Timestamp) return ts.toMillis();
  return 0;
}

export function getAuthProviderType(fbUser: FirebaseUser | null): 'password' | 'google' | 'apple' | 'other' {
  if (!fbUser) return 'other';
  const ids = fbUser.providerData.map((p) => p.providerId);
  if (ids.includes('password')) return 'password';
  if (ids.includes('google.com')) return 'google';
  if (ids.includes('apple.com')) return 'apple';
  return 'other';
}

// ---------------------------------------------------------------------------
// Auth & User Profile Operations
// ---------------------------------------------------------------------------
export async function syncFirebaseUserToApp(
  fbUser: FirebaseUser,
  overrideName?: string
): Promise<User> {
  const email = fbUser.email || '';
  const resolvedName = clampStr(
    overrideName || fbUser.displayName || (email ? email.split('@')[0] : 'Member'),
    100,
    'Member'
  );
  const nickname = clampStr(
    resolvedName.split(/\s+/)[0] || (email ? email.split('@')[0] : 'member'),
    60,
    'member'
  );
  const fallbackAvatar = fbUser.photoURL && fbUser.photoURL.length <= 50000
    ? fbUser.photoURL
    : createInitialsAvatarDataUrl(resolvedName);
  const providerId = clampStr(fbUser.providerData?.[0]?.providerId || 'firebase', 50, 'firebase');

  if (!fbUser.emailVerified) {
    return {
      id: fbUser.uid,
      name: resolvedName,
      nickname,
      email,
      avatar: fallbackAvatar,
      groups: [],
    };
  }

  const userDocRef = doc(db, 'users', fbUser.uid);
  try {
    const existingDoc = await getDoc(userDocRef);
    if (!existingDoc.exists()) {
      await setDoc(userDocRef, {
        id: fbUser.uid,
        name: resolvedName,
        nickname,
        email: clampStr(email, 200),
        avatar: fallbackAvatar,
        provider: providerId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return {
        id: fbUser.uid,
        name: resolvedName,
        nickname,
        email,
        avatar: fallbackAvatar,
        groups: [],
      };
    }

    const data = existingDoc.data();
    return {
      id: fbUser.uid,
      name: (data.name as string) || resolvedName,
      nickname: (data.nickname as string) || nickname,
      email: (data.email as string) || email,
      avatar: (data.avatar as string) || fallbackAvatar,
      groups: [],
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${fbUser.uid}`);
  }
}

export interface AuthActionResult {
  success: boolean;
  user?: User;
  needsVerification?: boolean;
  email?: string;
  error?: string;
}

export async function signInWithGoogleReal(): Promise<AuthActionResult> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (result.user) {
      const appUser = await syncFirebaseUserToApp(result.user);
      return { success: true, user: appUser };
    }
    return { success: false, error: 'No user credential returned from Google.' };
  } catch (err: any) {
    let message = err?.message || 'Google sign-in was cancelled or encountered an error.';
    if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
      message = 'Sign-in window was closed before completing.';
    } else if (err?.code === 'auth/popup-blocked') {
      message = 'Pop-up was blocked by your browser. Please allow pop-ups for this site and try again.';
    } else if (err?.code === 'auth/unauthorized-domain') {
      message = 'This domain is not yet authorized in Firebase Authentication settings.';
    } else if (err?.code === 'auth/account-exists-with-different-credential') {
      message = 'An account already exists with this email using another sign-in method.';
    }
    return { success: false, error: message };
  }
}

export async function signInWithAppleReal(): Promise<AuthActionResult> {
  try {
    const result = await signInWithPopup(auth, appleProvider);
    if (result.user) {
      if (!result.user.emailVerified) {
        return {
          success: true,
          needsVerification: true,
          email: result.user.email || '',
        };
      }
      const appUser = await syncFirebaseUserToApp(result.user);
      return { success: true, user: appUser };
    }
    return { success: false, error: 'No user credential returned from Apple.' };
  } catch (err: any) {
    let message = err?.message || 'Apple sign-in could not be completed.';
    if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
      message = 'Apple sign-in window was closed before completing.';
    } else if (err?.code === 'auth/popup-blocked') {
      message = 'Pop-up was blocked by your browser. Please allow pop-ups for this site.';
    } else if (err?.code === 'auth/operation-not-allowed') {
      message =
        'Apple Sign-In is not enabled yet in Firebase Authentication. Enable Apple under Authentication → Sign-in method in Firebase Console.';
    } else if (err?.code === 'auth/account-exists-with-different-credential') {
      message = 'An account already exists with this email using another sign-in method.';
    }
    return { success: false, error: message };
  }
}

export async function signUpWithEmailReal(
  name: string,
  email: string,
  pass: string
): Promise<AuthActionResult> {
  const cleanName = clampStr(name, 100);
  if (!cleanName) {
    return { success: false, error: 'Please enter your name.' };
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (cred.user) {
      await updateProfile(cred.user, { displayName: cleanName });
      await cred.user.reload();

      if (!cred.user.emailVerified) {
        try {
          await sendEmailVerification(cred.user);
        } catch (verErr) {
          console.warn('Could not send verification email immediately:', verErr);
        }
        return {
          success: true,
          needsVerification: true,
          email: cred.user.email || email.trim(),
        };
      }

      const appUser = await syncFirebaseUserToApp(cred.user, cleanName);
      return { success: true, user: appUser };
    }
    return { success: false, error: 'Registration failed.' };
  } catch (err: any) {
    let msg = err?.message || 'Could not complete registration.';
    if (err?.code === 'auth/email-already-in-use') {
      msg = 'An account with this email already exists. Please log in instead.';
    } else if (err?.code === 'auth/weak-password') {
      msg = 'Password should be at least 6 characters.';
    } else if (err?.code === 'auth/invalid-email') {
      msg = 'Please enter a valid email address.';
    } else if (err?.code === 'auth/operation-not-allowed') {
      msg =
        'Email/Password sign-up is not enabled yet in Firebase Authentication. Enable Email/Password under Authentication → Sign-in method in Firebase Console.';
    }
    return { success: false, error: msg };
  }
}

export async function signInWithEmailReal(
  email: string,
  pass: string
): Promise<AuthActionResult> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    if (cred.user) {
      await cred.user.reload();
      if (!cred.user.emailVerified) {
        return {
          success: true,
          needsVerification: true,
          email: cred.user.email || email.trim(),
        };
      }
      const appUser = await syncFirebaseUserToApp(cred.user);
      return { success: true, user: appUser };
    }
    return { success: false, error: 'Sign-in failed.' };
  } catch (err: any) {
    let msg = err?.message || 'Invalid email or password.';
    if (
      err?.code === 'auth/user-not-found' ||
      err?.code === 'auth/wrong-password' ||
      err?.code === 'auth/invalid-credential'
    ) {
      msg = 'Invalid email or password. Please check your credentials.';
    } else if (err?.code === 'auth/too-many-requests') {
      msg = 'Too many failed attempts. Please try again shortly or reset your password.';
    } else if (err?.code === 'auth/operation-not-allowed') {
      msg =
        'Email/Password sign-in is not enabled yet in Firebase Authentication. Enable Email/Password under Authentication → Sign-in method in Firebase Console.';
    }
    return { success: false, error: msg };
  }
}

export async function resendVerificationEmailReal(): Promise<{ success: boolean; error?: string }> {
  const user = auth.currentUser;
  if (!user) return { success: false, error: 'No active session found.' };
  try {
    await sendEmailVerification(user);
    return { success: true };
  } catch (err: any) {
    if (err?.code === 'auth/too-many-requests') {
      return { success: false, error: 'Verification email was just sent. Please check your inbox or wait a moment.' };
    }
    return { success: false, error: err?.message || 'Could not resend verification email.' };
  }
}

export async function checkEmailVerifiedReal(): Promise<AuthActionResult> {
  const fbUser = auth.currentUser;
  if (!fbUser) return { success: false, error: 'Session expired. Please log in again.' };
  try {
    await fbUser.reload();
    if (!fbUser.emailVerified) {
      return {
        success: false,
        needsVerification: true,
        email: fbUser.email || '',
        error: 'Email is not verified yet. Please click the link we sent to your inbox.',
      };
    }
    const appUser = await syncFirebaseUserToApp(fbUser);
    return { success: true, user: appUser };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unable to verify status.' };
  }
}

export async function sendPasswordResetReal(email: string): Promise<{ success: boolean; error?: string }> {
  const clean = email.trim();
  if (!clean || !clean.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' };
  }
  try {
    await sendPasswordResetEmail(auth, clean);
    return { success: true };
  } catch (err: any) {
    let msg = err?.message || 'Could not send password reset email.';
    if (err?.code === 'auth/invalid-email') msg = 'Please enter a valid email address.';
    if (err?.code === 'auth/user-not-found') msg = 'No account was found with that email address.';
    return { success: false, error: msg };
  }
}

export async function updateUserPasswordReal(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const fbUser = auth.currentUser;
  if (!fbUser || !fbUser.email) {
    return { success: false, error: 'You must be signed in with an email account to change your password.' };
  }
  if (getAuthProviderType(fbUser) !== 'password') {
    return {
      success: false,
      error: 'Password changes are managed by your Google or Apple account provider.',
    };
  }
  try {
    const credential = EmailAuthProvider.credential(fbUser.email, currentPassword);
    await reauthenticateWithCredential(fbUser, credential);
    await updatePassword(fbUser, newPassword);
    return { success: true };
  } catch (err: any) {
    let msg = err?.message || 'Could not update password.';
    if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
      msg = 'Current password is incorrect.';
    } else if (err?.code === 'auth/weak-password') {
      msg = 'New password must be at least 6 characters.';
    } else if (err?.code === 'auth/requires-recent-login') {
      msg = 'Please sign out and log back in before updating your password.';
    }
    return { success: false, error: msg };
  }
}

export async function signOutReal(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (err) {
    console.warn('Firebase signOut error:', err);
  }
}

export interface DeleteAccountResult {
  success: boolean;
  requiresRecentLogin?: boolean;
  providerType?: 'password' | 'google' | 'apple' | 'other';
  error?: string;
}

export async function reauthenticateCurrentUserReal(
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const fbUser = auth.currentUser;
  if (!fbUser) {
    return { success: false, error: 'No active session found. Please sign in again.' };
  }

  const providerType = getAuthProviderType(fbUser);

  try {
    if (providerType === 'password') {
      if (!fbUser.email) {
        return { success: false, error: 'Account email is unavailable for verification.' };
      }
      if (!password) {
        return { success: false, error: 'Please enter your current password to continue.' };
      }
      const credential = EmailAuthProvider.credential(fbUser.email, password);
      await reauthenticateWithCredential(fbUser, credential);
      return { success: true };
    }

    if (providerType === 'google') {
      await reauthenticateWithPopup(fbUser, googleProvider);
      return { success: true };
    }

    if (providerType === 'apple') {
      await reauthenticateWithPopup(fbUser, appleProvider);
      return { success: true };
    }

    // Fallback check against providerData
    const providerIds = fbUser.providerData.map((p) => p.providerId);
    if (providerIds.includes('google.com')) {
      await reauthenticateWithPopup(fbUser, googleProvider);
      return { success: true };
    }
    if (providerIds.includes('apple.com')) {
      await reauthenticateWithPopup(fbUser, appleProvider);
      return { success: true };
    }

    return {
      success: false,
      error: 'Please log out and sign back in to verify your account before deleting.',
    };
  } catch (err: any) {
    let msg = err?.message || 'Re-authentication failed. Please try again.';
    if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
      msg = 'Incorrect password. Please check your password and try again.';
    } else if (err?.code === 'auth/too-many-requests') {
      msg = 'Too many attempts. Please wait a moment and try again.';
    } else if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
      msg = 'Verification window was closed before completing.';
    } else if (err?.code === 'auth/popup-blocked') {
      msg = 'Pop-up was blocked by your browser. Please allow pop-ups and try again.';
    } else if (err?.code === 'auth/user-mismatch') {
      msg = 'Please sign in with the same account that is currently logged in.';
    }
    return { success: false, error: msg };
  }
}

export async function deleteCurrentUserAccountReal(
  userGroupIds: string[],
  options?: { skipFreshnessPrecheck?: boolean }
): Promise<DeleteAccountResult> {
  const fbUser = auth.currentUser;
  if (!fbUser) return { success: false, error: 'Not signed in.' };

  const uid = fbUser.uid;
  const providerType = getAuthProviderType(fbUser);

  // If the current sign-in session is older than ~4.5 minutes, prompt re-authentication
  // before deleting Firestore documents so cancelling never leaves a partial state.
  if (!options?.skipFreshnessPrecheck && fbUser.metadata?.lastSignInTime) {
    const lastSignInMs = Date.parse(fbUser.metadata.lastSignInTime);
    if (!Number.isNaN(lastSignInMs) && Date.now() - lastSignInMs > 4.5 * 60 * 1000) {
      return {
        success: false,
        requiresRecentLogin: true,
        providerType,
        error: 'For your security, please verify your identity before permanently deleting your account.',
      };
    }
  }

  try {
    // 1. Delete user's notifications subcollection
    try {
      const notifSnap = await getDocs(collection(db, 'users', uid, 'notifications'));
      for (const nDoc of notifSnap.docs) {
        await deleteDoc(nDoc.ref).catch(() => {});
      }
    } catch (err) {
      console.warn('Could not clean up notifications during account deletion:', err);
    }

    // 2. Delete plans created by this user (and their comments by this user)
    const deletedPlanIdsByGroup = new Map<string, string[]>();
    try {
      const plansSnap = await getDocs(
        query(collection(db, 'plans'), where('memberIds', 'array-contains', uid))
      );
      for (const pDoc of plansSnap.docs) {
        const pData = pDoc.data();
        if (pData.createdBy === uid) {
          try {
            const commentsSnap = await getDocs(
              query(
                collection(db, 'plans', pDoc.id, 'comments'),
                where('memberIds', 'array-contains', uid)
              )
            );
            for (const cDoc of commentsSnap.docs) {
              if (cDoc.data().userId === uid) {
                await deleteDoc(cDoc.ref).catch(() => {});
              }
            }
          } catch {
            // ignore comment cleanup errors
          }

          await deleteDoc(pDoc.ref).catch((err) =>
            console.warn(`Could not delete plan ${pDoc.id}:`, err)
          );
          if (typeof pData.groupId === 'string' && pData.groupId) {
            const list = deletedPlanIdsByGroup.get(pData.groupId) || [];
            list.push(pDoc.id);
            deletedPlanIdsByGroup.set(pData.groupId, list);
          }
        }
      }
    } catch (err) {
      console.warn('Could not clean up user plans during account deletion:', err);
    }

    // 3. Delete polls created by this user
    const deletedPollIdsByGroup = new Map<string, string[]>();
    try {
      const pollsSnap = await getDocs(
        query(collection(db, 'polls'), where('memberIds', 'array-contains', uid))
      );
      for (const pollDoc of pollsSnap.docs) {
        const pollData = pollDoc.data();
        if (pollData.createdBy === uid) {
          await deleteDoc(pollDoc.ref).catch((err) =>
            console.warn(`Could not delete poll ${pollDoc.id}:`, err)
          );
          if (typeof pollData.groupId === 'string' && pollData.groupId) {
            const list = deletedPollIdsByGroup.get(pollData.groupId) || [];
            list.push(pollDoc.id);
            deletedPollIdsByGroup.set(pollData.groupId, list);
          }
        }
      }
    } catch (err) {
      console.warn('Could not clean up user polls during account deletion:', err);
    }

    // 4. Clean up or leave groups the user belongs to
    for (const groupId of userGroupIds) {
      try {
        const gRef = doc(db, 'groups', groupId);
        const gSnap = await getDoc(gRef);
        if (gSnap.exists()) {
          const data = gSnap.data();
          const memberIds: string[] = Array.isArray(data.memberIds) ? data.memberIds : [];

          if (memberIds.length <= 1 && data.createdBy === uid) {
            // Delete messages authored by this user before deleting the sole-owned group
            try {
              const msgsSnap = await getDocs(
                query(
                  collection(db, 'groups', groupId, 'messages'),
                  where('memberIds', 'array-contains', uid)
                )
              );
              for (const mDoc of msgsSnap.docs) {
                if (mDoc.data().senderId === uid) {
                  await deleteDoc(mDoc.ref).catch(() => {});
                }
              }
            } catch {
              // ignore message cleanup errors
            }

            if (typeof data.inviteCode === 'string' && data.inviteCode) {
              await deleteDoc(doc(db, 'invites', data.inviteCode)).catch(() => {});
            }
            await deleteDoc(gRef);
          } else if (memberIds.includes(uid) && memberIds.length > 1) {
            const removedPlans = deletedPlanIdsByGroup.get(groupId) || [];
            const removedPolls = deletedPollIdsByGroup.get(groupId) || [];
            if (removedPlans.length > 0 || removedPolls.length > 0) {
              const groupPatch: Record<string, any> = { updatedAt: serverTimestamp() };
              if (removedPlans.length > 0) groupPatch.planIds = arrayRemove(...removedPlans);
              if (removedPolls.length > 0) groupPatch.pollIds = arrayRemove(...removedPolls);
              await updateDoc(gRef, groupPatch).catch(() => {});
            }

            await updateDoc(gRef, {
              memberIds: arrayRemove(uid),
              [`membersMap.${uid}`]: deleteField(),
              updatedAt: serverTimestamp(),
            });
          }
        }
      } catch (err) {
        console.warn(`Could not clean up group ${groupId} during account deletion:`, err);
      }
    }

    // 5. Delete the user's profile document
    await deleteDoc(doc(db, 'users', uid));

    // 6. Delete the Firebase Authentication user account
    if (!auth.currentUser) {
      return { success: false, error: 'Session expired. Please log in again.' };
    }
    await deleteUser(auth.currentUser);
    return { success: true };
  } catch (err: any) {
    if (err?.code === 'auth/requires-recent-login') {
      return {
        success: false,
        requiresRecentLogin: true,
        providerType,
        error: 'For your security, please verify your identity before deleting your account.',
      };
    }
    return { success: false, error: err?.message || 'Could not delete account.' };
  }
}

export function subscribeAuthState(
  callback: (fbUser: FirebaseUser | null) => void
): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

// ---------------------------------------------------------------------------
// Firestore User Profile Updates & Subscriptions
// ---------------------------------------------------------------------------
export function subscribeUserProfile(
  uid: string,
  fallbackUser: User,
  onData: (user: User) => void
): Unsubscribe {
  const ref = doc(db, 'users', uid);
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        onData({
          id: uid,
          name: (data.name as string) || fallbackUser.name,
          nickname: (data.nickname as string) || fallbackUser.nickname,
          email: (data.email as string) || fallbackUser.email,
          avatar: (data.avatar as string) || fallbackUser.avatar,
          groups: fallbackUser.groups,
        });
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${uid}`);
    }
  );
}

export async function updateUserProfileInFirestore(
  user: User,
  updated: Partial<User>,
  userGroupIds: string[]
): Promise<void> {
  const name = clampStr(updated.name ?? user.name, 100, 'Member');
  const nickname = clampStr(updated.nickname ?? (name.split(/\s+/)[0] || 'member'), 60, 'member');
  const avatar = clampAvatar(updated.avatar ?? user.avatar, name);

  try {
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: name }).catch(() => {});
    }

    await updateDoc(doc(db, 'users', user.id), {
      name,
      nickname,
      avatar,
      updatedAt: serverTimestamp(),
    });

    // Sync member display profile inside each group's membersMap
    for (const groupId of userGroupIds) {
      try {
        await updateDoc(doc(db, 'groups', groupId), {
          [`membersMap.${user.id}`]: {
            id: user.id,
            name,
            nickname,
            avatar,
          },
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn(`Could not sync profile to group ${groupId}:`, err);
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${user.id}`);
  }
}

// ---------------------------------------------------------------------------
// Groups & Invites
// ---------------------------------------------------------------------------
function mapDocToGroup(id: string, data: Record<string, any>): Group {
  const membersMap = (data.membersMap && typeof data.membersMap === 'object' ? data.membersMap : {}) as Record<string, Member>;
  const memberIds: string[] = Array.isArray(data.memberIds) ? data.memberIds : Object.keys(membersMap);
  const members: Member[] = memberIds
    .map((uid) => membersMap[uid])
    .filter((m): m is Member => Boolean(m && m.id && m.name));

  return {
    id,
    name: data.name || 'Group',
    description: data.description || '',
    icon: data.icon || 'users',
    image: data.image || undefined,
    avatar: data.image || undefined,
    color: data.color || 'indigo',
    inviteCode: data.inviteCode || '',
    members,
    createdAt: formatTimestampReadable(data.createdAt),
    planIds: Array.isArray(data.planIds) ? data.planIds : [],
    pollIds: Array.isArray(data.pollIds) ? data.pollIds : [],
    memberIds,
    createdBy: data.createdBy || '',
  };
}

export function subscribeUserGroups(
  uid: string,
  onData: (groups: Group[]) => void
): Unsubscribe {
  const q = query(collection(db, 'groups'), where('memberIds', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => mapDocToGroup(d.id, d.data()))
        .sort((a, b) => a.name.localeCompare(b.name));
      onData(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'groups');
    }
  );
}

export async function createGroupInFirestore(
  groupData: Partial<Group>,
  currentUser: User
): Promise<Group> {
  const groupId = makeSafeId('group');
  const name = clampStr(groupData.name, 100, 'New Group');
  const description = clampStr(groupData.description, 500, 'Friends planning group');
  const rawInvite = groupData.inviteCode
    ? groupData.inviteCode.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80)
    : generateInviteCode(name);
  const inviteCode = rawInvite.length >= 3 ? rawInvite : generateInviteCode(name);
  const image = groupData.image && groupData.image.length <= 50000 ? groupData.image.trim() : '';

  const memberObj: Member = {
    id: currentUser.id,
    name: clampStr(currentUser.name, 100, 'Member'),
    nickname: clampStr(currentUser.nickname || currentUser.name, 60, 'member'),
    avatar: clampAvatar(currentUser.avatar, currentUser.name),
    role: 'owner',
  };

  const groupDoc: Record<string, any> = {
    id: groupId,
    name,
    description,
    icon: clampStr(groupData.icon, 50, 'users'),
    color: clampStr(groupData.color, 30, 'indigo'),
    inviteCode,
    createdBy: currentUser.id,
    memberIds: [currentUser.id],
    membersMap: {
      [currentUser.id]: memberObj,
    },
    planIds: [],
    pollIds: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (image) {
    groupDoc.image = image;
  }

  const inviteDoc = {
    inviteCode,
    groupId,
    groupName: name,
    createdBy: currentUser.id,
    createdAt: serverTimestamp(),
  };

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'invites', inviteCode), inviteDoc);
    batch.set(doc(db, 'groups', groupId), groupDoc);
    await batch.commit();

    return {
      id: groupId,
      name,
      description,
      icon: groupDoc.icon,
      image: image || undefined,
      avatar: image || undefined,
      color: groupDoc.color,
      inviteCode,
      members: [memberObj],
      createdAt: 'Just now',
      planIds: [],
      pollIds: [],
      memberIds: [currentUser.id],
      createdBy: currentUser.id,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `groups/${groupId}`);
  }
}

export async function updateGroupInFirestore(
  groupId: string,
  updated: Partial<Group>
): Promise<void> {
  const payload: Record<string, any> = {
    updatedAt: serverTimestamp(),
  };
  if (updated.name !== undefined) payload.name = clampStr(updated.name, 100, 'Group');
  if (updated.description !== undefined) payload.description = clampStr(updated.description, 500);
  if (updated.icon !== undefined) payload.icon = clampStr(updated.icon, 50, 'users');
  if (updated.color !== undefined) payload.color = clampStr(updated.color, 30, 'indigo');

  const newImg = updated.image !== undefined ? updated.image : updated.avatar;
  if (newImg !== undefined) {
    if (!newImg || newImg.trim() === '') {
      payload.image = deleteField();
    } else if (newImg.length <= 50000) {
      payload.image = newImg.trim();
    }
  }

  try {
    await updateDoc(doc(db, 'groups', groupId), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `groups/${groupId}`);
  }
}

export async function joinGroupByInviteCode(
  rawInput: string,
  currentUser: User,
  existingGroups: Group[]
): Promise<{ status: 'joined' | 'already_member' | 'not_found'; groupId?: string; groupName?: string }> {
  const code = extractInviteCode(rawInput);
  if (!code || code.length < 3 || code.length > 80) {
    return { status: 'not_found' };
  }

  const already = existingGroups.find((g) => g.inviteCode.toLowerCase() === code.toLowerCase());
  if (already) {
    return { status: 'already_member', groupId: already.id, groupName: already.name };
  }

  try {
    let inviteSnap = await getDoc(doc(db, 'invites', code));
    if (!inviteSnap.exists() && code !== code.toLowerCase()) {
      inviteSnap = await getDoc(doc(db, 'invites', code.toLowerCase()));
    }
    if (!inviteSnap.exists()) {
      return { status: 'not_found' };
    }
    const inviteData = inviteSnap.data();
    const groupId = inviteData.groupId as string;
    const groupName = (inviteData.groupName as string) || 'Group';

    const memberObj: Member = {
      id: currentUser.id,
      name: clampStr(currentUser.name, 100, 'Member'),
      nickname: clampStr(currentUser.nickname || currentUser.name, 60, 'member'),
      avatar: clampAvatar(currentUser.avatar, currentUser.name),
      role: 'member',
    };

    await updateDoc(doc(db, 'groups', groupId), {
      memberIds: arrayUnion(currentUser.id),
      [`membersMap.${currentUser.id}`]: memberObj,
      updatedAt: serverTimestamp(),
    });

    // Fetch now-accessible group to sync user into existing group plans & polls
    const gSnap = await getDoc(doc(db, 'groups', groupId));
    if (gSnap.exists()) {
      const mapped = mapDocToGroup(gSnap.id, gSnap.data());
      await syncMissingGroupPlansAndPolls(mapped, currentUser.id);
    }

    return { status: 'joined', groupId, groupName };
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `invites/${code}`);
  }
}

export async function syncMissingGroupPlansAndPolls(group: Group, uid: string): Promise<void> {
  const planIds = group.planIds || [];
  const pollIds = group.pollIds || [];

  for (const planId of planIds) {
    try {
      const pRef = doc(db, 'plans', planId);
      const pSnap = await getDoc(pRef);
      if (pSnap.exists()) {
        const memberIds: string[] = Array.isArray(pSnap.data().memberIds) ? pSnap.data().memberIds : [];
        if (!memberIds.includes(uid)) {
          await updateDoc(pRef, {
            memberIds: arrayUnion(uid),
            updatedAt: serverTimestamp(),
          });
        }
      }
    } catch (err) {
      console.warn(`Could not sync membership for plan ${planId}:`, err);
    }
  }

  for (const pollId of pollIds) {
    try {
      const pollRef = doc(db, 'polls', pollId);
      const pollSnap = await getDoc(pollRef);
      if (pollSnap.exists()) {
        const memberIds: string[] = Array.isArray(pollSnap.data().memberIds) ? pollSnap.data().memberIds : [];
        if (!memberIds.includes(uid)) {
          await updateDoc(pollRef, {
            memberIds: arrayUnion(uid),
            updatedAt: serverTimestamp(),
          });
        }
      }
    } catch (err) {
      console.warn(`Could not sync membership for poll ${pollId}:`, err);
    }
  }
}

// ---------------------------------------------------------------------------
// Plans (Events & Proposals) & Comments
// ---------------------------------------------------------------------------
function mapDocToPlan(id: string, data: Record<string, any>): EventPlan & { memberIds: string[] } {
  const rsvpMap = (data.rsvpMap && typeof data.rsvpMap === 'object' ? data.rsvpMap : {}) as Record<string, EventRsvp>;
  const rsvps: EventRsvp[] = Object.values(rsvpMap).filter(
    (r): r is EventRsvp => Boolean(r && r.userId && r.status)
  );

  return {
    id,
    groupId: data.groupId || '',
    groupName: data.groupName || 'Group',
    groupColor: data.groupColor || 'indigo',
    title: data.title || 'Untitled Plan',
    description: data.description || '',
    date: data.date || new Date().toISOString().split('T')[0],
    endDate: data.endDate || undefined,
    startTime: data.startTime || '18:00',
    endTime: data.endTime || '',
    location: data.location || '',
    distanceKm: typeof data.distanceKm === 'number' ? data.distanceKm : undefined,
    weatherCondition: data.weatherCondition || undefined,
    categoryIcon: data.categoryIcon || undefined,
    createdBy: data.createdBy || '',
    createdByName: data.createdByName || 'Member',
    isProposal: Boolean(data.isProposal),
    isRecurring: Boolean(data.isRecurring),
    recurrencePattern: data.recurrencePattern || undefined,
    customRsvpOptions: Array.isArray(data.customRsvpOptions) ? data.customRsvpOptions : undefined,
    rsvps,
    comments: [],
    memberIds: Array.isArray(data.memberIds) ? data.memberIds : [],
  };
}

export function subscribeUserPlans(
  uid: string,
  onData: (plans: EventPlan[]) => void
): Unsubscribe {
  const q = query(collection(db, 'plans'), where('memberIds', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => mapDocToPlan(d.id, d.data()))
        .sort((a, b) => a.date.localeCompare(b.date));
      onData(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'plans');
    }
  );
}

export async function savePlanInFirestore(
  eventData: Partial<EventPlan>,
  group: Group,
  currentUser: User
): Promise<{ id: string; isNew: boolean }> {
  const todayIso = new Date().toISOString().split('T')[0];
  const dateStr =
    eventData.date && /^\d{4}-\d{2}-\d{2}$/.test(eventData.date)
      ? eventData.date
      : todayIso;

  if (eventData.id) {
    const payload: Record<string, any> = {
      title: clampStr(eventData.title, 150, 'Untitled Plan'),
      description: clampStr(eventData.description, 1000),
      date: dateStr,
      startTime: clampStr(eventData.startTime, 20, '18:00'),
      endTime: clampStr(eventData.endTime, 20, ''),
      location: clampStr(eventData.location, 300, ''),
      isProposal: Boolean(eventData.isProposal),
      updatedAt: serverTimestamp(),
    };
    if (eventData.endDate && /^\d{4}-\d{2}-\d{2}$/.test(eventData.endDate)) {
      payload.endDate = eventData.endDate;
    } else {
      payload.endDate = deleteField();
    }
    if (eventData.weatherCondition) {
      payload.weatherCondition = clampStr(eventData.weatherCondition, 100);
    }
    if (eventData.customRsvpOptions) {
      payload.customRsvpOptions = eventData.customRsvpOptions.slice(0, 10).map((s) => clampStr(s, 60));
    }

    try {
      await updateDoc(doc(db, 'plans', eventData.id), payload);
      return { id: eventData.id, isNew: false };
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `plans/${eventData.id}`);
    }
  }

  const planId = makeSafeId('plan');
  const memberIds = Array.from(new Set([...(group.memberIds || group.members.map((m) => m.id)), currentUser.id])).slice(0, 50);

  const planDoc: Record<string, any> = {
    id: planId,
    groupId: group.id,
    groupName: clampStr(group.name, 100, 'Group'),
    groupColor: clampStr(group.color, 30, 'indigo'),
    title: clampStr(eventData.title, 150, 'Untitled Plan'),
    description: clampStr(eventData.description, 1000),
    date: dateStr,
    startTime: clampStr(eventData.startTime, 20, '18:00'),
    endTime: clampStr(eventData.endTime, 20, ''),
    location: clampStr(eventData.location, 300, ''),
    createdBy: currentUser.id,
    createdByName: clampStr(currentUser.name, 100, 'Member'),
    isProposal: Boolean(eventData.isProposal),
    memberIds,
    rsvpMap: {
      [currentUser.id]: {
        userId: currentUser.id,
        userName: clampStr(currentUser.name, 100, 'Member'),
        userAvatar: clampAvatar(currentUser.avatar, currentUser.name),
        status: 'Going',
      },
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (eventData.endDate && /^\d{4}-\d{2}-\d{2}$/.test(eventData.endDate)) {
    planDoc.endDate = eventData.endDate;
  }
  if (eventData.weatherCondition) {
    planDoc.weatherCondition = clampStr(eventData.weatherCondition, 100);
  }
  if (eventData.customRsvpOptions && eventData.customRsvpOptions.length > 0) {
    planDoc.customRsvpOptions = eventData.customRsvpOptions.slice(0, 10).map((s) => clampStr(s, 60));
  }

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'plans', planId), planDoc);
    batch.update(doc(db, 'groups', group.id), {
      planIds: arrayUnion(planId),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();

    // Notify other group members
    const others = memberIds.filter((id) => id !== currentUser.id);
    for (const targetUid of others) {
      const notifId = makeSafeId('notif');
      setDoc(doc(db, 'users', targetUid, 'notifications', notifId), {
        id: notifId,
        type: 'event_invite',
        title: clampStr(`New plan: ${planDoc.title}`, 150),
        message: clampStr(`${currentUser.name} organized "${planDoc.title}" in ${group.name}.`, 500),
        senderId: currentUser.id,
        relatedEventId: planId,
        relatedGroupId: group.id,
        read: false,
        actionRequired: true,
        createdAt: serverTimestamp(),
      }).catch((err) => console.warn('Could not send plan notification:', err));
    }

    return { id: planId, isNew: true };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `plans/${planId}`);
  }
}

export async function deletePlanInFirestore(planId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'plans', planId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `plans/${planId}`);
  }
}

export async function rsvpPlanInFirestore(
  planId: string,
  currentUser: User,
  status: string
): Promise<void> {
  const entry = {
    userId: currentUser.id,
    userName: clampStr(currentUser.name, 100, 'Member'),
    userAvatar: clampAvatar(currentUser.avatar, currentUser.name),
    status: clampStr(status, 60, 'Going'),
  };
  try {
    await updateDoc(doc(db, 'plans', planId), {
      [`rsvpMap.${currentUser.id}`]: entry,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `plans/${planId}`);
  }
}

export function subscribePlanComments(
  planId: string,
  uid: string,
  onData: (comments: EventComment[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'plans', planId, 'comments'),
    where('memberIds', 'array-contains', uid)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            _ms: timestampMillis(data.createdAt),
            item: {
              id: d.id,
              userId: data.userId || '',
              userName: data.userName || 'Member',
              userAvatar: data.userAvatar || createInitialsAvatarDataUrl(data.userName || 'M'),
              text: data.text || '',
              createdAt: formatTimestampReadable(data.createdAt),
            } as EventComment,
          };
        })
        .sort((a, b) => a._ms - b._ms)
        .map((x) => x.item);
      onData(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, `plans/${planId}/comments`);
    }
  );
}

export async function addPlanCommentInFirestore(
  plan: EventPlan,
  group: Group | undefined,
  currentUser: User,
  text: string
): Promise<void> {
  const cleanText = clampStr(text, 1000);
  if (!cleanText) return;
  const commentId = makeSafeId('comment');
  const memberIds = Array.from(
    new Set([
      ...(group?.memberIds || group?.members.map((m) => m.id) || []),
      currentUser.id,
    ])
  ).slice(0, 50);

  try {
    await setDoc(doc(db, 'plans', plan.id, 'comments', commentId), {
      id: commentId,
      userId: currentUser.id,
      userName: clampStr(currentUser.name, 100, 'Member'),
      userAvatar: clampAvatar(currentUser.avatar, currentUser.name),
      text: cleanText,
      memberIds,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `plans/${plan.id}/comments/${commentId}`);
  }
}

// ---------------------------------------------------------------------------
// Polls
// ---------------------------------------------------------------------------
function mapDocToPoll(id: string, data: Record<string, any>): Poll {
  const votesMap = (data.votesMap && typeof data.votesMap === 'object' ? data.votesMap : {}) as Record<string, string>;
  const rawOptions = Array.isArray(data.options) ? data.options : [];
  const options: PollOption[] = rawOptions.map((opt: any) => {
    const optId = String(opt.id || '');
    const voters = Object.entries(votesMap)
      .filter(([, chosenId]) => chosenId === optId)
      .map(([voterUid]) => voterUid);
    return {
      id: optId,
      text: String(opt.text || ''),
      votes: voters,
      suggestedDate: opt.suggestedDate,
      suggestedTime: opt.suggestedTime,
      suggestedLocation: opt.suggestedLocation,
    };
  });

  return {
    id,
    groupId: data.groupId || '',
    groupName: data.groupName || 'Group',
    question: data.question || 'Untitled Poll',
    category: data.category || 'General',
    options,
    createdBy: data.createdBy || '',
    createdByName: data.createdByName || 'Member',
    createdAvatar: data.createdAvatar || createInitialsAvatarDataUrl(data.createdByName || 'M'),
    createdAt: formatTimestampReadable(data.createdAt),
    isClosed: Boolean(data.isClosed),
    winningOptionId: data.winningOptionId || undefined,
  };
}

export function subscribeUserPolls(
  uid: string,
  onData: (polls: Poll[]) => void
): Unsubscribe {
  const q = query(collection(db, 'polls'), where('memberIds', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => ({
          _ms: timestampMillis(d.data().createdAt),
          poll: mapDocToPoll(d.id, d.data()),
        }))
        .sort((a, b) => b._ms - a._ms)
        .map((x) => x.poll);
      onData(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'polls');
    }
  );
}

export async function createPollInFirestore(
  pollData: Partial<Poll>,
  group: Group,
  currentUser: User
): Promise<string> {
  const pollId = makeSafeId('poll');
  const memberIds = Array.from(
    new Set([...(group.memberIds || group.members.map((m) => m.id)), currentUser.id])
  ).slice(0, 50);

  const sanitizedOptions = (pollData.options || [])
    .slice(0, 10)
    .map((o, i) => ({
      id: clampStr(o.id || `opt-${i + 1}`, 64),
      text: clampStr(o.text, 150),
    }))
    .filter((o) => o.text.length > 0);

  const pollDoc = {
    id: pollId,
    groupId: group.id,
    groupName: clampStr(group.name, 100, 'Group'),
    question: clampStr(pollData.question, 200, 'Group Poll'),
    category: clampStr(pollData.category, 40, 'General'),
    options: sanitizedOptions,
    votesMap: {},
    memberIds,
    createdBy: currentUser.id,
    createdByName: clampStr(currentUser.name, 100, 'Member'),
    createdAvatar: clampAvatar(currentUser.avatar, currentUser.name),
    isClosed: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'polls', pollId), pollDoc);
    batch.update(doc(db, 'groups', group.id), {
      pollIds: arrayUnion(pollId),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();

    const others = memberIds.filter((id) => id !== currentUser.id);
    for (const targetUid of others) {
      const notifId = makeSafeId('notif');
      setDoc(doc(db, 'users', targetUid, 'notifications', notifId), {
        id: notifId,
        type: 'poll_created',
        title: clampStr(`New poll in ${group.name}`, 150),
        message: clampStr(`${currentUser.name} asked: "${pollDoc.question}"`, 500),
        senderId: currentUser.id,
        relatedPollId: pollId,
        relatedGroupId: group.id,
        read: false,
        actionRequired: false,
        createdAt: serverTimestamp(),
      }).catch((err) => console.warn('Could not send poll notification:', err));
    }

    return pollId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `polls/${pollId}`);
  }
}

export async function votePollInFirestore(
  pollId: string,
  uid: string,
  optionId: string,
  currentlyVotedThisOption: boolean
): Promise<void> {
  try {
    await updateDoc(doc(db, 'polls', pollId), {
      [`votesMap.${uid}`]: currentlyVotedThisOption ? deleteField() : clampStr(optionId, 64),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `polls/${pollId}`);
  }
}

// ---------------------------------------------------------------------------
// Notifications & Feedback
// ---------------------------------------------------------------------------
export function subscribeNotifications(
  uid: string,
  onData: (items: NotificationItem[]) => void
): Unsubscribe {
  const q = collection(db, 'users', uid, 'notifications');
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            _ms: timestampMillis(data.createdAt),
            item: {
              id: d.id,
              type: data.type || 'event_invite',
              title: data.title || '',
              message: data.message || '',
              timestamp: formatTimestampReadable(data.createdAt),
              read: Boolean(data.read),
              relatedEventId: data.relatedEventId,
              relatedPollId: data.relatedPollId,
              relatedGroupId: data.relatedGroupId,
              actionRequired: Boolean(data.actionRequired),
            } as NotificationItem,
          };
        })
        .sort((a, b) => b._ms - a._ms)
        .map((x) => x.item);
      onData(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, `users/${uid}/notifications`);
    }
  );
}

export async function markAllNotificationsReadInFirestore(
  uid: string,
  unreadIds: string[]
): Promise<void> {
  if (unreadIds.length === 0) return;
  try {
    const batch = writeBatch(db);
    unreadIds.forEach((id) => {
      batch.update(doc(db, 'users', uid, 'notifications', id), { read: true });
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/notifications`);
  }
}

export async function submitFeedbackInFirestore(
  uid: string,
  category: 'suggestion' | 'issue' | 'question',
  message: string
): Promise<void> {
  const cleanMsg = clampStr(message, 2000);
  if (!cleanMsg) return;
  const feedbackId = makeSafeId('fb');
  try {
    await setDoc(doc(db, 'feedback', feedbackId), {
      id: feedbackId,
      userId: uid,
      category,
      message: cleanMsg,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `feedback/${feedbackId}`);
  }
}

// ---------------------------------------------------------------------------
// Group Messages (if used)
// ---------------------------------------------------------------------------
export async function sendGroupMessageInFirestore(
  group: Group,
  currentUser: User,
  text: string
): Promise<void> {
  const cleanText = clampStr(text, 1000);
  if (!cleanText) return;
  const msgId = makeSafeId('msg');
  const memberIds = Array.from(
    new Set([...(group.memberIds || group.members.map((m) => m.id)), currentUser.id])
  ).slice(0, 50);

  try {
    await setDoc(doc(db, 'groups', group.id, 'messages', msgId), {
      id: msgId,
      groupId: group.id,
      senderId: currentUser.id,
      senderName: clampStr(currentUser.name, 100, 'Member'),
      senderAvatar: clampAvatar(currentUser.avatar, currentUser.name),
      text: cleanText,
      memberIds,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `groups/${group.id}/messages/${msgId}`);
  }
}

export type { ChatMessage };
