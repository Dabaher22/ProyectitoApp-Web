import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, RefreshCw } from 'lucide-react';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import { PendingCoach, getPendingCoaches, approveCoach } from '../../services/adminService';
import ScreenHeader from '../../components/ScreenHeader';
import Spinner from '../../components/Spinner';

export default function AdminCoachesScreen() {
  const navigate = useNavigate();
  const [coaches, setCoaches] = useState<PendingCoach[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await getPendingCoaches();
    setCoaches(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (uid: string) => {
    if (!confirm('¿Aprobar este coach? Podrá acceder al panel de coach.')) return;
    setApproving(uid);
    await approveCoach(uid);
    setCoaches(prev => prev.filter(c => c.uid !== uid));
    setApproving(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: Colors.bgPage, minHeight: '100vh' }}>
      <ScreenHeader title="ADMIN · COACHES PENDIENTES" onBack={() => navigate(-1)} />

      <div style={{ padding: Spacing.md, display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
        {/* Refresh */}
        <button
          onClick={load}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 36, backgroundColor: Colors.bgCard, borderRadius: Radius.md, border: 'none', cursor: 'pointer' }}
        >
          <RefreshCw color={Colors.gray} size={14} />
          <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>Actualizar</span>
        </button>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
            <Spinner color={Colors.orange} size={32} />
          </div>
        ) : coaches.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <span style={{ fontFamily: Fonts.mono, fontSize: 13, color: Colors.gray }}>
              No hay coaches pendientes de aprobación.
            </span>
          </div>
        ) : (
          coaches.map(c => (
            <div
              key={c.uid}
              style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, display: 'flex', alignItems: 'center', gap: Spacing.md }}
            >
              {/* Avatar */}
              <div style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.bgElevated, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 20, color: Colors.orange }}>
                  {c.displayName?.charAt(0).toUpperCase() ?? '?'}
                </span>
              </div>

              {/* Info */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.white }}>{c.displayName || '—'}</span>
                <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>{c.email}</span>
                <span style={{ fontFamily: Fonts.mono, fontSize: 9, color: Colors.bgPlaceholder }}>{c.uid}</span>
              </div>

              {/* Approve button */}
              <button
                onClick={() => handleApprove(c.uid)}
                disabled={approving === c.uid}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  backgroundColor: Colors.orange, borderRadius: Radius.md,
                  padding: '8px 14px', border: 'none', cursor: 'pointer', flexShrink: 0,
                }}
              >
                {approving === c.uid
                  ? <Spinner color={Colors.blackText} size={16} />
                  : <UserCheck color={Colors.blackText} size={16} />
                }
                <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 12, color: Colors.blackText }}>
                  APROBAR
                </span>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
