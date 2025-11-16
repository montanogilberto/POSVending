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
  IonGrid,
  IonRow,
  IonCol,
  IonPage,
  IonIcon,
  IonModal,
} from '@ionic/react';
import { waterOutline, receiptOutline, documentsOutline } from 'ionicons/icons';
import { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { helpCircleOutline, notificationsOutline } from 'ionicons/icons';
import './Laundry.css';
import Header from '../components/Header';
import AlertPopover from '../components/PopOver/AlertPopover';
import LogoutAlert from '../components/Alerts/LogoutAlert';
import MailPopover from '../components/PopOver/MailPopover';
import useInactivityTimer from '../hooks/useInactivityTimer';
import { fetchAllLaundry } from '../api/laundryApi';
import Receipt from '../components/Receipt';
import { fetchTicket } from '../api/ticketApi';

interface Transaction {
  date: string;
  amount: number;
  user: string;
  productName?: string;
  quantity?: number;
}

interface Income {
  incomeId: number;
  orderId: number;
  total: number;
  paymentMethod: string;
  paymentDate: string;
  userId: number;
  clientId: number;
  companyId: number;
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
  // Remove the duplicate declaration of history
  const location = useLocation();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allIncome, setAllIncome] = useState<Income[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  // 🔄 GET all_laundry
  const loadAllLaundry = async () => {
    try {
      const sortedIncome = await fetchAllLaundry();
      setAllIncome(sortedIncome);
    } catch (error) {
      console.error(error);
      setToastMessage('Error al obtener ventas del backend.');
      setShowToast(true);
    }
  };

  useEffect(() => {
    loadAllLaundry();
  }, []);

  useInactivityTimer(300000, loadAllLaundry);

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
      loadAllLaundry();
    } catch (error) {
      console.error(error);
      setToastMessage('Error al confirmar la venta.');
      setShowToast(true);
    }
  };

  const calculateTotal = (): number =>
    allIncome.reduce((sum, income) => sum + income.total, 0);

  const currentMonthYear = new Date().toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
  const currentUser = 'admin'; // From UserContext if available
  const percentageChange = '+0%'; // Mock; calculate from previous month if backend provides

  const history = useHistory();

  const [popoverState, setPopoverState] = useState<{ showAlertPopover: boolean; showMailPopover: boolean; event?: Event }>({
    showAlertPopover: false,
    showMailPopover: false,
  });

  const presentAlertPopover = (e: React.MouseEvent) => {
    setPopoverState({ ...popoverState, showAlertPopover: true, event: e.nativeEvent });
  };

  const dismissAlertPopover = () => setPopoverState({ ...popoverState, showAlertPopover: false });

  const presentMailPopover = (e: React.MouseEvent) => {
    setPopoverState({ ...popoverState, showMailPopover: true, event: e.nativeEvent });
  };

  const dismissMailPopover = () => setPopoverState({ ...popoverState, showMailPopover: false });

  const handleLogoutConfirm = () => {
    setAuthenticated(false);
    history.push('/Login');
    setShowLogoutAlert(false);
  };

  const handleShowReceipt = async (incomeId: number) => {
    try {
      const ticket = await fetchTicket(incomeId.toString());
      if (ticket) {
        // Parse date as UTC since database stores in UTC, then convert to Hermosillo timezone (UTC-7)
        const utcDate = new Date(ticket.paymentDate + (ticket.paymentDate.includes('Z') ? '' : 'Z'));
        const hermosilloDate = new Date(utcDate.getTime() - (7 * 60 * 60 * 1000));
        const receiptProps = {
          transactionDate: hermosilloDate.toLocaleDateString('es-ES'),
          transactionTime: hermosilloDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          clientName: ticket.client.name,
          clientPhone: ticket.client.cellphone,
          clientEmail: ticket.client.email,
          userName: ticket.user.name,
          products: ticket.products.map(p => ({
            name: p.name,
            quantity: p.quantity,
            unitPrice: p.unitPrice,
            subtotal: p.subtotal,
            options: p.options.map(o => o.choiceName)
          })),
          subtotal: ticket.totals.subtotal,
          iva: ticket.totals.iva,
          total: ticket.totals.total,
          paymentMethod: ticket.paymentMethod,
          amountReceived: ticket.totals.total, // Assuming full payment
          change: 0
        };
        setReceiptData(receiptProps);
        setShowReceiptModal(true);
      } else {
        setToastMessage('Recibo no encontrado.');
        setShowToast(true);
      }
    } catch (error) {
      console.error('Error fetching ticket:', error);
      setToastMessage('Error al obtener el recibo.');
      setShowToast(true);
    }
  };

  const getTitleFromPath = (pathname: string): string => {
    switch (pathname) {
      case '/POS':
        return 'Lavandería';
      case '/Laundry':
        return 'Lavandería';
      case '/ScannerQR':
        return 'Lector QR';
      case '/Setting':
        return 'Configuración';
      case '/Sells':
        return 'Ventas';
      default:
        return 'POS GMO';
    }
  };


  return (
    <IonPage>
      <Header
        presentAlertPopover={presentAlertPopover}
        presentMailPopover={presentMailPopover}
        screenTitle={getTitleFromPath(location.pathname)}
      />
      <IonContent fullscreen className="dashboard-content">
        <div className="dashboard-container">
          {/* Header */}
          <div className="dashboard-header-section">
            <h1 className="dashboard-title">Lavandería</h1>
          </div>

          {/* KPI Card - Total Ingresos */}
          <div className="dashboard-kpi-card">
            <div className="kpi-card-content">
              <div className="kpi-icon">
                <IonIcon icon={waterOutline} size="large" />
              </div>
              <div className="kpi-info">
                <h3 className="kpi-label">Total de Ingresos</h3>
                <div className="kpi-amount">${calculateTotal().toFixed(2)}</div>
                <div className="kpi-meta">
                  <span>{currentMonthYear}</span>
                  <span>• {currentUser}</span>
                  <span className="kpi-change">{percentageChange}</span>
                </div>
              </div>
            </div>
            <div className="kpi-action">
              <IonButton expand="block" className="start-sale-button" onClick={handleStartSeller}>
                Iniciar Venta
              </IonButton>
            </div>
          </div>

          {/* Carrito Summary if showCart */}
          {showCart && cart.length > 0 && (
            <div className="dashboard-cart-card">
              <h3>Carrito de Compra</h3>
              <div className="cart-items">
                {cart.map((item, i) => (
                  <div key={i} className="cart-item">
                    <span>{item.name} x{item.quantity}</span>
                    <span>${item.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="cart-total">
                <strong>Total: ${cart.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)}</strong>
              </div>
              <div className="cart-actions">
                <IonButton expand="block" className="confirm-sale-button" onClick={handleConfirmSale}>
                  Confirmar Venta
                </IonButton>
                <IonButton expand="block" fill="clear" onClick={() => { setShowCart(false); setCart([]); }}>
                  Cancelar
                </IonButton>
              </div>
            </div>
          )}

          {/* Actividad Reciente */}
          <div className="dashboard-activity-card">
            <h3>Actividad Reciente</h3>
            <div className="activity-timeline">
              {allIncome.length === 0 ? (
                <div className="activity-item no-activity">
                  ❌ Sin actividad — (ayer)
                </div>
              ) : (
                allIncome.slice(0, 10).map((income, i) => {
                  // Parse date as UTC since database stores in UTC, then convert to Hermosillo timezone (UTC-7)
                  const utcDate = new Date(income.paymentDate + (income.paymentDate.includes('Z') ? '' : 'Z'));
                  // Hermosillo is UTC-7, so subtract 7 hours from UTC
                  const hermosilloDate = new Date(utcDate.getTime() - (7 * 60 * 60 * 1000));
                  const time = hermosilloDate.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'});
                  const date = hermosilloDate.toLocaleDateString('es-ES');
                  return (
                    <div key={i} className="activity-item" onClick={() => handleShowReceipt(income.incomeId)}>
                      <span className="activity-icon">💰</span>
                      <div className="activity-content">
                        <span>Ingreso — ${income.total.toFixed(2)} ({income.paymentMethod}, {date} {time})</span>
                      </div>
                    </div>
                  );
                })
              )}
              {allIncome.length > 10 && (
                <div className="activity-item show-more">
                  <IonButton fill="clear" size="small" onClick={() => history.push('/movements')}>
                    Ver más movimientos
                  </IonButton>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Toast */}
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={2000}
          color={toastMessage.includes('Error') ? 'danger' : 'success'}
        />

        <AlertPopover
          isOpen={popoverState.showAlertPopover}
          event={popoverState.event}
          onDidDismiss={dismissAlertPopover}
        />
        <MailPopover
          isOpen={popoverState.showMailPopover}
          event={popoverState.event}
          onDidDismiss={dismissMailPopover}
        />
        <LogoutAlert
          isOpen={showLogoutAlert}
          onDidDismiss={() => setShowLogoutAlert(false)}
          handleLogoutConfirm={handleLogoutConfirm}
        />

        {/* Receipt Modal */}
        <IonModal isOpen={showReceiptModal} onDidDismiss={() => setShowReceiptModal(false)}>
          <Receipt {...receiptData} />
          <IonButton expand="block" onClick={() => setShowReceiptModal(false)}>Cerrar</IonButton>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Laundry;
