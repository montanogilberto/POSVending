import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonToast,
  IonAlert,
  IonButton,
  IonIcon,
  IonLoading,
  IonLabel,
  IonChip,
  IonInput,
} from '@ionic/react';
import { addCircle, card, wallet, business, receipt, cart, person, pricetag, qrCodeOutline, giftOutline } from 'ionicons/icons';
import { useCart } from '../../contexts/CartContext';
import { useProduct } from '../../contexts/ProductContext';
import { useUser } from '../../contexts/UserContext';
import { useState, useEffect, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { submitOrder } from '../../api/cartApi';
import useInactivityTimer from '../../hooks/useInactivityTimer';
import { fetchTicket } from '../../api/ticketApi';
import { postIncome, applyPromoToIncome } from '../../api/incomeApi';
import { useIncome } from '../../contexts/IncomeContext';
import { Client } from '../../api/clientsApi';
import { posRewardsApi, PosRewardBalance } from '../../api/posRewardsApi';
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
  const [showAlert, setShowAlert] = useState(false);
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
  const [clientBalanceLoading, setClientBalanceLoading] = useState(false);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const [newPointsBalance, setNewPointsBalance] = useState<number | null>(null);

  // Welcome coupon: every client gets one 2x1 on their first purchase.
  // "First purchase" = zero lifetime POS-reward points earned so far — no
  // new backend table needed, it reuses the ledger that's already updated
  // after every completed sale (see earnFromTicket below).
  const WELCOME_COUPON_CODE = '2X1';
  const [promoApplied, setPromoApplied] = useState(false);
  const [welcomeCouponApplied, setWelcomeCouponApplied] = useState(false);

  const welcomeCouponEligible =
    !!selectedClient && !clientBalanceLoading && (clientBalance === null || clientBalance.lifetimeEarned === 0);

  // A coupon checked for one customer must never carry over to the next.
  useEffect(() => {
    setWelcomeCouponApplied(false);
  }, [selectedClient?.clientId]);

  const promoActive = welcomeCouponApplied && welcomeCouponEligible;

  // Compute totals with promotion preview
  const totals = useMemo(() => {
    // Guard: if no cart items, return zeros
    if (!cartItems || cartItems.length === 0) {
      return { lines: [], subtotal: 0, total: 0, discount: 0 };
    }
    
    let subtotal = 0;
    let totalPromo = 0;
    const lines = cartItems.map((item) => {
      // item.price is already the line total (price * quantity)
      const lineTotal = Number(item.price) || 0;
      const qty = Number(item.quantity) || 1;
      
      subtotal += lineTotal;
      
      if (!promoActive) {
        return { ...item, payQty: qty, promoLineTotal: lineTotal, discount: 0 };
      }
      
      const payQty = payQty2x1(qty);
      const promoLineTotal = qty > 0 
        ? Math.round((lineTotal * (payQty / qty)) * 100) / 100 
        : lineTotal;
      const discount = Math.round((lineTotal - promoLineTotal) * 100) / 100;
      
      totalPromo += promoLineTotal;
      
      return { ...item, payQty, promoLineTotal, discount };
    });

    const discount = Math.round((subtotal - totalPromo) * 100) / 100;
    const finalTotal = promoActive ? totalPromo : subtotal;

    return { 
      lines, 
      subtotal: Math.round(subtotal * 100) / 100, 
      total: Math.round(finalTotal * 100) / 100, 
      discount: Math.round(discount * 100) / 100
    };
  }, [cartItems, promoActive]);

  // Calculate total (use promo-adjusted total)
  const total = totals.total;
  const cashNumber = parseFloat(cashPaid);

  const isCheckoutEnabled =
    !!paymentMethod &&
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
    if (!paymentMethod) {
      setShowAlert(true);
      return;
    }

    setPointsEarned(null);
    setNewPointsBalance(null);


    if (paymentMethod === 'Efectivo') {
      const cash = parseFloat(cashPaid);
      if (isNaN(cash) || cash < total) {
        showErrorToast('El efectivo pagado debe ser igual o mayor al total.');
        return;
      }
    }

    setLoading(true);

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
          paymentMethod: paymentMethod,
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

          const promoCodeValue = promoActive ? WELCOME_COUPON_CODE : null;

          const payload = {
            income: [
              {
                action: 1,
                total: total,
                paymentMethod: paymentMethod.toLowerCase(),
                cashPaid: paymentMethod === 'Efectivo' ? cashNumber : 0,
                cashReturn: paymentMethod === 'Efectivo' ? changeAmount : 0,
                paymentDate: new Date().toISOString(),
                userId,
                clientId: selectedClient?.clientId ?? 1,
                companyId,
                promotionCode: promoCodeValue,
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

            // Apply promo code to income via stored procedure (DB is source of truth)
            if (promoActive && promoCodeValue) {
              try {
                const promoPayload = {
                  promo: [{
                    action: 1,
                    incomeId: parseInt(newId),
                    companyId,
                    code: promoCodeValue,
                    userId
                  }]
                };
                console.log('Applying promo:', JSON.stringify(promoPayload, null, 2));
                const promoResult = await applyPromoToIncome(promoPayload);
                console.log('Promo applied result:', promoResult);
                setPromoApplied(true);
              } catch (promoError) {
                console.error('Error applying promo:', promoError);
                // Continue even if promo fails - income was still created
              }
            }
          }
        } catch (incomeError) {}

        clearCart();
        clearAllProducts();
        setWelcomeCouponApplied(false);
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
    history.push('/category');
  };

  const handlePaymentMethodSelect = (method: 'Efectivo' | 'Tarjeta' | 'Transferir') => {
    setPaymentMethod(method);
    if (method !== 'Efectivo') {
      setCashPaid('');
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/dashboard" />
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
                  {cartItems.map((item) => (
                    <CartItemCard
                      key={item.id}
                      id={item.id}
                      name={item.name}
                      quantity={item.quantity}
                      unitPrice={item.price / item.quantity}
                      totalPrice={item.price}
                      selectedOptionLabels={item.selectedOptionLabels}
                      pieces={item.pieces}
                      onRemove={removeFromCart}
                    />
                  ))}
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
                    {promoActive && totals.discount > 0 && (
                      <span className="detail-discount-label">
                        2x1 bienvenida: -{formatPrice(totals.discount)}
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

                  {welcomeCouponEligible && (
                    <div className="welcome-coupon-row">
                      <IonChip
                        className={`welcome-coupon-chip ${welcomeCouponApplied ? 'applied' : ''}`}
                        onClick={() => setWelcomeCouponApplied((applied) => !applied)}
                      >
                        <IonIcon icon={giftOutline} />
                        <IonLabel>
                          {welcomeCouponApplied
                            ? 'Cupón de bienvenida 2x1 aplicado'
                            : 'Cliente nuevo: cupón 2x1 disponible — toca para aplicar'}
                        </IonLabel>
                      </IonChip>
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
                  <div className="cart-payment-label">Método de pago</div>
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
                </div>

                {/* Cash Input */}
                {paymentMethod === 'Efectivo' && (
                  <div className="cash-input-section">
                    <div className="cash-input-wrapper">
                      <span className="currency-symbol">$</span>
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
                      />
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

        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header="Validación"
          message="Debe seleccionar un método de pago."
          buttons={['OK']}
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
            promotionCode={promoActive ? WELCOME_COUPON_CODE : undefined}
            discountAmount={promoActive ? totals.discount : undefined}
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

