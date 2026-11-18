import { useState } from 'react';
import {
  createOperationalNoticeTemplate, retireOperationalNoticeTemplate, updateOperationalNoticeTemplate,
  type OperationalNoticeTemplate, type OperationalNoticeTemplateInput,
} from '../../../api/operationalNoticeTemplateApi';
import { MESSAGE_MAX, TITLE_MAX } from './OperationalNoticeConstants';

const EMPTY: OperationalNoticeTemplateInput = {
  templateKey: '', name: '', description: '', icon: 'megaphoneOutline', noticeType: 'cierre',
  defaultTitle: '', defaultMessage: '', variables: ['motivo', 'fecha_reapertura', 'horario'],
  blocksReservations: true, sortOrder: null,
};

/** Platform admin (companyId 1008) only: create / edit / retire the Biblioteca GMO templates. */
export const useTemplateAdmin = (opts: {
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OperationalNoticeTemplate | null>(null);
  const [form, setForm] = useState<OperationalNoticeTemplateInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmRetire, setConfirmRetire] = useState(false);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (t: OperationalNoticeTemplate) => {
    const { operationalNoticeTemplateId: _id, status: _s, ...rest } = t;
    setEditing(t);
    setForm(rest);
    setOpen(true);
  };
  const close = () => { if (!saving) { setOpen(false); setConfirmRetire(false); } };

  const setField = <K extends keyof OperationalNoticeTemplateInput>(key: K, value: OperationalNoticeTemplateInput[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const keyOk = /^[a-z0-9_]+$/.test(form.templateKey.trim());
  const formValid = keyOk && !!form.name.trim() && !!form.defaultTitle.trim() && !!form.defaultMessage.trim()
    && form.defaultTitle.length <= TITLE_MAX && form.defaultMessage.length <= MESSAGE_MAX;

  const save = async () => {
    if (!formValid || saving) return;
    setSaving(true);
    try {
      const input = { ...form, templateKey: form.templateKey.trim(), name: form.name.trim() };
      if (editing) {
        const { templateKey: _key, ...rest } = input;
        await updateOperationalNoticeTemplate(editing.operationalNoticeTemplateId, rest);
        opts.onSaved('Plantilla actualizada');
      } else {
        await createOperationalNoticeTemplate(input);
        opts.onSaved('Plantilla creada');
      }
      setOpen(false);
    } catch (e) {
      opts.onError((e as Error).message || 'No se pudo guardar la plantilla');
    } finally {
      setSaving(false);
    }
  };

  const retire = async () => {
    if (!editing || saving) return;
    setSaving(true);
    try {
      await retireOperationalNoticeTemplate(editing.operationalNoticeTemplateId);
      opts.onSaved('Plantilla retirada');
      setOpen(false);
    } catch (e) {
      opts.onError((e as Error).message || 'No se pudo retirar la plantilla');
    } finally {
      setSaving(false);
      setConfirmRetire(false);
    }
  };

  return {
    open, editing, form, setField, keyOk, formValid, saving, confirmRetire, setConfirmRetire,
    openCreate, openEdit, close, save, retire,
  };
};

export type TemplateAdminVM = ReturnType<typeof useTemplateAdmin>;
