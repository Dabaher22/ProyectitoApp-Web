import React, { useState } from 'react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import Spinner from '../../components/Spinner';
import { uploadPaymentProof, submitPaymentReport } from '../../services/memberships';

interface Props {
  traineeId: string;
  coachId: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function ReportPaymentModal({ traineeId, coachId, onClose, onSubmitted }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!file) return;
    setSubmitting(true);
    try {
      const imageUrl = await uploadPaymentProof(traineeId, file);
      await submitPaymentReport(traineeId, coachId, imageUrl, note.trim() || undefined);
      onSubmitted();
    } catch {
      alert('No se pudo enviar el comprobante. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', backgroundColor: Colors.bgCard, borderRadius: '20px 20px 0 0',
          padding: `${Spacing.lg}px ${Spacing.lg}px calc(${Spacing.lg}px + env(safe-area-inset-bottom))`,
          display: 'flex', flexDirection: 'column', gap: Spacing.md,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: Colors.white, letterSpacing: 0.5 }}>REPORTAR PAGO</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <X color={Colors.gray} size={20} />
          </button>
        </div>

        <label style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
          height: previewUrl ? 220 : 140, borderRadius: Radius.md, border: `1px dashed ${Colors.teal}60`,
          backgroundColor: Colors.bgElevated, cursor: 'pointer', overflow: 'hidden',
        }}>
          <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
          {previewUrl ? (
            <img src={previewUrl} alt="Comprobante" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <>
              <Upload color={Colors.teal} size={24} />
              <span style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.gray }}>Toca para subir la captura del depósito</span>
            </>
          )}
        </label>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nota para tu coach (opcional)..."
          rows={2}
          style={{ width: '100%', borderRadius: Radius.md, backgroundColor: Colors.bgElevated, border: `1px solid ${Colors.bgPlaceholder}`, padding: '10px 12px', fontFamily: Fonts.mono, fontSize: 13, color: Colors.white, resize: 'none', outline: 'none', lineHeight: 1.5, boxSizing: 'border-box' }}
        />

        <button onClick={handleSubmit} disabled={!file || submitting} style={{
          height: 52, borderRadius: Radius.lg, backgroundColor: Colors.teal, border: 'none',
          cursor: file && !submitting ? 'pointer' : 'default', opacity: file ? 1 : 0.5,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {submitting ? <Spinner color={Colors.blackText} size={18} /> : <ImageIcon color={Colors.blackText} size={18} />}
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: Colors.blackText, letterSpacing: 0.5 }}>
            {submitting ? 'ENVIANDO...' : 'ENVIAR COMPROBANTE'}
          </span>
        </button>
      </div>
    </div>
  );
}
