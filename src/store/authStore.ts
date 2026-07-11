import { create } from 'zustand';

type Role = 'coach' | 'trainee' | 'pending_coach' | null;

interface AuthState {
  uid: string | null;
  email: string | null;
  displayName: string | null;
  role: Role;
  authReady: boolean;
  trainingMode: boolean;
  isAdmin: boolean;
  setUser: (uid: string, email: string, displayName: string) => void;
  setRole: (role: Role) => void;
  setAuthReady: () => void;
  setTrainingMode: (val: boolean) => void;
  setAdmin: (val: boolean) => void;
  clear: () => void;
}

const TRAINING_MODE_KEY = 'app_training_mode';

export const useAuthStore = create<AuthState>((set) => ({
  uid: null,
  email: null,
  displayName: null,
  role: null,
  authReady: false,
  isAdmin: false,
  trainingMode: localStorage.getItem(TRAINING_MODE_KEY) === 'true',
  setUser: (uid, email, displayName) => set({ uid, email, displayName }),
  setRole: (role) => set({ role }),
  setAuthReady: () => set({ authReady: true }),
  setAdmin: (val) => set({ isAdmin: val }),
  setTrainingMode: (val) => {
    localStorage.setItem(TRAINING_MODE_KEY, String(val));
    set({ trainingMode: val });
  },
  clear: () => set({ uid: null, email: null, displayName: null, role: null, isAdmin: false, trainingMode: false }),
}));
