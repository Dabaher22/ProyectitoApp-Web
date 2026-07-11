// Simple module-level flag to track unsaved changes across route transitions.
// Used by SetsRepsConfigScreen (writer) and CoachLayout nav (reader).
let _dirty = false;
let _saveCallback: (() => Promise<void>) | null = null;

export const dirtyGuard = {
  set: (v: boolean) => { _dirty = v; },
  get: () => _dirty,
  setSaveCallback: (fn: (() => Promise<void>) | null) => { _saveCallback = fn; },
  getSaveCallback: () => _saveCallback,
};
