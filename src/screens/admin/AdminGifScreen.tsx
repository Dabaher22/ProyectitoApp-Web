import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronUp, ChevronDown, Plus, Save, Trash2, Link } from 'lucide-react';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import {
  GifMeta,
  getGifLibrary,
  gifLibraryIsSeeded,
  seedIfEmpty,
  addGif,
  updateGif,
  deleteGif,
  swapGifOrder,
  getMuscleGroups,
  saveMuscleGroups,
} from '../../services/gifLibrary';
import ScreenHeader from '../../components/ScreenHeader';
import Spinner from '../../components/Spinner';

export default function AdminGifScreen() {
  const navigate = useNavigate();
  const [gifs, setGifs] = useState<GifMeta[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeded, setSeeded] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [activeTab, setActiveTab] = useState('');
  const [selected, setSelected] = useState<GifMeta | null>(null);
  const [editName, setEditName] = useState('');
  const [editMuscle, setEditMuscle] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [newMuscle, setNewMuscle] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [resolving, setResolving] = useState(false);
  // New group modal
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [savingGroup, setSavingGroup] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    const [data, groups] = await Promise.all([getGifLibrary(), getMuscleGroups()]);
    setGifs(data);
    setSeeded(gifLibraryIsSeeded());
    setMuscleGroups(groups);
    if (!activeTab || !groups.includes(activeTab)) {
      setActiveTab(groups[0] ?? '');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSeed = async () => {
    setSeeding(true);
    await seedIfEmpty();
    await load();
    setSeeding(false);
  };

  const tabGifs = gifs
    .filter(g => g.muscle === activeTab)
    .sort((a, b) => a.order - b.order);

  const handleSelect = (g: GifMeta) => {
    setSelected(g);
    setEditName(g.name);
    setEditMuscle(g.muscle);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSavingName(true);
    try {
      const updated: GifMeta = { ...selected, name: editName, muscle: editMuscle };
      await updateGif(updated);
      setGifs(prev => prev.map(g => g.id === selected.id ? updated : g));
      setSelected(null);
    } catch (e) {
      console.error('Error guardando GIF:', e);
      alert('No se pudo guardar. Revisa la consola para más detalles.');
    } finally {
      setSavingName(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!confirm(`¿Eliminar "${selected.name || selected.id}"?`)) return;
    setDeleting(true);
    try {
      await deleteGif(selected.id);
      setGifs(prev => prev.filter(g => g.id !== selected.id));
      setSelected(null);
    } catch (e) {
      console.error('Error eliminando GIF:', e);
      alert('No se pudo eliminar. Revisa la consola.');
    } finally {
      setDeleting(false);
    }
  };

  const handleMoveUp = async () => {
    if (!selected) return;
    const list = tabGifs;
    const idx = list.findIndex(g => g.id === selected.id);
    if (idx <= 0) return;
    const prev = list[idx - 1];
    await swapGifOrder(selected.id, selected.order, prev.id, prev.order);
    setGifs(all => all.map(g => {
      if (g.id === selected.id) return { ...g, order: prev.order };
      if (g.id === prev.id) return { ...g, order: selected.order };
      return g;
    }));
    setSelected(s => s ? { ...s, order: prev.order } : null);
  };

  const handleMoveDown = async () => {
    if (!selected) return;
    const list = tabGifs;
    const idx = list.findIndex(g => g.id === selected.id);
    if (idx >= list.length - 1) return;
    const next = list[idx + 1];
    await swapGifOrder(selected.id, selected.order, next.id, next.order);
    setGifs(all => all.map(g => {
      if (g.id === selected.id) return { ...g, order: next.order };
      if (g.id === next.id) return { ...g, order: selected.order };
      return g;
    }));
    setSelected(s => s ? { ...s, order: next.order } : null);
  };

  const handleAdd = async () => {
    if (!newUrl.trim() || !newMuscle) return;
    setAdding(true);
    const id = `CUSTOM_${Date.now()}`;
    const gif: Omit<GifMeta, 'order'> = {
      id, muscle: newMuscle, url: newUrl.trim(), name: newName.trim(),
    };
    await addGif(gif);
    await load();
    setNewUrl(''); setNewName(''); setNewMuscle(muscleGroups[0] ?? '');
    setShowAddModal(false);
    setActiveTab(newMuscle);
    setAdding(false);
  };

  const handleAddGroup = async () => {
    const name = newGroupName.trim().toUpperCase();
    if (!name) return;
    if (muscleGroups.includes(name)) {
      alert(`El grupo "${name}" ya existe.`);
      return;
    }
    setSavingGroup(true);
    try {
      const updated = [...muscleGroups, name];
      await saveMuscleGroups(updated);
      setMuscleGroups(updated);
      setActiveTab(name);
      setNewGroupName('');
      setShowGroupModal(false);
    } catch {
      alert('No se pudo guardar el grupo. Intenta de nuevo.');
    } finally {
      setSavingGroup(false);
    }
  };

  const handleDeleteGroup = async (group: string) => {
    const count = gifs.filter(g => g.muscle === group).length;
    if (count > 0) {
      alert(`No puedes eliminar "${group}" porque tiene ${count} GIFs. Muévelos primero.`);
      return;
    }
    if (!confirm(`¿Eliminar el grupo "${group}"?`)) return;
    const updated = muscleGroups.filter(m => m !== group);
    await saveMuscleGroups(updated);
    setMuscleGroups(updated);
    if (activeTab === group) setActiveTab(updated[0] ?? '');
  };

  const isPinterestUrl = (url: string) =>
    /pin\.it\//i.test(url) || /pinterest\.[a-z.]+\/pin\//i.test(url);

  const handleResolvePinterest = async () => {
    setResolving(true);
    setPreviewError(false);
    try {
      const proxy = `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(newUrl.trim())}`;
      const resp = await fetch(proxy);
      const html = await resp.text();

      // Priority 1: original GIF/image from the pin JSON blob
      const origMatch = html.match(/"images_orig":\{[^}]*"url":"(https:\/\/i\.pinimg\.com\/originals\/[^"]+)"/);
      // Priority 2: any originals URL in the page
      const anyOrigMatch = html.match(/https:\/\/i\.pinimg\.com\/originals\/[^\s"'\\]+/);
      // Priority 3: 736x thumbnail (good quality)
      const thumbMatch = html.match(/"images_736x":\{"url":"(https:\/\/i\.pinimg\.com\/[^"]+)"/);

      const imageUrl = origMatch?.[1] ?? anyOrigMatch?.[0] ?? thumbMatch?.[1];

      if (imageUrl) {
        setNewUrl(imageUrl);
      } else {
        alert('No se encontró imagen en ese pin. Intenta copiar la URL directa de la imagen.');
        setPreviewError(true);
      }
    } catch {
      alert('No se pudo resolver el pin. Verifica tu conexión e intenta de nuevo.');
      setPreviewError(true);
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="screen-full" style={{ display: 'flex', flexDirection: 'column', backgroundColor: Colors.bgPage }}>
      <ScreenHeader title="ADMIN · BIBLIOTECA GIFs" onBack={() => navigate(-1)} />

      {/* Seed banner */}
      {!loading && !seeded && (
        <div style={{ margin: Spacing.md, backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 15, color: Colors.white }}>Biblioteca vacía</span>
          <span style={{ fontFamily: Fonts.mono, fontSize: 11, color: Colors.gray, lineHeight: 1.6 }}>
            Importa los {388} GIFs existentes a Firestore para poder nombrarlos y reordenarlos.
          </span>
          <button onClick={handleSeed} disabled={seeding} style={{ height: 40, backgroundColor: Colors.orange, borderRadius: Radius.md, border: 'none', cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.blackText }}>
            {seeding ? 'Importando…' : 'IMPORTAR GIFs A FIRESTORE'}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div ref={tabsRef} style={{ display: 'flex', gap: 4, overflowX: 'auto', padding: `${Spacing.sm}px ${Spacing.lg}px 0`, borderBottom: `1px solid ${Colors.bgElevated}`, scrollbarWidth: 'none', alignItems: 'flex-end' }}>
        {muscleGroups.map(m => {
          const count = gifs.filter(g => g.muscle === m).length;
          return (
            <div key={m} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <button onClick={() => { setActiveTab(m); setSelected(null); }} style={{
                padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                fontFamily: Fonts.mono, fontWeight: 700, fontSize: 11, letterSpacing: 0.5,
                color: activeTab === m ? Colors.orange : Colors.gray,
                borderBottom: `2px solid ${activeTab === m ? Colors.orange : 'transparent'}`,
              }}>
                {m}
                <span style={{ marginLeft: 5, fontSize: 9, color: activeTab === m ? Colors.orange : Colors.bgPlaceholder }}>
                  {count}
                </span>
              </button>
              {/* Delete group — only when active tab and 0 GIFs */}
              {activeTab === m && count === 0 && (
                <button
                  onClick={() => handleDeleteGroup(m)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', marginBottom: 2 }}
                >
                  <Trash2 color="#FF3B30" size={11} />
                </button>
              )}
            </div>
          );
        })}
        {/* Add group button */}
        <button
          onClick={() => setShowGroupModal(true)}
          style={{ padding: '8px 10px', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
        >
          <Plus color={Colors.teal} size={16} />
        </button>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: Spacing.md }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
            <Spinner color={Colors.orange} size={32} />
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {tabGifs.map((g) => {
                const isSelected = selected?.id === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => isSelected ? setSelected(null) : handleSelect(g)}
                    style={{
                      position: 'relative', borderRadius: Radius.md, overflow: 'hidden',
                      border: `2px solid ${isSelected ? Colors.orange : 'transparent'}`,
                      background: 'none', cursor: 'pointer', padding: 0,
                      display: 'flex', flexDirection: 'column',
                    }}
                  >
                    <div style={{ aspectRatio: '1', backgroundColor: Colors.bgCard, position: 'relative' }}>
                      <img
                        src={g.url} alt={g.name || g.id}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                      {isSelected && (
                        <div style={{ position: 'absolute', inset: 0, backgroundColor: Colors.orange + '30', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.orange, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ color: Colors.blackText, fontSize: 12, fontWeight: 700 }}>✓</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ backgroundColor: Colors.bgCard, padding: '4px 6px', textAlign: 'left' }}>
                      <span style={{ fontFamily: Fonts.mono, fontSize: 9, color: g.name ? Colors.white : Colors.gray, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {g.name || '— sin nombre —'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={{ height: 100 }} />
          </>
        )}
      </div>

      {/* Edit panel */}
      {selected && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          backgroundColor: Colors.bgCard, borderRadius: '20px 20px 0 0',
          padding: '20px 20px calc(20px + env(safe-area-inset-bottom))',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
          display: 'flex', flexDirection: 'column', gap: Spacing.md,
          zIndex: 50, maxHeight: '80vh', overflowY: 'auto',
        }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.bgPlaceholder, alignSelf: 'center', marginBottom: 4 }} />

          <div style={{ display: 'flex', gap: Spacing.md }}>
            <img src={selected.url} alt="" style={{ width: 72, height: 72, borderRadius: Radius.md, objectFit: 'cover', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontFamily: Fonts.mono, fontSize: 9, color: Colors.gray, letterSpacing: 0.5 }}>NOMBRE DEL EJERCICIO</span>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Ej. Press de Banca con Barra"
                style={{
                  height: 38, backgroundColor: Colors.bgElevated, borderRadius: Radius.sm,
                  border: `1px solid ${Colors.orange}`, padding: '0 10px',
                  fontFamily: Fonts.mono, fontSize: 13, color: Colors.white, outline: 'none',
                }}
              />
              <span style={{ fontFamily: Fonts.mono, fontSize: 8, color: Colors.bgPlaceholder }}>ID: {selected.id}</span>
            </div>
          </div>

          {/* Muscle group change */}
          <div>
            <span style={{ fontFamily: Fonts.mono, fontSize: 9, color: Colors.gray, letterSpacing: 0.5 }}>GRUPO MUSCULAR</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {muscleGroups.map(m => (
                <button key={m} onClick={() => setEditMuscle(m)} style={{
                  padding: '5px 10px', borderRadius: Radius.full, border: 'none', cursor: 'pointer',
                  backgroundColor: editMuscle === m ? Colors.orange : Colors.bgElevated,
                  fontFamily: Fonts.mono, fontWeight: 700, fontSize: 9,
                  color: editMuscle === m ? Colors.blackText : Colors.gray,
                }}>{m}</button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleMoveUp} style={{ flex: 1, height: 40, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <ChevronUp color={Colors.white} size={16} />
              <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.white }}>Subir</span>
            </button>
            <button onClick={handleMoveDown} style={{ flex: 1, height: 40, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <ChevronDown color={Colors.white} size={16} />
              <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.white }}>Bajar</span>
            </button>
            <button onClick={handleDelete} disabled={deleting} style={{ width: 40, height: 40, backgroundColor: '#FF3B3020', borderRadius: Radius.md, border: `1px solid #FF3B3040`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 color="#FF3B30" size={16} />
            </button>
            <button onClick={handleSave} disabled={savingName} style={{ flex: 2, height: 40, backgroundColor: Colors.orange, borderRadius: Radius.md, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {savingName ? <Spinner color={Colors.blackText} size={18} /> : <Save color={Colors.blackText} size={16} />}
              <span style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.blackText }}>GUARDAR</span>
            </button>
          </div>

          <button onClick={() => setSelected(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer' }}>
            <X color={Colors.gray} size={20} />
          </button>
        </div>
      )}

      {/* FAB — Add GIF */}
      {!selected && (
        <button
          onClick={() => { setNewMuscle(muscleGroups[0] ?? ''); setShowAddModal(true); }}
          style={{
            position: 'fixed', bottom: `calc(${Spacing.lg}px + env(safe-area-inset-bottom))`, right: Spacing.lg,
            width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.orange,
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(255,107,53,0.5)',
          }}
        >
          <Plus color={Colors.blackText} size={24} />
        </button>
      )}

      {/* Add GIF Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', zIndex: 1000 }}>
          <div style={{
            width: '100%', backgroundColor: Colors.bgCard, borderRadius: '20px 20px 0 0',
            padding: '24px 20px calc(24px + env(safe-area-inset-bottom))',
            display: 'flex', flexDirection: 'column', gap: Spacing.md,
            maxHeight: '85vh', overflowY: 'auto',
          }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.bgPlaceholder, alignSelf: 'center', marginBottom: 4 }} />
            <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 18, color: Colors.white }}>AGREGAR GIF</div>

            <div>
              <div style={{ fontFamily: Fonts.mono, fontSize: 9, color: Colors.gray, letterSpacing: 0.5, marginBottom: 6 }}>URL DEL GIF</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, border: `1px solid ${newUrl ? Colors.orange : Colors.bgPlaceholder}`, padding: '0 12px' }}>
                <Link color={Colors.gray} size={14} />
                <input
                  value={newUrl}
                  onChange={e => { setNewUrl(e.target.value); setPreviewError(false); }}
                  placeholder="https://... (URL directa al archivo de imagen)"
                  style={{ flex: 1, height: 44, background: 'none', border: 'none', outline: 'none', fontFamily: Fonts.mono, fontSize: 12, color: Colors.white }}
                />
              </div>
            </div>

            {isPinterestUrl(newUrl.trim()) && (
              <button
                onClick={handleResolvePinterest}
                disabled={resolving}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  height: 40, borderRadius: Radius.md, border: 'none', cursor: resolving ? 'default' : 'pointer',
                  backgroundColor: '#E60023' + (resolving ? '60' : ''), // Pinterest red
                  fontFamily: Fonts.heading, fontWeight: 700, fontSize: 12,
                  color: Colors.white, letterSpacing: 0.5,
                }}
              >
                {resolving ? '⏳ Extrayendo imagen...' : '📌 EXTRAER IMAGEN DE PINTEREST'}
              </button>
            )}

            {newUrl.trim() && !isPinterestUrl(newUrl.trim()) && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                {!previewError ? (
                  <img
                    src={newUrl.trim()}
                    alt="preview"
                    onError={() => setPreviewError(true)}
                    style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: Radius.md, border: `1px solid ${Colors.bgPlaceholder}` }}
                  />
                ) : (
                  <div style={{ width: 100, height: 100, borderRadius: Radius.md, backgroundColor: Colors.bgElevated, border: `1px solid #FF3B3060`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <span style={{ fontSize: 22 }}>🚫</span>
                    <span style={{ fontFamily: Fonts.mono, fontSize: 9, color: '#FF3B30', textAlign: 'center', lineHeight: 1.4 }}>URL no válida</span>
                  </div>
                )}
                {previewError && (
                  <span style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.gray, textAlign: 'center', lineHeight: 1.5, maxWidth: 260 }}>
                    Necesitas la URL directa a la imagen.{'\n'}Clic derecho en la imagen → "Copiar dirección de imagen"
                  </span>
                )}
              </div>
            )}

            <div>
              <div style={{ fontFamily: Fonts.mono, fontSize: 9, color: Colors.gray, letterSpacing: 0.5, marginBottom: 6 }}>NOMBRE DEL EJERCICIO</div>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Ej. Press de Banca con Barra"
                style={{ width: '100%', height: 44, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, border: `1px solid ${Colors.bgPlaceholder}`, padding: '0 12px', fontFamily: Fonts.mono, fontSize: 13, color: Colors.white, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <div style={{ fontFamily: Fonts.mono, fontSize: 9, color: Colors.gray, letterSpacing: 0.5, marginBottom: 6 }}>GRUPO MUSCULAR</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {muscleGroups.map(m => (
                  <button key={m} onClick={() => setNewMuscle(m)} style={{
                    padding: '6px 12px', borderRadius: Radius.full, border: 'none', cursor: 'pointer',
                    backgroundColor: newMuscle === m ? Colors.orange : Colors.bgElevated,
                    fontFamily: Fonts.mono, fontWeight: 700, fontSize: 10,
                    color: newMuscle === m ? Colors.blackText : Colors.gray,
                  }}>{m}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={() => setShowAddModal(false)} style={{ flex: 1, height: 48, backgroundColor: Colors.bgElevated, borderRadius: Radius.lg, border: 'none', cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: Colors.gray }}>
                CANCELAR
              </button>
              <button onClick={handleAdd} disabled={adding || !newUrl.trim() || !newMuscle || previewError} style={{ flex: 2, height: 48, backgroundColor: (newUrl.trim() && newMuscle && !previewError) ? Colors.orange : Colors.bgElevated, borderRadius: Radius.lg, border: 'none', cursor: (newUrl.trim() && newMuscle && !previewError) ? 'pointer' : 'default', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 14, color: (newUrl.trim() && newMuscle && !previewError) ? Colors.blackText : Colors.gray }}>
                {adding ? 'AGREGANDO…' : 'AGREGAR GIF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add group modal */}
      {showGroupModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ width: '100%', maxWidth: 360, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: 24, display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
            <div style={{ fontFamily: Fonts.heading, fontWeight: 700, fontSize: 16, color: Colors.white }}>NUEVO GRUPO MUSCULAR</div>
            <input
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              placeholder="Ej. CARDIO"
              autoFocus
              style={{ height: 44, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, border: `1px solid ${Colors.orange}`, padding: '0 12px', fontFamily: Fonts.mono, fontSize: 16, color: Colors.white, outline: 'none', width: '100%', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowGroupModal(false); setNewGroupName(''); }} style={{ flex: 1, height: 44, backgroundColor: Colors.bgElevated, borderRadius: Radius.md, border: 'none', cursor: 'pointer', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: Colors.gray }}>
                CANCELAR
              </button>
              <button onClick={handleAddGroup} disabled={savingGroup || !newGroupName.trim()} style={{ flex: 2, height: 44, backgroundColor: newGroupName.trim() ? Colors.teal : Colors.bgElevated, borderRadius: Radius.md, border: 'none', cursor: newGroupName.trim() ? 'pointer' : 'default', fontFamily: Fonts.heading, fontWeight: 700, fontSize: 13, color: newGroupName.trim() ? Colors.blackText : Colors.gray }}>
                {savingGroup ? 'GUARDANDO…' : 'CREAR GRUPO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
