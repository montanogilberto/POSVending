import React, { useRef, useState } from 'react';
import { IonButton, IonCard, IonCardContent, IonChip, IonIcon, IonSpinner } from '@ionic/react';
import { alertCircleOutline, checkmarkCircleOutline, globeOutline } from 'ionicons/icons';
import { lookupProductOnWeb, WebProductLookup } from '../../../api/productAgentApi';
import { fmtMXN } from '../../../utils/format';
import './ProductWebSearch.css';

export interface ProductWebSearchProps {
  companyId: number;
  /** What the person already typed: the search uses the barcode first, then the name. */
  barCode: string;
  name: string;
  disabled?: boolean;
  /** Fills the form from the result; returns the labels of the fields it filled. */
  onApply: (result: WebProductLookup) => string[];
}

type SearchState = 'idle' | 'loading' | 'done' | 'failed';

/** MXN with the app's formatter; another country's currency keeps its code. */
const fmtPrice = (r: WebProductLookup) =>
  !r.currency || r.currency === 'MXN' ? fmtMXN(r.price) : `${r.price.toFixed(2)} ${r.currency}`;

/**
 * "Buscar en internet": the product web lookup agent finds the product by its
 * barcode or name and offers name, description, net content and market price.
 * Suggestions only — nothing reaches the form until "Aplicar", and the wizard
 * only fills fields that are still empty. Each search is one paid agent call.
 */
const ProductWebSearch: React.FC<ProductWebSearchProps> = ({ companyId, barCode, name, disabled, onApply }) => {
  const [state, setState] = useState<SearchState>('idle');
  const [result, setResult] = useState<WebProductLookup | null>(null);
  const [filled, setFilled] = useState<string[] | null>(null);
  const latest = useRef(0);

  const code = barCode.trim();
  const text = name.trim();
  const canSearch = Boolean(code || text);

  const search = async () => {
    if (!canSearch || state === 'loading') return;
    const mine = ++latest.current;
    setState('loading');
    setResult(null);
    setFilled(null);
    const found = await lookupProductOnWeb({ companyId, merchantName: '', code, ticketName: text });
    if (mine !== latest.current) return;
    setResult(found);
    setState(found ? 'done' : 'failed');
  };

  const piece = result && result.netContent > 0 && result.unitOfMeasure ? `${result.netContent} ${result.unitOfMeasure}` : '';
  const existing = result?.existingProduct?.id ? result.existingProduct.name : '';

  return (
    <IonCard className="web-search">
      <IonCardContent>
        <div className="web-search-title">
          <IonIcon icon={globeOutline} />
          <span>Buscar en internet</span>
        </div>
        <p className="web-search-hint">
          {code ? <>Busca el código de barras <strong>{code}</strong>{text && <> y «{text}»</>}.</>
            : text ? <>Busca «{text}».</>
            : 'Escribe el código de barras o el nombre del producto y búscalo para llenar el resto.'}
        </p>

        <IonButton size="small" fill="outline" onClick={search} disabled={disabled || !canSearch || state === 'loading'}>
          {state === 'loading' ? <><IonSpinner name="dots" /> Buscando…</> : result ? 'Buscar de nuevo' : 'Buscar producto'}
        </IonButton>

        {state === 'failed' && (
          <p className="web-search-status web-search-status--error">No se pudo buscar el producto. Revisa tu conexión e intenta de nuevo.</p>
        )}

        {state === 'done' && result && (
          !result.found ? (
            <p className="web-search-status web-search-status--error">
              {result.issues[0] ?? 'No se encontró el producto en internet.'} Prueba con el nombre completo o la marca.
            </p>
          ) : (
            <div className="web-search-result">
              <div className="web-search-head">
                <strong>{result.suggestedName || result.fullName}</strong>
                <IonChip color={result.verified ? 'success' : 'warning'} className="web-search-chip">
                  {result.verified ? 'Código verificado' : 'Por nombre'}
                </IonChip>
              </div>
              <dl className="web-search-fields">
                {result.brand && (<><dt>Marca</dt><dd>{result.brand}</dd></>)}
                {piece && (<><dt>Contenido</dt><dd>{piece}{result.unitsPerPack > 1 ? ` · paquete de ${result.unitsPerPack}` : ''}</dd></>)}
                {result.price > 0 && (<><dt>Precio en internet</dt><dd>{fmtPrice(result)}</dd></>)}
                {result.description && (<><dt>Descripción</dt><dd>{result.description}</dd></>)}
              </dl>
              {existing && (
                <p className="web-search-warning">
                  <IonIcon icon={alertCircleOutline} />
                  Ya existe en tu catálogo como «{existing}». Revisa antes de crear otro.
                </p>
              )}
              {result.issues.filter(i => !i.startsWith('Ya existe')).map(i => (
                <p key={i} className="web-search-issue">{i}</p>
              ))}
              {result.sources.length > 0 && (
                <p className="web-search-source">Fuente: {result.sources.map(s => s.title).filter(Boolean).join(', ')}</p>
              )}
              {filled === null ? (
                <IonButton expand="block" size="small" onClick={() => setFilled(onApply(result))} disabled={disabled}>
                  Aplicar al formulario
                </IonButton>
              ) : (
                <p className="web-search-status web-search-status--ok">
                  <IonIcon icon={checkmarkCircleOutline} />
                  {filled.length ? `Se llenó: ${filled.join(', ')}. Revisa antes de continuar.` : 'No había campos vacíos que llenar.'}
                </p>
              )}
            </div>
          )
        )}
      </IonCardContent>
    </IonCard>
  );
};

export default ProductWebSearch;
