import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Repeat, Zap, Plus, Minus } from 'lucide-react';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { Circuit } from '../../services/circuits';

const CIRCUIT_COLOR = '#B980FF';

type Phase = 'ready' | 'running' | 'finished';

export default function CircuitLoggingScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const uid = useAuthStore((s) => s.uid)!;
  const circuit = location.state as Circuit | null;

  const totalSeconds = ((circuit?.format === 'amrap' ? circuit.timeLimitMinutes : circuit?.totalMinutes) ?? 15) * 60;
  const totalMinutes = Math.round(totalSeconds / 60);

  const [phase, setPhase] = useState<Phase>('ready');
  const [secsLeft, setSecsLeft] = useState(totalSeconds);
  const [rounds, setRounds] = useState(0);           // AMRAP: completed rounds
  const [emomMinute, setEmomMinute] = useState(0);    // EMOM: current minute (0-indexed)
  const [emomSecsInMinute, setEmomSecsInMinute] = useState(60);
  const [showExitModal, setShowExitModal] = useState(false);
  const startEpochRef = useRef<number>(0);
  const isAmrap = circuit?.format === 'amrap';

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // AMRAP: main countdown
  useEffect(() => {
    if (phase !== 'running' || !isAmrap) return;
    if (secsLeft <= 0) { setPhase('finished'); return; }
    const t = setTimeout(() => setSecsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, secsLeft, isAmrap]);

  // EMOM: per-minute countdown
  useEffect(() => {
    if (phase !== 'running' || isAmrap) return;
    if (emomMinute >= totalMinutes) { setPhase('finished'); return; }
    if (emomSecsInMinute <= 0) {
      const next = emomMinute + 1;
      setEmomMinute(next);
      setEmomSecsInMinute(60);
      return;
    }
    const t = setTimeout(() => setEmomSecsInMinute((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, emomSecsInMinute, emomMinute, isAmrap, totalMinutes]);

  if (!circuit) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: Colors.bgPage }}>
        <span style={{ color: Colors.gray, fontFamily: Fonts.mono }}>Circuito no encontrado.</span>
      </div>
    );
  }

  const currentEmomEx = circuit.exercises[emomMinute % circuit.exercises.length];
  const minutes = isAmrap ? circuit.timeLimitMinutes : circuit.totalMinutes;
  const Icon = isAmrap ? Repeat : Zap;

  /* ─── Ready screen ─────────────────────── */
  if (phase === 'ready') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: Colors.bgPage }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: `${Spacing.md}px ${Spacing.lg}px`, paddingTop: 'calc(16px + env(safe-area-inset-top))' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
            <ArrowLeft color={Colors.white} size={22} />
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, gap: Spacing.lg }}>
          <div style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: CIRCUIT_COLOR + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon color={CIRCUIT_COLOR} size={32} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: CIRCUIT_COLOR, letterSpacing: 0.5 }}>{circuit.format.toUpperCase()}</div>
            <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 26, color: Colors.white, textTransform: 'uppercase', marginTop: 4 }}>{circuit.name}</div>
            <div style={{ fontFamily: Fonts.mono, fontSize: 13, color: Colors.gray, marginTop: 6 }}>
              {isAmrap ? `${minutes} minutos · máx. rondas` : `${minutes} minutos · ${circuit.exercises.length} ejercicio${circuit.exercises.length > 1 ? 's' : ''}`}
            </div>
          </div>
          <div style={{ width: '100%', maxWidth: 340, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
            {isAmrap && <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, letterSpacing: 0.5 }}>POR RONDA</div>}
            {!isAmrap && <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, letterSpacing: 0.5 }}>ROTACIÓN DE EJERCICIOS</div>}
            {circuit.exercises.map((e, i) => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm }}>
                  {!isAmrap && <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: CIRCUIT_COLOR, minWidth: 50 }}>Min {i + 1}{circuit.exercises.length > 1 ? `, ${i + 1 + circuit.exercises.length}...` : ''}</span>}
                  <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: Colors.white }}>{e.name}</span>
                </div>
                <span style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 13, color: CIRCUIT_COLOR }}>×{e.reps}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: Spacing.lg, paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
          <button onClick={() => { startEpochRef.current = Date.now(); setPhase('running'); }} style={{
            width: '100%', height: 56, backgroundColor: CIRCUIT_COLOR, borderRadius: Radius.lg, border: 'none',
            cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 18, color: Colors.white, letterSpacing: 1,
          }}>
            INICIAR {circuit.format.toUpperCase()} →
          </button>
        </div>
      </div>
    );
  }

  /* ─── Finished screen ──────────────────── */
  if (phase === 'finished') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: Colors.bgPage, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg }}>
        <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Spacing.lg }}>
          <div style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: CIRCUIT_COLOR + '25', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 36 }}>⏱</span>
          </div>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 28, color: Colors.white, textAlign: 'center', letterSpacing: 1 }}>¡TIEMPO!</span>
          {isAmrap && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 52, color: CIRCUIT_COLOR }}>{rounds}</div>
              <div style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray }}>ronda{rounds !== 1 ? 's' : ''} completada{rounds !== 1 ? 's' : ''}</div>
            </div>
          )}
          {!isAmrap && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 52, color: CIRCUIT_COLOR }}>{Math.min(emomMinute, totalMinutes)}</div>
              <div style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray }}>minutos completados de {totalMinutes}</div>
            </div>
          )}
          <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: Colors.white, textTransform: 'uppercase' }}>{circuit.name}</div>
          <button onClick={() => navigate(-1)} style={{ width: '100%', height: 52, backgroundColor: CIRCUIT_COLOR, borderRadius: Radius.lg, border: 'none', cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: Colors.white, marginTop: Spacing.sm }}>
            LISTO
          </button>
        </div>
      </div>
    );
  }

  /* ─── Running: AMRAP ───────────────────── */
  if (isAmrap) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: Colors.bgPage }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${Spacing.md}px ${Spacing.lg}px`, paddingTop: 'calc(16px + env(safe-area-inset-top))' }}>
          <button onClick={() => setShowExitModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
            <ArrowLeft color={Colors.white} size={22} />
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: CIRCUIT_COLOR, letterSpacing: 1 }}>AMRAP</div>
            <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>{circuit.name}</div>
          </div>
          <div style={{ width: 22 }} />
        </div>

        {/* Timer */}
        <div style={{ textAlign: 'center', paddingTop: Spacing.md, paddingBottom: Spacing.sm }}>
          <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 52, color: secsLeft <= 30 ? Colors.orange : CIRCUIT_COLOR, letterSpacing: 4 }}>
            {formatTime(secsLeft)}
          </div>
          <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, letterSpacing: 0.5 }}>TIEMPO RESTANTE</div>
        </div>

        {/* Exercise list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: `0 ${Spacing.lg}px` }}>
          <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, letterSpacing: 0.5, marginBottom: 8 }}>POR RONDA</div>
          {circuit.exercises.map((e, i) => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: Spacing.sm, paddingBottom: Spacing.sm, borderBottom: i < circuit.exercises.length - 1 ? `1px solid ${Colors.bgElevated}` : 'none' }}>
              <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: Colors.white, textTransform: 'uppercase' }}>{e.name}</span>
              <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 18, color: CIRCUIT_COLOR }}>×{e.reps}</span>
            </div>
          ))}
        </div>

        {/* Round counter */}
        <div style={{ padding: Spacing.lg, paddingBottom: 'calc(24px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
          <div style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={() => setRounds((r) => Math.max(0, r - 1))} style={{ width: 44, height: 44, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Minus color={Colors.white} size={20} />
            </button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 44, color: Colors.white, lineHeight: 1 }}>{rounds}</div>
              <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, letterSpacing: 0.5 }}>RONDAS</div>
            </div>
            <button onClick={() => setRounds((r) => r + 1)} style={{ width: 44, height: 44, backgroundColor: CIRCUIT_COLOR, borderRadius: Radius.md, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus color={Colors.white} size={20} />
            </button>
          </div>
          <button onClick={() => setPhase('finished')} style={{ height: 48, backgroundColor: Colors.bgElevated, borderRadius: Radius.lg, border: 'none', cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: Colors.gray }}>
            TERMINAR AMRAP
          </button>
        </div>

        {showExitModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
            <div style={{ width: '100%', backgroundColor: Colors.bgCard, borderRadius: '20px 20px 0 0', padding: '24px 24px calc(24px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 20, color: Colors.white }}>¿SALIR DEL CIRCUITO?</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                <button onClick={() => { setPhase('finished'); setShowExitModal(false); }} style={{ height: 52, borderRadius: Radius.lg, backgroundColor: CIRCUIT_COLOR, border: 'none', cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.white }}>GUARDAR RESULTADO</button>
                <button onClick={() => navigate(-1)} style={{ height: 52, borderRadius: Radius.lg, backgroundColor: Colors.bgElevated, border: 'none', cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.gray }}>SALIR SIN GUARDAR</button>
                <button onClick={() => setShowExitModal(false)} style={{ height: 52, borderRadius: Radius.lg, backgroundColor: 'transparent', border: `1px solid ${Colors.bgElevated}`, cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.white }}>CONTINUAR</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ─── Running: EMOM ────────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: Colors.bgPage }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${Spacing.md}px ${Spacing.lg}px`, paddingTop: 'calc(16px + env(safe-area-inset-top))' }}>
        <button onClick={() => setShowExitModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
          <ArrowLeft color={Colors.white} size={22} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: CIRCUIT_COLOR, letterSpacing: 1 }}>EMOM</div>
          <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>{circuit.name}</div>
        </div>
        <div style={{ width: 22 }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, gap: Spacing.lg }}>
        {/* Minute indicator */}
        <div style={{ fontFamily: Fonts.mono, fontWeight: 700, fontSize: 14, color: Colors.gray, letterSpacing: 0.5 }}>
          MINUTO {emomMinute + 1} DE {totalMinutes}
        </div>

        {/* Per-minute countdown */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 64, color: emomSecsInMinute <= 10 ? Colors.orange : CIRCUIT_COLOR, letterSpacing: 4, lineHeight: 1 }}>
            {String(emomSecsInMinute).padStart(2, '0')}
          </div>
          <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, letterSpacing: 0.5, marginTop: 4 }}>SEGUNDOS</div>
        </div>

        {/* Current exercise */}
        {currentEmomEx && (
          <div style={{ textAlign: 'center', backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.lg, width: '100%', maxWidth: 340, border: `1px solid ${CIRCUIT_COLOR}30` }}>
            <div style={{ fontFamily: Fonts.mono, fontSize: 10, color: CIRCUIT_COLOR, letterSpacing: 0.5, marginBottom: 8 }}>AHORA</div>
            <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 24, color: Colors.white, textTransform: 'uppercase' }}>{currentEmomEx.name}</div>
            <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 40, color: CIRCUIT_COLOR, marginTop: 8 }}>×{currentEmomEx.reps}</div>
          </div>
        )}

        {/* Next exercise preview */}
        {circuit.exercises.length > 1 && (
          <div style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray }}>
            Próximo: {circuit.exercises[(emomMinute + 1) % circuit.exercises.length]?.name} ×{circuit.exercises[(emomMinute + 1) % circuit.exercises.length]?.reps}
          </div>
        )}

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 300 }}>
          {Array.from({ length: totalMinutes }).map((_, i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i < emomMinute ? CIRCUIT_COLOR : i === emomMinute ? Colors.white : Colors.bgElevated }} />
          ))}
        </div>
      </div>

      <div style={{ padding: Spacing.lg, paddingBottom: 'calc(24px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
        <button onClick={() => { setEmomMinute((m) => m + 1); setEmomSecsInMinute(60); }} style={{ height: 52, backgroundColor: CIRCUIT_COLOR, borderRadius: Radius.lg, border: 'none', cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.white }}>
          ✓ MINUTO COMPLETADO
        </button>
        <button onClick={() => { setPhase('finished'); }} style={{ height: 40, backgroundColor: Colors.bgElevated, borderRadius: Radius.lg, border: 'none', cursor: 'pointer', fontFamily: Fonts.mono, fontWeight: 700, fontSize: 12, color: Colors.gray }}>
          TERMINAR EMOM
        </button>
      </div>

      {showExitModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
          <div style={{ width: '100%', backgroundColor: Colors.bgCard, borderRadius: '20px 20px 0 0', padding: '24px 24px calc(24px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 20, color: Colors.white }}>¿SALIR DEL CIRCUITO?</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              <button onClick={() => { setPhase('finished'); setShowExitModal(false); }} style={{ height: 52, borderRadius: Radius.lg, backgroundColor: CIRCUIT_COLOR, border: 'none', cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.white }}>GUARDAR RESULTADO</button>
              <button onClick={() => navigate(-1)} style={{ height: 52, borderRadius: Radius.lg, backgroundColor: Colors.bgElevated, border: 'none', cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.gray }}>SALIR SIN GUARDAR</button>
              <button onClick={() => setShowExitModal(false)} style={{ height: 52, borderRadius: Radius.lg, backgroundColor: 'transparent', border: `1px solid ${Colors.bgElevated}`, cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.white }}>CONTINUAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
