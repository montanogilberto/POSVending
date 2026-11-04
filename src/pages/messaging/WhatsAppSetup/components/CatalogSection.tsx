import React from 'react';
import { IonButton, IonCard, IonCardContent, IonIcon, IonItem, IonLabel, IonList, IonSpinner } from '@ionic/react';
import { addOutline, createOutline, trashOutline } from 'ionicons/icons';
import EmptyState from '../../../../components/ui/EmptyState';

interface Editor<T> {
  editing: { id: number | null } | null;
  saving: boolean;
  removingId: number | null;
  startNew: () => void;
  startEdit: (item: T) => void;
  cancel: () => void;
  save: () => void;
  remove: (item: T) => void;
}

interface CatalogSectionProps<T> {
  items: T[];
  idOf: (item: T) => number;
  title: (item: T) => string;
  detail: (item: T) => string | null;
  editor: Editor<T>;
  addLabel: string;
  emptyText: string;
  emptyIcon: string;
  /** The fields of the item being edited / created. */
  form: React.ReactNode;
}

/** A catalog list (servicios / promociones / preguntas) with one inline form for add/edit. */
function CatalogSection<T>({
  items, idOf, title, detail, editor, addLabel, emptyText, emptyIcon, form,
}: CatalogSectionProps<T>) {
  const busy = editor.saving || editor.removingId != null;

  const formCard = editor.editing && (
    <IonCard className="was-edit-card">
      <IonCardContent>
        {form}
        <div className="was-edit-actions">
          <IonButton fill="clear" color="medium" onClick={editor.cancel} disabled={editor.saving}>Cancelar</IonButton>
          <IonButton onClick={editor.save} disabled={editor.saving}>
            {editor.saving ? <IonSpinner name="dots" /> : 'Guardar'}
          </IonButton>
        </div>
      </IonCardContent>
    </IonCard>
  );

  return (
    <>
      {items.length === 0 && !editor.editing && <EmptyState icon={emptyIcon} text={emptyText} />}
      {items.length > 0 && (
        <IonList lines="full" className="was-catalog">
          {items.map(item => {
            const id = idOf(item);
            if (editor.editing?.id === id) return <React.Fragment key={id}>{formCard}</React.Fragment>;
            const d = detail(item);
            return (
              <IonItem key={id}>
                <IonLabel className="ion-text-wrap">
                  <h3>{title(item)}</h3>
                  {d && <p>{d}</p>}
                </IonLabel>
                <IonButton slot="end" fill="clear" aria-label="Editar" disabled={busy || !!editor.editing}
                  onClick={() => editor.startEdit(item)}>
                  <IonIcon icon={createOutline} slot="icon-only" />
                </IonButton>
                <IonButton slot="end" fill="clear" color="danger" aria-label="Quitar" disabled={busy}
                  onClick={() => editor.remove(item)}>
                  {editor.removingId === id ? <IonSpinner name="dots" /> : <IonIcon icon={trashOutline} slot="icon-only" />}
                </IonButton>
              </IonItem>
            );
          })}
        </IonList>
      )}
      {editor.editing?.id === null && formCard}
      {!editor.editing && (
        <IonButton fill="outline" className="was-add" onClick={editor.startNew} disabled={busy}>
          <IonIcon icon={addOutline} slot="start" /> {addLabel}
        </IonButton>
      )}
    </>
  );
}

export default CatalogSection;
