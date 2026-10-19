/**
 * ExitConfirmContext — "¿Seguro que quieres salir?" before leaving a screen.
 *
 * One IonToast for the whole app (buttons: Quedarme / Salir). Triggered by:
 *   - every on-screen back button (components/ui/ConfirmBackButton, used by
 *     Header and the pages that render their own toolbar);
 *   - the Android hardware back button (ionBackButton, priority 10: above the
 *     router's own back handler (0), below open overlays (100) — so a modal or
 *     popover still just closes, without asking).
 * With history → Salir goes back; at the root → Salir closes the app (native).
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { IonToast, useIonRouter } from '@ionic/react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

interface ExitConfirmValue {
  /** Shows the confirm toast; `onConfirm` runs only if the user taps "Salir". */
  confirmExit: (onConfirm: () => void, message?: string) => void;
  /** Back with confirmation: router history if any, else `defaultHref`. */
  confirmBack: (defaultHref?: string) => void;
}

const ExitConfirmContext = createContext<ExitConfirmValue | null>(null);

const BACK_MESSAGE = '¿Seguro que quieres salir de esta pantalla?';
const EXIT_APP_MESSAGE = '¿Seguro que quieres salir de la app?';

export const ExitConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useIonRouter();
  const [prompt, setPrompt] = useState<{ message: string } | null>(null);
  // Kept in a ref so the toast button always runs the latest request.
  const onConfirmRef = useRef<(() => void) | null>(null);

  const confirmExit = useCallback((onConfirm: () => void, message = BACK_MESSAGE) => {
    onConfirmRef.current = onConfirm;
    setPrompt({ message });
  }, []);

  const confirmBack = useCallback((defaultHref = '/dashboard') => {
    confirmExit(() => {
      if (router.canGoBack()) router.goBack();
      else router.push(defaultHref, 'back');
    });
  }, [confirmExit, router]);

  // Android hardware back.
  useEffect(() => {
    const handler = (ev: Event) => {
      (ev as CustomEvent).detail.register(10, () => {
        if (router.canGoBack()) {
          confirmExit(() => router.goBack());
        } else if (Capacitor.isNativePlatform()) {
          confirmExit(() => { CapacitorApp.exitApp(); }, EXIT_APP_MESSAGE);
        }
      });
    };
    document.addEventListener('ionBackButton', handler);
    return () => document.removeEventListener('ionBackButton', handler);
  }, [confirmExit, router]);

  return (
    <ExitConfirmContext.Provider value={{ confirmExit, confirmBack }}>
      {children}
      <IonToast
        isOpen={!!prompt}
        message={prompt?.message}
        position="bottom"
        duration={6000}
        color="dark"
        onDidDismiss={() => { setPrompt(null); onConfirmRef.current = null; }}
        buttons={[
          { text: 'Quedarme', role: 'cancel' },
          {
            text: 'Salir',
            role: 'confirm',
            handler: () => {
              const go = onConfirmRef.current;
              onConfirmRef.current = null;
              go?.();
            },
          },
        ]}
      />
    </ExitConfirmContext.Provider>
  );
};

export const useExitConfirm = (): ExitConfirmValue => {
  const ctx = useContext(ExitConfirmContext);
  if (!ctx) throw new Error('useExitConfirm must be used inside <ExitConfirmProvider>');
  return ctx;
};
