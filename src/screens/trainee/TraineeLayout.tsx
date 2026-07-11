import React, { useEffect, useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Dumbbell, Clock, User, Route, Zap } from 'lucide-react';
import { Colors, Fonts, Spacing, Radius } from '../../theme';
import { getMacrocyclesByTrainee, getActiveMacrocycle } from '../../services/periodization';
import { useAuthStore } from '../../store/authStore';

const BASE_NAV = [
  { to: '/trainee', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/trainee/routine', label: 'Rutina', icon: Dumbbell },
  { to: '/trainee/history', label: 'Historial', icon: Clock },
  { to: '/trainee/profile', label: 'Perfil', icon: User },
];

const JOURNEY_ITEM = { to: '/trainee/journey', label: 'Journey', icon: Route, end: false };

const SIDEBAR_WIDTH = 220;

export default function TraineeLayout() {
  const { uid } = useAuthStore();
  const [hasActivePlan, setHasActivePlan] = useState(false);

  useEffect(() => {
    if (!uid) return;
    getMacrocyclesByTrainee(uid)
      .then((macros) => setHasActivePlan(!!getActiveMacrocycle(macros)))
      .catch(() => {});
  }, [uid]);

  const NAV_ITEMS = hasActivePlan
    ? [BASE_NAV[0], BASE_NAV[1], JOURNEY_ITEM, BASE_NAV[2], BASE_NAV[3]]
    : BASE_NAV;
  return (
    <>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <aside style={{
          width: SIDEBAR_WIDTH,
          backgroundColor: Colors.bgCard,
          borderRight: `1px solid ${Colors.bgElevated}`,
          display: 'flex',
          flexDirection: 'column',
          padding: `${Spacing.lg}px ${Spacing.md}px`,
          gap: Spacing.xs,
          flexShrink: 0,
        }} className="desktop-sidebar">
          <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm, paddingLeft: Spacing.sm, marginBottom: Spacing.lg }}>
            <div style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Zap color={Colors.blackText} fill={Colors.blackText} size={16} />
            </div>
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 18, color: Colors.white, letterSpacing: 2 }}>PROYECTITO</span>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: Spacing.sm,
                  padding: `10px ${Spacing.sm}px`,
                  borderRadius: Radius.md,
                  backgroundColor: isActive ? Colors.teal + '20' : 'transparent',
                  color: isActive ? Colors.teal : Colors.gray,
                  fontFamily: Fonts.mono,
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: 0.5,
                  textDecoration: 'none',
                  transition: 'background-color 0.15s',
                })}
              >
                <Icon size={18} />
                {label.toUpperCase()}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }} className="main-content">
          <div style={{ flex: 1, maxWidth: 960, width: '100%', margin: '0 auto' }}>
            <Outlet />
          </div>
        </main>
      </div>

      <div className="mobile-bottom-nav" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        backgroundColor: Colors.bgCard,
        borderTop: `1px solid ${Colors.bgElevated}`,
        display: 'flex', zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} style={({ isActive }) => ({
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: `${Spacing.sm}px 0`,
            color: isActive ? Colors.teal : Colors.gray,
            textDecoration: 'none', gap: 3,
          })}>
            <Icon size={22} />
            <span style={{ fontFamily: Fonts.mono, fontSize: 9, fontWeight: 700, letterSpacing: 0.3 }}>{label.toUpperCase()}</span>
          </NavLink>
        ))}
      </div>

      <style>{`
        @media (min-width: 768px) {
          .mobile-bottom-nav { display: none !important; }
          .desktop-sidebar { display: flex !important; }
          .main-content { padding-bottom: 0 !important; }
          .screen-full { height: 100%; }
        }
        @media (max-width: 767px) {
          .desktop-sidebar { display: none !important; }
          .mobile-bottom-nav { display: flex !important; }
          .main-content { padding-bottom: calc(64px + env(safe-area-inset-bottom)); }
          .screen-full { height: calc(100% - env(safe-area-inset-bottom)); }
        }
      `}</style>
    </>
  );
}
