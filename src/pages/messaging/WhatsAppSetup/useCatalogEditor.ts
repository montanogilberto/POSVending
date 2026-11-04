import { useCallback, useState } from 'react';
import { notifyDataChanged } from '../../../utils/refreshBus';
import { SP_ERRORS } from './WhatsAppSetupConstants';

const reason = (e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e);
  return SP_ERRORS[msg] ?? msg;
};

interface CatalogEditorOptions<T, D> {
  idOf: (item: T) => number;
  empty: D;
  toDraft: (item: T) => D;
  /** Spanish message for the first invalid field, null when it can be saved. */
  validate: (draft: D) => string | null;
  create: (draft: D) => Promise<unknown>;
  update: (id: number, draft: D) => Promise<unknown>;
  remove: (id: number) => Promise<unknown>;
  reload: () => Promise<void>;
  showToast: (msg: string, color?: string) => void;
  /** e.g. 'el servicio' — used in the toasts. */
  noun: string;
}

/**
 * One list of a catalog (servicios / promociones / preguntas): a single item
 * is edited at a time in a form; save = insert (id null) or update; remove =
 * deactivate. Every write reloads the list from the backend.
 */
export function useCatalogEditor<T, D>(o: CatalogEditorOptions<T, D>) {
  const [editing, setEditing] = useState<{ id: number | null; draft: D } | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const startNew = useCallback(() => setEditing({ id: null, draft: o.empty }), [o.empty]);
  const startEdit = (item: T) => setEditing({ id: o.idOf(item), draft: o.toDraft(item) });
  const cancel = () => setEditing(null);
  const setField = <K extends keyof D>(key: K, value: D[K]) =>
    setEditing(e => (e ? { ...e, draft: { ...e.draft, [key]: value } } : e));

  const save = async () => {
    if (!editing || saving) return;
    const invalid = o.validate(editing.draft);
    if (invalid) { o.showToast(invalid, 'warning'); return; }
    setSaving(true);
    try {
      if (editing.id == null) await o.create(editing.draft);
      else await o.update(editing.id, editing.draft);
      await o.reload();
      setEditing(null);
      notifyDataChanged('whatsappSetup');
      o.showToast(`✓ Guardamos ${o.noun}`, 'success');
    } catch (e) {
      o.showToast(`No se pudo guardar ${o.noun}: ${reason(e)}`, 'danger');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: T) => {
    const id = o.idOf(item);
    if (removingId != null) return;
    setRemovingId(id);
    try {
      await o.remove(id);
      await o.reload();
      if (editing?.id === id) setEditing(null);
      notifyDataChanged('whatsappSetup');
      o.showToast(`Quitamos ${o.noun}`, 'success');
    } catch (e) {
      o.showToast(`No se pudo quitar ${o.noun}: ${reason(e)}`, 'danger');
    } finally {
      setRemovingId(null);
    }
  };

  return { editing, saving, removingId, startNew, startEdit, cancel, setField, save, remove };
}
