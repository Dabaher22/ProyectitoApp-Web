import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, ClipboardList, User, CalendarRange, Zap, type LucideIcon } from 'lucide-react';
import { Colors, Fonts, Spacing, Radius } from '../../theme';
import { dirtyGuard } from '../../store/dirtyGuard';
import { useAuthStore } from '../../store/authStore';
import Spinner from '../../components/Spinner';

interface NavItem { to: string; label: string; icon: LucideIcon; end?: boolean }

const BASE_NAV: NavItem[] = [
  { to: '/coach', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/coach/clients', label: 'Asesorados', icon: Users },
  { to: '/coach/routines', label: 'Rutinas', icon: ClipboardList },
  { to: '/coach/profile', label: 'Perfil', icon: User },
];
const PLAN_ITEM: NavItem = { to: '/coach/periodization', label: 'Plan', icon: CalendarRange };

const SIDEBAR_WIDTH = 220;

export default function CoachLayout() {
  const navigate = useNavigate();
  const { isAdmin } = useAuthStore();
  const NAV_ITEMS = isAdmin
    ? [BASE_NAV[0], BASE_NAV[1], BASE_NAV[2], PLAN_ITEM, BASE_NAV[3]]
    : BASE_NAV;
  const [dirtyModal, setDirtyModal] = useState<{ pendingTo: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const handleNavClick = (e: React.MouseEvent, to: string) => {
    if (dirtyGuard.get()) {
      e.preventDefault();
      setDirtyModal({ pendingTo: to });
    } else {
      dirtyGuard.set(false);
    }
  };

  const handleSaveAndLeave = async () => {
    if (!dirtyModal) return;
    setSaving(true);
    try {
      const fn = dirtyGuard.getSaveCallback();
      if (fn) await fn();
      dirtyGuard.set(false);
      setDirtyModal(null);
      navigate(dirtyModal.pendingTo);
    } catch {
      alert('No se pudo guardar la rutina.');
    } finally {
      setSaving(false);
    }
  };

  const handleLeaveWithoutSave = () => {
    if (!dirtyModal) return;
    const to = dirtyModal.pendingTo;
    dirtyGuard.set(false);
    dirtyGuard.setSaveCallback(null);
    setDirtyModal(null);
    navigate(to);
  };

  return (
    <>
      {/* Desktop sidebar */}
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
          {/* Logo */}
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
                onClick={(e) => handleNavClick(e, to)}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: Spacing.sm,
                  padding: `10px ${Spacing.sm}px`,
                  borderRadius: Radius.md,
                  backgroundColor: isActive ? Colors.orange + '20' : 'transparent',
                  color: isActive ? Colors.orange : Colors.gray,
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

        {/* Main content */}
        <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }} className="main-content">
          <div style={{ flex: 1, maxWidth: 960, width: '100%', margin: '0 auto' }}>
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div className="mobile-bottom-nav" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.bgCard,
        borderTop: `1px solid ${Colors.bgElevated}`,
        display: 'flex',
        zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={(e) => handleNavClick(e, to)}
            style={({ isActive }) => ({
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: `${Spacing.sm}px 0`,
              color: isActive ? Colors.orange : Colors.gray,
              textDecoration: 'none',
              gap: 3,
            })}
          >
            <Icon size={22} />
            <span style={{ fontFamily: Fonts.mono, fontSize: 9, fontWeight: 700, letterSpacing: 0.3 }}>
              {label.toUpperCase()}
            </span>
          </NavLink>
        ))}
      </div>

      {/* Dirty guard modal */}
      {dirtyModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}
          onClick={() => !saving && setDirtyModal(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: '100%', backgroundColor: Colors.bgCard, borderRadius: '20px 20px 0 0',
            padding: '24px 24px calc(24px + env(safe-area-inset-bottom))',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.bgPlaceholder, alignSelf: 'center', marginBottom: 8 }} />
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 20, color: Colors.white }}>¿SALIR DE LA RUTINA?</span>
            <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray, lineHeight: 1.6 }}>
              Tienes cambios sin guardar. ¿Qué deseas hacer?
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              <button
                onClick={handleSaveAndLeave}
                disabled={saving}
                style={{ height: 52, borderRadius: Radius.lg, backgroundColor: Colors.orange, border: 'none', cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.blackText, letterSpacing: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {saving && <Spinner color={Colors.blackText} size={18} />}
                {saving ? 'GUARDANDO...' : 'GUARDAR Y SALIR'}
              </button>
              <button
                onClick={handleLeaveWithoutSave}
                disabled={saving}
                style={{ height: 52, borderRadius: Radius.lg, backgroundColor: Colors.bgElevated, border: 'none', cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.gray, letterSpacing: 0.5 }}
              >
                SALIR SIN GUARDAR
              </button>
              <button
                onClick={() => setDirtyModal(null)}
                disabled={saving}
                style={{ height: 52, borderRadius: Radius.lg, backgroundColor: 'transparent', border: `1px solid ${Colors.bgElevated}`, cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.white, letterSpacing: 0.5 }}
              >
                CONTINUAR EDITANDO
              </button>
            </div>
          </div>
        </div>
      )}

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
