import React, { useState, useEffect } from 'react';
import { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, IonCheckbox, IonInput, IonSegment, IonSegmentButton, IonLabel, IonChip, IonImg, IonSpinner } from '@ionic/react';
import { close, add, trash, checkmarkCircle, chevronForward, checkmark, createOutline } from 'ionicons/icons';
import { createCategory, updateCategory } from '../../../api/categoriesApi';
import { fetchCategoriesByCompany } from '../../../utils/apiUtils';
import { useProduct } from '../../../contexts/ProductContext';
import { useUser } from '../../../contexts/UserContext';
import { Product } from '../../../data/type_products';
import { fmtMXN } from '../../../utils/format';
import { ProductLabelReading } from '../../../api/productAgentApi';
import ProductLabelReader from './ProductLabelReader';
import { uploadProductImage } from '../../../api/productsApi';
import { pickProductLabelPhoto } from '../../../utils/pickAvatarPhoto';
import './ProductWizard.css';

interface OptionChoice { name: string; extraPrice: number; }
interface ProductOptionData { name: string; optionType: 'radio' | 'checkbox'; choices: OptionChoice[]; }
interface WizardData {
  categoryId: number; categoryName: string;
  name: string; code: string; barCode: string; description: string; dateOfExpire: string; noExpire: boolean;
  netContent: string; unitOfMeasure: string;
  salePrice: string; unitPrice: string; stockQuantity: string;
  /** Precio al que lo vende la competencia (OXXO, súper…) — referencia, no se cobra. */
  referencePrice: string;
  /** Saved product photo (blob URL). */
  imageUrl: string;
  options: ProductOptionData[];
  formQuantity: string; additionalDescription: string; packingName: string; packingPresentationName: string;
}
interface CategoryItem { categoryId: number; name: string; }
export interface ProductWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  product?: Product | null;
  mode?: 'create' | 'view' | 'edit';
}

const STEPS = ['Categoría','Producto','Precio','Opciones','Adicional','Resumen'];
const UNITS = [
  { value: 'g',  label: 'g'  },
  { value: 'kg', label: 'kg' },
  { value: 'ml', label: 'ml' },
  { value: 'L',  label: 'L'  },
  { value: 'pz', label: 'pz' },
];
/** Margen mínimo de utilidad sobre el precio de venta: (venta - costo) / venta. */
const TARGET_MARGIN = 0.30;
/** Precio mínimo para el margen objetivo, redondeado hacia arriba al centavo. */
const suggestedPrice = (cost: number) => Math.ceil(Number((cost / (1 - TARGET_MARGIN) * 100).toFixed(6))) / 100;
const marginOf = (sale: number, cost: number) => (sale > 0 ? (sale - cost) / sale : 0);
/** Márgenes ofrecidos como sugerencia rápida (el primero es el mínimo). */
const MARGIN_PRESETS = [0.30, 0.35, 0.40, 0.50];
/** Precio "de anaquel": redondea hacia arriba al siguiente $0.50, nunca baja del margen. */
const shelfPrice = (cost: number, margin: number) =>
  Math.ceil(Number((cost / (1 - margin) * 2).toFixed(6))) / 2;
/** Precio por kg / L (o por pieza) a partir del contenido neto. */
const pricePerBaseUnit = (sale: number, content: number, unit: string) => {
  if (!(sale > 0) || !(content > 0)) return null;
  if (unit === 'g')  return { value: sale / content * 1000, unit: 'kg' };
  if (unit === 'ml') return { value: sale / content * 1000, unit: 'L' };
  if (unit === 'kg' || unit === 'L') return { value: sale / content, unit };
  if (unit === 'pz') return { value: sale / content, unit: 'pz' };
  return null;
};
const INIT: WizardData = {
  categoryId:0, categoryName:'', name:'', code:'', barCode:'', description:'', dateOfExpire:'', noExpire:false,
  netContent:'', unitOfMeasure:'',
  salePrice:'', unitPrice:'', stockQuantity:'', referencePrice:'', imageUrl:'', options:[],
  formQuantity:'', additionalDescription:'', packingName:'', packingPresentationName:'',
};

const ProductWizard: React.FC<ProductWizardProps> = ({ isOpen, onClose, onSuccess, product, mode }) => {
  const { createProduct, updateProduct, loading } = useProduct();
  const { companyId } = useUser();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(INIT);
  const [cats, setCats] = useState<CategoryItem[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  /** Inline category form: id null = new category. */
  const [catEdit, setCatEdit] = useState<{ id: number | null; name: string } | null>(null);
  const [catSaving, setCatSaving] = useState(false);
  const [catError, setCatError] = useState('');
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [openOpt, setOpenOpt] = useState<Record<number,boolean>>({});
  const [saleTouched, setSaleTouched] = useState(false);
  /** Photos taken in the label reader; one of them becomes the product image. */
  const [labelPhotos, setLabelPhotos] = useState<string[]>([]);
  /** Product image not uploaded yet (data URL) — uploaded on submit. */
  const [pendingImage, setPendingImage] = useState('');
  /** true once the user picked the image by hand, so new reader photos don't replace it. */
  const [imageChosen, setImageChosen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const effectiveMode: 'create' | 'view' | 'edit' = mode ?? (product?.productId ? 'edit' : 'create');
  const isReadOnly = effectiveMode === 'view';

  useEffect(() => {
    if (!isOpen) return;

    setStep(0);
    setErrors({});
    setShowSuccess(false);
    setSubmitError('');
    setOpenOpt({});
    setSaleTouched(Boolean(product));
    setLabelPhotos([]);
    setPendingImage('');
    setImageChosen(false);
    loadCats();

    if (product) {
      const anyProduct = product as any;
      const details = product.details?.[0] ?? anyProduct.productDetails?.[0];
      const allDescriptions = product.descriptions ?? anyProduct.productDescriptions ?? [];
      const principalDescription =
        allDescriptions.find((d: any) => d.is_principal === '1') ?? allDescriptions[0];

      const sourceOptions = product.options ?? anyProduct.productOptions ?? [];
      const mappedOptions: ProductOptionData[] = sourceOptions.map((opt: any) => ({
        name: opt.name ?? '',
        optionType: (opt.type === 'checkbox' ? 'checkbox' : 'radio'),
        choices: (opt.choices ?? opt.optionChoices ?? []).map((ch: any) => ({
          name: ch.name ?? '',
          extraPrice: Number(ch.price ?? 0),
        })),
      }));

      const normalizedDateOfExpire =
        product.dateOfExpire && product.dateOfExpire !== '1900-01-01'
          ? String(product.dateOfExpire).slice(0, 10)
          : '';

      setData({
        categoryId: Number(product.categoryId || 0),
        categoryName: product.category?.name ?? '',
        name: String((product as any).name ?? ''),
        code: String((product as any).code ?? ''),
        barCode: String((product as any).barCode ?? ''),
        description: String((product as any).description ?? ''),
        dateOfExpire: normalizedDateOfExpire,
        noExpire: !normalizedDateOfExpire,
        netContent: anyProduct.netContent != null && Number(anyProduct.netContent) > 0 ? String(Number(anyProduct.netContent)) : '',
        unitOfMeasure: String(anyProduct.unitOfMeasure ?? ''),
        salePrice: details?.salePrice != null ? String(details.salePrice) : '0',
        unitPrice: details?.unitPrice != null ? String(details.unitPrice) : '0',
        stockQuantity: details?.stockQuantity != null ? String(details.stockQuantity) : '0',
        imageUrl: String(anyProduct.imageUrl ?? anyProduct.image ?? ''),
        referencePrice: anyProduct.referencePrice != null && Number(anyProduct.referencePrice) > 0 ? String(Number(anyProduct.referencePrice)) : '',
        options: mappedOptions,
        formQuantity: product.form?.quantity ?? '',
        additionalDescription: principalDescription?.Dosage ?? '',
        packingName: '',
        packingPresentationName: '',
      });
      return;
    }

    setData(INIT);
  }, [isOpen, product]);

  const loadCats = async (): Promise<CategoryItem[]> => {
    setCatLoading(true);
    try {
      const normalizedCompanyId = Number(companyId);
      if (!Number.isFinite(normalizedCompanyId) || normalizedCompanyId <= 0) {
        setCats([]);
        return [];
      }
      const res = await fetchCategoriesByCompany(String(normalizedCompanyId));
      const list: CategoryItem[] = res.map((c: any) => ({ categoryId: c.categoryId ?? c.productCategoryId ?? 0, name: c.name ?? '' }));
      setCats(list);
      return list;
    } catch(e) { console.error(e); return []; } finally { setCatLoading(false); }
  };

  /* Create / rename a category without leaving the wizard (same CRUD as CategoriesPage). */
  const startNewCat = () => { setCatEdit({ id: null, name: '' }); setCatError(''); };
  const startRenameCat = (cat: CategoryItem) => { setCatEdit({ id: cat.categoryId, name: cat.name }); setCatError(''); };
  const saveCat = async () => {
    if (!catEdit) return;
    const name = catEdit.name.trim();
    if (!name) { setCatError('Escribe el nombre de la categoría'); return; }
    const duplicate = cats.some(c => c.categoryId !== catEdit.id && c.name.trim().toLowerCase() === name.toLowerCase());
    if (duplicate) { setCatError('Ya existe una categoría con ese nombre'); return; }
    setCatSaving(true);
    setCatError('');
    try {
      const cid = Number(companyId);
      if (catEdit.id === null) await createCategory(name, '', cid);
      else await updateCategory(catEdit.id, name, '', cid);
      const list = await loadCats();
      // Select what was just created/renamed so the user can continue right away.
      const saved = catEdit.id !== null
        ? list.find(c => c.categoryId === catEdit.id)
        : list.find(c => c.name.trim().toLowerCase() === name.toLowerCase());
      if (saved) { upd('categoryId', saved.categoryId); upd('categoryName', saved.name); }
      setCatEdit(null);
    } catch (e: any) {
      console.error('[ProductWizard] saveCat:error', e);
      setCatError('No se pudo guardar la categoría. Intenta de nuevo.');
    } finally {
      setCatSaving(false);
    }
  };

  const upd = (f: keyof WizardData, v: any) => { setData(p => ({...p,[f]:v})); setErrors(p => ({...p,[f]:''})); };
  const updCost = (v: string) => {
    upd('unitPrice', v);
    const cost = parseFloat(v);
    if (!saleTouched && cost > 0) upd('salePrice', shelfPrice(cost, TARGET_MARGIN).toFixed(2));
  };
  const updSale = (v: string) => { setSaleTouched(true); upd('salePrice', v); };

  /** Product label agent -> form. Only fills fields that are still empty, so it
   *  never overwrites what the user typed; Código, category and prices stay manual. */
  const applyLabelReading = (r: ProductLabelReading): string[] => {
    const filled: string[] = [];
    const fill = (f: keyof WizardData, value: string, label: string) => {
      if (!value || String(data[f] ?? '').trim()) return;
      upd(f, value);
      filled.push(label);
    };
    fill('name', r.suggestedName, 'Nombre');
    fill('barCode', r.barCode, 'Código de barras');
    fill('description', r.description, 'Descripción');
    if (r.netContent > 0 && r.unitOfMeasure && !data.netContent && !data.unitOfMeasure) {
      upd('netContent', String(r.netContent));
      upd('unitOfMeasure', r.unitOfMeasure);
      filled.push('Contenido neto');
    }
    if (r.expirationDate && !data.dateOfExpire && !data.noExpire) {
      upd('dateOfExpire', r.expirationDate);
      filled.push('Fecha de expiración');
    }
    return filled;
  };
  /** Reader photos changed: default the product image to the first one (the front). */
  const onLabelPhotos = (photos: string[]) => {
    setLabelPhotos(photos);
    if (!imageChosen) setPendingImage(photos[0] ?? '');
    else if (pendingImage && !photos.includes(pendingImage) && labelPhotos.includes(pendingImage)) setPendingImage(photos[0] ?? '');
  };
  const chooseImage = (src: string) => { setPendingImage(src); setImageChosen(true); };
  const takeImage = async () => {
    const dataUrl = await pickProductLabelPhoto();
    if (dataUrl) chooseImage(dataUrl);
  };
  const imagePreview = pendingImage || data.imageUrl;
  const fmt =(v: string) => v ? new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(parseFloat(v)||0) : '—';

  const validate = () => {
    const e: Record<string,string> = {};
    if (step===0 && !data.categoryId) e.categoryId='Selecciona una categoría';
    if (step===1) {
      if(!data.name.trim()) e.name='El nombre es requerido';
      if(!data.noExpire && !data.dateOfExpire) e.dateOfExpire='Elige una fecha o marca "Sin fecha de expiración"';
      const content = parseFloat(data.netContent);
      if (data.netContent && !(content > 0)) e.netContent='Ingresa una cantidad mayor a 0';
      else if (data.netContent && !data.unitOfMeasure) e.netContent='Selecciona la unidad';
      else if (!data.netContent && data.unitOfMeasure) e.netContent='Ingresa la cantidad';
    }
    if (step===2) {
      const sale = parseFloat(data.salePrice);
      const cost = parseFloat(data.unitPrice) || 0;
      // Priced by options (sizes/cycles): the base must be allowed to be $0,
      // otherwise base + option is charged twice (Garrafón $10 + 19 lts $10).
      const pricedByOptions = data.options.some(o => o.choices.some(c => Number(c.extraPrice) > 0));
      if (!data.salePrice || !(sale >= 0)) e.salePrice='Ingresa un precio válido';
      else if (!pricedByOptions && cost > 0 && sale < suggestedPrice(cost)) e.salePrice=`El margen mínimo es ${TARGET_MARGIN*100}%. Precio mínimo: ${fmtMXN(suggestedPrice(cost))}`;
    }
    setErrors(e); return Object.keys(e).length===0;
  };

  const goNext  = () => {
    if (isReadOnly) {
      setErrors({});
      setStep(s => Math.min(s + 1, 5));
      return;
    }
    if (validate()) setStep(s=>Math.min(s+1,5));
  };
  const goBack  = () => { setErrors({}); setStep(s=>Math.max(s-1,0)); };
  const skip    = () => { setErrors({}); setStep(s=>Math.min(s+1,5)); };
  const jump    = (t:number) => { if(t<step){ setErrors({}); setStep(t); } };

  const countValidChoices = (choices: OptionChoice[]) =>
    choices.filter((ch) => ch.name.trim() !== '').length;

  const addOpt    = () => { if (isReadOnly) return; upd('options',[...data.options,{name:'',optionType:'radio',choices:[{name:'',extraPrice:0}]}]); };
  const remOpt    = (i:number) => { if (isReadOnly) return; upd('options',data.options.filter((_,x)=>x!==i)); };
  const updOpt    = (i:number,f:keyof ProductOptionData,v:any) => { if (isReadOnly) return; upd('options',data.options.map((o,x)=>x===i?{...o,[f]:v}:o)); };
  const addCh     = (i:number) => { if (isReadOnly) return; upd('options',data.options.map((o,x)=>x===i?{...o,choices:[...o.choices,{name:'',extraPrice:0}]}:o)); };
  const remCh     = (i:number,ci:number) => { if (isReadOnly) return; upd('options',data.options.map((o,x)=>x===i?{...o,choices:o.choices.filter((_,cx)=>cx!==ci)}:o)); };
  const updCh     = (i:number,ci:number,f:keyof OptionChoice,v:any) => { if (isReadOnly) return; upd('options',data.options.map((o,x)=>x===i?{...o,choices:o.choices.map((c,cx)=>cx===ci?{...c,[f]:v}:c)}:o)); };

  const handleSubmit = async () => {
    if (isReadOnly) return;
    console.log('[ProductWizard] handleSubmit:start', {
      step,
      companyId,
      categoryId: data.categoryId,
      name: data.name,
      optionsCount: data.options.length,
    });

    setSubmitError('');

    try {
      const normalizedOptions = data.options.map((opt) => ({
        ...opt,
        name: opt.name.trim(),
        choices: (opt.choices ?? []).map((ch) => ({
          ...ch,
          name: ch.name.trim(),
          extraPrice: Number(ch.extraPrice || 0),
        })),
      }));

      const sanitizedOptions = normalizedOptions
        .filter((opt) => opt.name !== '')
        .map((opt) => ({
          action: 1,
          productOptionId: null,
          optionKey: opt.name.toLowerCase().replace(/\s+/g, '_'),
          name: opt.name,
          type: opt.optionType,
          optionChoices: opt.choices
            .filter((ch) => ch.name !== '')
            .map((ch) => ({
              action: 1,
              productOptionChoiceId: null,
              choiceKey: ch.name.toLowerCase().replace(/\s+/g, '_'),
              name: ch.name,
              price: Number(ch.extraPrice || 0),
              description: '',
            })),
        }));

      console.log('[ProductWizard] handleSubmit:sanitizedOptions', sanitizedOptions);

      // Options are optional: a drink/snack is a plain product (barcode, stock, price).
      // Options are only for real modifiers (size, flavor of a prepared item).

      const invalidOptionIndex = sanitizedOptions.findIndex(
        (opt) => !opt.name || !opt.optionKey || !opt.type || !Array.isArray(opt.optionChoices) || opt.optionChoices.length === 0
      );

      if (invalidOptionIndex !== -1) {
        const msg = `La opción #${invalidOptionIndex + 1} debe tener nombre, tipo y al menos una opción hija.`;
        console.warn('[ProductWizard] handleSubmit:validationError:invalidOption', {
          invalidOptionIndex,
          option: sanitizedOptions[invalidOptionIndex],
          message: msg,
        });
        setSubmitError(msg);
        return;
      }

      const invalidChoiceRef = (() => {
        for (let oi = 0; oi < sanitizedOptions.length; oi += 1) {
          const option = sanitizedOptions[oi];
          const ci = option.optionChoices.findIndex(
            (choice) => !choice.name || !choice.choiceKey || Number.isNaN(Number(choice.price))
          );
          if (ci !== -1) return { oi, ci };
        }
        return null;
      })();

      if (invalidChoiceRef) {
        const msg = `La opción #${invalidChoiceRef.oi + 1}, elección #${invalidChoiceRef.ci + 1} requiere nombre y precio válido.`;
        console.warn('[ProductWizard] handleSubmit:validationError:invalidChoice', {
          invalidChoiceRef,
          choice: sanitizedOptions[invalidChoiceRef.oi].optionChoices[invalidChoiceRef.ci],
          message: msg,
        });
        setSubmitError(msg);
        return;
      }

      const allDescriptions = (product as any)?.descriptions ?? (product as any)?.productDescriptions ?? [];
      const firstDescription = allDescriptions?.[0];

      const productDescriptions = data.additionalDescription.trim()
        ? [{
            action: product?.productId ? 2 : 1,
            productDescriptionId: firstDescription?.productDescriptionId ?? null,
            Dosage: data.additionalDescription.trim(),
            measurementId: firstDescription?.measurementId ?? null,
            is_principal: '1',
            activeIngredientId: firstDescription?.activeIngredientId ?? null,
          }]
        : [];

      const normalizedCompanyId = Number(companyId);
      console.log('[ProductWizard] handleSubmit:companyId:normalized', {
        rawCompanyId: companyId,
        normalizedCompanyId,
      });

      if (!Number.isFinite(normalizedCompanyId) || normalizedCompanyId <= 0) {
        const msg = 'No hay una empresa activa en sesión. Inicia sesión y selecciona una empresa.';
        console.warn('[ProductWizard] handleSubmit:invalidCompanyId', {
          rawCompanyId: companyId,
          normalizedCompanyId,
          message: msg,
        });
        setSubmitError(msg);
        return;
      }

      const isEdit = Boolean(product?.productId);

      let imageUrl = data.imageUrl || null;
      if (pendingImage) {
        setUploadingImage(true);
        try {
          imageUrl = await uploadProductImage({ companyId: normalizedCompanyId, imageBase64: pendingImage });
        } finally {
          setUploadingImage(false);
        }
      }

      const payload = {
        productId: product?.productId ?? null,
        name: data.name.trim(),
        code: data.code.trim(),
        barCode: data.barCode.trim(),
        description: data.description.trim(),
        dateOfExpire: data.noExpire ? '' : data.dateOfExpire,
        noExpire: data.noExpire,
        netContent: data.netContent ? Number(data.netContent) : null,
        referencePrice: data.referencePrice ? Number(data.referencePrice) : null,
        imageUrl,
        unitOfMeasure: data.netContent ? data.unitOfMeasure : null,
        categoryId: data.categoryId,
        companyId: normalizedCompanyId,
        productFormId: product?.productFormId ?? 0,
        manufactureId: product?.manufactureId ?? 0,
        productForm: data.formQuantity.trim()
          ? {
              action: isEdit ? 2 : 1,
              productFormId: product?.form?.productFormId ?? null,
              quantity: data.formQuantity.trim(),
              productPackingPresentationId: product?.form?.productPackingPresentationId ?? null,
              productsPackingTypeId: product?.form?.productsPackingTypeId ?? null,
            }
          : undefined,
        productDetails: {
          action: isEdit ? 2 : 1,
          productDetailId: (product as any)?.details?.[0]?.productDetailId ?? (product as any)?.productDetails?.[0]?.productDetailId ?? null,
          stockQuantity: Number(data.stockQuantity || 0),
          unitPrice: Number(data.unitPrice || 0),
          salePrice: Number(data.salePrice || 0),
        },
        productDescriptions,
        productOptions: sanitizedOptions.map((opt: any, index: number) => {
          const sourceOptions = (product as any)?.options ?? (product as any)?.productOptions ?? [];
          const existingOption = sourceOptions[index];
          const existingChoices = existingOption?.choices ?? existingOption?.optionChoices ?? [];
          return {
            ...opt,
            action: isEdit ? 2 : 1,
            productOptionId: existingOption?.productOptionId ?? null,
            optionChoices: (opt.optionChoices ?? []).map((choice: any, choiceIndex: number) => {
              const existingChoice = existingChoices[choiceIndex];
              return {
                ...choice,
                action: isEdit ? 2 : 1,
                productOptionChoiceId: existingChoice?.productOptionChoiceId ?? null,
              };
            }),
          };
        }),
      } as any;

      console.log('[ProductWizard] handleSubmit:payload', payload);

      if (isEdit && product?.productId) {
        const updateResult = await updateProduct(product.productId, payload);
        console.log('[ProductWizard] handleSubmit:updateProduct:success', updateResult);
      } else {
        const createResult = await createProduct(payload);
        console.log('[ProductWizard] handleSubmit:createProduct:success', createResult);
      }

      setShowSuccess(true);
      console.log('[ProductWizard] handleSubmit:showSuccess:true');

      setTimeout(() => {
        console.log('[ProductWizard] handleSubmit:timeout:closing', {
          hasOnSuccess: Boolean(onSuccess),
        });
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (e: any) {
      console.error('[ProductWizard] handleSubmit:error', e);
      setSubmitError(e.message ?? 'Error al crear el producto');
    }
  };

  /* ── Step Indicator ── */
  const StepBar = () => (
    <div className="wizard-step-indicator">
      {STEPS.map((s,i) => (
        <React.Fragment key={i}>
          <div className="wizard-step-item">
            <button className={`wizard-step-circle${i===step?' active':''}${i<step?' completed':''}`} onClick={()=>jump(i)} style={{cursor:i<step?'pointer':'default',border:'none'}}>
              {i<step ? <IonIcon icon={checkmark}/> : i+1}
            </button>
            <span className={`wizard-step-label${i===step?' active':''}${i<step?' completed':''}`}>{s}</span>
          </div>
          {i<5 && <div className={`wizard-step-connector${i<step?' completed':''}`}/>}
        </React.Fragment>
      ))}
    </div>
  );

  /* ── Step 1: Category ── */
  const renderS1 = () => (
    <div>
      <div className="wizard-step-header">
        <h2 className="wizard-step-title">Selecciona una categoría</h2>
        <p className="wizard-step-subtitle">El producto pertenecerá a esta categoría</p>
      </div>
      {catLoading ? <div className="wizard-loading-cats">Cargando categorías...</div> :
       cats.length===0 ? <div className="wizard-no-cats"><p>No se encontraron categorías</p></div> :
       <div className="wizard-category-grid">
         {cats.map(cat=>(
           <div key={cat.categoryId} className="wizard-category-cell">
             <button className={`wizard-category-card${data.categoryId===cat.categoryId?' selected':''}`}
               onClick={()=>{ if (isReadOnly) return; upd('categoryId',cat.categoryId); upd('categoryName',cat.name); }}
               disabled={isReadOnly}>
               <div className="wizard-cat-icon">🏷️</div>
               <span className="wizard-cat-name">{cat.name}</span>
               {data.categoryId===cat.categoryId && <div className="wizard-cat-check"><IonIcon icon={checkmarkCircle}/></div>}
             </button>
             {!isReadOnly && (
               <IonButton fill="clear" size="small" className="wizard-cat-edit" aria-label={`Renombrar ${cat.name}`}
                 onClick={()=>startRenameCat(cat)} disabled={catSaving}>
                 <IonIcon slot="icon-only" icon={createOutline}/>
               </IonButton>
             )}
           </div>
         ))}
       </div>}
      {!isReadOnly && !catLoading && (
        catEdit ? (
          <div className="wizard-cat-form">
            <p className="wizard-cat-form-title">{catEdit.id === null ? 'Nueva categoría' : 'Renombrar categoría'}</p>
            <IonInput className={`wizard-ion-input wizard-cat-input${catError ? ' error' : ''}`} placeholder="Ej. Bebidas"
              value={catEdit.name} maxlength={50} disabled={catSaving}
              onIonInput={e=>{ setCatEdit({ ...catEdit, name: String(e.detail.value ?? '') }); setCatError(''); }}
              onKeyDown={e=>{ if (e.key === 'Enter') saveCat(); }}/>
            {catError && <span className="wizard-field-error">{catError}</span>}
            <div className="wizard-cat-form-actions">
              <IonButton fill="clear" color="medium" size="small" onClick={()=>{ setCatEdit(null); setCatError(''); }} disabled={catSaving}>
                Cancelar
              </IonButton>
              <IonButton size="small" onClick={saveCat} disabled={catSaving}>
                {catSaving ? <IonSpinner name="dots"/> : 'Guardar'}
              </IonButton>
            </div>
          </div>
        ) : (
          <IonButton fill="outline" size="small" className="wizard-cat-add" onClick={startNewCat}>
            <IonIcon slot="start" icon={add}/> Nueva categoría
          </IonButton>
        )
      )}
      {errors.categoryId && <p className="wizard-field-error" style={{marginTop:12}}>{errors.categoryId}</p>}
    </div>
  );

  /* ── Step 2: Basic Info ── */
  const renderS2 = () => (
    <div>
      <div className="wizard-step-header">
        <h2 className="wizard-step-title">Información del producto</h2>
        <p className="wizard-step-subtitle">Datos básicos de identificación</p>
      </div>
      {!isReadOnly && effectiveMode !== 'edit' && (
        <ProductLabelReader companyId={Number(companyId)} onApply={applyLabelReading} onPhotosChange={onLabelPhotos} />
      )}
      <div className="wizard-form">
        <div className="wizard-field">
          <label className="wizard-label">Imagen del producto</label>
          <div className="wizard-image-row">
            {imagePreview
              ? <IonImg className="wizard-image-preview" src={imagePreview} alt="Imagen del producto" />
              : <div className="wizard-image-empty">Sin imagen</div>}
            {!isReadOnly && (
              <div className="wizard-image-actions">
                {labelPhotos.length > 1 && (
                  <div className="wizard-image-choices">
                    {labelPhotos.map((src, i) => (
                      <IonChip key={i} className={`wizard-image-chip${pendingImage === src ? ' selected' : ''}`} onClick={() => chooseImage(src)}>
                        Foto {i + 1}
                      </IonChip>
                    ))}
                  </div>
                )}
                <IonButton size="small" fill="outline" onClick={takeImage}>
                  {imagePreview ? 'Cambiar imagen' : 'Agregar imagen'}
                </IonButton>
                {pendingImage && (
                  <IonButton size="small" fill="clear" color="medium" onClick={() => { setPendingImage(''); setImageChosen(true); }}>
                    Quitar
                  </IonButton>
                )}
              </div>
            )}
          </div>
          {pendingImage && <span className="wizard-image-hint">Se sube al guardar el producto.</span>}
        </div>
        <div className="wizard-field">
          <label className="wizard-label">Nombre <span className="required">*</span></label>
          <input className={`wizard-input${errors.name?' error':''}`} placeholder="Ej. El Buchón" value={data.name} onChange={e=>upd('name',e.target.value)} disabled={isReadOnly}/>
          {errors.name && <span className="wizard-field-error">{errors.name}</span>}
        </div>
        <div className="wizard-field-row">
          <div className="wizard-field">
            <label className="wizard-label">Código</label>
            {/* Assigned by sp_products_save on insert: MAX(numeric code) + 1 for the company. */}
            <div className="wizard-auto-code">{data.code || 'Automático al guardar'}</div>
          </div>
          <div className="wizard-field">
            <label className="wizard-label">Código de barras</label>
            <input className="wizard-input" placeholder="Ej. 7501234567890" value={data.barCode} onChange={e=>upd('barCode',e.target.value)} disabled={isReadOnly}/>
          </div>
        </div>
        <div className="wizard-field">
          <label className="wizard-label">Descripción</label>
          <textarea className="wizard-textarea" placeholder="Describe brevemente el producto..." rows={3} value={data.description} onChange={e=>upd('description',e.target.value)} disabled={isReadOnly}/>
        </div>
        <div className="wizard-field">
          <label className="wizard-label">Contenido neto</label>
          <div className="wizard-content-row">
            <IonInput className={`wizard-ion-input${errors.netContent?' error':''}`} type="number" inputmode="decimal" min="0" placeholder="Ej. 500"
              value={data.netContent} onIonInput={e=>upd('netContent',String(e.detail.value ?? ''))} disabled={isReadOnly}/>
            <IonSegment className="wizard-unit-segment" value={data.unitOfMeasure}
              onIonChange={e=>{ upd('unitOfMeasure',String(e.detail.value ?? '')); setErrors(p=>({...p,netContent:''})); }} disabled={isReadOnly}>
              {UNITS.map(u=>(
                <IonSegmentButton key={u.value} value={u.value}><IonLabel>{u.label}</IonLabel></IonSegmentButton>
              ))}
            </IonSegment>
          </div>
          {errors.netContent && <span className="wizard-field-error">{errors.netContent}</span>}
        </div>
        <div className="wizard-field">
          <label className="wizard-label">Fecha de expiración</label>
          {!data.noExpire && (
            <input className={`wizard-input${errors.dateOfExpire?' error':''}`} type="date" value={data.dateOfExpire} onChange={e=>upd('dateOfExpire',e.target.value)} disabled={isReadOnly}/>
          )}
          <IonCheckbox className="wizard-checkbox" labelPlacement="end" justify="start" checked={data.noExpire} disabled={isReadOnly}
            onIonChange={e=>{ upd('noExpire',e.detail.checked); setErrors(p=>({...p,dateOfExpire:''})); }}>
            Sin fecha de expiración
          </IonCheckbox>
          {errors.dateOfExpire && <span className="wizard-field-error">{errors.dateOfExpire}</span>}
        </div>
      </div>
    </div>
  );

  /* ── Step 3: Price ── */
  const renderS3 = () => {
    const sale = parseFloat(data.salePrice) || 0;
    const cost = parseFloat(data.unitPrice) || 0;
    const minPrice = cost > 0 ? suggestedPrice(cost) : null;
    const margin = data.salePrice && cost > 0 ? sale - cost : null;
    const marginPct = margin !== null ? marginOf(sale, cost) : null;
    const pricedByOptions = data.options.some(o => o.choices.some(c => Number(c.extraPrice) > 0));
    const belowTarget = !pricedByOptions && minPrice !== null && data.salePrice !== '' && sale < minPrice;
    const perUnit = pricePerBaseUnit(sale, parseFloat(data.netContent), data.unitOfMeasure);
    const ref = parseFloat(data.referencePrice) || 0;
    const refMargin = ref > 0 && cost > 0 ? marginOf(ref, cost) : null;
    /** Costo máximo para vender al precio de mercado con el margen objetivo. */
    const maxCostAtRef = ref > 0 ? Math.floor(ref * (1 - TARGET_MARGIN) * 100) / 100 : null;
    const vsRef = ref > 0 && sale > 0 ? (sale - ref) / ref : null;
    return (
      <div>
        <div className="wizard-step-header">
          <h2 className="wizard-step-title">Precio y disponibilidad</h2>
          <p className="wizard-step-subtitle">Captura el costo y sugerimos el precio con {TARGET_MARGIN*100}% de margen</p>
        </div>
        <div className="wizard-form">
          <div className="wizard-field">
            <label className="wizard-label">Costo unitario (MXN)</label>
            <div className="wizard-input-prefix">
              <span className="prefix">$</span>
              <input className="wizard-input with-prefix" type="number" min="0" step="0.01" placeholder="0.00" value={data.unitPrice} onChange={e=>updCost(e.target.value)} disabled={isReadOnly}/>
            </div>
          </div>
          <div className="wizard-field">
            <label className="wizard-label">Precio de venta (MXN) <span className="required">*</span></label>
            <div className="wizard-input-prefix">
              <span className="prefix">$</span>
              <input className={`wizard-input with-prefix${errors.salePrice || belowTarget ?' error':''}`} type="number" min="0" step="0.01" placeholder="0.00" value={data.salePrice} onChange={e=>updSale(e.target.value)} disabled={isReadOnly}/>
            </div>
            {minPrice !== null && !isReadOnly && (
              <div className="wizard-suggested-price">
                <span>Sugerencias según el costo (mínimo {TARGET_MARGIN*100}% → <strong>{fmtMXN(minPrice)}</strong>)</span>
                <div className="wizard-price-chips">
                  {MARGIN_PRESETS.map(m => {
                    const price = shelfPrice(cost, m);
                    return (
                      <IonChip key={m} className={`wizard-price-chip${sale === price ? ' selected' : ''}`}
                        onClick={()=>{ updSale(price.toFixed(2)); }}>
                        <strong>{fmtMXN(price)}</strong>&nbsp;· {Math.round(m*100)}%
                      </IonChip>
                    );
                  })}
                </div>
              </div>
            )}
            {errors.salePrice && <span className="wizard-field-error">{errors.salePrice}</span>}
          </div>
          <div className="wizard-field">
            <label className="wizard-label">Precio en el mercado (MXN)</label>
            <div className="wizard-input-prefix">
              <span className="prefix">$</span>
              <input className="wizard-input with-prefix" type="number" min="0" step="0.01" placeholder="Ej. precio en OXXO" value={data.referencePrice} onChange={e=>upd('referencePrice',e.target.value)} disabled={isReadOnly}/>
            </div>
            {ref > 0 && (
              <div className={`wizard-market-hint${refMargin !== null && refMargin < TARGET_MARGIN ? ' warn' : ''}`}>
                {vsRef !== null && (
                  <p>Tu precio está <strong>{vsRef >= 0 ? `${(vsRef*100).toFixed(1)}% arriba` : `${(-vsRef*100).toFixed(1)}% abajo`}</strong> del mercado ({fmtMXN(Math.abs(sale - ref))}).</p>
                )}
                {refMargin !== null && (
                  <p>Al precio de mercado tu margen sería <strong>{(refMargin*100).toFixed(1)}%</strong>.</p>
                )}
                {refMargin !== null && refMargin < TARGET_MARGIN && maxCostAtRef !== null && (
                  <p>Para competir con {TARGET_MARGIN*100}% de margen necesitas comprarlo a <strong>{fmtMXN(maxCostAtRef)}</strong> o menos.</p>
                )}
              </div>
            )}
          </div>
          <div className="wizard-field">
            <label className="wizard-label">Cantidad en stock</label>
            <input className="wizard-input" type="number" min="0" placeholder="0" value={data.stockQuantity} onChange={e=>upd('stockQuantity',e.target.value)} disabled={isReadOnly}/>
          </div>
          {data.salePrice && (
            <div className="wizard-price-summary">
              <div className="price-summary-row"><span>Precio de venta</span><strong className="price-green">{fmt(data.salePrice)}</strong></div>
              {margin!==null && marginPct!==null && (
                <div className="price-summary-row">
                  <span>Margen</span>
                  <strong className={belowTarget?'price-red':'price-green'}>{fmt(margin.toString())} ({(marginPct*100).toFixed(1)}%)</strong>
                </div>
              )}
              {perUnit && <div className="price-summary-row"><span>Precio por {perUnit.unit}</span><strong className="price-blue">{fmtMXN(perUnit.value)}</strong></div>}
              {data.stockQuantity && <div className="price-summary-row"><span>Valor en inventario</span><strong className="price-blue">{fmt(((parseFloat(data.salePrice)||0)*(parseInt(data.stockQuantity)||0)).toString())}</strong></div>}
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ── Step 4: Options ── */
  const renderS4 = () => (
    <div>
      <div className="wizard-step-header">
        <h2 className="wizard-step-title">Opciones de personalización</h2>
        <p className="wizard-step-subtitle">Agrega opciones que el cliente puede elegir en el POS</p>
      </div>
      <div className="wizard-options-list">
        {data.options.map((opt,oi)=>(
          <div key={oi} className="wizard-option-card">
            <div className="wizard-option-header">
              <span className="wizard-option-num">Opción {oi+1}</span>
              <button className="wizard-remove-btn" onClick={()=>remOpt(oi)} disabled={isReadOnly}><IonIcon icon={trash}/></button>
            </div>
            <div className="wizard-option-body">
              <div className="wizard-option-row">
                <div className="wizard-field">
                  <label className="wizard-label">Nombre de la opción</label>
                  <input className="wizard-input" placeholder="Ej. Tamaño, Sabor..." value={opt.name} onChange={e=>updOpt(oi,'name',e.target.value)} disabled={isReadOnly}/>
                </div>
                <div className="wizard-field">
                  <label className="wizard-label">Tipo</label>
                  <select className="wizard-select" value={opt.optionType} onChange={e=>updOpt(oi,'optionType',e.target.value as 'radio'|'checkbox')} disabled={isReadOnly}>
                    <option value="radio">Radio (1 opción)</option>
                    <option value="checkbox">Checkbox (múltiple)</option>
                  </select>
                </div>
              </div>
              <div className="wizard-choices-section">
                <p className="wizard-choices-title">Opciones disponibles</p>
                {opt.choices.length>0 && (
                  <div className="wizard-choices-list">
                    {opt.choices.map((ch,ci)=>(
                      <div key={ci} className="wizard-choice-row">
                        <input className="wizard-input" placeholder="Ej. Grande..." value={ch.name} onChange={e=>updCh(oi,ci,'name',e.target.value)} disabled={isReadOnly}/>
                        <div className="wizard-input-prefix">
                          <span className="prefix">$</span>
                          <input className="wizard-input with-prefix" type="number" min="0" step="0.01" placeholder="0.00" value={ch.extraPrice===0?'':ch.extraPrice} onChange={e=>updCh(oi,ci,'extraPrice',parseFloat(e.target.value)||0)} disabled={isReadOnly}/>
                        </div>
                        <button className="wizard-remove-btn" onClick={()=>remCh(oi,ci)} disabled={isReadOnly}><IonIcon icon={trash}/></button>
                      </div>
                    ))}
                  </div>
                )}
                {countValidChoices(opt.choices) === 0 && (
                  <p className="wizard-field-error" style={{ marginTop: 8 }}>
                    Esta opción requiere al menos una opción visible con nombre.
                  </p>
                )}
                {!isReadOnly && <button className="wizard-add-choice-btn" onClick={()=>addCh(oi)}><IonIcon icon={add}/>Agregar opción</button>}
              </div>
            </div>
          </div>
        ))}
        {!isReadOnly && <button className="wizard-add-option-btn" onClick={addOpt}><IonIcon icon={add}/>Agregar grupo de opciones</button>}
      </div>
      {data.options.length===0 && <p className="wizard-skip-hint">Si el producto no tiene opciones, puedes omitir este paso.</p>}
    </div>
  );

  /* ── Step 5: Optional ── */
  const renderS5 = () => {
    const sections = [
      { icon:'📋', cls:'blue',   title:'Forma del producto',      desc:'Cantidad y presentación',
        body:<div className="wizard-field" style={{marginTop:12}}><label className="wizard-label">Cantidad</label><input className="wizard-input" placeholder="Ej. 500ml, 1kg..." value={data.formQuantity} onChange={e=>upd('formQuantity',e.target.value)} disabled={isReadOnly}/></div> },
      { icon:'📝', cls:'green',  title:'Descripción adicional',   desc:'Información técnica',
        body:<div className="wizard-field" style={{marginTop:12}}><label className="wizard-label">Descripción técnica</label><textarea className="wizard-textarea" rows={3} placeholder="Información adicional..." value={data.additionalDescription} onChange={e=>upd('additionalDescription',e.target.value)} disabled={isReadOnly}/></div> },
      { icon:'📦', cls:'orange', title:'Empaque',                 desc:'Tipo de empaque',
        body:<div className="wizard-field" style={{marginTop:12}}><label className="wizard-label">Nombre del empaque</label><input className="wizard-input" placeholder="Ej. Caja, Bolsa..." value={data.packingName} onChange={e=>upd('packingName',e.target.value)} disabled={isReadOnly}/></div> },
      { icon:'🎁', cls:'purple', title:'Presentación de empaque', desc:'Presentación o tamaño',
        body:<div className="wizard-field" style={{marginTop:12}}><label className="wizard-label">Nombre de la presentación</label><input className="wizard-input" placeholder="Ej. Individual, Pack x6..." value={data.packingPresentationName} onChange={e=>upd('packingPresentationName',e.target.value)} disabled={isReadOnly}/></div> },
    ];
    return (
      <div>
        <div className="wizard-step-header">
          <h2 className="wizard-step-title">Configuración adicional</h2>
          <p className="wizard-step-subtitle">Todos estos campos son opcionales.</p>
        </div>
        <div className="wizard-optional-sections">
          {sections.map((s,i)=>(
            <div key={i} className="wizard-optional-card">
              <div className="wizard-optional-card-header" onClick={()=>setOpenOpt(p=>({...p,[i]:!p[i]}))}>
                <div className={`wizard-optional-card-icon ${s.cls}`}>{s.icon}</div>
                <div className="wizard-optional-card-text">
                  <p className="wizard-optional-card-title">{s.title}</p>
                  <p className="wizard-optional-card-desc">{s.desc}</p>
                </div>
                <span className={`wizard-optional-card-chevron${openOpt[i]?' open':''}`}>›</span>
              </div>
              {openOpt[i] && <div className="wizard-optional-card-body">{s.body}</div>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  /* ── Step 6: Review ── */
  const renderS6 = () => {
    const rows1 = [{k:'Categoría',v:data.categoryName}];
    const rows2 = [{k:'Nombre',v:data.name},{k:'Código',v:data.code},{k:'Código de barras',v:data.barCode},{k:'Descripción',v:data.description},{k:'Contenido neto',v:data.netContent?`${data.netContent} ${data.unitOfMeasure}`:''},{k:'Fecha expiración',v:data.noExpire?'Sin expiración':data.dateOfExpire}];
    const rows3 = [{k:'Precio de venta',v:data.salePrice?fmt(data.salePrice):''},{k:'Costo unitario',v:data.unitPrice?fmt(data.unitPrice):''},{k:'Margen',v:parseFloat(data.unitPrice)>0&&data.salePrice?`${(marginOf(parseFloat(data.salePrice)||0,parseFloat(data.unitPrice))*100).toFixed(1)}%`:''},{k:'Precio en mercado',v:data.referencePrice?fmt(data.referencePrice):''},{k:'Stock inicial',v:data.stockQuantity}];
    const ReviewCard = ({title,rows,editStep}:{title:string;rows:{k:string;v:string}[];editStep:number}) => (
      <div className="wizard-review-card">
        <div className="wizard-review-card-header">
          <span className="wizard-review-card-title">{title}</span>
          <button className="wizard-review-edit-btn" onClick={()=>jump(editStep)}>Editar</button>
        </div>
        <div className="wizard-review-card-body">
          {rows.map(({k,v})=>(
            <div key={k} className="wizard-review-row">
              <span className="wizard-review-key">{k}</span>
              <span className={`wizard-review-val${!v?' empty':''}`}>{v||'—'}</span>
            </div>
          ))}
        </div>
      </div>
    );
    return (
      <div>
        <div className="wizard-step-header">
          <h2 className="wizard-step-title">Resumen del producto</h2>
          <p className="wizard-step-subtitle">Revisa la información antes de crear el producto</p>
        </div>
        {submitError && <div className="wizard-submit-error">{submitError}</div>}
        <div className="wizard-review-sections">
          <ReviewCard title="🏷️ Categoría"        rows={rows1} editStep={0}/>
          <ReviewCard title="📄 Información básica" rows={rows2} editStep={1}/>
          <ReviewCard title="💰 Precio y stock"     rows={rows3} editStep={2}/>
          {data.options.length>0 && (
            <div className="wizard-review-card">
              <div className="wizard-review-card-header">
                <span className="wizard-review-card-title">⚙️ Opciones POS</span>
                <button className="wizard-review-edit-btn" onClick={()=>jump(3)}>Editar</button>
              </div>
              <div className="wizard-review-card-body">
                {data.options.map((opt,i)=>(
                  <div key={i} className="wizard-review-option">
                    <div className="wizard-review-option-name">{opt.name||`Opción ${i+1}`}</div>
                    <span className="wizard-review-option-type">{opt.optionType==='radio'?'Radio':'Checkbox'}</span>
                    {opt.choices.map((ch,ci)=>(
                      <div key={ci} className="wizard-review-choice">
                        <span>{ch.name||'—'}</span>
                        <span>{ch.extraPrice>0?`+${fmt(ch.extraPrice.toString())}`:'Sin costo extra'}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
          {(data.formQuantity||data.additionalDescription||data.packingName||data.packingPresentationName) && (
            <div className="wizard-review-card">
              <div className="wizard-review-card-header">
                <span className="wizard-review-card-title">📋 Configuración adicional</span>
                <button className="wizard-review-edit-btn" onClick={()=>jump(4)}>Editar</button>
              </div>
              <div className="wizard-review-card-body">
                {data.formQuantity && <div className="wizard-review-row"><span className="wizard-review-key">Forma</span><span className="wizard-review-val">{data.formQuantity}</span></div>}
                {data.additionalDescription && <div className="wizard-review-row"><span className="wizard-review-key">Descripción adicional</span><span className="wizard-review-val">{data.additionalDescription}</span></div>}
                {data.packingName && <div className="wizard-review-row"><span className="wizard-review-key">Empaque</span><span className="wizard-review-val">{data.packingName}</span></div>}
                {data.packingPresentationName && <div className="wizard-review-row"><span className="wizard-review-key">Presentación</span><span className="wizard-review-val">{data.packingPresentationName}</span></div>}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ── Success ── */
  const renderSuccess = () => (
    <div className="wizard-success">
      <div className="wizard-success-icon">✅</div>
      <h2>¡Producto creado!</h2>
      <p>El producto <strong>{data.name}</strong> fue creado exitosamente.</p>
    </div>
  );

  /* ── Footer ── */
  const isOptionalStep = step===3 || step===4;
  const isLastStep     = step===5;
  const isEditMode = effectiveMode === 'edit';

  const Footer = () => (
    <div className="wizard-footer">
      {step>0 && !showSuccess && (
        <button className="wizard-footer-back" onClick={goBack}>
          <IonIcon icon={chevronForward} style={{transform:'rotate(180deg)'}}/> Atrás
        </button>
      )}
      <div className="wizard-footer-spacer"/>
      {isOptionalStep && !showSuccess && !isReadOnly && (
        <button className="wizard-footer-skip" onClick={skip}>Omitir</button>
      )}
      {!isLastStep && !showSuccess && (
        <button className="wizard-footer-next" onClick={goNext}>
          Siguiente <IonIcon icon={chevronForward}/>
        </button>
      )}
      {isLastStep && !showSuccess && !isReadOnly && (
        <button className="wizard-footer-submit" onClick={handleSubmit} disabled={loading || uploadingImage}>
          {uploadingImage ? <><IonSpinner name="dots" /> Subiendo imagen…</>
            : loading ? <><IonSpinner name="dots" /> {isEditMode ? 'Guardando…' : 'Creando…'}</>
            : (isEditMode ? '✓ Guardar cambios' : '✓ Crear producto')}
        </button>
      )}
    </div>
  );

  const renderStepContent = () => {
    switch (step) {
      case 0: return renderS1();
      case 1: return renderS2();
      case 2: return renderS3();
      case 3: return renderS4();
      case 4: return renderS5();
      case 5: return renderS6();
      default: return renderS1();
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} className="wizard-modal">
      <IonHeader>
        <IonToolbar>
          <IonTitle className="wizard-modal-title">
            {isReadOnly ? 'Ver producto' : isEditMode ? 'Editar producto' : 'Nuevo Producto'}
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose} fill="clear">
              <IonIcon icon={close}/>
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      {!showSuccess && <StepBar/>}

      <IonContent className="wizard-content">
        <div className="wizard-scroll-content">
          {showSuccess ? renderSuccess() : renderStepContent()}
        </div>
      </IonContent>

      {!showSuccess && <Footer/>}
    </IonModal>
  );
};

export default ProductWizard;
