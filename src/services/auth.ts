import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, getDoc, getDocFromServer, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export async function signUp(name: string, email: string, password: string) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: name });
  await setDoc(doc(db, 'users', credential.user.uid), {
    displayName: name,
    email,
    role: 'trainee',
    createdAt: serverTimestamp(),
  });
  return credential.user;
}

export async function signIn(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email);
}

export async function getUserRole(uid: string): Promise<'coach' | 'trainee' | 'pending_coach' | null> {
  try {
    const snap = await getDocFromServer(doc(db, 'users', uid));
    if (snap.exists()) return snap.data().role ?? null;
    return null;
  } catch {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) return snap.data().role ?? null;
    return null;
  }
}

export async function getUserData(uid: string): Promise<{
  role: 'coach' | 'trainee' | 'pending_coach' | null;
  isAdmin: boolean;
}> {
  try {
    const snap = await getDocFromServer(doc(db, 'users', uid));
    if (snap.exists()) {
      return { role: snap.data().role ?? null, isAdmin: snap.data().isAdmin === true };
    }
  } catch {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      return { role: snap.data().role ?? null, isAdmin: snap.data().isAdmin === true };
    }
  }
  return { role: null, isAdmin: false };
}

export async function saveUserRole(uid: string, role: 'coach' | 'trainee' | 'pending_coach') {
  await setDoc(doc(db, 'users', uid), { role }, { merge: true });
}

export async function getUserFriendSectionName(uid: string): Promise<string> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.data()?.friendSectionName ?? 'Amigos';
}

export async function saveUserFriendSectionName(uid: string, name: string): Promise<void> {
  await setDoc(doc(db, 'users', uid), { friendSectionName: name }, { merge: true });
}

export function parseAuthError(code: string): string {
  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'Este email ya está registrado.',
    'auth/invalid-email': 'El email no es válido.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/user-not-found': 'No existe una cuenta con ese email.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/invalid-credential': 'Email o contraseña incorrectos.',
    'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.',
    'auth/network-request-failed': 'Sin conexión. Revisa tu internet.',
  };
  return messages[code] ?? 'Ocurrió un error. Intenta de nuevo.';
}
