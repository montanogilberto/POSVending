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
} from '@ionic/react';
import { addCircle, card } from 'ionicons/icons';
import { useCart } from '../../context/CartContext';
import { useState, useEffect, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { submitOrder } from '../../api/cartApi';
import useInactivityTimer from '../../hooks/useInactivityTimer';
import { fetchTicket } from '../../api/ticketApi';
import { postIncome } from '../../api/incomeApi';
import { useIncome } from '../../context/IncomeContext';

import '../../styles/dashboard.css';
import './CartPage.css';
import Receipt from '../../components/Receipt';

import CartSummary from './CartSummary';
import CartItemsList from './CartItemsList';
import CheckoutActions from './CheckoutActions';
import ReceiptDisplay from './ReceiptDisplay';

const CartPage: React.FC = () => {
  const { cart, removeFromCart, clearCart } = useCart();
  const { loadIncomes } = useIncome();
  const history = useHistory();

  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'tarjeta' | 'transferencia' | ''>('');
  const [cashPaid, setCashPaid] = useState<string>('');
  const [showAlert, setShowAlert] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [changeAmount, setChangeAmount] = useState(0);
  const [ticketData, setTicketData] = useState<any>(null);
  const [lastIncomeId, setLastIncomeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const receiptRef = useRef<HTMLDivElement | null>(null);

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const cashNumber = parseFloat(cashPaid);

  const isCheckoutEnabled =
    !!paymentMethod &&
    (paymentMethod !== 'efectivo' ||
      (!isNaN(cashNumber) && cashNumber >= total));

  useInactivityTimer(300000, () => window.location.reload());

  useEffect(() => {
    const cash = parseFloat(cashPaid);
    if (paymentMethod === 'efectivo' && !isNaN(cash) && cash > total) {
      setChangeAmount(cash - total);
    }
  }, [cashPaid, paymentMethod, total]);

  const showErrorToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
  };

  const handleCheckout = async () => {
    if (!paymentMethod) {
      setShowAlert(true);
      return;
    }

    if (paymentMethod === 'efectivo') {
      const cash = parseFloat(cashPaid);
      if (isNaN(cash) || cash < total) {
        showErrorToast('El efectivo pagado debe ser igual o mayor al total.');
        return;
      }
    }

    setLoading(true);

    const orderData = {
      orders: cart.map((item) => {
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
          userId: 1,
          total: item.price * item.quantity,
          clientId: 1,
          comments: '',
          selections: selections,
        };
      }),
    };

    try {
      const response = await submitOrder(orderData);

      if (response.ok) {
        try {
          const payload = {
            income: [
              {
                action: 1,
                total: total,
                paymentMethod: paymentMethod,
                paymentDate: new Date().toISOString(),
                userId: 1,
                clientId: 1,
                companyId: 1,
                products: cart.map((item) => ({
                  productId: parseInt(item.productId),
                  options: Object.entries(item.selectedChoices).map(([optionId, choices]) => ({
                    productOptionId: parseInt(optionId),
                    choices: choices.map((c) => ({
                      productOptionChoiceId: c.id,
                      name: c.name,
                      price: c.price,
                    })),
                  }))[0],
                })),
              },
            ],
          };

          const incomeData = await postIncome(payload);
          const rec = Array.isArray(incomeData.result)
            ? incomeData.result[0]
            : null;

          if (rec && rec.msg === 'Inserted Successfully' && rec.value != null) {
            const newId = String(rec.value);
            setLastIncomeId(newId);
            await loadIncomes();
          }
        } catch (incomeError) {}

        clearCart();
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

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/Laundry" />
          </IonButtons>
          <IonTitle>Carrito</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="cart-content">
        <div className="cart-wrapper">
          <div className="cart-container">
            <h2 className="cart-title">Carrito de Compras</h2>

            {cart.length === 0 ? (
              <p className="empty-cart">El carrito está vacío.</p>
            ) : (
              <>
                {cart.map((item) => (
                  <div key={item.id} className="cart-item">
                    <div className="cart-item-header">
                      <h3 className="cart-item-title">{item.name}</h3>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="remove-button"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="cart-item-detail">Cantidad: {item.quantity}</p>
                    <p className="cart-item-detail">Precio: ${item.price.toFixed(2)}</p>

                    {item.selectedOptionLabels &&
                      Object.entries(item.selectedOptionLabels).map(
                        ([key, value]) => (
                          <p key={key} className="cart-item-detail">
                            {key}:{' '}
                            {Array.isArray(value) ? value.join(', ') : value}
                          </p>
                        )
                      )}
                  </div>
                ))}

                <hr className="cart-separator" />

                <div className="cart-total">Total: ${total.toFixed(2)}</div>

                <div className="payment-section">
                  <label className="payment-label">Método de pago</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="payment-select"
                  >
                    <option value="">Seleccionar método</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>

                {paymentMethod === 'efectivo' && (
                  <div className="cash-input-section">
                    <label className="cash-input-label">Efectivo recibido</label>
                    <input
                      type="number"
                      value={cashPaid}
                      onChange={(e) => setCashPaid(e.target.value)}
                      placeholder="Ingrese el efectivo recibido"
                      min={total}
                      className="cash-input"
                    />
                  </div>
                )}

                {/* --------------------------- */}
                {/*     NEW BUTTON SECTION      */}
                {/* --------------------------- */}
                <div className="cart-actions">

                  <IonButton
                    fill="outline"
                    onClick={handleAddMoreProducts}
                    className="cart-button cart-button-secondary"
                  >
                    <IonIcon slot="start" icon={addCircle} />
                    Agregar más productos
                  </IonButton>

                  <IonButton
                    expand="block"
                    onClick={handleCheckout}
                    disabled={!isCheckoutEnabled}
                    className="cart-button cart-button-primary"
                  >
                    <IonIcon slot="start" icon={card} />
                    Pagar ${total.toFixed(2)}
                  </IonButton>
                </div>
              </>
            )}
          </div>
        </div>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          color="danger"
          position="bottom"
          buttons={[
            {
              text: 'OK',
              role: 'cancel',
              handler: () => {
                setShowToast(false);
              },
            },
          ]}
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
          onDidDismiss={async () => {
            setShowSuccessToast(false);
            if (lastIncomeId) {
              const ticket = await fetchTicket(lastIncomeId);
              setTicketData(ticket);

              setTimeout(() => {
                const receiptEl = document.getElementById('receipt-container');
                if (receiptEl) receiptEl.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }
          }}
          message={`¡Pedido realizado! Método de pago: ${paymentMethod}${
            paymentMethod === 'efectivo' && !isNaN(parseFloat(cashPaid)) && parseFloat(cashPaid) > total
              ? ` : Cambio a devolver: $${(parseFloat(cashPaid) - total).toFixed(2)}`
              : ''
          }`}
          color="success"
          position="bottom"
          buttons={[
            {
              text: 'OK',
              role: 'cancel',
              handler: () => {
                setShowSuccessToast(false);
              },
            },
          ]}
        />

        {ticketData && (
          <ReceiptDisplay
            ticketData={ticketData}
            paymentMethod={paymentMethod}
            cashPaid={cashPaid}
            clearCart={clearCart}
            setTicketData={setTicketData}
          />
        )}

        <IonLoading isOpen={loading} message="Procesando pago..." />
      </IonContent>
    </IonPage>
  );
};

export default CartPage;
