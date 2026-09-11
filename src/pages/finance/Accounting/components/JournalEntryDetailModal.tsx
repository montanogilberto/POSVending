import React from 'react';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent,
  IonList, IonItem, IonLabel, IonNote,
} from '@ionic/react';
import StatusBadge from '../../../../components/ui/StatusBadge';
import { JOURNAL_ENTRY_STATUS } from '../../../../components/ui/statusMaps';
import { fmtMXN } from '../../../../utils/format';
import { JournalEntryDetail } from '../../../../api/journalEntriesApi';

interface Props {
  entry: JournalEntryDetail | null;
  onClose: () => void;
  onVoid: (entryId: number) => Promise<void>;
}

const JournalEntryDetailModal: React.FC<Props> = ({ entry, onClose, onVoid }) => {
  return (
    <IonModal isOpen={!!entry} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Asiento #{entry?.entryNumber}</IonTitle>
          <IonButtons slot="end"><IonButton onClick={onClose}>Cerrar</IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {entry && (
          <>
            <p>{entry.entryDate} · <StatusBadge status={entry.status} map={JOURNAL_ENTRY_STATUS} /></p>
            <p><strong>{entry.description}</strong></p>

            <IonList inset>
              {entry.lines.map((line) => (
                <IonItem key={line.journalEntryLineId}>
                  <IonLabel>
                    <h3><IonNote className="accounting-code">{line.accountCode}</IonNote> {line.accountName}</h3>
                    {line.lineDescription && <p>{line.lineDescription}</p>}
                  </IonLabel>
                  <IonLabel slot="end" className="ion-text-end">
                    {line.debit > 0 && <p>Debe {fmtMXN(line.debit)}</p>}
                    {line.credit > 0 && <p>Haber {fmtMXN(line.credit)}</p>}
                  </IonLabel>
                </IonItem>
              ))}
            </IonList>

            <p className="accounting-totals-row">
              <strong>Total: {fmtMXN(entry.totalDebit)}</strong>
            </p>

            {entry.status === 'POSTED' && (
              <IonButton expand="block" color="danger" fill="outline" onClick={() => onVoid(entry.entryId)}>
                Anular asiento
              </IonButton>
            )}
          </>
        )}
      </IonContent>
    </IonModal>
  );
};

export default JournalEntryDetailModal;
