import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonToast,
  IonButton,
  IonIcon,
  IonLoading,
  IonLabel,
  IonChip,
  IonInput,
  useIonViewWillEnter,
} from '@ionic/react';
import ConfirmBackButton from '../../components/ui/ConfirmBackButton';
import { addCircle, card, wallet, business, receipt, cart, person, pricetag, qrCodeOutline, giftOutline } from 'ionicons/icons';
import { useCart } from '../../contexts/CartContext';
import { useProduct } from '../../contexts/ProductContext';
import { useUser } from '../../contexts/UserContext';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { submitOrder } from '../../api/cartApi';
import useInactivityTimer from '../../hooks/useInactivityTimer';
import { fetchTicket } from '../../api/ticketApi';
import { postIncome } from '../../api/incomeApi';
import { getAllCommissionTerminals, CommissionTerminal } from '../../api/commissionTerminalsApi';
import { activeCardTerminal, terminalCommission } from '../../utils/incomeMoney';
import { useIncome } from '../../contexts/IncomeContext';
import { Client } from '../../api/clientsApi';
import {
  posRewardsApi, PosRewardBalance, PosRewardCatalogItem, PosRewardProductCount, IncomeDiscountsResult, stampUnits,
} from '../../api/posRewardsApi';
import { notifyDataChanged } from '../../utils/refreshBus';

import '../../styles/dashboard.css';
import './CartPage.css';

import CartItemCard from '../../components/pos/CartItemCard';
import ClientSelector from '../../components/pos/ClientSelector';
import ClientQrScannerModal from '../../components/pos/ClientQrScannerModal';
import ReceiptDisplay from '../receipt/ReceiptDisplay';

/**
 * Helper function for 2x1 promotion: calculates how many items to pay for.
 * Buy 2, get 1 free means: for every 3 items, pay for 2.
 * Formula: qty - floor(qty / 2) = pay for 2 out of every 3
 */
const payQty2x1 = (qty: number): number => Math.max(0, qty - Math.floor(qty / 2));

const CartPage: React.FC = () => {
  const { cart: cartItems, removeFromCart, clearCart } = useCart();
  const { clearAllProducts } = useProduct();
  const { companyId, userId } = useUser();
  const { loadIncomes } = useIncome();
  const history = useHistory();

  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Tarjeta' | 'Transferir' | ''>('');
  const [cashPaid, setCashPaid] = useState<string>('');

  // Split payment (e.g. 60% Efectivo + 40% Tarjeta on one ticket). Separate
  // UI mode from the single-method selector above -- toggling it on hides
  // that selector and shows one amount input per method instead. KNOWN GAP:
  // a split sale's Tarjeta portion doesn't get a terminal-commission journal
  // entry yet (see modules/incomePayments.py's docstring) -- v1 scope.
  const [splitPaymentEnabled, setSplitPaymentEnabled] = useState(false);
  const [splitAmounts, setSplitAmounts] = useState<Record<'Efectivo' | 'Tarjeta' | 'Transferir', string>>({
    Efectivo: '', Tarjeta: '', Transferir: '',
  });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState<'success' | 'danger' | 'warning'>('danger');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [changeAmount, setChangeAmount] = useState(0);
  const [ticketData, setTicketData] = useState<any>(null);
  const [lastIncomeId, setLastIncomeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [clientBalance, setClientBalance] = useState<PosRewardBalance | null>(null);
  // Card terminal (commission catalog) — previews the commission the business
  // absorbs on a card sale; the customer still pays `total`.
  const [cardTerminal, setCardTerminal] = useState<CommissionTerminal | null>(null);

  useIonViewWillEnter(() => {
    getAllCommissionTerminals()
      .then((terminals) => setCardTerminal(activeCardTerminal(terminals)))
      .catch((e) => console.warn('[Cart] Could not load commission terminals', e));
  });
  const [clientBalanceLoading, setClientBalanceLoading] = useState(false);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const [newPointsBalance, setNewPointsBalance] = useState<number | null>(null);

  // Every discount comes from posRewardCatalogItems: coupons (typed at
  // checkout), stamp cards ("compra 3, el 4to gratis") and points rewards.
  // The cart only PREVIEWS them: the coupon code and the chosen reward go
  // with the sale and the backend (sp_income_applyDiscounts) applies them,
  // redeems the reward and sets the final total -- so an abandoned or failed
  // sale never uses up a reward.
  const [rewardsCatalog, setRewardsCatalog] = useState<PosRewardCatalogItem[]>([]);
  const [productCounts, setProductCounts] = useState<PosRewardProductCount[]>([]);
  const [selectedRewardId, setSelectedRewardId] = useState<number | null>(null);
  const [coupons, setCoupons] = useState<PosRewardCatalogItem[]>([]);
  const [selectedCouponId, setSelectedCouponId] = useState<number | null>(null);

  // Coupons from the catalog (coupon_b2g1). firstPurchaseOnly ones (the 2x1
  // welcome coupon) need a client who never earned POS points -- the same
  // rule the backend enforces when it applies the code.
  useEffect(() => {
    let cancelled = false;
    posRewardsApi.listCoupons(companyId)
      .then(list => { if (!cancelled) setCoupons(list); })
      .catch(err => console.error('[CartPage] Failed to load coupons', err));
    return () => { cancelled = true; };
  }, [companyId]);

  const clientIsNew =
    !!selectedClient && !clientBalanceLoading && (clientBalance === null || clientBalance.lifetimeEarned === 0);
  const availableCoupons = useMemo(
    () => coupons.filter(c => !c.firstPurchaseOnly || clientIsNew),
    [coupons, clientIsNew]
  );
  const selectedCoupon = availableCoupons.find(c => c.catalogItemId === selectedCouponId) ?? null;
  const promoActive = !!selectedCoupon;
  const couponCovers = useCallback(
    (productId: number) =>
      !!selectedCoupon && (selectedCoupon.freeProductId == null || selectedCoupon.freeProductId === productId),
    [selectedCoupon]
  );

  // A coupon or reward chosen for one customer must never carry over to the next.
  useEffect(() => {
    setSelectedCouponId(null);
    setSelectedRewardId(null);
  }, [selectedClient?.clientId]);

  const selectedReward = rewardsCatalog.find(c => c.catalogItemId === selectedRewardId) ?? null;
  const freeUnitsByProduct = useMemo(() => {
    const map = new Map<number, number>();
    if (selectedReward?.rewardType === 'free_product' && selectedReward.freeProductId != null) {
      map.set(selectedReward.freeProductId, 1);
    }
    return map;
  }, [selectedReward]);

  // Compute totals with promotion preview
  const totals = useMemo(() => {
    // Guard: if no cart items, return zeros
    if (!cartItems || cartItems.length === 0) {
      return { lines: [], subtotal: 0, total: 0, discount: 0, pointsDiscount: 0 };
    }
    
    let subtotal = 0;
    let totalPromo = 0;
    const lines = cartItems.map((item) => {
      // item.price is already the line total (price * quantity)
      const lineTotal = Number(item.price) || 0;
      const qty = Number(item.quantity) || 1;

      subtotal += lineTotal;

      const payQtyPromo = couponCovers(Number(item.productId)) ? payQty2x1(qty) : qty;
      const freeUnits = freeUnitsByProduct.get(Number(item.productId)) ?? 0;
      const payQty = Math.max(0, payQtyPromo - freeUnits);

      if (payQty === qty) {
        // Nothing discounted on this line -- skip the divide/round round-trip
        // so an undiscounted price never drifts by a rounding cent.
        totalPromo += lineTotal;
        return { ...item, payQty, promoLineTotal: lineTotal, discount: 0 };
      }

      const promoLineTotal = qty > 0
        ? Math.round((lineTotal * (payQty / qty)) * 100) / 100
        : lineTotal;
      const discount = Math.round((lineTotal - promoLineTotal) * 100) / 100;

      totalPromo += promoLineTotal;

      return { ...item, payQty, promoLineTotal, discount };
    });

    // Points rewards come off the discounted total, as sp_income_applyDiscounts does.
    let pointsDiscount = 0;
    if (selectedReward?.rewardType === 'discount_fixed') {
      pointsDiscount = Math.min(Number(selectedReward.discountValue) || 0, totalPromo);
    } else if (selectedReward?.rewardType === 'discount_pct') {
      pointsDiscount = Math.round(totalPromo * (Number(selectedReward.discountValue) || 0)) / 100;
    }
    const finalTotal = Math.max(0, totalPromo - pointsDiscount);
    const discount = Math.round((subtotal - finalTotal) * 100) / 100;

    return {
      lines,
      subtotal: Math.round(subtotal * 100) / 100,
      total: Math.round(finalTotal * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      pointsDiscount: Math.round(pointsDiscount * 100) / 100,
    };
  }, [cartItems, couponCovers, selectedReward, freeUnitsByProduct]);

  // Calculate total (use promo-adjusted total)
  const total = totals.total;
  const cashNumber = parseFloat(cashPaid);

  const splitTotal = (['Efectivo', 'Tarjeta', 'Transferir'] as const)
    .reduce((sum, m) => sum + (parseFloat(splitAmounts[m]) || 0), 0);
  const splitRemaining = Math.round((total - splitTotal) * 100) / 100;
  const splitComplete = splitTotal > 0 && Math.abs(splitRemaining) < 0.01;

  const isCheckoutEnabled = splitPaymentEnabled
    ? splitComplete
    : !!paymentMethod &&
      (paymentMethod !== 'Efectivo' ||
        (!isNaN(cashNumber) && cashNumber >= total));

  const isCheckoutEnabledFinal = isCheckoutEnabled;

  useInactivityTimer(300000, () => window.location.reload());

  useEffect(() => {
    const cash = parseFloat(cashPaid);
    if (paymentMethod === 'Efectivo' && !isNaN(cash) && cash > total) {
      setChangeAmount(cash - total);
    } else {
      setChangeAmount(0);
    }
  }, [cashPaid, paymentMethod, total]);

  useEffect(() => {
    if (!selectedClient?.clientId) {
      setClientBalance(null);
      setClientBalanceLoading(false);
      return;
    }
    let cancelled = false;
    setClientBalanceLoading(true);
    posRewardsApi.getBalance(companyId, selectedClient.clientId)
      .then(balance => { if (!cancelled) setClientBalance(balance); })
      .catch(err => console.error('[CartPage] Failed to load points balance', err))
      .finally(() => { if (!cancelled) setClientBalanceLoading(false); });
    return () => { cancelled = true; };
  }, [selectedClient?.clientId]);

  // Rewards catalog (no coupons) + stamp-card progress for the selected client.
  useEffect(() => {
    if (!selectedClient?.clientId) {
      setRewardsCatalog([]);
      setProductCounts([]);
      return;
    }
    let cancelled = false;
    Promise.all([
      posRewardsApi.listCatalog(companyId, true),
      posRewardsApi.getProductCounts(companyId, selectedClient.clientId),
    ])
      .then(([catalog, counts]) => {
        if (cancelled) return;
        setRewardsCatalog(catalog);
        setProductCounts(counts);
      })
      .catch(err => console.error('[CartPage] Failed to load rewards catalog', err));
    return () => { cancelled = true; };
  }, [selectedClient?.clientId, companyId]);

  const cartProductIds = useMemo(
    () => new Set(cartItems.map(item => Number(item.productId))),
    [cartItems]
  );

  // Rewards the client can use on THIS order: a stamp card whose product is
  // in the cart and whose purchases are complete (server-computed
  // unitsAvailable, net of earlier redemptions), or a points reward the
  // balance covers. The backend re-checks both when the sale is saved.
  const eligibleRewards = useMemo(() => {
    if (!selectedClient?.clientId) return [];
    return rewardsCatalog.filter(item => {
      if (item.rewardType === 'free_product') {
        if (item.freeProductId == null || !cartProductIds.has(item.freeProductId)) return false;
        const available = productCounts.find(p => p.productId === item.freeProductId)?.unitsAvailable ?? 0;
        return available >= stampUnits(item);
      }
      if (item.rewardType === 'discount_fixed' || item.rewardType === 'discount_pct') {
        return (clientBalance?.balance ?? 0) >= Number(item.requiredPoints);
      }
      return false;
    });
  }, [rewardsCatalog, productCounts, cartProductIds, clientBalance, selectedClient?.clientId]);

  // Drop a chosen reward the order no longer qualifies for (e.g. its product
  // was removed from the cart).
  useEffect(() => {
    if (selectedRewardId != null && !eligibleRewards.some(r => r.catalogItemId === selectedRewardId)) {
      setSelectedRewardId(null);
    }
  }, [eligibleRewards, selectedRewardId]);

  // One reward per sale. Choosing it only previews the discount; it is
  // redeemed by the backend with the sale.
  const toggleReward = (item: PosRewardCatalogItem) => {
    if (!item.catalogItemId) return;
    setSelectedRewardId(prev => (prev === item.catalogItemId ? null : item.catalogItemId!));
  };

  const REJECT_REASONS: Record<string, string> = {
    invalid_or_inactive: 'no está vigente',
    needs_client: 'requiere un cliente registrado',
    not_first_purchase: 'solo aplica en la primera compra',
    no_eligible_lines: 'no hay 2 unidades del mismo producto',
    no_line_prices: 'la venta no tiene precios por opción',
    product_not_in_sale: 'el producto no está en la venta',
    insufficient_product_units: 'faltan compras de ese producto',
    insufficient_points: 'puntos insuficientes',
    one_reward_per_sale: 'solo una recompensa por venta',
  };

  const showErrorToast = (message: string, color: 'success' | 'danger' | 'warning' = 'danger') => {
    setToastMessage(message);
    setToastColor(color);
    setShowToast(true);
  };

  const formatPrice = (price: number) => {
    const safePrice = isNaN(price) ? 0 : price;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(safePrice);
  };

  const handleCheckout = async () => {
    if (splitPaymentEnabled) {
      if (!splitComplete) {
        showErrorToast(
          splitRemaining > 0
            ? `Falta ${formatPrice(splitRemaining)} por asignar.`
            : `Asignaste ${formatPrice(-splitRemaining)} de más.`
        );
        return;
      }
    } else if (!paymentMethod) {
      showErrorToast('Debe seleccionar un método de pago.');
      return;
    }

    setPointsEarned(null);
    setNewPointsBalance(null);


    if (!splitPaymentEnabled && paymentMethod === 'Efectivo') {
      const cash = parseFloat(cashPaid);
      if (isNaN(cash) || cash < total) {
        showErrorToast('El efectivo pagado debe ser igual o mayor al total.');
        return;
      }
    }

    setLoading(true);

    const effectivePaymentMethod = splitPaymentEnabled ? 'Dividido' : paymentMethod;
    const splitPaymentLines = splitPaymentEnabled
      ? (['Efectivo', 'Tarjeta', 'Transferir'] as const)
          .filter(m => (parseFloat(splitAmounts[m]) || 0) > 0)
          .map(m => ({ method: m.toLowerCase(), amount: parseFloat(splitAmounts[m]) }))
      : undefined;

    const orderData = {
      orders: cartItems.map((item) => {
        const selections = Object.entries(item.selectedOptions || {})
          .map(([optionType, optionValues]) =>
            (Array.isArray(optionValues) ? optionValues : [optionValues]).map((value: string) => ({
              productOptionId: optionType,
              productOptionChoiceId: value,
            }))
          )
          .flat();

        return {
          productId: item.productId,
          quantity: item.quantity,
          paymentMethod: effectivePaymentMethod,
          orderNumber: Math.floor(Math.random() * 10000),
          tableNumber: 5,
          userId,
          total: item.price, // item.price already includes quantity
          clientId: selectedClient?.clientId ?? 1,
          comments: '',
          selections: selections,
        };
      }),
    };

    try {
      const response = await submitOrder(orderData);

      if (response.ok) {
        try {
          const products = cartItems.map((item) => {
            // Group choices by productOptionId
            const optionsByOptionId: { [optionId: number]: Array<{
              productOptionChoiceId: number;
              name: string;
              price: number;
              quantity: number;
            }> } = {};

            Object.entries(item.selectedChoices).forEach(([optionId, choices]) => {
              const optId = parseInt(optionId);
              choices.forEach((choice) => {
                if (!optionsByOptionId[optId]) {
                  optionsByOptionId[optId] = [];
                }
                optionsByOptionId[optId].push({
                  productOptionChoiceId: choice.id,
                  name: choice.name,
                  price: choice.price,
                  quantity: choice.quantity,
                });
              });
            });

            // Build the new nested structure
            const productOptions = Object.entries(optionsByOptionId).map(([productOptionId, choices]) => ({
              productOptionId: parseInt(productOptionId),
              choices: choices,
            }));

            return {
              productId: parseInt(item.productId),
              name: item.name,
              unitPrice: item.price / item.quantity, // Derive unit price from total
              subtotal: item.price, // item.price already includes quantity
              quantity: item.quantity,
              options: productOptions,
            };
          });

          const promoCodeValue = selectedCoupon?.code ?? null;

          // Card sales record which terminal charged them so accounting can
          // apply its commission. Never block the sale if the catalog is down.
          // Split sales skip this entirely (v1 known gap -- see
          // modules/incomePayments.py): a split's Tarjeta portion doesn't
          // get a commission journal entry yet.
          let commissionTerminalId: number | null = null;
          if (!splitPaymentEnabled && paymentMethod === 'Tarjeta') {
            try {
              const terminal = cardTerminal ?? activeCardTerminal(await getAllCommissionTerminals());
              commissionTerminalId = terminal?.commissionTerminalId ?? null;
              if (!terminal) console.warn('[Cart] No active card terminal in catalog; backend will use its default');
            } catch (e) {
              console.warn('[Cart] Could not load commission terminals; backend will use its default terminal', e);
            }
          }

          const payload = {
            income: [
              {
                action: 1,
                total: total,
                paymentMethod: effectivePaymentMethod.toLowerCase(),
                cashPaid: splitPaymentEnabled
                  ? (parseFloat(splitAmounts.Efectivo) || 0)
                  : (paymentMethod === 'Efectivo' ? cashNumber : 0),
                cashReturn: splitPaymentEnabled ? 0 : (paymentMethod === 'Efectivo' ? changeAmount : 0),
                ...(splitPaymentLines && { payments: splitPaymentLines }),
                paymentDate: new Date().toISOString(),
                userId,
                clientId: selectedClient?.clientId ?? 1,
                companyId,
                promotionCode: promoCodeValue,
                ...(selectedReward?.catalogItemId && { rewardCatalogItemIds: [selectedReward.catalogItemId] }),
                commissionTerminalId,
                products: cartItems.map((item) => ({
                  productId: parseInt(item.productId),
                  quantity: item.quantity,
                  // Only include pieces for "Servicio Completo" products
                  ...(item.pieces && { pieces: item.pieces }),
                  options: Object.entries(item.selectedChoices).flatMap(([optionId, choices]) =>
                    choices.map((choice) => ({
                      productOptionId: parseInt(optionId),
                      productOptionChoiceId: choice.id,
                      quantity: choice.quantity,
                    }))
                  ),
                })),
              },
            ],
          };

          console.log('Income Payload:', JSON.stringify(payload, null, 2));

          const incomeData = await postIncome(payload);
          const rec = Array.isArray(incomeData.result)
            ? incomeData.result[0]
            : null;

          if (rec && rec.msg === 'Inserted Successfully' && rec.value != null) {
            const newId = String(rec.value);
            setLastIncomeId(newId);
            await loadIncomes(1);

            // POS loyalty points: calculated server-side from the ticket's lines — never here.
            try {
              const earnResult = await posRewardsApi.earnFromTicket(parseInt(newId), companyId);
              setPointsEarned(earnResult.pointsEarned);
              setNewPointsBalance(earnResult.newBalance);
              notifyDataChanged('pos_reward_earned');
              // Refresh so a client who just placed their first order stops
              // looking "welcome-coupon eligible" if they buy again same session.
              if (selectedClient?.clientId) {
                posRewardsApi.getBalance(companyId, selectedClient.clientId)
                  .then(setClientBalance)
                  .catch(err => console.error('[CartPage] Failed to refresh points balance', err));
              }
            } catch (rewardError) {
              console.error('[PosRewards] earnFromTicket failed:', rewardError);
              // Ticket is already recorded — a points failure must not block or undo the sale.
            }

            // The backend applied the coupon/reward and set the final total
            // (sp_income_applyDiscounts). Tell the cashier if it differs
            // from the preview, e.g. a reward was no longer valid.
            const discounts: IncomeDiscountsResult | undefined = rec.discounts;
            if (discounts) {
              const names = (r: { catalogItemId?: number; code?: string }) =>
                r.code ?? [...rewardsCatalog, ...coupons].find(c => c.catalogItemId === r.catalogItemId)?.name ?? 'Descuento';
              const rejected = discounts.rejected.map(r => `${names(r)}: ${REJECT_REASONS[r.reason] ?? r.reason}`);
              if (rejected.length > 0 || Math.abs(Number(discounts.total) - total) >= 0.01) {
                showErrorToast(
                  `${rejected.length ? `No aplicado — ${rejected.join('; ')}. ` : ''}Total cobrado: ${formatPrice(Number(discounts.total))}`,
                  'warning'
                );
              }
            }
          }
        } catch (incomeError) {}

        clearCart();
        clearAllProducts();
        setSelectedCouponId(null);
        setSelectedRewardId(null);
        setSplitPaymentEnabled(false);
        setSplitAmounts({ Efectivo: '', Tarjeta: '', Transferir: '' });
        setShowSuccessToast(true);
      } else {
        showErrorToast('Ocurrió un error al procesar el pedido.');
      }
    } catch (error) {
      showErrorToast('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMoreProducts = () => {
    history.push('/product');
  };

  const handlePaymentMethodSelect = (method: 'Efectivo' | 'Tarjeta' | 'Transferir') => {
    setPaymentMethod(method);
    if (method !== 'Efectivo') {
      setCashPaid('');
    }
  };

  const toggleSplitPayment = () => {
    setSplitPaymentEnabled(prev => {
      const next = !prev;
      if (next) {
        // Switching into split mode -- the single-method selection no
        // longer applies.
        setPaymentMethod('');
        setCashPaid('');
      } else {
        setSplitAmounts({ Efectivo: '', Tarjeta: '', Transferir: '' });
      }
      return next;
    });
  };

  const handleSplitAmountChange = (method: 'Efectivo' | 'Tarjeta' | 'Transferir', value: string) => {
    setSplitAmounts(prev => ({ ...prev, [method]: value }));
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <ConfirmBackButton defaultHref="/dashboard" />
          </IonButtons>
          <IonTitle>Carrito</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleAddMoreProducts}>
              <IonIcon icon={cart} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="cart-content">
        <div className="cart-wrapper">
          <div className="cart-container">
            {/* Header */}
            <div className="cart-header">
              <h1 className="cart-title">Resumen</h1>
              <p className="cart-subtitle">
                {cartItems.length > 0 
                  ? `${cartItems.length} producto${cartItems.length !== 1 ? 's' : ''}`
                  : 'Tu carrito está vacío'
                }
              </p>
            </div>

            {cartItems.length === 0 ? (
              <div className="empty-cart">
                <div className="empty-cart-icon">🛒</div>
                <p className="empty-cart-text">Tu carrito está vacío</p>
                <IonButton
                  fill="outline"
                  onClick={handleAddMoreProducts}
                  className="cart-button-secondary"
                >
                  <IonIcon slot="start" icon={addCircle} />
                  Ver productos
                </IonButton>
              </div>
            ) : (
              <>
                {/* Cart Items List */}
                <div className="cart-items-list">
                  {totals.lines.map((item) => {
                    const discountAmount = item.discount ?? 0;
                    const labels = [
                      couponCovers(Number(item.productId)) && discountAmount > 0 ? selectedCoupon?.name : undefined,
                      freeUnitsByProduct.has(Number(item.productId)) ? selectedReward?.name : undefined,
                    ].filter((n): n is string => !!n);
                    const discountLabel = labels.length > 0 ? labels.join(' + ') : undefined;
                    return (
                      <CartItemCard
                        key={item.id}
                        id={item.id}
                        name={item.name}
                        quantity={item.quantity}
                        unitPrice={item.price / item.quantity}
                        totalPrice={item.promoLineTotal}
                        originalPrice={item.price}
                        discountAmount={discountAmount}
                        discountLabel={discountLabel}
                        selectedOptionLabels={item.selectedOptionLabels}
                        pieces={item.pieces}
                        onRemove={removeFromCart}
                      />
                    );
                  })}
                </div>

                {/* Detail Footer */}
                <div className="detail-footer">
                  <IonButton
                    fill="outline"
                    onClick={handleAddMoreProducts}
                    className="detail-add-more-btn"
                  >
                    <IonIcon slot="start" icon={addCircle} className="add-icon" />
                    Agregar más
                  </IonButton>
                  <div className="detail-total">
                    {totals.discount > 0 && (
                      <>
                        <span className="detail-subtotal-label">
                          Subtotal: {formatPrice(totals.subtotal)}
                        </span>
                        <span className="detail-discount-label">
                          {[selectedCoupon?.name, selectedReward?.name].filter(Boolean).join(' + ') || 'Descuento'}:
                          {' '}-{formatPrice(totals.discount)}
                        </span>
                      </>
                    )}
                    {promoActive && !totals.lines.some(l => couponCovers(Number(l.productId)) && (l.discount ?? 0) > 0) && (
                      <span className="detail-discount-label detail-discount-label--pending">
                        {selectedCoupon?.name}: agrega otra unidad del mismo producto para el descuento
                      </span>
                    )}
                    <span className="detail-total-label">Total</span>
                    <span className="detail-total-amount">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>

                {/* Client Selector */}
                <div className="client-section">
                  <div className="client-label">CLIENTE</div>
                  <div className="client-row">
                    <div className="client-info">
                      {selectedClient ? (
                        <>
                          <div className="client-name">
                            {selectedClient.first_name} {selectedClient.last_name}
                          </div>
                          <div className="client-contact">
                            {selectedClient.cellphone}
                            {selectedClient.email && ` • ${selectedClient.email}`}
                          </div>
                          {clientBalance != null && (
                            <IonChip color="success" className="client-points-chip">
                              <IonIcon icon={pricetag} />
                              <IonLabel>{clientBalance.balance} pts</IonLabel>
                            </IonChip>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="client-name">Mostrador / Desconocido</div>
                          <div className="client-contact">Sin cliente seleccionado</div>
                        </>
                      )}
                    </div>
                  </div>

                  {availableCoupons.length > 0 && (
                    <div className="welcome-coupon-row">
                      {availableCoupons.map(coupon => {
                        const applied = coupon.catalogItemId === selectedCouponId;
                        return (
                          <IonChip
                            key={coupon.catalogItemId}
                            className={`welcome-coupon-chip ${applied ? 'applied' : ''}`}
                            onClick={() => {
                              setSelectedCouponId(applied ? null : coupon.catalogItemId ?? null);
                              // 2x1 only discounts a line once it has 2+ units of the SAME
                              // product+options — a cart of single, distinct items produces
                              // a $0 discount even though the chip now reads "aplicado".
                              const covered = (item: { productId: string | number }) =>
                                coupon.freeProductId == null || coupon.freeProductId === Number(item.productId);
                              if (!applied && !cartItems.some(item => covered(item) && Number(item.quantity) >= 2)) {
                                showErrorToast(
                                  `${coupon.name} aplica cuando llevas 2 unidades del mismo producto — agrega otra para ver el descuento.`,
                                  'warning'
                                );
                              }
                            }}
                          >
                            <IonIcon icon={giftOutline} />
                            <IonLabel>
                              {applied
                                ? `${coupon.name} aplicado`
                                : coupon.firstPurchaseOnly
                                  ? `Cliente nuevo: ${coupon.name} disponible — toca para aplicar`
                                  : `${coupon.name} — toca para aplicar`}
                            </IonLabel>
                          </IonChip>
                        );
                      })}
                    </div>
                  )}

                  {eligibleRewards.length > 0 && (
                    <div className="rewards-available-section">
                      <div className="rewards-available-label">Recompensas disponibles</div>
                      {eligibleRewards.map(item => {
                        const chosen = item.catalogItemId === selectedRewardId;
                        const cost = item.rewardType === 'free_product' ? '' : ` · ${item.requiredPoints} pts`;
                        return (
                          <div key={item.catalogItemId} className="reward-available-row">
                            <div className="reward-available-info">
                              <IonIcon icon={giftOutline} color="success" />
                              <IonLabel>{item.name}{cost}</IonLabel>
                            </div>
                            <IonButton
                              size="small"
                              color={chosen ? 'medium' : 'success'}
                              disabled={selectedRewardId != null && !chosen}
                              onClick={() => toggleReward(item)}
                            >
                              {chosen ? 'Quitar' : 'Aplicar'}
                            </IonButton>
                          </div>
                        );
                      })}
                      {selectedRewardId != null && (
                        <div className="rewards-limit-hint">Solo se puede aplicar una recompensa por venta.</div>
                      )}
                    </div>
                  )}

                  <div className="client-actions-row">
                    <IonButton
                      fill="outline"
                      onClick={() => setShowClientSelector(true)}
                      className="client-change-btn"
                    >
                      <IonIcon icon={person} slot="start" />
                      Cambiar cliente
                    </IonButton>
                    <IonButton
                      fill="outline"
                      onClick={() => setShowQrScanner(true)}
                      className="client-scan-btn"
                    >
                      <IonIcon icon={qrCodeOutline} slot="start" />
                      Escanear QR
                    </IonButton>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="cart-payment-section">
                  <div className="cart-payment-label-row">
                    <div className="cart-payment-label">Método de pago</div>
                    <IonButton
                      fill="clear"
                      size="small"
                      className={`split-payment-toggle ${splitPaymentEnabled ? 'active' : ''}`}
                      onClick={toggleSplitPayment}
                    >
                      {splitPaymentEnabled ? 'Un solo método' : 'Pago dividido'}
                    </IonButton>
                  </div>

                  {!splitPaymentEnabled ? (
                    <div className="payment-method-selector">
                      <IonButton
                        fill="outline"
                        className={`payment-method-btn ${paymentMethod === 'Efectivo' ? 'selected' : ''}`}
                        onClick={() => handlePaymentMethodSelect('Efectivo')}
                      >
                        <IonIcon icon={wallet} slot="start" className="icon" />
                        Efectivo
                      </IonButton>
                      <IonButton
                        fill="outline"
                        className={`payment-method-btn ${paymentMethod === 'Tarjeta' ? 'selected' : ''}`}
                        onClick={() => handlePaymentMethodSelect('Tarjeta')}
                      >
                        <IonIcon icon={card} slot="start" className="icon" />
                        Tarjeta
                      </IonButton>
                      <IonButton
                        fill="outline"
                        className={`payment-method-btn ${paymentMethod === 'Transferir' ? 'selected' : ''}`}
                        onClick={() => handlePaymentMethodSelect('Transferir')}
                      >
                        <IonIcon icon={business} slot="start" className="icon" />
                        Transferir
                      </IonButton>
                    </div>
                  ) : (
                    <div className="split-payment-section">
                      {([
                        { key: 'Efectivo' as const, icon: wallet },
                        { key: 'Tarjeta' as const, icon: card },
                        { key: 'Transferir' as const, icon: business },
                      ]).map(({ key, icon }) => (
                        <div key={key} className="split-payment-row">
                          <IonIcon icon={icon} className="split-payment-icon" />
                          <IonLabel className="split-payment-method-label">{key}</IonLabel>
                          <div className="split-payment-input-wrapper">
                            <IonInput
                              type="number"
                              inputmode="decimal"
                              fill="outline"
                              value={splitAmounts[key]}
                              onIonInput={(e) => handleSplitAmountChange(key, e.detail.value ?? '')}
                              placeholder="0.00"
                              min={0}
                              step="0.01"
                              className="split-payment-input"
                            >
                              <span slot="start" className="currency-symbol">$</span>
                            </IonInput>
                          </div>
                        </div>
                      ))}
                      <div className={`split-payment-summary ${splitComplete ? 'complete' : ''}`}>
                        <span>Asignado: {formatPrice(splitTotal)} / {formatPrice(total)}</span>
                        {!splitComplete && (
                          <span className="split-payment-remaining">
                            {splitRemaining > 0
                              ? `Falta ${formatPrice(splitRemaining)}`
                              : `Sobran ${formatPrice(-splitRemaining)}`}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card-terminal commission (absorbed by the business, not charged to the client) */}
                {!splitPaymentEnabled && paymentMethod === 'Tarjeta' && cardTerminal && total > 0 && (
                  <div className="terminal-commission">
                    <div className="terminal-commission-row">
                      <span>Comisión terminal ({Number(cardTerminal.commissionRatePct)}%)</span>
                      <span className="terminal-commission-amount">
                        −{formatPrice(terminalCommission(total, cardTerminal))}
                      </span>
                    </div>
                    <div className="terminal-commission-row terminal-commission-row--net">
                      <span>Recibes</span>
                      <span>{formatPrice(total - terminalCommission(total, cardTerminal))}</span>
                    </div>
                  </div>
                )}

                {/* Cash Input */}
                {!splitPaymentEnabled && paymentMethod === 'Efectivo' && (
                  <div className="cash-input-section">
                    <div className="cash-input-wrapper">
                      <IonInput
                        type="number"
                        inputmode="decimal"
                        fill="outline"
                        value={cashPaid}
                        onIonInput={(e) => setCashPaid(e.detail.value ?? '')}
                        placeholder="0.00"
                        min={0}
                        step="0.01"
                        className="cash-input"
                      >
                        <span slot="start" className="currency-symbol">$</span>
                      </IonInput>
                    </div>
                    {changeAmount > 0 && (
                      <div className="change-display">
                        <span className="change-amount">
                          Cambio: {formatPrice(changeAmount)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Button */}
                <div className="payment-actions">
                  <IonButton
                    expand="block"
                    onClick={handleCheckout}
                    disabled={!isCheckoutEnabledFinal}
                    className="pay-button"
                    color="primary"
                  >
                    <IonIcon slot="start" icon={receipt} className="pay-icon" />
                    {`PAGAR ${formatPrice(total)}`}
                  </IonButton>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Toasts */}
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          color={toastColor}
          position="bottom"
          buttons={[{ text: 'OK', role: 'cancel' }]}
        />

        <IonToast
          isOpen={showSuccessToast}
          message="¡Pedido realizado!"
          color="success"
          position="bottom"
          duration={3000}
          onDidDismiss={async () => {
            setShowSuccessToast(false);
            if (lastIncomeId) {
              console.log('Fetching ticket for incomeId:', lastIncomeId);
              const ticket = await fetchTicket(lastIncomeId);
              console.log('Ticket fetched:', ticket);
              setTicketData(ticket);

              setTimeout(() => {
                const receiptEl = document.getElementById('receipt-container');
                if (receiptEl) {
                  receiptEl.scrollIntoView({ behavior: 'smooth' });
                } else {
                  console.log('Receipt container not found, trying alternative selector');
                  // Fallback to find receipt in another way
                  const allReceipts = document.querySelectorAll('[id*="receipt"]');
                  if (allReceipts.length > 0) {
                    allReceipts[0].scrollIntoView({ behavior: 'smooth' });
                  }
                }
              }, 300);
            }
          }}
        />

        {ticketData && (
          <ReceiptDisplay
            ticketData={ticketData}
            paymentMethod={paymentMethod}
            cashPaid={cashPaid}
            changeAmount={changeAmount}
            clearCart={clearCart}
            setTicketData={setTicketData}
            pointsEarned={pointsEarned}
            newPointsBalance={newPointsBalance}
          />
        )}

        <IonLoading isOpen={loading} message="Procesando..." />

        {/* Client Selector Modal */}
        <ClientSelector
          isOpen={showClientSelector}
          onClose={() => setShowClientSelector(false)}
          onChange={setSelectedClient}
          selectedClient={selectedClient}
        />

        <ClientQrScannerModal
          isOpen={showQrScanner}
          onClose={() => setShowQrScanner(false)}
          onClientFound={(client) => {
            setSelectedClient(client);
            setToastMessage(`Cliente identificado: ${client.first_name} ${client.last_name}`);
            setToastColor('success');
            setShowToast(true);
          }}
        />
      </IonContent>
    </IonPage>
  );
};

export default CartPage;

