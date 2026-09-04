import React from 'react';
import { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent } from '@ionic/react';
import { closeOutline } from 'ionicons/icons';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { ExpensesVM } from '../ExpensesLogic';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Props {
  vm: ExpensesVM;
}

const ExpensesTrendsModal: React.FC<Props> = ({ vm }) => (
  <IonModal isOpen={vm.showTrendsModal} onDidDismiss={() => vm.setShowTrendsModal(false)}>
    <IonHeader>
      <IonToolbar>
        <IonTitle>Tendencia de Egresos (12 meses)</IonTitle>
        <IonButtons slot="end">
          <IonButton onClick={() => vm.setShowTrendsModal(false)}>
            <IonIcon icon={closeOutline} slot="icon-only" />
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>
    <IonContent className="ion-padding">
      {vm.trendsData && (
        <Bar
          data={vm.trendsData}
          options={{
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } },
          }}
        />
      )}
    </IonContent>
  </IonModal>
);

export default ExpensesTrendsModal;
