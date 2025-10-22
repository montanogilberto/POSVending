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
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonGrid,
  IonRow,
  IonCol,
  IonButton,
  IonLoading,
  IonToast,
  IonIcon,
} from '@ionic/react';
import { close } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { fetchCategories, Categories } from '../data/categories';

const Category: React.FC = () => {
  const history = useHistory();
  const [categories, setCategories] = useState<Categories[]>([]);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const fetchedCategories = await fetchCategories();
      setCategories(fetchedCategories);
      setToastMessage('Categorías cargadas.');
      setShowToast(true);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setToastMessage('Error al cargar categorías.');
      setShowToast(true);
      // Fallback to empty array
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const selectCategory = (category: Categories) => {
    // Navigate to product-selection with category in state
    history.push('/product-selection', { from: 'category', category });
    setToastMessage(`Categoría "${category.name}" seleccionada.`);
    setShowToast(true);
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent className="ion-padding">
          <IonLoading isOpen={loading} message="Cargando categorías..." />
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <IonGrid>
          <IonRow>
            {categories.map((category) => (
              <IonCol size="12" sizeMd="6" sizeLg="4" key={category.productCategoryId}>
                <IonCard button onClick={() => selectCategory(category)}>
                  {category.image && (
                    <img src={`https://smartloansbackend.azurewebsites.net${category.image}`} alt={category.name} style={{width: '100%', height: '150px', objectFit: 'cover'}} />
                  )}
                  <IonCardHeader>
                    <IonCardTitle>{category.name}</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <p>{category.name} - Selecciona para ver productos</p>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            ))}
          </IonRow>
        </IonGrid>
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

export default Category;
