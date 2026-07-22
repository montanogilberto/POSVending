import React from 'react';
import { IonInput, IonSpinner, IonIcon } from '@ionic/react';
import { alertCircleOutline } from 'ionicons/icons';
import { ExtractedIdFields } from '../utils/idOcr';
import './IdExtractedFieldsSummary.css';

interface IdExtractedFieldsSummaryProps {
  fields: ExtractedIdFields;
  onFieldsChange: (fields: ExtractedIdFields) => void;
  ocrLoading: boolean;
  ocrError: string;
}

// Domicilio and Clave de Elector are required on the contract (see
// contractPdf.ts) despite neither being reliably auto-extractable (confirmed
// via extensive on-device testing: the INE's anti-copy watermark defeats
// OCR, and a Gemini-vision alternative fabricated a different address/clave
// on nearly every call against the same photo) — kept here as manual-entry
// fields the client fills in by hand.
const FIELD_LABELS: Array<{ key: keyof ExtractedIdFields; label: string }> = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'domicilio', label: 'Domicilio' },
  { key: 'curp', label: 'CURP' },
  { key: 'claveElector', label: 'Clave de elector' },
  { key: 'fechaNacimiento', label: 'Fecha de nacimiento' },
];

// Pure display/edit component — the OCR fetch itself runs in the parent
// (ClientFaceRecognitionPage) as soon as front+back captures are ready, so
// it has time to finish in the background before this is ever shown (see
// that component's OCR effect for why).
const IdExtractedFieldsSummary: React.FC<IdExtractedFieldsSummaryProps> = ({
  fields,
  onFieldsChange,
  ocrLoading,
  ocrError,
}) => {
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
