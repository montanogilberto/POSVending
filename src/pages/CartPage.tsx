import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonList,
  IonButton,
  IonText,
  IonButtons,
  IonBackButton,
  IonSelect,
  IonSelectOption,
  IonAlert,
  IonIcon,
  IonFab,
  IonFabButton,
  IonInput,
  IonToast,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardContent,
} from '@ionic/react';
import { useCart } from '../context/CartContext';
import { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import CartItem from '../components/CartItem';
import { submitOrder } from '../api/cartApi';
import { addCircle, addCircleOutline } from 'ionicons/icons';
import useInactivityTimer from '../hooks/useInactivityTimer';
import { fetchAllLaundry } from '../api/laundryApi';
import Receipt from '../components/Receipt';
import { fetchTicket } from '../api/ticketApi';

const CartPage: React.FC = () => {
  const { cart, removeFromCart, clearCart } = useCart();
  const history = useHistory();
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'tarjeta' | ''>('');
  const [cashPaid, setCashPaid] = useState<string>('');
  const [showAlert, setShowAlert] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [changeAmount, setChangeAmount] = useState(0);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [ticketData, setTicketData] = useState<any>(null);
  const [lastIncomeId, setLastIncomeId] = useState<string | null>(null);

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const isCheckoutEnabled = paymentMethod && (paymentMethod !== 'efectivo' || (cashPaid && !isNaN(parseFloat(cashPaid)) && parseFloat(cashPaid) >= total));

  useInactivityTimer(300000, () => window.location.reload());

  useEffect(() => {
    const cash = parseFloat(cashPaid);
    if (paymentMethod === 'efectivo' && !isNaN(cash) && cash > total) {
      setChangeAmount(cash - total);
      //setToastMessage(`Cambio a devolver: $${(cash - total).toFixed(2)}`);
      //setShowToast(true);
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
        console.log("cash:" + cash)
        console.log("total:" + total)
        showErrorToast('El efectivo pagado debe ser igual o mayor al total.');
        return;
      }
    }

    const orderData = {
      orders: cart.map((item) => {
        const selections = Object.entries(item.selectedOptions || {}).map(([optionType, optionValues]) => {
          return (Array.isArray(optionValues) ? optionValues : [optionValues]).map((value: string) => ({
            productOptionId: optionType,
            productOptionChoiceId: value,
          }));
        }).flat();

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
          // Call income endpoint
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
                  products: cart.map(item => ({
                    productId: parseInt(item.productId),
                    options: Object.entries(item.selectedChoices).map(([optionId, choices]) => ({
                      productOptionId: parseInt(optionId),
                      choices: choices.map(c => ({
                        productOptionChoiceId: c.id,
                        name: c.name,
                        price: c.price
                      }))
                    }))[0]  // Assuming one option per product; adjust if multiple
                  }))
                }
              ]
            };
            console.log('Income API payload:', payload);
            const incomeResponse = await fetch('https://smartloansbackend.azurewebsites.net/income', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            if (incomeResponse.ok) {
              const incomeData = await incomeResponse.json();
              console.log('Income response:', incomeData);
            
              const rec = Array.isArray(incomeData.result) ? incomeData.result[0] : null;
            
              if (rec && rec.msg === 'Inserted Successfully' && rec.value != null) {
                const newId = Number(rec.value); // value is a string in the JSON
                setLastIncomeId(newId);
                console.log('Income inserted successfully, ID:', newId);
              } else {
                console.error('Income insertion failed:', rec?.msg || 'Unknown error', rec);
              }
            } else {
              console.error('Income call failed:', incomeResponse.status);
              const errorText = await incomeResponse.text();
              console.error('Income error response:', errorText);
            }
          } catch (incomeError) {
            console.error('Income call error:', incomeError);
          }
          setShowSuccessToast(true);
        } else {
          const errorData = await response.json();
          console.error('Order error:', errorData.detail);
          showErrorToast('Ocurrió un error al procesar el pedido.');
        }
      } catch (error) {
        console.error('Checkout error:', error);
        showErrorToast('No se pudo conectar con el servidor.');
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

      <IonContent>
        <IonGrid className="ion-padding">
          <IonRow className="ion-justify-content-center">
            <IonCol sizeMd="6" sizeLg="4" sizeXs="12">
              <IonCard className="dashboard-card">
                <IonCardHeader>
                  <IonCardSubtitle>Carrito de Compras</IonCardSubtitle>
                </IonCardHeader>
                <IonCardContent>
                  {cart.length === 0 ? (
                    <IonText>El carrito está vacío.</IonText>
                  ) : (
                    <>
                      <IonList>
                        {cart.map((item) => (
                          <CartItem
                            key={item.id}
                            id={item.id}
                            name={item.name}
                            quantity={item.quantity}
                            price={item.price}
                            selectedOptionLabels={item.selectedOptionLabels}
                            onRemove={removeFromCart}
                          />
                        ))}
                      </IonList>

                      <IonItem lines="none">
                        <IonLabel>
                          <h2>Total: ${total.toFixed(2)}</h2>
                        </IonLabel>
                      </IonItem>

                      <IonItem>
                        <IonLabel position="stacked">Método de pago</IonLabel>
                        <IonSelect
                          value={paymentMethod}
                          onIonChange={(e) => {
                            setPaymentMethod(e.detail.value);
                            setCashPaid('');
                          }}
                          interface="popover"
                        >
                          <IonSelectOption value="efectivo">Efectivo</IonSelectOption>
                          <IonSelectOption value="tarjeta">Tarjeta</IonSelectOption>
                        </IonSelect>
                      </IonItem>

                      {paymentMethod === 'efectivo' && (
                        <IonItem>
                          <IonLabel position="stacked">Efectivo recibido</IonLabel>
                          <IonInput
                            type="number"
                            value={cashPaid}
                            onIonChange={e => setCashPaid(e.detail.value!)}
                            placeholder="Ingrese el efectivo recibido"
                            min={total}
                          />
                        </IonItem>
                      )}

                      <IonButton expand="block" color="primary" onClick={handleCheckout} disabled={!isCheckoutEnabled}>
                        Proceder al pago
                      </IonButton>

                      <IonButton expand="block" color="medium" onClick={clearCart}>
                        Vaciar carrito
                      </IonButton>
                    </>
                  )}
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>
        <IonFab slot="fixed" horizontal="end" >
          <IonFabButton onClick={handleAddMoreProducts} aria-label="agregar mas productos">
            <IonIcon icon={addCircle} />
          </IonFabButton>
        </IonFab>



      </IonContent>

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
            handler: () => setShowToast(false),
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
            setShowReceipt(true);
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
            handler: () => setShowSuccessToast(false),
          },
        ]}
      />

      {showReceipt && ticketData && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Receipt
            transactionDate={new Date(ticketData.paymentDate).toLocaleDateString('es-ES')}
            transactionTime={new Date(ticketData.paymentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            clientName={ticketData.client.name}
            clientPhone={ticketData.client.cellphone}
            clientEmail={ticketData.client.email}
            userName={ticketData.user.name}
            products={ticketData.products.map((prod: any) => ({
              name: prod.name,
              quantity: prod.quantity,
              unitPrice: prod.unitPrice,
              subtotal: prod.subtotal,
              options: prod.options.map((opt: any) => `${opt.optionName}: ${opt.choiceName}`),
            }))}
            subtotal={ticketData.totals.subtotal}
            iva={ticketData.totals.iva}
            total={ticketData.totals.total}
            paymentMethod={ticketData.paymentMethod === 'efectivo' ? 'Efectivo' : 'Tarjeta'}
            amountReceived={paymentMethod === 'efectivo' ? parseFloat(cashPaid) || ticketData.totals.total : ticketData.totals.total}
            change={paymentMethod === 'efectivo' ? (parseFloat(cashPaid) || 0) - ticketData.totals.total : 0}
          />
          <IonButton
            style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 10000 }}
            onClick={async () => {
              setShowReceipt(false);
              setTicketData(null);
              clearCart();
              await fetchAllLaundry();
              history.push('/Laundry');
            }}
          >
            Cerrar
          </IonButton>
        </div>
      )}
    </IonPage>
  );
};

export default CartPage;