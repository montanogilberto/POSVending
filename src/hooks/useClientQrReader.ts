/**
 * useClientQrReader — reads client QR codes in the background from a handheld
 * scanner (USB / Bluetooth "keyboard wedge"), with no button and no camera.
 *
 * A wedge scanner types the code as very fast keystrokes, usually followed by
 * Enter. While the page is the visible Ionic view, this hook watches the
 * keyboard: a burst of fast keys that parses as a client QR is looked up and
 * handed to `onClientFound`. Normal typing is never touched — a person cannot
 * type a whole `GMO1.x.y.z` code with every key under MAX_KEY_GAP_MS.
 *
 * If the burst landed in a focused field (search bar, cash amount), the field
 * is restored to what it held before the scan, and the scanner's Enter is
 * swallowed so it cannot "click" a focused button such as Cobrar.
 *
 * Uso:
 *   const { looking } = useClientQrReader({ enabled, onClientFound, onError });
 */
import { useEffect, useRef, useState } from 'react';
import { useIonViewDidEnter, useIonViewWillLeave } from '@ionic/react';
import { getOneClient, Client } from '../api/clientsApi';
import { parseClientQrValue } from '../utils/clientQr';

/** Longest pause between two keys of the same scan. Humans type slower. */
const MAX_KEY_GAP_MS = 100;
/** Scanners configured without an Enter suffix: the burst ends after this silence. */
const IDLE_FLUSH_MS = 150;
/** Shortest possible client QR is longer than this; shorter bursts are ignored. */
const MIN_SCAN_LENGTH = 8;

type Field = HTMLInputElement | HTMLTextAreaElement;

interface Options {
  /** Pause reading (a sale in progress, a wizard open…). Default true. */
  enabled?: boolean;
  onClientFound: (client: Client) => void;
  onError?: (message: string) => void;
}

const isField = (el: unknown): el is Field =>
  el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;

/** Puts a field back to its pre-scan value, the way React/Ionic expect it. */
function restoreField(field: Field, value: string) {
  if (!field.isConnected || field.value === value) return;
  const proto = field instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(field, value);
  field.dispatchEvent(new Event('input', { bubbles: true }));
}

export function useClientQrReader({ enabled = true, onClientFound, onError }: Options) {
  const [looking, setLooking] = useState(false);
  const lookingRef = useRef(false);
  const viewActiveRef = useRef(true);
  const enabledRef = useRef(enabled);
  const onFoundRef = useRef(onClientFound);
  const onErrorRef = useRef(onError);
  enabledRef.current = enabled;
  onFoundRef.current = onClientFound;
  onErrorRef.current = onError;

  // Ionic keeps pages mounted: only the visible view may react to a scan.
  useIonViewDidEnter(() => { viewActiveRef.current = true; });
  useIonViewWillLeave(() => { viewActiveRef.current = false; });

  useEffect(() => {
    let mounted = true;
    let buffer = '';
    let lastKeyAt = 0;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let field: Field | null = null;
    let fieldValueBefore = '';

    const reset = () => {
      buffer = '';
      field = null;
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = undefined;
    };

    const lookup = async (clientId: number) => {
      if (lookingRef.current) return;
      lookingRef.current = true;
      setLooking(true);
      try {
        const clients = await getOneClient({ clients: [{ clientId }] });
        const client = clients?.[0];
        if (!mounted) return;
        if (!client) onErrorRef.current?.('No se encontró ese cliente.');
        else onFoundRef.current(client);
      } catch (err) {
        console.error('[ClientQrReader] lookup failed:', err);
        if (mounted) onErrorRef.current?.('No se pudo buscar el cliente. Intenta de nuevo.');
      } finally {
        lookingRef.current = false;
        if (mounted) setLooking(false);
      }
    };

    /** Ends the current burst; returns true when it was a client QR. */
    const flush = (): boolean => {
      const raw = buffer;
      const scannedInto = field;
      const valueBefore = fieldValueBefore;
      reset();
      if (raw.length < MIN_SCAN_LENGTH) return false;
      const clientId = parseClientQrValue(raw);
      if (!clientId) return false;
      if (scannedInto) restoreField(scannedInto, valueBefore);
      void lookup(clientId);
      return true;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!enabledRef.current || !viewActiveRef.current) { reset(); return; }
      if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;

      const now = performance.now();
      if (buffer && now - lastKeyAt > MAX_KEY_GAP_MS) reset();

      if (e.key === 'Enter') {
        if (flush()) {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }
      if (e.key.length !== 1) return; // Shift, Tab, arrows…

      if (!buffer) {
        // keydown fires before the character is inserted: this is the pre-scan value.
        const target = e.composedPath()[0];
        field = isField(target) ? target : null;
        fieldValueBefore = field?.value ?? '';
      }
      buffer += e.key;
      lastKeyAt = now;
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(flush, IDLE_FLUSH_MS);
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      mounted = false;
      window.removeEventListener('keydown', onKeyDown, true);
      reset();
    };
  }, []);

  return { looking };
}
