import React, { ReactNode, useEffect, useState } from 'react';
import { IonButton, IonContent, IonPage } from '@ionic/react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { fetchMinNativeVersion } from '../../api/appVersionApi';
import { APP_STORE_URL, PLAY_STORE_URL } from '../../utils/appLinks';
import './UpdateRequiredGate.css';

/**
 * Blocks a native build older than the backend's minimum. The app stays usable
 * while checking and if the check fails: a network problem must not lock anyone out.
 */
const UpdateRequiredGate: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mustUpdate, setMustUpdate] = useState(false);
  const platform = Capacitor.getPlatform();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;
    Promise.all([CapacitorApp.getInfo(), fetchMinNativeVersion()])
      .then(([info, minimum]) => {
        const required = platform === 'ios' ? minimum.ios : minimum.android;
        if (!cancelled && required > 0 && Number(info.build) < required) setMustUpdate(true);
      })
      .catch(() => console.log('[UpdateRequiredGate] check failed, app stays usable'));
    return () => {
      cancelled = true;
    };
  }, [platform]);

  if (!mustUpdate) return <>{children}</>;

  return (
    <IonPage>
      <IonContent>
        <div className="update-required">
          <h1>Actualiza la app</h1>
          <p>Esta versión ya no es compatible. Descarga la más reciente para seguir usándola.</p>
          <IonButton expand="block" href={platform === 'ios' ? APP_STORE_URL : PLAY_STORE_URL}>
            Actualizar
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default UpdateRequiredGate;
