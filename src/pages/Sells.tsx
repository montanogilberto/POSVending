import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import ExploreContainer from '../components/ExploreContainer';
import './Sells.css';

const Sells: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Sells</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Sells</IonTitle>
          </IonToolbar>
        </IonHeader>
        <ExploreContainer name="Sells page" />
      </IonContent>
    </IonPage>
  );
};

export default Sells;
