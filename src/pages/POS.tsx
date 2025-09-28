import React from 'react';
import {
  IonContent,
  IonPage,
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
  IonIcon,
} from '@ionic/react';
import { waterOutline, receiptOutline, documentsOutline } from 'ionicons/icons';
import { useEffect, useState } from 'react';
import './POS.css';

interface Transaction {
  date: string;
  amount: number;
  user: string;
}

interface VendingData {
  ingreso: number;
}

const POS: React.FC = () => {
  const [cash, setCash] = useState<number | undefined>();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allVending, setAllVending] = useState<VendingData[]>([]);

  // 🔄 POST al backend para guardar un ingreso
  const sendToBackend = async (amount: number): Promise<boolean> => {
    try {
      const response = await fetch('https://smartloansbackend.azurewebsites.net/vending', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vending: [
            {
              ingreso: amount,
              action: 1,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Error al enviar al backend: ${response.status}`);
      }

      const data = await response.json();
      console.log('Respuesta del backend:', data);
      return true;
    } catch (error) {
      console.error(error);
      setToastMessage('Error al enviar datos al backend.');
      setShowToast(true);
      return false;
    }
  };
const fetchAllVending = async () => {
  try {
    const response = await fetch('https://smartloansbackend.azurewebsites.net/all_vending');
    if (!response.ok) {
      throw new Error(`Error al obtener datos del backend: ${response.status}`);
    }

    const data = await response.json();
    console.log('Datos desde /all_vending:', data);

    let vendingData = data.vending;

    // Si el backend devuelve una cadena, intentar convertirla a arreglo
    if (typeof vendingData === 'string') {
      try {
        vendingData = JSON.parse(vendingData);
      } catch (error) {
        vendingData = [];
      }
    }

    // Validar que sea un arreglo antes de asignar
    if (Array.isArray(vendingData)) {
      setAllVending(vendingData);
    } else {
      setAllVending([]); 
    }

  } catch (error) {
    console.error(error);
    setToastMessage('Error al obtener ingresos del backend.');
    setShowToast(true);
  }
};


  // 📦 Cargar ingresos al iniciar
  useEffect(() => {
    fetchAllVending();
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

    setTransactions(prev => [newTransaction, ...prev].slice(0, 5));
    setToastMessage(`Efectivo aceptado: $${cash.toFixed(2)}`);
    setShowToast(true);
    setCash(undefined);
    fetchAllVending(); // 🔄 Recargar ingresos del backend
  };

  // 🔢 Calcular total de ingresos
  const calculateTotal = (): number => {
    return allVending.reduce((sum, item) => sum + item.ingreso, 0);
  };

  return (
    <IonPage>
      <IonContent fullscreen>
        <IonGrid className="ion-padding">

          {/* Total de Ingresos */}
          <IonRow className="ion-justify-content-center">
            <IonCol sizeMd="6" sizeLg="4" sizeXs="12">
              <IonCard className="dashboard-card">
                <IonCardHeader>
                  <IonIcon icon={waterOutline} size="large" color="primary" />
                  <IonCardSubtitle className="secondary-text">Total de Ingresos</IonCardSubtitle>
                </IonCardHeader>
                <IonCardContent className="total-number">
                  ${calculateTotal().toFixed(2)}
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          {/* Ingrese el Pago */}
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

          {/* Últimos Pagos (Local) */}
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
                        <IonCol>Fecha</IonCol>
                        <IonCol>Usuario</IonCol>
                        <IonCol>Monto</IonCol>
                      </IonRow>
                      {transactions.map((txn, index) => (
                        <React.Fragment key={index}>
                          <IonRow className="table-row">
                            <IonCol>{txn.date}</IonCol>
                            <IonCol>{txn.user}</IonCol>
                            <IonCol>${txn.amount.toFixed(2)}</IonCol>
                          </IonRow>
                          {index < transactions.length - 1 && <IonRow><IonCol className="divider" col-12><hr /></IonCol></IonRow>}
                        </React.Fragment>
                      ))}
                    </IonGrid>
                  )}
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

         {/* Actividad Reciente */}
         <IonRow className="ion-justify-content-center ion-margin-top">
           <IonCol sizeMd="6" sizeLg="4" sizeXs="12">
             <IonCard className="dashboard-card">
               <IonCardHeader>
                 <IonIcon icon={documentsOutline} size="large" />
                 <IonCardSubtitle>Actividad Reciente</IonCardSubtitle>
               </IonCardHeader>
               <IonCardContent>
                 {allVending.length === 0 ? (
                   <div className="timeline-item secondary-text">
                     ❌ Sin actividad — (ayer)
                   </div>
                 ) : (
                   <div className="timeline">
                     {allVending.slice(0, 3).map((item, index) => {
                       const now = new Date();
                       const time = new Date(now.getTime() - index * 3600000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                       const status = index % 3 === 0 ? '✅ Pago recibido' : index % 3 === 1 ? '🕒 En espera' : '❌ Sin actividad';
                       const color = index % 3 === 0 ? 'success' : index % 3 === 1 ? 'warning' : 'danger';
                       return (
                         <div key={index} className={`timeline-item ${color}`}>
                           <span className="timeline-icon">{index % 3 === 0 ? '✅' : index % 3 === 1 ? '🕒' : '❌'}</span>
                           <div className="timeline-content">
                             <span>{status} — ${item.ingreso.toFixed(2)} ({time})</span>
                           </div>
                           <span className="timeline-dot" style={{backgroundColor: index % 3 === 0 ? '#007BFF' : '#666'}}></span>
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

        {/* Toast de mensajes */}
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

export default POS;
