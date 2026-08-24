/**
 * ChipStoreView — solo presentacion (MVVM).
 * Sin cobros ni logica: todo viene de useChipStore().
 */
import React from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
  IonIcon, IonToast, IonSpinner, IonChip, IonLabel,
} from '@ionic/react';
import {
  arrowBackOutline, phonePortraitOutline, informationCircle, lockClosedOutline,
  cardOutline,
} from 'ionicons/icons';
import EmptyState from '../../../components/ui/EmptyState';
import { fmtInt } from '../../../utils/format';
import { useChipStore } from './ChipStoreLogic';
import ChipPackCard from './components/ChipPackCard';
import CustomPackCard from './components/CustomPackCard';
import StripeChipSheet from './components/StripeChipSheet';

const ChipStoreView: React.FC = () => {
  const vm = useChipStore();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => vm.history.goBack()}>
              <IonIcon icon={arrowBackOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
          <IonTitle>Tienda de fichas</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="cs-content">
        <IonToast {...vm.toastProps} />

        {vm.loading ? (
          <div className="cs-loading"><IonSpinner name="dots" /></div>
        ) : (
          <>
            <div className="cs-balance">
              <IonChip outline color="warning">
                <IonLabel>{fmtInt(vm.coinBalance)} fichas</IonLabel>
              </IonChip>
            </div>

            {/* Con tarjeta guardada la compra es de un toque: decirlo antes
                de tocar evita la duda de "¿me va a pedir los datos?". */}
            {vm.rail === 'stripe' && vm.card?.last4 && (
              <div className="cs-card-hint">
                <IonIcon icon={cardOutline} />
                <span>
                  Se cobrará a tu {vm.card.brand ?? 'tarjeta'} •••• {vm.card.last4}
                </span>
              </div>
            )}

            {/* El bloqueo por IAP solo aplica cuando ESE es el riel elegido. */}
            {vm.rail === 'iap' && vm.iapBlocked === 'web' ? (
              <EmptyState
                icon={phonePortraitOutline}
                text="Las fichas se compran desde la app de iPhone o Android."
                className="cs-empty"
              />
            ) : vm.rail === 'iap' && vm.iapBlocked === 'plugin_missing' ? (
              <EmptyState
                icon={lockClosedOutline}
                text="La tienda todavía no está disponible en esta versión de la app."
                className="cs-empty"
              />
            ) : vm.packs.length === 0 ? (
              <EmptyState
                icon={informationCircle}
                text="No hay paquetes disponibles por ahora."
                className="cs-empty"
              />
            ) : (
              <>
                <div className="cs-grid">
                  {vm.fixedPacks.map(pack => (
                    <ChipPackCard
                      key={pack.packKey}
                      pack={pack}
                      storePrice={vm.prices[
                        vm.platform === 'ios' ? pack.productIdIos : pack.productIdAndroid
                      ]}
                      busy={vm.buying === pack.packKey}
                      disabled={!!vm.buying}
                      onBuy={vm.buy}
                    />
                  ))}
                </div>

                {/* El monto libre va aparte y a lo ancho: dentro de la rejilla
                    el deslizador quedaba demasiado angosto para apuntarle. */}
                {vm.customPack && (
                  <CustomPackCard
                    pack={vm.customPack}
                    busy={vm.buying === vm.customPack.packKey}
                    disabled={!!vm.buying}
                    onBuy={vm.buy}
                  />
                )}
              </>
            )}

            <div className="cs-legal">
              <IonIcon icon={informationCircle} />
              <p>
                Las fichas son solo para jugar dentro del arcade.
                <strong> No son dinero, no se canjean y no se reembolsan en efectivo.</strong>
              </p>
            </div>

            <StripeChipSheet
              clientSecret={vm.sheet?.clientSecret ?? null}
              packName={vm.sheet?.packName ?? ''}
              chips={vm.sheet?.chips ?? 0}
              onDone={vm.finishSheet}
              onDismiss={vm.closeSheet}
            />
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default ChipStoreView;
