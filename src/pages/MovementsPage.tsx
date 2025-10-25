import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonDatetime,
  IonGrid,
  IonRow,
  IonCol,
  IonIcon,
} from '@ionic/react';
import { waterOutline } from 'ionicons/icons';

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

const MovementsPage: React.FC = () => {
  const [allIncome, setAllIncome] = useState<Income[]>([]);
  const [filteredIncome, setFilteredIncome] = useState<Income[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');

  // 🔄 GET all_laundry
  const fetchAllLaundry = async () => {
    try {
      const response = await fetch('https://smartloansbackend.azurewebsites.net/all_income');
      if (!response.ok) throw new Error(`Error al obtener datos del backend: ${response.status}`);

      const data = await response.json();
      console.log('Fetched all_income:', data);
      // Sort by paymentDate descending (newest first)
      const sortedIncome = (data.income || []).sort((a: Income, b: Income) =>
        new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
      );
      setAllIncome(sortedIncome);
      setFilteredIncome(sortedIncome);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchAllLaundry();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      const filtered = allIncome.filter(income => {
        const incomeDate = new Date(income.paymentDate).toISOString().split('T')[0];
        return incomeDate === selectedDate;
      });
      setFilteredIncome(filtered);
    } else {
      setFilteredIncome(allIncome);
    }
  }, [selectedDate, allIncome]);

  // Group incomes by date
  const groupedIncomes = filteredIncome.reduce((groups, income) => {
    const date = new Date(income.paymentDate).toLocaleDateString('es-ES');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(income);
    return groups;
  }, {} as Record<string, Income[]>);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" />
          </IonButtons>
          <IonTitle>Movimientos</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonGrid className="ion-padding">
          <IonRow className="ion-justify-content-center">
            <IonCol sizeMd="6" sizeLg="4" sizeXs="12">
              <IonCard className="dashboard-card">
                <IonCardHeader>
                  <IonIcon icon={waterOutline} size="large" color="primary" />
                  <IonCardSubtitle>Filtrar por Fecha</IonCardSubtitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonItem>
                    <IonLabel>Seleccionar Fecha</IonLabel>
                    <IonDatetime
                      presentation="date"
                      value={selectedDate}
                      onIonChange={(e) => setSelectedDate(e.detail.value as string)}
                    />
                  </IonItem>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
          <IonRow className="ion-justify-content-center">
            <IonCol sizeMd="6" sizeLg="4" sizeXs="12">
              <IonCard className="dashboard-card">
                <IonCardHeader>
                  <IonCardSubtitle>Todos los Movimientos</IonCardSubtitle>
                </IonCardHeader>
                <IonCardContent>
                  {filteredIncome.length === 0 ? (
                    <div className="secondary-text">
                      No hay movimientos para la fecha seleccionada.
                    </div>
                  ) : (
                    <div>
                      {Object.entries(groupedIncomes).map(([date, incomes]) => (
                        <div key={date}>
                          <IonItem>
                            <IonLabel>
                              <h2>{date}</h2>
                              <p>{incomes.length} movimiento{incomes.length !== 1 ? 's' : ''}</p>
                            </IonLabel>
                          </IonItem>
                          <IonList>
                            {incomes.map((income, i) => {
                              const now = new Date(income.paymentDate);
                              const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                              return (
                                <IonItem key={i}>
                                  <IonLabel>
                                    <h3>Ingreso — ${income.total.toFixed(2)}</h3>
                                    <p>{time} — {income.paymentMethod}</p>
                                  </IonLabel>
                                </IonItem>
                              );
                            })}
                          </IonList>
                        </div>
                      ))}
                    </div>
                  )}
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default MovementsPage;
