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
import { helpCircleOutline, notificationsOutline, logOutOutline } from 'ionicons/icons';
import './Laundry.css';

interface Transaction {
  date: string;
  amount: number;
  user: string;
}

interface LaundryData {
  ingreso: number;
}

const Laundry: React.FC = () => {
  const [cash, setCash] = useState<number | undefined>();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allLaundry, setAllLaundry] = useState<LaundryData[]>([]);

  // 🔄 POST al backend
  const sendToBackend = async (amount: number): Promise<boolean> => {
    try {
      const response = await fetch('https://smartloansbackend.azurewebsites.net/laundry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          laundry: [{ ingreso: amount, action: 1 }],
        }),
      });

      if (!response.ok) throw new Error(`Error al enviar al backend: ${response.status}`);
      await response.json();
      return true;
    } catch (error) {
      console.error(error);
      setToastMessage('Error al enviar datos al backend.');
      setShowToast(true);
      return false;
    }
  };

  // 🔄 GET ingresos
  const fetchAllLaundry = async () => {
    try {
      const response = await fetch('https://smartloansbackend.azurewebsites.net/all_vending');
      if (!response.ok) throw new Error(`Error al obtener datos del backend: ${response.status}`);

      const data = await response.json();
      let laundryData = data.laundry;

      if (typeof laundryData === 'string') {
        try {
          laundryData = JSON.parse(laundryData);
        } catch {
          laundryData = [];
        }
      }
      setAllLaundry(Array.isArray(laundryData) ? laundryData : []);
    } catch (error) {
      console.error(error);
      setToastMessage('Error al obtener ingresos del backend.');
      setShowToast(true);
    }
  };

  useEffect(() => {
    fetchAllLaundry();
  }, []);

  const handleAccept = async () => {
    if (!cash || cash <= 0) {
      setToastMessage('Ingrese una cantidad válida mayor a 0.');
      setShowToast(true);
      return;
    }

    const enviado = await sendToBackend(cash);
    if (!enviado) return;

    const now = new Date();
    const newTransaction: Transaction = { 
      date: now.toLocaleDateString('es-ES') + ' ' + now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      amount: cash,
      user: 'Juan P.',
    };

    setTransactions((prev) => [newTransaction, ...prev].slice(0, 5));
    setToastMessage(`Pago aceptado: $${cash.toFixed(2)}`);
    setShowToast(true);
    setCash(undefined);
    fetchAllLaundry();
  };

  const calculateTotal = (): number =>
    allLaundry.reduce((sum, item) => sum + item.ingreso, 0);

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

          {/* Formulario */}
          <IonRow className="ion-justify-content-center">
            <IonCol sizeMd="6" sizeLg="4" sizeXs="12">
              <IonCard className="dashboard-card">
                <IonCardHeader>
                  <IonLabel className="payment-label">Ingrese el pago</IonLabel>
                </IonCardHeader>
                <IonCardContent>
                  <IonItem lines="none" className="payment-input-item">
                    <IonInput
                      type="number"
                      value={cash}
                      onIonChange={(e) => setCash(parseFloat(e.detail.value!))}
                      placeholder="Ej. 50.00"
                      className="payment-input"
                    />
                  </IonItem>
                  <IonButton expand="block" className="accept-button" onClick={handleAccept}>
                    ACEPTAR PAGO
                  </IonButton>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          {/* Últimos pagos */}
          <IonRow className="ion-justify-content-center ion-margin-top">
            <IonCol sizeMd="6" sizeLg="4" sizeXs="12">
              <IonCard className="dashboard-card">
                <IonCardHeader>
                  <IonIcon icon={receiptOutline} size="large" />
                  <IonCardSubtitle>Últimos Pagos (Local)</IonCardSubtitle>
                </IonCardHeader>
                <IonCardContent>
                  {transactions.length === 0 ? (
                    <p className="secondary-text ion-text-center">No hay pagos registrados</p>
                  ) : (
                    <IonGrid className="payments-table">
                      <IonRow className="table-header">
                        <IonCol>Monto</IonCol>
                        <IonCol>Fecha</IonCol>
                        <IonCol>Usuario</IonCol>
                      </IonRow>
                      {transactions.length > 0 ? transactions.slice(0, 3).map((txn, i) => (
                        <React.Fragment key={i}>
                          <IonRow className="table-row">
                            <IonCol>${txn.amount.toFixed(2)}</IonCol>
                            <IonCol>{txn.date}</IonCol>
                            <IonCol>{txn.user}</IonCol>
                          </IonRow>
                          {i < 2 && <IonRow><IonCol className="divider" col-12><hr /></IonCol></IonRow>}
                        </React.Fragment>
                      )) : (
                        <IonRow className="table-row">
                          <IonCol className="ion-text-center" col-12>No hay pagos registrados</IonCol>
                        </IonRow>
                      )}
                    </IonGrid>
                  )}
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          {/* Actividad */}
          <IonRow className="ion-justify-content-center ion-margin-top">
            <IonCol sizeMd="6" sizeLg="4" sizeXs="12">
              <IonCard className="dashboard-card">
                <IonCardHeader>
                  <IonIcon icon={documentsOutline} size="large" />
                  <IonCardSubtitle>Actividad Reciente</IonCardSubtitle>
                </IonCardHeader>
                <IonCardContent>
                  {allLaundry.length === 0 ? (
                    <div className="timeline-item secondary-text">
                      ❌ Sin actividad — (ayer)
                    </div>
                  ) : (
                    <div className="timeline">
                      {allLaundry.length > 0 ? allLaundry.slice(0, 3).map((item, i) => {
                        const now = new Date();
                        const time = new Date(now.getTime() - i * 3600000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                        const status = i % 2 === 0 ? 'Pago recibido' : 'En espera';
                        const icon = i % 2 === 0 ? '✅' : '🕒';
                        const color = i % 2 === 0 ? 'success' : 'warning';
                        return (
                          <div key={i} className={`timeline-item ${color}`}>
                            <span className="timeline-icon">{icon}</span>
                            <div className="timeline-content">
                              <span>{status} — ${item.ingreso.toFixed(2)} ({time})</span>
                            </div>
                            <span className="timeline-dot" style={{backgroundColor: '#007BFF'}}></span>
                          </div>
                        );
                      }) : (
                        <div className="timeline-item secondary-text">
                          Sin actividad reciente
                        </div>
                      )}
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
