import React from 'react';
import { IonList, IonItem, IonLabel, IonButton, IonIcon, IonNote } from '@ionic/react';
import { addOutline } from 'ionicons/icons';
import StatusBadge from '../../../../components/ui/StatusBadge';
import { JOURNAL_ENTRY_STATUS } from '../../../../components/ui/statusMaps';
import { fmtMXN } from '../../../../utils/format';
import { AccountingVM } from '../AccountingLogic';
import JournalEntryFormModal from './JournalEntryFormModal';
import JournalEntryDetailModal from './JournalEntryDetailModal';

interface Props {
  vm: AccountingVM;
}

const JournalEntriesTab: React.FC<Props> = ({ vm }) => {
  return (
    <>
      <div className="accounting-toolbar">
        <h2>Libro Diario</h2>
        <IonButton size="small" onClick={() => vm.setShowEntryForm(true)}>
          <IonIcon icon={addOutline} slot="start" />
          Nuevo asiento
        </IonButton>
      </div>

      <IonList inset>
        {vm.entries.map((entry) => (
          <IonItem key={entry.entryId} button onClick={() => vm.handleViewEntry(entry.entryId)}>
            <IonLabel>
              <h3>
                <IonNote className="accounting-code">#{entry.entryNumber}</IonNote> {entry.description}
              </h3>
              <p>{entry.entryDate} · {fmtMXN(entry.totalDebit)} · <StatusBadge status={entry.status} map={JOURNAL_ENTRY_STATUS} /></p>
            </IonLabel>
          </IonItem>
        ))}
        {vm.entries.length === 0 && !vm.loading && (
          <IonItem><IonLabel color="medium">Sin asientos contables todavía.</IonLabel></IonItem>
        )}
      </IonList>

      <JournalEntryFormModal
        isOpen={vm.showEntryForm}
        accounts={vm.postableAccounts}
        onClose={() => vm.setShowEntryForm(false)}
        onSubmit={vm.handlePostEntry}
      />

      <JournalEntryDetailModal
        entry={vm.selectedEntry}
        onClose={() => vm.setSelectedEntry(null)}
        onVoid={vm.handleVoidEntry}
      />
    </>
  );
};

export default JournalEntriesTab;
