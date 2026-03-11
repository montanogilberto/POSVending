import React, { useState, useEffect } from 'react';
import { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent } from '@ionic/react';
import { close, add, trash, checkmarkCircle, chevronForward, checkmark } from 'ionicons/icons';
import { fetchCategoriesByCompany } from '../../utils/apiUtils';
import { useProduct } from '../../context/ProductContext';
import { useUser } from '../UserContext';
import './ProductWizard.css';

interface OptionChoice { name: string; extraPrice: number; }
interface ProductOptionData { name: string; optionType: 'radio' | 'checkbox'; choices: OptionChoice[]; }
interface WizardData {
  categoryId: number; categoryName: string;
  name: string; code: string; barCode: string; description: string; dateOfExpire: string;
  salePrice: string; unitPrice: string; stockQuantity: string;
  options: ProductOptionData[];
  formQuantity: string; additionalDescription: string; packingName: string; packingPresentationName: string;
}
interface CategoryItem { categoryId: number; name: string; }
export interface ProductWizardProps { isOpen: boolean; onClose: () => void; onSuccess?: () => void; }

const STEPS = ['Categoría','Producto','Precio','Opciones','Adicional','Resumen'];
const INIT: WizardData = {
  categoryId:0, categoryName:'', name:'', code:'', barCode:'', description:'', dateOfExpire:'',
  salePrice:'', unitPrice:'', stockQuantity:'', options:[],
  formQuantity:'', additionalDescription:'', packingName:'', packingPresentationName:'',
};

const ProductWizard: React.FC<ProductWizardProps> = ({ isOpen, onClose, onSuccess }) => {
  const { createProduct, loading } = useProduct();
  const { companyId } = useUser();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(INIT);
  const [cats, setCats] = useState<CategoryItem[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [openOpt, setOpenOpt] = useState<Record<number,boolean>>({});

  useEffect(() => {
    if (isOpen) { setStep(0); setData(INIT); setErrors({}); setShowSuccess(false); setSubmitError(''); setOpenOpt({}); loadCats(); }
  }, [isOpen]);

  const loadCats = async () => {
    setCatLoading(true);
    try {
      const normalizedCompanyId = Number(companyId);
      if (!Number.isFinite(normalizedCompanyId) || normalizedCompanyId <= 0) {
        setCats([]);
        return;
      }
      const res = await fetchCategoriesByCompany(String(normalizedCompanyId));
      setCats(res.map((c: any) => ({ categoryId: c.categoryId ?? c.productCategoryId ?? 0, name: c.name ?? '' })));
    } catch(e) { console.error(e); } finally { setCatLoading(false); }
  };

  const upd = (f: keyof WizardData, v: any) => { setData(p => ({...p,[f]:v})); setErrors(p => ({...p,[f]:''})); };
  const fmt = (v: string) => v ? new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(parseFloat(v)||0) : '—';

  const validate = () => {
    const e: Record<string,string> = {};
    if (step===0 && !data.categoryId) e.categoryId='Selecciona una categoría';
    if (step===1) { if(!data.name.trim()) e.name='El nombre es requerido'; if(!data.code.trim()) e.code='El código es requerido'; }
    if (step===2 && (!data.salePrice || parseFloat(data.salePrice)<0)) e.salePrice='Ingresa un precio válido';
    setErrors(e); return Object.keys(e).length===0;
  };

  const goNext  = () => { if(validate()) setStep(s=>Math.min(s+1,5)); };
  const goBack  = () => { setErrors({}); setStep(s=>Math.max(s-1,0)); };
  const skip    = () => { setErrors({}); setStep(s=>Math.min(s+1,5)); };
  const jump    = (t:number) => { if(t<step){ setErrors({}); setStep(t); } };

  const addOpt    = () => upd('options',[...data.options,{name:'',optionType:'radio',choices:[]}]);
  const remOpt    = (i:number) => upd('options',data.options.filter((_,x)=>x!==i));
  const updOpt    = (i:number,f:keyof ProductOptionData,v:any) => upd('options',data.options.map((o,x)=>x===i?{...o,[f]:v}:o));
  const addCh     = (i:number) => upd('options',data.options.map((o,x)=>x===i?{...o,choices:[...o.choices,{name:'',extraPrice:0}]}:o));
  const remCh     = (i:number,ci:number) => upd('options',data.options.map((o,x)=>x===i?{...o,choices:o.choices.filter((_,cx)=>cx!==ci)}:o));
  const updCh     = (i:number,ci:number,f:keyof OptionChoice,v:any) => upd('options',data.options.map((o,x)=>x===i?{...o,choices:o.choices.map((c,cx)=>cx===ci?{...c,[f]:v}:c)}:o));

  const handleSubmit = async () => {
    setSubmitError('');
    try {
      const sanitizedOptions = data.options
        .filter((opt) => opt.name.trim() !== '')
        .map((opt) => ({
          action: 1,
          productOptionId: null,
          optionKey: opt.name.trim().toLowerCase().replace(/\s+/g, '_'),
          name: opt.name.trim(),
          type: opt.optionType,
          optionChoices: opt.choices
            .filter((ch) => ch.name.trim() !== '')
            .map((ch) => ({
              action: 1,
              productOptionChoiceId: null,
              choiceKey: ch.name.trim().toLowerCase().replace(/\s+/g, '_'),
              name: ch.name.trim(),
              price: Number(ch.extraPrice || 0),
              description: '',
            })),
        }));

      const productDescriptions = data.additionalDescription.trim()
        ? [{
            action: 1,
            productDescriptionId: null,
            Dosage: data.additionalDescription.trim(),
            measurementId: null,
            is_principal: '1',
            activeIngredientId: null,
          }]
        : [];

      const normalizedCompanyId = Number(companyId);
      if (!Number.isFinite(normalizedCompanyId) || normalizedCompanyId <= 0) {
        setSubmitError('No hay una empresa activa en sesión. Inicia sesión y selecciona una empresa.');
        return;
      }

      await createProduct({
        name: data.name.trim(),
        code: data.code.trim(),
        barCode: data.barCode.trim(),
        description: data.description.trim(),
        dateOfExpire: data.dateOfExpire || '',
        categoryId: data.categoryId,
        companyId: normalizedCompanyId,
        productFormId: 0,
        manufactureId: 0,
        productForm: data.formQuantity.trim()
          ? {
              action: 1,
              productFormId: null,
              quantity: data.formQuantity.trim(),
              productPackingPresentationId: null,
              productsPackingTypeId: null,
            }
          : undefined,
        productDetails: {
          action: 1,
          productDetailId: null,
          stockQuantity: Number(data.stockQuantity || 0),
          unitPrice: Number(data.unitPrice || 0),
          salePrice: Number(data.salePrice || 0),
        },
        productDescriptions,
        productOptions: sanitizedOptions,
      } as any);
      setShowSuccess(true);
      setTimeout(() => { onSuccess?.(); onClose(); }, 2000);
    } catch(e:any) { setSubmitError(e.message ?? 'Error al crear el producto'); }
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
  const S1 = () => (
    <div>
      <div className="wizard-step-header">
        <h2 className="wizard-step-title">Selecciona una categoría</h2>
        <p className="wizard-step-subtitle">El producto pertenecerá a esta categoría</p>
      </div>
      {catLoading ? <div className="wizard-loading-cats">Cargando categorías...</div> :
       cats.length===0 ? <div className="wizard-no-cats"><p>No se encontraron categorías</p></div> :
       <div className="wizard-category-grid">
         {cats.map(cat=>(
           <button key={cat.categoryId} className={`wizard-category-card${data.categoryId===cat.categoryId?' selected':''}`}
             onClick={()=>{ upd('categoryId',cat.categoryId); upd('categoryName',cat.name); }}>
             <div className="wizard-cat-icon">🏷️</div>
             <span className="wizard-cat-name">{cat.name}</span>
             {data.categoryId===cat.categoryId && <div className="wizard-cat-check"><IonIcon icon={checkmarkCircle}/></div>}
           </button>
         ))}
       </div>}
      {errors.categoryId && <p className="wizard-field-error" style={{marginTop:12}}>{errors.categoryId}</p>}
    </div>
  );

  /* ── Step 2: Basic Info ── */
  const S2 = () => (
    <div>
      <div className="wizard-step-header">
        <h2 className="wizard-step-title">Información del producto</h2>
        <p className="wizard-step-subtitle">Datos básicos de identificación</p>
      </div>
      <div className="wizard-form">
        <div className="wizard-field">
          <label className="wizard-label">Nombre <span className="required">*</span></label>
          <input className={`wizard-input${errors.name?' error':''}`} placeholder="Ej. El Buchón" value={data.name} onChange={e=>upd('name',e.target.value)}/>
          {errors.name && <span className="wizard-field-error">{errors.name}</span>}
        </div>
        <div className="wizard-field-row">
          <div className="wizard-field">
            <label className="wizard-label">Código <span className="required">*</span></label>
            <input className={`wizard-input${errors.code?' error':''}`} placeholder="Ej. PROD001" value={data.code} onChange={e=>upd('code',e.target.value)}/>
            {errors.code && <span className="wizard-field-error">{errors.code}</span>}
          </div>
          <div className="wizard-field">
            <label className="wizard-label">Código de barras</label>
            <input className="wizard-input" placeholder="Ej. 7501234567890" value={data.barCode} onChange={e=>upd('barCode',e.target.value)}/>
          </div>
        </div>
        <div className="wizard-field">
          <label className="wizard-label">Descripción</label>
          <textarea className="wizard-textarea" placeholder="Describe brevemente el producto..." rows={3} value={data.description} onChange={e=>upd('description',e.target.value)}/>
        </div>
        <div className="wizard-field">
          <label className="wizard-label">Fecha de expiración</label>
          <input className="wizard-input" type="date" value={data.dateOfExpire} onChange={e=>upd('dateOfExpire',e.target.value)}/>
        </div>
      </div>
    </div>
  );

  /* ── Step 3: Price ── */
  const S3 = () => {
    const margin = data.salePrice && data.unitPrice ? (parseFloat(data.salePrice)||0)-(parseFloat(data.unitPrice)||0) : null;
    return (
      <div>
        <div className="wizard-step-header">
          <h2 className="wizard-step-title">Precio y disponibilidad</h2>
          <p className="wizard-step-subtitle">Define el precio de venta y el stock inicial</p>
        </div>
        <div className="wizard-form">
          <div className="wizard-field">
            <label className="wizard-label">Precio de venta (MXN) <span className="required">*</span></label>
            <div className="wizard-input-prefix">
              <span className="prefix">$</span>
              <input className={`wizard-input with-prefix${errors.salePrice?' error':''}`} type="number" min="0" step="0.01" placeholder="0.00" value={data.salePrice} onChange={e=>upd('salePrice',e.target.value)}/>
            </div>
            {errors.salePrice && <span className="wizard-field-error">{errors.salePrice}</span>}
          </div>
          <div className="wizard-field">
            <label className="wizard-label">Precio unitario / Costo (MXN)</label>
            <div className="wizard-input-prefix">
              <span className="prefix">$</span>
              <input className="wizard-input with-prefix" type="number" min="0" step="0.01" placeholder="0.00" value={data.unitPrice} onChange={e=>upd('unitPrice',e.target.value)}/>
            </div>
          </div>
          <div className="wizard-field">
            <label className="wizard-label">Cantidad en stock</label>
            <input className="wizard-input" type="number" min="0" placeholder="0" value={data.stockQuantity} onChange={e=>upd('stockQuantity',e.target.value)}/>
          </div>
          {data.salePrice && (
            <div className="wizard-price-summary">
              <div className="price-summary-row"><span>Precio de venta</span><strong className="price-green">{fmt(data.salePrice)}</strong></div>
              {margin!==null && data.unitPrice && <div className="price-summary-row"><span>Margen estimado</span><strong className={margin>=0?'price-green':'price-blue'}>{fmt(margin.toString())}</strong></div>}
              {data.stockQuantity && <div className="price-summary-row"><span>Valor en inventario</span><strong className="price-blue">{fmt(((parseFloat(data.salePrice)||0)*(parseInt(data.stockQuantity)||0)).toString())}</strong></div>}
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ── Step 4: Options ── */
  const S4 = () => (
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
              <button className="wizard-remove-btn" onClick={()=>remOpt(oi)}><IonIcon icon={trash}/></button>
            </div>
            <div className="wizard-option-body">
              <div className="wizard-option-row">
                <div className="wizard-field">
                  <label className="wizard-label">Nombre de la opción</label>
                  <input className="wizard-input" placeholder="Ej. Tamaño, Sabor..." value={opt.name} onChange={e=>updOpt(oi,'name',e.target.value)}/>
                </div>
                <div className="wizard-field">
                  <label className="wizard-label">Tipo</label>
                  <select className="wizard-select" value={opt.optionType} onChange={e=>updOpt(oi,'optionType',e.target.value as 'radio'|'checkbox')}>
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
                        <input className="wizard-input" placeholder="Ej. Grande..." value={ch.name} onChange={e=>updCh(oi,ci,'name',e.target.value)}/>
                        <div className="wizard-input-prefix">
                          <span className="prefix">$</span>
                          <input className="wizard-input with-prefix" type="number" min="0" step="0.01" placeholder="0.00" value={ch.extraPrice===0?'':ch.extraPrice} onChange={e=>updCh(oi,ci,'extraPrice',parseFloat(e.target.value)||0)}/>
                        </div>
                        <button className="wizard-remove-btn" onClick={()=>remCh(oi,ci)}><IonIcon icon={trash}/></button>
                      </div>
                    ))}
                  </div>
                )}
                <button className="wizard-add-choice-btn" onClick={()=>addCh(oi)}><IonIcon icon={add}/>Agregar opción</button>
              </div>
            </div>
          </div>
        ))}
        <button className="wizard-add-option-btn" onClick={addOpt}><IonIcon icon={add}/>Agregar grupo de opciones</button>
      </div>
      {data.options.length===0 && <p className="wizard-skip-hint">Si el producto no tiene opciones, puedes omitir este paso.</p>}
    </div>
  );

  /* ── Step 5: Optional ── */
  const S5 = () => {
    const sections = [
      { icon:'📋', cls:'blue',   title:'Forma del producto',      desc:'Cantidad y presentación',
        body:<div className="wizard-field" style={{marginTop:12}}><label className="wizard-label">Cantidad</label><input className="wizard-input" placeholder="Ej. 500ml, 1kg..." value={data.formQuantity} onChange={e=>upd('formQuantity',e.target.value)}/></div> },
      { icon:'📝', cls:'green',  title:'Descripción adicional',   desc:'Información técnica',
        body:<div className="wizard-field" style={{marginTop:12}}><label className="wizard-label">Descripción técnica</label><textarea className="wizard-textarea" rows={3} placeholder="Información adicional..." value={data.additionalDescription} onChange={e=>upd('additionalDescription',e.target.value)}/></div> },
      { icon:'📦', cls:'orange', title:'Empaque',                 desc:'Tipo de empaque',
        body:<div className="wizard-field" style={{marginTop:12}}><label className="wizard-label">Nombre del empaque</label><input className="wizard-input" placeholder="Ej. Caja, Bolsa..." value={data.packingName} onChange={e=>upd('packingName',e.target.value)}/></div> },
      { icon:'🎁', cls:'purple', title:'Presentación de empaque', desc:'Presentación o tamaño',
        body:<div className="wizard-field" style={{marginTop:12}}><label className="wizard-label">Nombre de la presentación</label><input className="wizard-input" placeholder="Ej. Individual, Pack x6..." value={data.packingPresentationName} onChange={e=>upd('packingPresentationName',e.target.value)}/></div> },
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
  const S6 = () => {
    const rows1 = [{k:'Categoría',v:data.categoryName}];
    const rows2 = [{k:'Nombre',v:data.name},{k:'Código',v:data.code},{k:'Código de barras',v:data.barCode},{k:'Descripción',v:data.description},{k:'Fecha expiración',v:data.dateOfExpire}];
    const rows3 = [{k:'Precio de venta',v:data.salePrice?fmt(data.salePrice):''},{k:'Costo unitario',v:data.unitPrice?fmt(data.unitPrice):''},{k:'Stock inicial',v:data.stockQuantity}];
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
  const Success = () => (
    <div className="wizard-success">
      <div className="wizard-success-icon">✅</div>
      <h2>¡Producto creado!</h2>
      <p>El producto <strong>{data.name}</strong> fue creado exitosamente.</p>
    </div>
  );

  /* ── Footer ── */
  const isOptionalStep = step===3 || step===4;
  const isLastStep     = step===5;

  const Footer = () => (
    <div className="wizard-footer">
      {step>0 && !showSuccess && (
        <button className="wizard-footer-back" onClick={goBack}>
          <IonIcon icon={chevronForward} style={{transform:'rotate(180deg)'}}/> Atrás
        </button>
      )}
      <div className="wizard-footer-spacer"/>
      {isOptionalStep && !showSuccess && (
        <button className="wizard-footer-skip" onClick={skip}>Omitir</button>
      )}
      {!isLastStep && !showSuccess && (
        <button className="wizard-footer-next" onClick={goNext}>
          Siguiente <IonIcon icon={chevronForward}/>
        </button>
      )}
      {isLastStep && !showSuccess && (
        <button className="wizard-footer-submit" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Creando...' : '✓ Crear producto'}
        </button>
      )}
    </div>
  );

  /* ── Render ── */
  const stepContent = [<S1/>,<S2/>,<S3/>,<S4/>,<S5/>,<S6/>];

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} className="wizard-modal">
      <IonHeader>
        <IonToolbar>
          <IonTitle className="wizard-modal-title">Nuevo Producto</IonTitle>
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
          {showSuccess ? <Success/> : stepContent[step]}
        </div>
      </IonContent>

      {!showSuccess && <Footer/>}
    </IonModal>
  );
};

export default ProductWizard;
