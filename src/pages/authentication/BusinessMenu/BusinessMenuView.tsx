/**
 * BusinessMenuView — "Sube tu menú o catálogo" in the POS signup wizard
 * (step "Perfil"). Optional: the LoanAgents business_menu agent reads a file
 * (PDF, image, Excel, CSV, Markdown) or a web page and the wizard adds the
 * POS modules it suggests. Presentation only — state in useBusinessMenu().
 */
import React from 'react';
import { IonButton, IonIcon, IonInput, IonSegment, IonSegmentButton, IonLabel, IonSpinner } from '@ionic/react';
import { cloudUploadOutline, linkOutline, documentAttachOutline } from 'ionicons/icons';
import { useBusinessMenu } from './BusinessMenuLogic';
import { MENU_FILE_ACCEPT } from './BusinessMenuConstants';
import type { BusinessMenuResult, MenuSourceMode } from './BusinessMenuTypes';
import MenuResultCard from './components/MenuResultCard';
import './BusinessMenu.css';

interface Props {
  businessName: string;
  result: BusinessMenuResult | null;
  onResult: (result: BusinessMenuResult | null) => void;
  moduleLabel: (id: string) => string;
}

const BusinessMenuView: React.FC<Props> = ({ businessName, result, onResult, moduleLabel }) => {
  const vm = useBusinessMenu({ businessName, result, onResult });

  return (
    <div className="bm-wrap">
      <div className="bm-head">
        <IonIcon icon={documentAttachOutline} aria-hidden="true" />
        <div>
          <p className="bm-title">Tu menú o catálogo <span>(opcional)</span></p>
          <p className="bm-sub">Lo leemos para entender qué vendes y preparar tu cuenta.</p>
        </div>
      </div>

      {vm.result ? <MenuResultCard vm={vm} moduleLabel={moduleLabel} /> : (
        <>
          <IonSegment
            value={vm.mode}
            disabled={vm.analyzing}
            onIonChange={e => vm.setMode((e.detail.value as MenuSourceMode) ?? 'file')}
            className="bm-segment"
          >
            <IonSegmentButton value="file"><IonLabel>Archivo</IonLabel></IonSegmentButton>
            <IonSegmentButton value="url"><IonLabel>Página web</IonLabel></IonSegmentButton>
          </IonSegment>

          {vm.mode === 'file' ? (
            <>
              {/* No Ionic file picker exists: a hidden native input opened by the IonButton. */}
              <input
                ref={vm.fileInputRef}
                type="file"
                accept={MENU_FILE_ACCEPT}
                hidden
                onChange={e => vm.onFileChosen(e.target.files?.[0])}
              />
              <IonButton expand="block" fill="outline" className="bm-upload" onClick={vm.pickFile} disabled={vm.analyzing}>
                {vm.analyzing ? (
                  <><IonSpinner name="dots" /><span className="bm-busy">Analizando {vm.fileName ?? 'tu archivo'}…</span></>
                ) : (
                  <><IonIcon slot="start" icon={cloudUploadOutline} />Elegir archivo</>
                )}
              </IonButton>
              <p className="bm-formats">PDF, foto o imagen, Excel (.xlsx), CSV o Markdown · máx. 8 MB</p>
            </>
          ) : (
            <form className="bm-url" onSubmit={e => { e.preventDefault(); vm.analyzeUrl(); }}>
              <IonInput
                fill="outline"
                label="Dirección de tu página o menú en línea"
                labelPlacement="floating"
                type="url"
                inputmode="url"
                value={vm.url}
                disabled={vm.analyzing}
                onIonInput={e => vm.setUrl(String(e.detail.value ?? ''))}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); vm.analyzeUrl(); } }}
              />
              <IonButton type="submit" className="bm-url-go" disabled={vm.analyzing || !vm.url.trim()}>
                {vm.analyzing ? <IonSpinner name="dots" /> : <><IonIcon slot="start" icon={linkOutline} />Analizar</>}
              </IonButton>
            </form>
          )}

          {vm.error && <p className="bm-error">{vm.error}</p>}
        </>
      )}
    </div>
  );
};

export default BusinessMenuView;
