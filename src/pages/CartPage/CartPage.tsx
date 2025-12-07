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
import { addCircle, card, trash } from 'ionicons/icons';
import { useCart } from '../../context/CartContext';
import { useState, useEffect, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { submitOrder } from '../../api/cartApi';
import useInactivityTimer from '../../hooks/useInactivityTimer';
import { fetchTicket } from '../../api/ticketApi';
import { postIncome } from '../../api/incomeApi';
import { useIncome } from '../../context/IncomeContext';
import '../../styles/dashboard.css';
import Receipt from '../../components/Receipt';

import CartSummary from './CartSummary';
import CartItemsList from './CartItemsList';
import CheckoutActions from './CheckoutActions';
import ReceiptDisplay from './ReceiptDisplay';
// Removed ReceiptModal import as it's no longer used

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

  const isCheckoutEnabled: boolean =
    !!paymentMethod &&
    (
      paymentMethod !== 'efectivo' ||
      (
        !isNaN(cashNumber) &&
        cashNumber >= total
      )
    );

  useInactivityTimer(300000, () => window.location.reload());

  useEffect(() => {
    const cash = parseFloat(cashPaid);
    if (paymentMethod === 'efectivo' && !isNaN(cash) && cash > total) {
      setChangeAmount(cash - total);
    } else {
      setShowToast(false);
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
          .map(([optionType, optionValues]) => {
            return (Array.isArray(optionValues) ? optionValues : [optionValues]).map((value: string) => ({
              productOptionId: optionType,
              productOptionChoiceId: value,
            }));
          })
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
          const rec = Array.isArray(incomeData.result) ? incomeData.result[0] : null;

          if (rec && rec.msg === 'Inserted Successfully' && rec.value != null) {
            const newId = String(rec.value);
            setLastIncomeId(newId);
            try {
              await loadIncomes();
            } catch (reloadError) {}
          }
        } catch (incomeError) {}
        clearCart();
        setShowSuccessToast(true);
      } else {
        const errorData = await response.json();
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

      <IonContent fullscreen style={{ backgroundColor: '#f5f5f5', fontFamily: 'Inter, SF Pro, sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '16px' }}>
          <div className="cart-container">
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', textAlign: 'center' }}>Carrito de Compras</h2>

            {cart.length === 0 ? (
              <p style={{ color: '#666', textAlign: 'center' }}>El carrito está vacío.</p>
            ) : (
              <>
                {cart.map((item) => (
                  <div key={item.id} style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h3 style={{ fontWeight: 'bold', margin: 0 }}>{item.name}</h3>
                      <button onClick={() => removeFromCart(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '18px' }}>✕</button>
                    </div>
                    <p style={{ margin: '4px 0' }}>Cantidad: {item.quantity}</p>
                    <p style={{ margin: '4px 0' }}>Precio: ${item.price.toFixed(2)}</p>
                    {item.selectedOptionLabels && Object.entries(item.selectedOptionLabels).map(([key, value]) => (
                      <p key={key} style={{ margin: '4px 0' }}>{key}: {Array.isArray(value) ? value.join(', ') : value}</p>
                    ))}
                  </div>
                ))}

                <hr style={{ border: 'none', borderTop: '1px solid #e0e0e0', margin: '24px 0' }} />

                <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '24px' }}>Total: ${total.toFixed(2)}</div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Método de pago</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    style={{ width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '8px', fontSize: '16px' }}
                  >
                    <option value="">Seleccionar método</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>

                {paymentMethod === 'efectivo' && (
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Efectivo recibido</label>
                    <input
                      type="number"
                      value={cashPaid}
                      onChange={(e) => setCashPaid(e.target.value)}
                      placeholder="Ingrese el efectivo recibido"
                      min={total}
                      style={{ width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '8px', fontSize: '16px' }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <IonButton
                    
                    fill="outline"
                    color="primary"
                    onClick={handleAddMoreProducts}
                  >
                    <IonIcon slot="start" icon={addCircle} />
                    Agregar más productos
                  </IonButton>
                  <IonButton
                    expand="block"
                    fill="solid"
                    color="primary"
                    onClick={handleCheckout}
                    disabled={!isCheckoutEnabled}
                  >
                    <IonIcon slot="start" icon={card} />
                    Proceder al pago
                  </IonButton>
                  <IonButton
                    expand="block"
                    fill="solid"
                    color="medium"
                    onClick={clearCart}
                  >
                    <IonIcon slot="start" icon={trash} />
                    Vaciar carrito
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
              text: 'Cerrar',
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
            console.log('Toast dismissed, lastIncomeId:', lastIncomeId);
            setShowSuccessToast(false);
            if (lastIncomeId) {
              console.log('Fetching ticket for incomeId:', lastIncomeId);
              const ticket = await fetchTicket(lastIncomeId);
              console.log('Fetched ticket:', ticket);
              setTicketData(ticket);
              // Scroll to the receipt
              setTimeout(() => {
                const receiptEl = document.getElementById('receipt-container');
                if (receiptEl) receiptEl.scrollIntoView({ behavior: 'smooth' });
              }, 100);
              // Removed setting showReceipt true, as modal is gone
            } else {
              console.log('No lastIncomeId, cannot fetch ticket');
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

        {/* Receipt Display */}
        {ticketData && (
          <ReceiptDisplay
            ticketData={ticketData}
            paymentMethod={paymentMethod}
            cashPaid={cashPaid}
            clearCart={clearCart}
            setTicketData={setTicketData}
          />
        )}

        <IonLoading
          isOpen={loading}
          message="Procesando pago..."
        />
      </IonContent>
    </IonPage>
  );
};

export default CartPage;
