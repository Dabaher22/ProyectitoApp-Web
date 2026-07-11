import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported, Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: 'AIzaSyCl09N_sw7jueCeTotzW_9G3AMBf9SEabk',
  authDomain: 'proyectito-50262.firebaseapp.com',
  projectId: 'proyectito-50262',
  storageBucket: 'proyectito-50262.firebasestorage.app',
  messagingSenderId: '1084048549320',
  appId: '1:1084048549320:web:2d67feaa3910386208ccfd',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

let _messaging: Messaging | null = null;
export async function getMessagingInstance(): Promise<Messaging | null> {
  if (_messaging) return _messaging;
  const supported = await isSupported();
  if (!supported) return null;
  _messaging = getMessaging(app);
  return _messaging;
}
