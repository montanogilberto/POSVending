import React, { useEffect, useRef, useState } from 'react';
import { IonInput, IonSpinner, IonIcon } from '@ionic/react';
import { alertCircleOutline } from 'ionicons/icons';
import { extractIneFields, ExtractedIdFields } from '../utils/idOcr';
import './IdExtractedFieldsSummary.css';

interface IdExtractedFieldsSummaryProps {
  idFrontImageBase64: string;
  idBackImageBase64: string;
  fields: ExtractedIdFields;
  onFieldsChange: (fields: ExtractedIdFields) => void;
}

const FIELD_LABELS: Array<{ key: keyof ExtractedIdFields; label: string }> = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'domicilio', label: 'Domicilio' },
  { key: 'curp', label: 'CURP' },
  { key: 'claveElector', label: 'Clave de elector' },
  { key: 'fechaNacimiento', label: 'Fecha de nacimiento' },
];

// Runs OCR against the front+back ID captures (once per pair of images) and
// renders the results as editable inputs — office staff/client confirm or
// correct these before continuing, since handheld-photo OCR is never fully
// reliable. Front and back are both scanned because CURP/name/address land
// on different sides depending on the INE card revision.
const IdExtractedFieldsSummary: React.FC<IdExtractedFieldsSummaryProps> = ({
  idFrontImageBase64,
  idBackImageBase64,
  fields,
  onFieldsChange,
}) => {
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState('');
  const ranForRef = useRef('');

  useEffect(() => {
    if (!idFrontImageBase64 || !idBackImageBase64) return;
    const key = `${idFrontImageBase64.length}:${idBackImageBase64.length}`;
    if (ranForRef.current === key) return;
    ranForRef.current = key;

    let cancelled = false;
    console.log('[IdExtractedFieldsSummary] running OCR on front+back captures');
    setOcrLoading(true);
    setOcrError('');

    Promise.all([extractIneFields(idFrontImageBase64), extractIneFields(idBackImageBase64)])
      .then(([front, back]) => {
        if (cancelled) return;
        const merged: ExtractedIdFields = {
          nombre: front.nombre || back.nombre,
          domicilio: front.domicilio || back.domicilio,
          curp: front.curp || back.curp,
          claveElector: front.claveElector || back.claveElector,
          fechaNacimiento: front.fechaNacimiento || back.fechaNacimiento,
        };
        console.log('[IdExtractedFieldsSummary] OCR merged result', merged);
        onFieldsChange(merged);
      })
      .catch((err) => {
        console.log('[IdExtractedFieldsSummary] OCR FAILED', err);
        if (!cancelled) {
          setOcrError('No se pudo leer la identificación automáticamente. Completa los datos manualmente.');
        }
      })
      .finally(() => {
        if (!cancelled) setOcrLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idFrontImageBase64, idBackImageBase64]);

  return (
    <div className="id-extracted-fields ion-margin-top">
      <div className="id-extracted-fields-header">
        <span>Datos extraídos de la identificación</span>
        {ocrLoading && <IonSpinner name="crescent" />}
      </div>

      {ocrError && (
        <p className="id-extracted-fields-error">
          <IonIcon icon={alertCircleOutline} /> {ocrError}
        </p>
      )}

      {FIELD_LABELS.map(({ key, label }) => (
        <div className="id-extracted-field" key={key}>
          <label className="id-extracted-field-label">{label}</label>
          <IonInput
            className="id-extracted-field-input"
            fill="outline"
            value={fields[key]}
            placeholder={ocrLoading ? 'Leyendo...' : 'No detectado'}
            onIonInput={(e) => onFieldsChange({ ...fields, [key]: e.detail.value ?? '' })}
          />
        </div>
      ))}

      <p className="id-extracted-fields-hint">
        Verifica y corrige estos datos si es necesario — se detectan automáticamente y pueden contener errores.
      </p>
    </div>
  );
};

export default IdExtractedFieldsSummary;
