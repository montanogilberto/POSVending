import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import ExploreContainer from '../components/ExploreContainer';
import './Setting.css';

const Setting: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Setting</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Setting</IonTitle>
          </IonToolbar>
        </IonHeader>
        <ExploreContainer name="Setting page" />
      </IonContent>
    </IonPage>
  );
};

export default Setting;
