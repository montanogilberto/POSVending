import { ScreenOrientation } from '@capacitor/screen-orientation';
import { StatusBar } from '@capacitor/status-bar';
import { useEffect } from 'react';

/**
 * Locks the device to landscape and hides the status bar while the 3D game is mounted, restoring
 * both on unmount — the "watch a movie fullscreen" feel the mission asked for. Both calls are
 * native-only in any real sense: on web (including this project's own dev-server preview) they
 * either no-op or throw depending on browser support, so every call is wrapped and swallowed —
 * failing to lock orientation should never block the game from rendering. Only verifiable on a
 * real device/native build; this project's own browser preview tool can't exercise either API.
 */
export const useFullscreenGameMode = (): void => {
  useEffect(() => {
    ScreenOrientation.lock({ orientation: 'landscape' }).catch(() => { /* web/unsupported: ignore */ });
    StatusBar.hide().catch(() => { /* web/unsupported: ignore */ });

    return () => {
      ScreenOrientation.unlock().catch(() => { /* web/unsupported: ignore */ });
      StatusBar.show().catch(() => { /* web/unsupported: ignore */ });
    };
  }, []);
};
