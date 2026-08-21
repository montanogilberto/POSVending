/**
 * useChipStore — ViewModel de la tienda de fichas (MVVM).
 *
 * Riel por defecto: STRIPE (chipRail.ts). El negocio ya cobra con Stripe y
 * guarda la tarjeta del cliente, asi que comprar fichas es un solo toque:
 *
 *   tarjeta guardada  → /arcade/quickBuy (off-session, como las cuotas)
 *   sin tarjeta       → Payment Element
 *   el banco pide 3DS → Payment Element retomando el MISMO cobro
 *
 * El importe nunca sale de aqui: el backend lo lee del catalogo. Mandarlo
 * desde el navegador dejaria comprar el paquete grande por un peso.
 */
import { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useIonViewWillEnter } from '@ionic/react';
import { useUser } from '../../../contexts/UserContext';
import { useToast } from '../../../hooks/useToast';
import { notifyDataChanged, onDataChanged } from '../../../utils/refreshBus';
import { getArcadeWallet } from '../../../api/arcadeApi';
import {
  getChipPacks, getSavedCard, quickBuyChips, createChipCheckout, confirmChipCheckout,
  creditPurchase, StoreError,
  type ChipPack, type SavedCard,
} from '../../../api/arcadeStoreApi';
import { resolveRail } from './chipRail';
import {
  storeAvailability, currentPlatform, getProducts, purchase, finishTransaction,
  type IapUnavailable,
} from '../Arcade/iapClient';

interface PendingSheet {
  clientSecret: string;
  packName: string;
  chips: number;
}

export function useChipStore() {
  const history = useHistory();
  const { clientId, companyId } = useUser();
  const { showToast, toastProps } = useToast();

  const rail = resolveRail();

  const [packs, setPacks] = useState<ChipPack[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [card, setCard] = useState<SavedCard | null>(null);
  const [coinBalance, setCoinBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [iapBlocked, setIapBlocked] = useState<IapUnavailable>(null);
  const [buying, setBuying] = useState<string | null>(null);
  const [sheet, setSheet] = useState<PendingSheet | null>(null);

  const platform = currentPlatform();

  const load = useCallback(async () => {
    if (!clientId || !companyId) { setLoading(false); return; }
    try {
      const [catalog, wallet, saved] = await Promise.all([
        getChipPacks(companyId),
        getArcadeWallet(companyId, clientId),
        rail === 'stripe' ? getSavedCard(companyId, clientId) : Promise.resolve(null),
      ]);
      setPacks(catalog);
      setCoinBalance(wallet?.coinBalance ?? 0);
      setCard(saved);

      if (rail === 'iap') {
        const availability = await storeAvailability();
        setIapBlocked(availability);
        if (!availability && platform) {
          const ids = catalog.map(p => (platform === 'ios' ? p.productIdIos : p.productIdAndroid));
          setPrices(await getProducts(ids));
        }
      }
    } catch (err) {
      console.log('[ChipStore] no se pudo cargar', err);
      showToast('No se pudo cargar la tienda', 'danger');
    }
    setLoading(false);
  }, [clientId, companyId, platform, rail, showToast]);

  useIonViewWillEnter(() => { void load(); });
  useEffect(() => onDataChanged(() => { void load(); }), [load]);

  const applyCredit = useCallback(async (
    result: { status: string; chipsCredited: number; coinBalance: number; folio?: string },
  ) => {
    setCoinBalance(result.coinBalance);
    showToast(
      result.status === 'already_credited'
        ? 'Esa compra ya estaba acreditada'
        : `+${result.chipsCredited.toLocaleString('es-MX')} fichas · ticket ${result.folio ?? ''} enviado por correo`.trim(),
    );
    notifyDataChanged('arcade-purchase');
    await load();
  }, [load, showToast]);

  /** Abre el Payment Element para un cobro ya creado en Stripe. */
  const openSheet = (pack: ChipPack, clientSecret: string, chips?: number) =>
    setSheet({
      clientSecret,
      packName: pack.name,
      chips: chips ?? pack.chips + pack.bonusChips,
    });

  const buyWithStripe = async (pack: ChipPack, chips?: number) => {
    if (!clientId || !companyId) return;
    try {
      // Camino feliz: un toque contra la tarjeta guardada.
      if (card?.last4) {
        const result = await quickBuyChips(companyId, clientId, pack.packKey, chips);
        await applyCredit(result);
        return;
      }
      const checkout = await createChipCheckout(companyId, clientId, pack.packKey, chips);
      openSheet(pack, checkout.clientSecret, chips);
    } catch (err) {
      if (err instanceof StoreError) {
        const secret = (err as StoreError & { clientSecret?: string }).clientSecret;
        // 3DS: se retoma el MISMO cobro, no se abre otro.
        if (err.code === 'authentication_required' && secret) {
          openSheet(pack, secret, chips);
          return;
        }
        if (err.code === 'no_saved_card' && clientId && companyId) {
          const checkout = await createChipCheckout(companyId, clientId, pack.packKey, chips);
          openSheet(pack, checkout.clientSecret, chips);
          return;
        }
        showToast(err.message, 'danger');
        return;
      }
      showToast('No se pudo completar la compra', 'danger');
    }
  };

  const buyWithIap = async (pack: ChipPack) => {
    if (!clientId || !companyId || !platform) return;
    const productId = platform === 'ios' ? pack.productIdIos : pack.productIdAndroid;
    // Orden deliberado: cobrar → acreditar → y recien entonces cerrar con la
    // tienda. Cerrar antes dejaria al usuario pagado y sin fichas.
    const receipt = await purchase(productId);
    const result = await creditPurchase({
      companyId, clientId, packKey: pack.packKey, platform, productId,
      transactionId: receipt.transactionId,
      purchaseToken: receipt.purchaseToken,
    });
    await finishTransaction(receipt);
    await applyCredit(result);
  };

  const buy = async (pack: ChipPack, chips?: number) => {
    if (buying) return;
    setBuying(pack.packKey);
    try {
      if (rail === 'stripe') await buyWithStripe(pack, chips);
      else await buyWithIap(pack);
    } catch (err) {
      if (err instanceof StoreError) showToast(err.message, 'danger');
      else console.log('[ChipStore] compra cancelada o fallida', err);
    }
    setBuying(null);
  };

  /** El Payment Element termino: confirmar contra Stripe y acreditar. */
  const finishSheet = async (paymentIntentId: string) => {
    if (!clientId) return;
    try {
      const result = await confirmChipCheckout(paymentIntentId, clientId);
      setSheet(null);
      await applyCredit(result);
      // La tarjeta pudo quedar guardada en este cobro: refrescar el "un toque".
      if (companyId) setCard(await getSavedCard(companyId, clientId));
    } catch (err) {
      // El cobro SI ocurrio; solo fallo el abono. Se deja la hoja abierta y se
      // avisa: el webhook de Stripe acredita igual, sin intervencion.
      const message = err instanceof StoreError ? err.message : 'No se pudo acreditar';
      showToast(`${message}. Tus fichas se acreditarán en un momento.`, 'warning');
    }
  };

  // El monto libre se pinta aparte de la rejilla de paquetes fijos.
  const customPack = packs.find(p => p.isCustom === '1') ?? null;
  const fixedPacks = packs.filter(p => p.isCustom !== '1');

  return {
    history, loading, packs, fixedPacks, customPack, prices, coinBalance, card, rail,
    iapBlocked, buying, platform, sheet,
    buy, finishSheet, closeSheet: () => setSheet(null),
    reload: load, toastProps,
  };
}

export type ChipStoreVM = ReturnType<typeof useChipStore>;
