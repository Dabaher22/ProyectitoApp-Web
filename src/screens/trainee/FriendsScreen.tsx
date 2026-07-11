import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Copy, Check, Users } from 'lucide-react';
import ScreenHeader from '../../components/ScreenHeader';
import Spinner from '../../components/Spinner';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { generateFriendInvite, addFriendWithCode, getFriendships, getFriendName, getFriendId, Friendship } from '../../services/friends';

export default function FriendsScreen() {
  const navigate = useNavigate();
  const { uid, displayName } = useAuthStore();

  const [friends, setFriends] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);

  // Add friend
  const [friendCode, setFriendCode] = useState('');
  const [addingFriend, setAddingFriend] = useState(false);
  const [friendError, setFriendError] = useState('');

  // Invite code
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!uid) return;
    getFriendships(uid).then(setFriends).finally(() => setLoading(false));
  }, [uid]);

  const handleGenerateCode = async () => {
    if (!uid || !displayName) return;
    setGeneratingCode(true);
    try {
      const c = await generateFriendInvite(uid, displayName);
      setInviteCode(c);
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCopy = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddFriend = async () => {
    if (friendCode.trim().length < 6) { setFriendError('Ingresa un código de 6 caracteres.'); return; }
    if (!uid || !displayName) return;
    setAddingFriend(true); setFriendError('');
    try {
      const name = await addFriendWithCode(friendCode.trim(), uid, displayName);
      alert(`¡${name} agregado como amigo!`);
      setFriendCode('');
      const updated = await getFriendships(uid);
      setFriends(updated);
    } catch (err: any) {
      setFriendError(err.message ?? 'No se pudo agregar.');
    } finally {
      setAddingFriend(false);
    }
  };

  return (
    <div>
      <ScreenHeader title="AMIGOS" />
      <div style={{ padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.lg }}>

        {/* Add friend section */}
        <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.lg, display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>AGREGAR AMIGO</span>

          {/* Generate invite code */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
            <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>Comparte tu código para que te agreguen:</span>
            {inviteCode ? (
              <div style={{ display: 'flex', gap: Spacing.sm, alignItems: 'center' }}>
                <div style={{ flex: 1, height: 50, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 22, color: Colors.teal, letterSpacing: 6 }}>{inviteCode}</span>
                </div>
                <button onClick={handleCopy} style={{ height: 50, width: 50, backgroundColor: Colors.teal + '20', borderRadius: Radius.md, border: `1px solid ${Colors.teal}40`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {copied ? <Check color={Colors.teal} size={18} /> : <Copy color={Colors.teal} size={18} />}
                </button>
              </div>
            ) : (
              <button onClick={handleGenerateCode} disabled={generatingCode} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
                height: 46, backgroundColor: Colors.bgElevated, borderRadius: Radius.md,
                border: `1px solid ${Colors.teal}30`, cursor: 'pointer',
              }}>
                {generatingCode ? <Spinner color={Colors.teal} size={18} /> : <UserPlus color={Colors.teal} size={16} />}
                <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.teal }}>GENERAR MI CÓDIGO</span>
              </button>
            )}
          </div>

          {/* Divider */}
          <div style={{ height: 1, backgroundColor: Colors.bgElevated }} />

          {/* Add by code */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
            <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>Ingresa el código de un amigo:</span>
            {friendError && <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.orange }}>{friendError}</span>}
            <div style={{ display: 'flex', gap: Spacing.sm, alignItems: 'center' }}>
              <input
                value={friendCode}
                onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
                placeholder="CÓDIGO"
                maxLength={6}
                onKeyDown={(e) => e.key === 'Enter' && handleAddFriend()}
                style={{
                  flex: 1, height: 50, backgroundColor: Colors.bgElevated, borderRadius: Radius.md,
                  textAlign: 'center', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 22,
                  color: Colors.white, letterSpacing: 6, border: 'none', outline: 'none',
                }}
              />
              {addingFriend ? (
                <Spinner color={Colors.teal} size={28} />
              ) : (
                <button onClick={handleAddFriend} style={{
                  display: 'flex', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.teal,
                  borderRadius: Radius.md, paddingLeft: Spacing.md, paddingRight: Spacing.md, height: 50, border: 'none', cursor: 'pointer',
                }}>
                  <UserPlus color={Colors.blackText} size={18} />
                  <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.blackText }}>AGREGAR</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Friends list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray, letterSpacing: 2 }}>MIS AMIGOS</span>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner color={Colors.teal} size={28} /></div>
          ) : friends.length === 0 ? (
            <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.lg, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Spacing.md }}>
              <Users color={Colors.gray} size={28} />
              <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray, textAlign: 'center' }}>Aún no tienes amigos agregados.</span>
            </div>
          ) : (
            friends.map((f) => {
              const name = getFriendName(f, uid!);
              const fid = getFriendId(f, uid!);
              return (
                <button
                  key={f.id}
                  onClick={() => navigate(`/trainee/friend/${fid}`, { state: { friendName: name } })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: Spacing.md,
                    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
                    padding: Spacing.md, border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.teal + '25', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 20, color: Colors.teal }}>{name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.white, textTransform: 'uppercase' }}>{name}</div>
                    <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, marginTop: 2 }}>Ver perfil →</div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
