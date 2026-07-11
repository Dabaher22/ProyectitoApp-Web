import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './config/firebase';
import { getUserData } from './services/auth';
import { useAuthStore } from './store/authStore';
import { Colors } from './theme';
import Spinner from './components/Spinner';

import LoginScreen from './screens/auth/LoginScreen';
import RegisterScreen from './screens/auth/RegisterScreen';
import RoleSelectionScreen from './screens/RoleSelectionScreen';
import PendingCoachScreen from './screens/auth/PendingCoachScreen';
import FriendProfileScreen from './screens/trainee/FriendProfileScreen';

import CoachLayout from './screens/coach/CoachLayout';
import CoachDashboardScreen from './screens/coach/CoachDashboardScreen';
import ClientsScreen from './screens/coach/ClientsScreen';
import RoutinesScreen from './screens/coach/RoutinesScreen';
import CoachProfileScreen from './screens/coach/CoachProfileScreen';
import CreateRoutineScreen from './screens/coach/CreateRoutineScreen';
import ExerciseSelectionScreen from './screens/coach/ExerciseSelectionScreen';
import SetsRepsConfigScreen from './screens/coach/SetsRepsConfigScreen';
import CoachProgressViewScreen from './screens/coach/CoachProgressViewScreen';
import AssignRoutineScreen from './screens/coach/AssignRoutineScreen';
import TrainingBoardScreen from './screens/coach/TrainingBoardScreen';
import CreateCircuitScreen from './screens/coach/CreateCircuitScreen';
import CreateNotificationScreen from './screens/coach/CreateNotificationScreen';
import NotificationsScreen from './screens/trainee/NotificationsScreen';
import PeriodizationDashboardScreen from './screens/coach/PeriodizationDashboardScreen';
import CreateMacrocycleScreen from './screens/coach/CreateMacrocycleScreen';
import MacrocycleDetailScreen from './screens/coach/MacrocycleDetailScreen';
import CreateMesocycleScreen from './screens/coach/CreateMesocycleScreen';
import CreateMicrocycleScreen from './screens/coach/CreateMicrocycleScreen';
import TimelineViewScreen from './screens/coach/TimelineViewScreen';
import MyTrainingJourneyScreen from './screens/trainee/MyTrainingJourneyScreen';
import TrainingRoadmapScreen from './screens/trainee/TrainingRoadmapScreen';
import PhaseDetailsScreen from './screens/trainee/PhaseDetailsScreen';
import ProgressAnalyticsScreen from './screens/trainee/ProgressAnalyticsScreen';

import TraineeLayout from './screens/trainee/TraineeLayout';
import TraineeDashboardScreen from './screens/trainee/TraineeDashboardScreen';
import RoutineScreen from './screens/trainee/RoutineScreen';
import HistoryScreen from './screens/trainee/HistoryScreen';
import TraineeProfileScreen from './screens/trainee/TraineeProfileScreen';
import FriendsScreen from './screens/trainee/FriendsScreen';
import WorkoutLoggingScreen from './screens/trainee/WorkoutLoggingScreen';
import CircuitLoggingScreen from './screens/trainee/CircuitLoggingScreen';
import SessionDetailScreen from './screens/shared/SessionDetailScreen';
import AdminGifScreen from './screens/admin/AdminGifScreen';
import AdminCoachesScreen from './screens/admin/AdminCoachesScreen';

// Redirects authenticated users away from auth pages
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { uid, role, trainingMode, authReady } = useAuthStore();
  if (!authReady) return null;
  if (!uid) return <>{children}</>;
  if (role === 'pending_coach') return <Navigate to="/pending-coach" replace />;
  if (role === 'coach' && !trainingMode) return <Navigate to="/coach" replace />;
  return <Navigate to="/trainee" replace />;
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { uid, role, trainingMode, authReady } = useAuthStore();
  if (!authReady) return null;
  if (!uid) return <Navigate to="/login" replace />;
  if (role === 'pending_coach') return <Navigate to="/pending-coach" replace />;
  if (role === 'coach' && !trainingMode) return <Navigate to="/coach" replace />;
  return <>{children}</>;
}

function CoachGuard({ children }: { children: React.ReactNode }) {
  const { uid, role, trainingMode, authReady } = useAuthStore();
  if (!authReady) return null;
  if (!uid) return <Navigate to="/login" replace />;
  if (role === 'pending_coach') return <Navigate to="/pending-coach" replace />;
  if (role !== 'coach' || trainingMode) return <Navigate to="/trainee" replace />;
  return <>{children}</>;
}

function PendingCoachGuard({ children }: { children: React.ReactNode }) {
  const { uid, role, authReady } = useAuthStore();
  if (!authReady) return null;
  if (!uid) return <Navigate to="/login" replace />;
  if (role === 'coach') return <Navigate to="/coach" replace />;
  if (role === 'trainee') return <Navigate to="/trainee" replace />;
  if (!role) return <Navigate to="/select-role" replace />;
  return <>{children}</>;
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { uid, isAdmin, authReady } = useAuthStore();
  if (!authReady) return null;
  if (!uid || !isAdmin) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminCoachGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin, authReady } = useAuthStore();
  if (!authReady) return null;
  if (!isAdmin) return <Navigate to="/coach" replace />;
  return <>{children}</>;
}

export default function App() {
  const { setUser, setRole, setAdmin, setAuthReady, clear, authReady } = useAuthStore();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user.uid, user.email ?? '', user.displayName ?? '');
        const { role, isAdmin } = await getUserData(user.uid);
        setRole(role);
        setAdmin(isAdmin);
      } else {
        clear();
      }
      setAuthReady();
    });
    return unsub;
  }, []);

  if (!authReady) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgPage }}>
        <Spinner color={Colors.orange} size={36} />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth — redirige si ya hay sesión */}
        <Route path="/login" element={<PublicRoute><LoginScreen /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterScreen /></PublicRoute>} />
        <Route path="/select-role" element={<RoleSelectionScreen />} />
        <Route path="/pending-coach" element={<PendingCoachGuard><PendingCoachScreen /></PendingCoachGuard>} />

        {/* Coach */}
        <Route path="/coach" element={<CoachGuard><CoachLayout /></CoachGuard>}>
          <Route index element={<CoachDashboardScreen />} />
          <Route path="clients" element={<ClientsScreen />} />
          <Route path="routines" element={<RoutinesScreen />} />
          <Route path="profile" element={<CoachProfileScreen />} />
          <Route path="create-routine" element={<CreateRoutineScreen />} />
          <Route path="exercise-selection" element={<ExerciseSelectionScreen />} />
          <Route path="sets-reps" element={<SetsRepsConfigScreen />} />
          <Route path="progress/:traineeId" element={<CoachProgressViewScreen />} />
          <Route path="session-detail" element={<SessionDetailScreen />} />
          <Route path="assign-routine/:traineeId" element={<AssignRoutineScreen />} />
          <Route path="board/:traineeId" element={<TrainingBoardScreen />} />
          <Route path="circuits" element={<RoutinesScreen />} />
          <Route path="create-circuit" element={<CreateCircuitScreen />} />
          <Route path="create-notification" element={<CreateNotificationScreen />} />
          <Route path="notifications" element={<NotificationsScreen />} />
          <Route path="periodization" element={<AdminCoachGuard><PeriodizationDashboardScreen /></AdminCoachGuard>} />
          <Route path="periodization/create" element={<AdminCoachGuard><CreateMacrocycleScreen /></AdminCoachGuard>} />
          <Route path="periodization/:macrocycleId" element={<AdminCoachGuard><MacrocycleDetailScreen /></AdminCoachGuard>} />
          <Route path="periodization/:macrocycleId/create-meso" element={<AdminCoachGuard><CreateMesocycleScreen /></AdminCoachGuard>} />
          <Route path="periodization/:macrocycleId/:mesocycleId/create-micro" element={<AdminCoachGuard><CreateMicrocycleScreen /></AdminCoachGuard>} />
          <Route path="periodization/timeline/:macrocycleId" element={<AdminCoachGuard><TimelineViewScreen /></AdminCoachGuard>} />
        </Route>

        {/* Trainee - pantallas completas sin layout */}
        <Route path="/trainee/workout" element={<AuthGuard><WorkoutLoggingScreen /></AuthGuard>} />
        <Route path="/trainee/circuit" element={<AuthGuard><CircuitLoggingScreen /></AuthGuard>} />

        {/* Trainee */}
        <Route path="/trainee" element={<AuthGuard><TraineeLayout /></AuthGuard>}>
          <Route index element={<TraineeDashboardScreen />} />
          <Route path="routine" element={<RoutineScreen />} />
          <Route path="history" element={<HistoryScreen />} />
          <Route path="session-detail" element={<SessionDetailScreen />} />
          <Route path="profile" element={<TraineeProfileScreen />} />
          <Route path="friends" element={<FriendsScreen />} />
          <Route path="friend/:friendId" element={<FriendProfileScreen />} />
          <Route path="notifications" element={<NotificationsScreen />} />
          <Route path="journey" element={<MyTrainingJourneyScreen />} />
          <Route path="journey/roadmap" element={<TrainingRoadmapScreen />} />
          <Route path="journey/phase/:phaseId" element={<PhaseDetailsScreen />} />
          <Route path="journey/analytics" element={<ProgressAnalyticsScreen />} />
        </Route>

        {/* Admin */}
        <Route path="/admin/gifs" element={<AdminGuard><AdminGifScreen /></AdminGuard>} />
        <Route path="/admin/coaches" element={<AdminGuard><AdminCoachesScreen /></AdminGuard>} />

        {/* Default redirect */}
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}

function RootRedirect() {
  const { uid, role, trainingMode } = useAuthStore();
  if (!uid) return <Navigate to="/login" replace />;
  if (role === 'pending_coach') return <Navigate to="/pending-coach" replace />;
  if (role === 'coach' && !trainingMode) return <Navigate to="/coach" replace />;
  return <Navigate to="/trainee" replace />;
}
