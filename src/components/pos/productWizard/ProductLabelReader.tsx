import React, { useEffect, useRef, useState } from 'react';
import { IonButton, IonCard, IonCardContent, IonIcon, IonImg, IonSpinner } from '@ionic/react';
import { cameraOutline, closeCircle, sparklesOutline, alertCircleOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { extractProductLabel, ProductLabelReading } from '../../../api/productAgentApi';
import { pickProductLabelPhoto } from '../../../utils/pickAvatarPhoto';
import './ProductLabelReader.css';

const MAX_PHOTOS = 3;

export interface ProductLabelReaderProps {
  companyId: number;
  disabled?: boolean;
  /** Fills the form from the reading; returns the labels of the fields it filled. */
  onApply: (reading: ProductLabelReading) => string[];
  /** Current photos (data URLs) — the wizard offers them as the product image. */
  onPhotosChange?: (photos: string[]) => void;
}

type ReaderState = 'idle' | 'loading' | 'done' | 'failed';

/**
 * "Llenar con fotos del producto": the product label agent reads 1-3 photos
 * (front + back with the barcode) and offers the values to the wizard.
 * Suggestions only — nothing reaches the form until "Aplicar", and the
 * wizard only fills fields that are still empty.
 */
const ProductLabelReader: React.FC<ProductLabelReaderProps> = ({ companyId, disabled, onApply, onPhotosChange }) => {
  const [photos, setPhotos] = useState<string[]>([]);
  const [state, setState] = useState<ReaderState>('idle');
  const [reading, setReading] = useState<ProductLabelReading | null>(null);
  const [filled, setFilled] = useState<string[] | null>(null);
  const latest = useRef(0);

  useEffect(() => { onPhotosChange?.(photos); }, [photos]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetReading = () => {
    latest.current++;
    setState('idle');
    setReading(null);
    setFilled(null);
  };

  const addPhoto = async () => {
    const dataUrl = await pickProductLabelPhoto();
    if (!dataUrl) return;
    setPhotos((p) => [...p, dataUrl].slice(0, MAX_PHOTOS));
    resetReading();
  };

  const removePhoto = (index: number) => {
    setPhotos((p) => p.filter((_, i) => i !== index));
    resetReading();
  };

  const read = async () => {
    if (!photos.length) return;
    const mine = ++latest.current;
    setState('loading');
    setReading(null);
    setFilled(null);
    const result = await extractProductLabel({ companyId, photos });
    if (mine !== latest.current) return; // a newer read or photo change won
    setReading(result);
    setState(result ? 'done' : 'failed');
  };

  const apply = () => {
    if (reading) setFilled(onApply(reading));
  };

  const duplicate = reading?.matchedBy === 'barCode';
  const similar = reading?.matchedBy === 'name' && reading.existingProduct.name;

  return (
    <IonCard className="label-reader">
      <IonCardContent>
        <div className="label-reader-title">
          <IonIcon icon={sparklesOutline} />
          <span>Llenar con fotos del producto</span>
        </div>
        <p className="label-reader-hint">
          Toma el frente y el reverso (donde están el código de barras, el contenido y la caducidad).
        </p>

        {photos.length > 0 && (
          <div className="label-reader-photos">
            {photos.map((src, i) => (
              <div key={i} className="label-reader-photo">
                <IonImg src={src} alt={`Foto ${i + 1} del producto`} />
                <IonButton fill="clear" size="small" className="label-reader-remove"
                  onClick={() => removePhoto(i)} disabled={disabled || state === 'loading'}
                  aria-label={`Quitar foto ${i + 1}`}>
                  <IonIcon slot="icon-only" icon={closeCircle} />
                </IonButton>
              </div>
            ))}
          </div>
        )}

        <div className="label-reader-actions">
          {photos.length < MAX_PHOTOS && (
            <IonButton fill="outline" size="small" onClick={addPhoto} disabled={disabled || state === 'loading'}>
              <IonIcon slot="start" icon={cameraOutline} />
              {photos.length ? 'Agregar otra foto' : 'Tomar o subir foto'}
            </IonButton>
          )}
          {photos.length > 0 && (
            <IonButton size="small" onClick={read} disabled={disabled || state === 'loading'}>
              {state === 'loading' ? <IonSpinner name="crescent" /> : 'Leer etiqueta'}
            </IonButton>
          )}
        </div>

        {state === 'loading' && <p className="label-reader-status">Leyendo la etiqueta…</p>}
        {state === 'failed' && (
          <p className="label-reader-status label-reader-status--error">
            No se pudo leer la etiqueta. Intenta de nuevo o con una foto más cercana.
          </p>
        )}

        {state === 'done' && reading && (
          <div className="label-reader-result">
            {!reading.isProduct ? (
              <p className="label-reader-status label-reader-status--error">
                La foto no parece ser de un producto.
              </p>
            ) : (
              <>
                <dl className="label-reader-fields">
                  {reading.suggestedName && (<><dt>Nombre</dt><dd>{reading.suggestedName}</dd></>)}
                  {reading.barCode && (<><dt>Código de barras</dt><dd>{reading.barCode}</dd></>)}
                  {reading.netContent > 0 && (<><dt>Contenido</dt><dd>{reading.netContent} {reading.unitOfMeasure}</dd></>)}
                  {reading.expirationDate && (<><dt>Caducidad</dt><dd>{reading.expirationDate}</dd></>)}
                  {reading.description && (<><dt>Descripción</dt><dd>{reading.description}</dd></>)}
                </dl>

                {duplicate && (
                  <p className="label-reader-warning">
                    <IonIcon icon={alertCircleOutline} />
                    Este código de barras ya está registrado como «{reading.existingProduct.name}». Revisa antes de crear otro.
                  </p>
                )}
                {!duplicate && similar && (
                  <p className="label-reader-warning">
                    <IonIcon icon={alertCircleOutline} />
                    Se parece a «{reading.existingProduct.name}», que ya existe.
                  </p>
                )}
                {reading.issues.filter((i) => !i.includes('ya está registrado')).map((issue, i) => (
                  <p key={i} className="label-reader-issue">{issue}</p>
                ))}
                {reading.notes.map((note, i) => (
                  <p key={`n${i}`} className="label-reader-note">{note}</p>
                ))}

                {filled === null ? (
                  <IonButton expand="block" size="small" onClick={apply} disabled={disabled}>
                    Aplicar al formulario
                  </IonButton>
                ) : (
                  <p className="label-reader-status label-reader-status--ok">
                    <IonIcon icon={checkmarkCircleOutline} />
                    {filled.length
                      ? `Se llenó: ${filled.join(', ')}. Revisa antes de continuar.`
                      : 'No había campos vacíos que llenar.'}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </IonCardContent>
    </IonCard>
  );
};

export default ProductLabelReader;
