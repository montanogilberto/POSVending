import React from 'react';
import {
  IonContent,
  IonInput,
  IonButton,
  IonItem,
  IonLabel,
  IonToast,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardContent,
  IonList,
  IonGrid,
  IonRow,
  IonCol,
  IonPage,
  IonIcon,
} from '@ionic/react';
import { waterOutline, receiptOutline, documentsOutline } from 'ionicons/icons';
import { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { helpCircleOutline, notificationsOutline, logOutOutline } from 'ionicons/icons';
import './Laundry.css';

interface Transaction {
  date: string;
  amount: number;
  user: string;
  productName?: string;
  quantity?: number;
}

interface LaundryData {
  laundryId: number;
  total: number;
  create_at: string;
  update_at: string;
  details?: Array<{
    laundryDetailId: number;
    productId: number;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    create_at: string;
    update_at: string;
  }>;
}

interface CartItem {
  productId: number;
  name: string;
  description: string;
  price: number;
  quantity: number;
  subtotal: number;
  selectedOptions: { [optionId: number]: number };
}

interface LocationState {
  from?: string;
  item?: CartItem;
}

const Laundry: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allLaundry, setAllLaundry] = useState<LaundryData[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  // 🔄 GET all_laundry
  const fetchAllLaundry = async () => {
    try {
      const response = await fetch('https://smartloansbackend.azurewebsites.net/all_laundry');
      if (!response.ok) throw new Error(`Error al obtener datos del backend: ${response.status}`);

      const data = await response.json();
      console.log('Fetched all_laundry:', data);
      setAllLaundry(data.pos_laundry || []);
    } catch (error) {
      console.error(error);
      setToastMessage('Error al obtener ventas del backend.');
      setShowToast(true);
    }
  };

  useEffect(() => {
    fetchAllLaundry();
  }, []);

  useEffect(() => {
    const state = location.state as LocationState | undefined;
    if (state && state.from === 'product-selection' && state.item) {
      const item = state.item;
      setCart(prev => [...prev, item]);
      setShowCart(true);
      setToastMessage(`Producto "${item.name}" agregado al carrito.`);
      setShowToast(true);
    }
  }, [location.state]);

  const handleStartSeller = () => {
    history.push('/category');
  };

  const handleConfirmSale = async () => {
    if (cart.length === 0) {
      setToastMessage('El carrito está vacío.');
      setShowToast(true);
      return;
    }

    try {
      const total = cart.reduce((sum, item) => sum + item.subtotal, 0);
      const response = await fetch('https://smartloansbackend.azurewebsites.net/pos_laundry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pos_laundry: {
            details: cart.map(item => ({
              productId: item.productId,
              cantidad: item.quantity,
              precio_unitario: item.price,
              subtotal: item.subtotal
            })),
            total
          }
        }),
      });

      if (!response.ok) throw new Error(`Error al crear venta: ${response.status}`);
      const data = await response.json();
      console.log('Venta creada:', data);

      const now = new Date();
      const newTransaction: Transaction = {
        date: now.toLocaleDateString('es-ES') + ' ' + now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        amount: total,
        user: 'admin',
        productName: cart.map(item => item.name).join(', '),
        quantity: cart.reduce((sum, item) => sum + item.quantity, 0)
      };

      setTransactions(prev => [newTransaction, ...prev].slice(0, 5));
      setToastMessage(`Venta confirmada: $${total.toFixed(2)}`);
      setShowToast(true);
      setCart([]);
      setShowCart(false);
      fetchAllLaundry();
    } catch (error) {
      console.error(error);
      setToastMessage('Error al confirmar la venta.');
      setShowToast(true);
    }
  };

  const calculateTotal = (): number =>
    allLaundry.reduce((sum, sale) => sum + sale.total, 0);

  const currentMonthYear = new Date().toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
  const currentUser = 'admin'; // From UserContext if available
  const percentageChange = '+0%'; // Mock; calculate from previous month if backend provides

  return (
    <IonPage>
      <IonContent fullscreen>
        <IonGrid className="ion-padding">
          <IonRow>test</IonRow>
          {/* 💧 Total de ingresos */}
          <IonRow className="ion-justify-content-center">
            <IonCol sizeMd="6" sizeLg="4" sizeXs="12">
              <IonCard className="dashboard-card">
                <IonCardHeader>
                  <IonIcon icon={waterOutline} size="large" color="primary" />
                  <IonCardSubtitle className="secondary-text">Total de Ingresos</IonCardSubtitle>
                </IonCardHeader>
                <IonCardContent>
                  <div className="total-number">${calculateTotal().toFixed(2)}</div>
                  <div className="total-meta">
                    <span className="secondary-text">{currentMonthYear}</span>
                    <span className="secondary-text">• {currentUser}</span>
                    <span className="percentage-change">{percentageChange}</span>
                  </div>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          {/* Iniciar Venta */}
          <IonRow className="ion-justify-content-center">
            <IonCol sizeMd="6" sizeLg="4" sizeXs="12">
              <IonCard className="dashboard-card">
                <IonCardHeader>
                  <IonLabel className="payment-label">Iniciar Venta</IonLabel>
                </IonCardHeader>
                <IonCardContent>
                  <IonButton expand="block" className="start-seller-button" onClick={handleStartSeller}>
                    Iniciar Selección de Productos
                  </IonButton>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          {/* Carrito Summary if showCart */}
          {showCart && cart.length > 0 && (
            <IonRow className="ion-justify-content-center">
              <IonCol sizeMd="6" sizeLg="4" sizeXs="12">
                <IonCard className="dashboard-card">
                  <IonCardHeader>
                    <IonCardSubtitle>Carrito de Compra</IonCardSubtitle>
                  </IonCardHeader>
                  <IonCardContent>
                    {cart.map((item, i) => (
                      <IonItem key={i} lines="full">
                        <IonLabel>
                          <h2>{item.name} x{item.quantity}</h2>
                          <p>${item.subtotal.toFixed(2)}</p>
                        </IonLabel>
                      </IonItem>
                    ))}
                    <div className="cart-total">
                      <strong>Total: ${cart.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)}</strong>
                    </div>
                    <IonButton expand="block" className="confirm-sale-button" onClick={handleConfirmSale}>
                      Confirmar Venta
                    </IonButton>
                    <IonButton expand="block" fill="clear" onClick={() => { setShowCart(false); setCart([]); }}>
                      Cancelar
                    </IonButton>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            </IonRow>
          )}


          {/* Actividad */}
          <IonRow className="ion-justify-content-center ion-margin-top">
            <IonCol sizeMd="6" sizeLg="4" sizeXs="12">
              <IonCard className="dashboard-card">
                <IonCardHeader>
                  
                  <IonCardSubtitle>Actividad Reciente</IonCardSubtitle>
                </IonCardHeader>
                <IonCardContent>
                  {allLaundry.length === 0 ? (
                    <div className="timeline-item secondary-text">
                      ❌ Sin actividad — (ayer)
                    </div>
                  ) : (
                    <div className="timeline">
                      {allLaundry.slice(0, 3).map((sale, i) => {
                        const now = new Date(sale.create_at);
                        const time = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                        const status = 'Venta';
                        const icon = '✅';
                        const color = 'success';
                        const productCount = sale.details ? sale.details.length : 1;
                        return (
                          <div key={i} className={`timeline-item ${color}`}>
                            <span className="timeline-icon">{icon}</span>
                            <div className="timeline-content">
                              <span>{status} — ${sale.total.toFixed(2)} ({productCount} productos, {time})</span>
                            </div>
                            <span className="timeline-dot" style={{backgroundColor: '#007BFF'}}></span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

        </IonGrid>

        {/* Toast */}
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={2000}
          color={toastMessage.includes('Error') ? 'danger' : 'success'}
        />
      </IonContent>
    </IonPage>
  );
};

export default Laundry;
