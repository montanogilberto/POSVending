import React, { useEffect, useRef, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons,
  IonIcon, IonToast, IonLoading, IonCheckbox, IonProgressBar, IonBadge,
} from '@ionic/react';
import {
  checkmarkCircle, ellipseOutline, fingerPrintOutline, documentTextOutline,
  shieldCheckmarkOutline, arrowForwardOutline, arrowBackOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useUser } from '../components/UserContext';
import {
  getAllClientFaceRecognitions, updateClientFaceRecognition,
  ClientFaceRecognition,
} from '../api/clientFaceRecognitionApi';
import SignaturePad from '../components/SignaturePad';
import './BorrowerOnboardingPage.css';

const PAGARE_TEXT = `PAGARÉ

Lugar y Fecha: _______________

Yo, _________________________________ (en adelante "el Suscriptor"), con domicilio en _________________________________, me obligo incondicionalmente a pagar a la orden de _________________________________ (en adelante "el Beneficiario"), la cantidad de $_________________ (________________________ pesos 00/100 M.N.), en la fecha de vencimiento _____________, o antes si así lo acordamos.

TASA DE INTERÉS: La cantidad adeudada generará un interés anual del ____% sobre saldos insolutos, pagadero de manera _____________.

LUGAR DE PAGO: El presente pagaré será pagado en ___________________________.

CLÁUSULA DE VENCIMIENTO ANTICIPADO: En caso de incumplimiento de cualquier pago parcial, el Beneficiario podrá exigir el pago total de la deuda pendiente.

DISPOSICIONES LEGALES: El presente pagaré se rige por los artículos 170 al 174 de la Ley General de Títulos y Operaciones de Crédito vigente en los Estados Unidos Mexicanos. En caso de controversia, las partes se someten expresamente a la jurisdicción de los Tribunales competentes de la Ciudad de México, renunciando a cualquier otro fuero que por razón de su domicilio presente o futuro pudiere corresponderles.

EJECUTIVIDAD: El presente documento constituye un Título de Crédito con carácter ejecutivo de conformidad con el artículo 167 de la LGTOC, por lo que en caso de incumplimiento el Beneficiario podrá iniciar acción ejecutiva mercantil ante Juez competente sin necesidad de juicio previo.

El Suscriptor declara que ha leído y comprendido el presente pagaré y que firma el mismo de manera voluntaria y libre de cualquier vicio del consentimiento.`;

const CONTRACT_TEXT = `CONTRATO DE CRÉDITO PERSONAL P2P — POS GMO

Ciudad de México, a _______________

PARTES:
- ACREDITANTE: _________________________________ (Prestamista)
- ACREDITADO: _________________________________ (Prestatario)

PRIMERA — OBJETO: El Acreditante otorga al Acreditado un crédito personal de hasta $_________________ M.N. bajo las condiciones establecidas en el Pagaré firmado en este mismo acto.

SEGUNDA — TASA Y PLAZO: La tasa de interés, el plazo y la forma de pago quedarán determinados en el Pagaré correspondiente y en la oferta aceptada dentro de la plataforma POS GMO.

TERCERA — OBLIGACIONES DEL ACREDITADO:
a) Destinar los recursos al fin declarado.
b) Pagar puntualmente capital e intereses en las fechas convenidas.
c) Notificar cualquier cambio de domicilio o situación financiera relevante dentro de los 5 días siguientes.
d) Mantener vigentes los datos biométricos registrados en la plataforma.

CUARTA — INCUMPLIMIENTO: En caso de mora el Acreditante podrá:
i) Cobrar intereses moratorios al doble de la tasa ordinaria pactada.
ii) Hacer exigible la totalidad del crédito de manera anticipada.
iii) Ejercer acción ejecutiva mercantil con base en el Pagaré suscrito.

QUINTA — DATOS PERSONALES: El Acreditado consiente expresamente el tratamiento de sus datos personales, incluyendo datos biométricos, conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y el Aviso de Privacidad de POS GMO.

SEXTA — MEDIACIÓN: Antes de iniciar cualquier procedimiento judicial, las partes acuerdan someter la controversia a mediación ante la Procuraduría Federal del Consumidor (PROFECO) o institución equivalente.

SÉPTIMA — JURISDICCIÓN: Para todo lo no previsto en este contrato, las partes se sujetan a la Ley General de Títulos y Operaciones de Crédito, el Código de Comercio y la legislación aplicable vigente en los Estados Unidos Mexicanos.

Al aceptar digitalmente, el Acreditado reconoce haber leído, entendido y aceptado la totalidad de las cláusulas del presente contrato.`;

type Step = 0 | 1 | 2;

const STEPS = [
  { icon: fingerPrintOutline,    label: 'Biometría'  },
  { icon: documentTextOutline,   label: 'Pagaré'     },
  { icon: shieldCheckmarkOutline, label: 'Contrato'  },
];

const BorrowerOnboardingPage: React.FC = () => {
  const history = useHistory();
  const { clientId, companyId, userId } = useUser();

  const [step, setStep] = useState<Step>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [record, setRecord] = useState<ClientFaceRecognition | null>(null);

  // Step 1 — Pagaré
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [pagareAccepted, setPagareAccepted] = useState(false);

  // Step 2 — Contract
  const [contractAccepted, setContractAccepted] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const recs = await getAllClientFaceRecognitions(companyId);
        const mine = recs.find(r => r.clientId === clientId) ?? null;
        setRecord(mine);
        if (mine?.pagareAccepted) setPagareAccepted(true);
        if (mine?.contractAccepted) setContractAccepted(true);
      } catch { /* silent */ }
      setLoading(false);
    })();
  }, [clientId, companyId]);

  const biometricDone = !!record?.isVerified;
  const pagareDone    = !!record?.pagareAccepted;
  const contractDone  = !!record?.contractAccepted;
  const allDone       = biometricDone && pagareDone && contractDone;

  // ── Step 0: Biometría ──────────────────────────────────────────────────
  const goToFaceRecognition = () => {
    history.push(`/client-face-recognition`);
  };

  // ── Step 1: Pagaré ─────────────────────────────────────────────────────
  const savePagare = async () => {
    if (!signatureDataUrl && !pagareDone) {
      setToast('Debes firmar el pagaré antes de continuar');
      return;
    }
    if (!pagareAccepted) {
      setToast('Debes aceptar el pagaré');
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      if (record?.clientFaceRecognitionId) {
        await updateClientFaceRecognition(record.clientFaceRecognitionId, {
          pagareAccepted: true,
          pagareAcceptedAt: now,
          pagarePdfBlobUrl: signatureDataUrl ?? record.pagarePdfBlobUrl,
        });
        setRecord(r => r ? { ...r, pagareAccepted: true, pagareAcceptedAt: now } : r);
      }
      setStep(2);
    } catch (e: any) {
      setToast(e?.message ?? 'Error al guardar pagaré');
    }
    setSaving(false);
  };

  // ── Step 2: Contract ───────────────────────────────────────────────────
  const saveContract = async () => {
    if (!contractAccepted) {
      setToast('Debes aceptar el contrato para continuar');
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      if (record?.clientFaceRecognitionId) {
        await updateClientFaceRecognition(record.clientFaceRecognitionId, {
          contractAccepted: true,
          contractAcceptedAt: now,
        });
      }
      history.replace('/p2p-lending');
    } catch (e: any) {
      setToast(e?.message ?? 'Error al guardar contrato');
    }
    setSaving(false);
  };

  const stepDone = [biometricDone, pagareDone, contractDone];

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => history.goBack()}>
              <IonIcon icon={arrowBackOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
          <IonTitle>Perfil de Prestatario</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="bop-content">
        <IonLoading isOpen={loading || saving} message={saving ? 'Guardando...' : 'Cargando...'} />
        <IonToast isOpen={!!toast} message={toast ?? ''} duration={3000} onDidDismiss={() => setToast(null)} color="warning" position="top" />

        {/* ── Progress bar ── */}
        <IonProgressBar value={(step + (stepDone[step] ? 1 : 0)) / 3} color="primary" style={{ height: 6 }} />

        {/* ── Step indicator ── */}
        <div className="bop-steps">
          {STEPS.map((s, i) => (
            <div key={i} className={`bop-step ${i === step ? 'active' : ''} ${stepDone[i] ? 'done' : ''}`}>
              <div className="bop-step-icon">
                <IonIcon icon={stepDone[i] ? checkmarkCircle : (i === step ? s.icon : ellipseOutline)} />
              </div>
              <span className="bop-step-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* ══════════════ STEP 0 — Biometría ══════════════ */}
        {step === 0 && (
          <div className="bop-panel">
            <div className="bop-section-title">
              <IonIcon icon={fingerPrintOutline} />
              Verificación Biométrica
            </div>
            <p className="bop-desc">
              Tu identidad debe verificarse con reconocimiento facial y documento de identidad oficial antes de poder acceder a préstamos. Este paso es obligatorio por ley para la firma del Pagaré.
            </p>

            {biometricDone ? (
              <div className="bop-done-card">
                <IonIcon icon={checkmarkCircle} color="success" />
                <div>
                  <strong>Biometría verificada</strong>
                  <p>Puntuación de confianza: {((record?.confidenceScore ?? 0) * 100).toFixed(0)}%</p>
                </div>
              </div>
            ) : (
              <div className="bop-alert-card">
                <p>⚠️ Aún no tienes datos biométricos registrados. Completa la verificación facial para continuar.</p>
                <IonButton expand="block" onClick={goToFaceRecognition}>
                  Ir a verificación facial
                  <IonIcon icon={arrowForwardOutline} slot="end" />
                </IonButton>
              </div>
            )}

            <IonButton
              expand="block"
              disabled={!biometricDone}
              onClick={() => setStep(1)}
              className="bop-next-btn"
            >
              Continuar → Pagaré
              <IonIcon icon={arrowForwardOutline} slot="end" />
            </IonButton>
          </div>
        )}

        {/* ══════════════ STEP 1 — Pagaré ══════════════ */}
        {step === 1 && (
          <div className="bop-panel">
            <div className="bop-section-title">
              <IonIcon icon={documentTextOutline} />
              Pagaré — Título de Crédito
            </div>
            <p className="bop-desc">
              Lee detenidamente el pagaré. Este documento tiene fuerza ejecutiva ante cualquier juez en México conforme a la LGTOC y es el único instrumento que se presentará en caso de incumplimiento.
            </p>

            {pagareDone ? (
              <div className="bop-done-card">
                <IonIcon icon={checkmarkCircle} color="success" />
                <div>
                  <strong>Pagaré firmado y aceptado</strong>
                  <p>Firmado digitalmente el {record?.pagareAcceptedAt ? new Date(record.pagareAcceptedAt).toLocaleDateString('es-MX') : '—'}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="bop-legal-doc">
                  <pre>{PAGARE_TEXT}</pre>
                </div>

                <div className="bop-sig-label">Firma digital del Suscriptor</div>
                <SignaturePad
                  height={180}
                  label="Dibuja tu firma aquí"
                  onSave={setSignatureDataUrl}
                  onClear={() => setSignatureDataUrl(null)}
                />
                {signatureDataUrl && (
                  <p style={{ fontSize: 12, color: '#16a34a', marginTop: 6 }}>✓ Firma capturada</p>
                )}

                <div className="bop-check-row">
                  <IonCheckbox
                    checked={pagareAccepted}
                    onIonChange={e => setPagareAccepted(e.detail.checked)}
                  />
                  <label onClick={() => setPagareAccepted(v => !v)}>
                    He leído, entendido y acepto el presente Pagaré, reconociendo su carácter ejecutivo conforme a la Ley General de Títulos y Operaciones de Crédito.
                  </label>
                </div>
              </>
            )}

            <div className="bop-row-btns">
              <IonButton fill="outline" onClick={() => setStep(0)}>
                <IonIcon icon={arrowBackOutline} slot="start" /> Anterior
              </IonButton>
              <IonButton
                onClick={pagareDone ? () => setStep(2) : savePagare}
                disabled={!pagareDone && (!pagareAccepted || !signatureDataUrl)}
              >
                {pagareDone ? 'Continuar' : 'Firmar y continuar'}
                <IonIcon icon={arrowForwardOutline} slot="end" />
              </IonButton>
            </div>
          </div>
        )}

        {/* ══════════════ STEP 2 — Contrato ══════════════ */}
        {step === 2 && (
          <div className="bop-panel">
            <div className="bop-section-title">
              <IonIcon icon={shieldCheckmarkOutline} />
              Contrato de Crédito P2P
            </div>
            <p className="bop-desc">
              Este contrato complementa el Pagaré y establece las obligaciones de ambas partes, incluyendo manejo de datos biométricos conforme a la LFPDPPP.
            </p>

            {contractDone ? (
              <div className="bop-done-card">
                <IonIcon icon={checkmarkCircle} color="success" />
                <div>
                  <strong>Contrato aceptado</strong>
                  <p>Aceptado el {record?.contractAcceptedAt ? new Date(record.contractAcceptedAt).toLocaleDateString('es-MX') : '—'}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="bop-legal-doc">
                  <pre>{CONTRACT_TEXT}</pre>
                </div>

                <div className="bop-check-row">
                  <IonCheckbox
                    checked={contractAccepted}
                    onIonChange={e => setContractAccepted(e.detail.checked)}
                  />
                  <label onClick={() => setContractAccepted(v => !v)}>
                    He leído, entendido y acepto íntegramente el Contrato de Crédito Personal P2P, incluyendo el tratamiento de mis datos personales y biométricos conforme al Aviso de Privacidad de POS GMO.
                  </label>
                </div>
              </>
            )}

            <div className="bop-row-btns">
              <IonButton fill="outline" onClick={() => setStep(1)}>
                <IonIcon icon={arrowBackOutline} slot="start" /> Anterior
              </IonButton>
              <IonButton
                color="success"
                onClick={contractDone ? () => history.replace('/p2p-lending') : saveContract}
                disabled={!contractDone && !contractAccepted}
              >
                {contractDone ? 'Ir a la plataforma' : 'Aceptar y activar cuenta'}
                <IonIcon icon={checkmarkCircle} slot="end" />
              </IonButton>
            </div>
          </div>
        )}

        {/* ── All done summary ── */}
        {allDone && step < 2 && (
          <div style={{ margin: '16px', textAlign: 'center' }}>
            <IonBadge color="success" style={{ fontSize: 14, padding: '8px 16px' }}>
              ✓ Perfil completo — listo para solicitar préstamos
            </IonBadge>
            <br />
            <IonButton className="ion-margin-top" onClick={() => history.replace('/p2p-lending')}>
              Ir a la plataforma P2P
            </IonButton>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default BorrowerOnboardingPage;
