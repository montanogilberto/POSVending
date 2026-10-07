import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIonAlert, useIonViewWillEnter } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { extractTicket, TicketExtraction } from '../../../api/expenseAgentApi';
import { createExpense, uploadExpenseReceiptImage } from '../../../api/expensesApi';
import { createSupplier, getAllSuppliers, Supplier } from '../../../api/supplierApi';
import { createSupplyProduct, getCompanyProducts } from '../../../api/productsApi';
import { fetchCategories } from '../../../api/categoriesApi';
import { useUser } from '../../../contexts/UserContext';
import { useToast } from '../../../hooks/useToast';
import { notifyDataChanged } from '../../../utils/refreshBus';
import { pickExpenseReceiptPhoto } from '../../../utils/pickAvatarPhoto';
import { takeOperationPhoto } from './operationDraftStore';
import { buildDraft, hermosilloNoonUtc, keptLines, linesTotal, missingItems, summarize, totalDifference, totalsAgree } from './operationPlan';
import type { LineDecision, OperationDraft, PlanLine, SavingStep, SupplierDecision } from './ExpenseOperationTypes';

export type ReadingState = 'idle' | 'reading' | 'ready' | 'failed' | 'notTicket' | 'outdated';

export interface CatalogOption { id: number; name: string; }

export const useExpenseOperation = () => {
  const history = useHistory();
  const [presentAlert] = useIonAlert();
  const { companyId, userId } = useUser();
  const { showToast, toastProps } = useToast({ defaultColor: 'danger' });

  const [photo, setPhoto] = useState<string | null>(null);
  const [reading, setReading] = useState<ReadingState>('idle');
  const [ticket, setTicket] = useState<TicketExtraction | null>(null);
  const [draft, setDraft] = useState<OperationDraft | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [step, setStep] = useState<SavingStep>('idle');
  const [completed, setCompleted] = useState(false);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<CatalogOption[]>([]);

  // Retry safety: whatever was already created stays created. If the egreso
  // itself fails after the supplier/products were registered, pressing
  // confirm again reuses those records instead of registering duplicates.
  const receiptUrlRef = useRef<{ photo: string; url: string } | null>(null);
  const createdSupplierRef = useRef<{ name: string; id: number } | null>(null);
  const createdProductsRef = useRef<Map<string, number>>(new Map());
  const latestRead = useRef(0);

  const readTicket = useCallback(async (image: string) => {
    const mine = ++latestRead.current;
    setReading('reading');
    setDraft(null);
    setTicket(null);
    const result = await extractTicket({ companyId, imageBase64: image });
    notifyDataChanged('agent-usage'); // the reading just spent tokens: refresh the header balance
    if (mine !== latestRead.current) return;
    if (!result) { setReading('failed'); return; }
    setTicket(result);
    if (!result.isPurchaseTicket) { setReading('notTicket'); return; }
    // The agents service decides what to register; an older deployment has no proposal yet.
    if (!result.proposal) { setReading('outdated'); return; }
    setDraft(buildDraft(result.proposal));
    setReading('ready');
  }, [companyId]);

  useEffect(() => { if (photo) readTicket(photo); }, [photo, readTicket]);

  // Ionic keeps this page mounted after the first visit, so the ticket picked on
  // the form is read on EVERY entry (not just at mount). A new ticket always
  // starts a clean operation: nothing from the previous one carries over.
  useIonViewWillEnter(() => {
    const next = takeOperationPhoto();
    if (!next) return;
    receiptUrlRef.current = null;
    createdSupplierRef.current = null;
    createdProductsRef.current = new Map();
    setCompleted(false);
    setSubmitAttempted(false);
    setStep('idle');
    setPhoto(next);
  });

  useEffect(() => {
    if (!companyId) return;
    getAllSuppliers(companyId).then(setSuppliers).catch(e => console.error('[ExpenseOperation] suppliers', e));
    getCompanyProducts(companyId)
      .then(list => setProducts(list.map(p => ({ id: p.productId, name: p.name }))))
      .catch(e => console.error('[ExpenseOperation] products', e));
  }, [companyId]);

  // Reading a ticket costs money (one agent call), so whatever it produced —
  // or is still producing — is worth protecting until it's saved.
  const hasPaidResult = (reading === 'reading' || reading === 'ready') && !completed;

  const pickAndRead = async () => {
    const next = await pickExpenseReceiptPhoto();
    if (next) setPhoto(next);
  };

  const changePhoto = async () => {
    if (!hasPaidResult) return pickAndRead();
    presentAlert({
      header: '¿Cambiar la foto?',
      message: 'El agente volverá a leer el ticket (tiene costo) y se perderán los cambios que hiciste en este resumen.',
      buttons: [
        { text: 'Seguir con esta foto', role: 'cancel' },
        { text: 'Cambiar foto', role: 'destructive', handler: () => { pickAndRead(); } },
      ],
    });
  };

  // Leaving by ANY route (header back, hardware back, menu, tab bar) asks first.
  const alertOpen = useRef(false);
  useEffect(() => {
    if (!hasPaidResult) return;
    const unblock = history.block((location, action) => {
      if (alertOpen.current) return false;
      alertOpen.current = true;
      presentAlert({
        header: '¿Salir sin registrar?',
        message: reading === 'reading'
          ? 'El agente todavía está leyendo el ticket y leerlo de nuevo tiene costo. Si sales, se pierde esta lectura.'
          : 'Ya se leyó el ticket con el agente y leerlo de nuevo tiene costo. Si sales, se pierde este resumen y los cambios que hiciste.',
        buttons: [
          { text: 'Seguir aquí', role: 'cancel', handler: () => { alertOpen.current = false; } },
          {
            text: 'Salir', role: 'destructive',
            handler: () => {
              alertOpen.current = false;
              unblock();
              if (action === 'REPLACE') history.replace(location); else history.push(location);
            },
          },
        ],
        onDidDismiss: () => { alertOpen.current = false; },
      });
      return false;
    });
    // Closing/reloading the browser tab (web) can't show our alert, but the browser's own prompt still protects it.
    const beforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', beforeUnload);
    return () => { unblock(); window.removeEventListener('beforeunload', beforeUnload); };
  }, [hasPaidResult, reading, history, presentAlert]);

  const patch = (fn: (d: OperationDraft) => OperationDraft) => setDraft(d => (d ? fn(d) : d));
  const setSupplier = (supplier: SupplierDecision) => patch(d => ({ ...d, supplier }));
  const setLineDecision = (index: number, decision: LineDecision) =>
    patch(d => ({ ...d, lines: d.lines.map(l => (l.index === index ? { ...l, decision } : l)) }));
  const updateLine = (index: number, change: Partial<Pick<PlanLine, 'quantity' | 'unitCost'>>) =>
    patch(d => ({ ...d, lines: d.lines.map(l => (l.index === index ? { ...l, ...change } : l)) }));
  const setPaymentMethod = (paymentMethod: string) => patch(d => ({ ...d, paymentMethod }));
  const setPaymentDate = (paymentDate: string) => patch(d => ({ ...d, paymentDate }));

  const missing = useMemo(() => (draft ? missingItems(draft) : []), [draft]);
  const summary = useMemo(() => (draft ? summarize(draft) : null), [draft]);
  const total = draft ? linesTotal(draft) : 0;
  const difference = draft ? totalDifference(draft) : null;
  const agrees = draft ? totalsAgree(draft) : true;
  const saving = step !== 'idle';

  const confirm = async () => {
    if (!draft || saving) return;
    if (missing.length > 0) {
      setSubmitAttempted(true);
      showToast(`Falta: ${missing.join(', ')}`);
      return;
    }
    try {
      // 1 — the ticket photo is the egreso's mandatory evidence.
      setStep('receipt');
      if (!receiptUrlRef.current || receiptUrlRef.current.photo !== photo) {
        const upload = await uploadExpenseReceiptImage({ companyId, imageBase64: photo! });
        if (!upload?.blobUrl) throw new Error('No se pudo subir la foto del ticket.');
        receiptUrlRef.current = { photo: photo!, url: upload.blobUrl };
      }

      // 2 — supplier
      setStep('supplier');
      let supplierId: number;
      if (draft.supplier.mode === 'existing') {
        supplierId = draft.supplier.supplierId;
      } else if (draft.supplier.mode === 'new') {
        const name = draft.supplier.name.trim();
        if (createdSupplierRef.current?.name !== name) {
          try {
            await createSupplier({ companyId, supplierName: name, contactName: '', phone: '', email: '', address: '', active: '1' });
          } catch (err) {
            // A supplier with this name may already exist (duplicate rejected by the SP): reuse it below.
            console.warn('[ExpenseOperation] createSupplier:', err);
          }
          const list = await getAllSuppliers(companyId);
          setSuppliers(list);
          const found = list.find(s => s.supplierName.trim().toLowerCase() === name.toLowerCase());
          if (!found) throw new Error('No se pudo registrar el proveedor.');
          createdSupplierRef.current = { name, id: found.supplierId };
          notifyDataChanged('supplier-created');
        }
        supplierId = createdSupplierRef.current!.id;
      } else {
        throw new Error('Falta el proveedor.');
      }

      // 3 — new products (supplies), registered once each even across retries
      setStep('products');
      const kept = keptLines(draft);
      let categoryId = 0;
      const resolved: { productId: number; quantity: number; unitCost: number }[] = [];
      for (const line of kept) {
        if (line.decision.mode === 'existing') {
          resolved.push({ productId: line.decision.productId, quantity: line.quantity, unitCost: line.unitCost });
        } else if (line.decision.mode === 'new') {
          const key = line.decision.name.trim().toLowerCase();
          let productId = createdProductsRef.current.get(key);
          if (!productId) {
            if (!categoryId) {
              const categories = await fetchCategories(String(companyId));
              categoryId = (categories.find(c => c.name.trim().toLowerCase() === 'productos') ?? categories[0])?.categoryId ?? 0;
              if (!categoryId) throw new Error('No hay categorías para registrar el producto nuevo.');
            }
            productId = await createSupplyProduct({ companyId, categoryId, name: line.decision.name.trim() });
            createdProductsRef.current.set(key, productId);
            notifyDataChanged('product-created');
          }
          resolved.push({ productId, quantity: line.quantity, unitCost: line.unitCost });
        }
      }

      // 4 — the egreso
      setStep('expense');
      await createExpense({
        expenses: [{
          action: 1,
          total: linesTotal(draft),
          paymentMethod: draft.paymentMethod,
          paymentDate: hermosilloNoonUtc(draft.paymentDate),
          userId,
          companyId,
          expenseType: 'inventory',
          supplierId,
          products: resolved,
          receiptUrl: receiptUrlRef.current.url,
        }],
      });
      notifyDataChanged('expense-created');
      setCompleted(true); // lifts the leave-confirmation: nothing left to lose
      showToast('Egreso registrado', 'success');
      setTimeout(() => history.replace('/egresos'), 500);
    } catch (err) {
      console.error('[ExpenseOperation] confirm failed:', err);
      showToast(err instanceof Error ? err.message : 'No se pudo registrar la operación. Intenta de nuevo.');
      setStep('idle');
    }
  };

  const stepLabel: Record<SavingStep, string> = {
    idle: '',
    receipt: 'Subiendo el ticket…',
    supplier: 'Registrando proveedor…',
    products: 'Registrando productos…',
    expense: 'Creando el egreso…',
  };

  return {
    photo, reading, ticket, draft, suppliers, products, missing, summary, total, difference, agrees,
    submitAttempted, saving, savingLabel: stepLabel[step], toastProps,
    readAgain: () => photo && readTicket(photo), changePhoto, goBack: () => history.goBack(),
    setSupplier, setLineDecision, updateLine, setPaymentMethod, setPaymentDate, confirm,
  };
};

export type ExpenseOperationVM = ReturnType<typeof useExpenseOperation>;
