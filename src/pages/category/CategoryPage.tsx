import { IonPage, IonContent, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonButtons, IonButton, IonIcon, IonImg, IonCardTitle } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { fetchCategories, Categories } from '../../data/categories';
import { useLocation } from 'react-router-dom';
import { IonLoading } from '@ionic/react';
import Header from '../../components/layout/Header';
import AlertPopover from '../../components/popovers/AlertPopover';
import MailPopover from '../../components/popovers/MailPopover';
import { usePopovers } from '../../hooks/usePopovers';
import '../../styles/dashboard.css';
import './CategoryPage.css';

const CategoryPage: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const [categories, setCategories] = useState<Categories[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);
  const pops = usePopovers();

  // Check if we're in expense mode based on the route
  const isExpenseMode = location.pathname.startsWith('/expense-');

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const loadCategories = async () => {
      try {
        setLoading(true);
        const fetchedCategories = await fetchCategories();
        setCategories(fetchedCategories);
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  if (loading) {
    return (
      <IonPage>
        <IonContent className="ion-padding">
          <IonLoading isOpen={loading} message="Cargando categorías...." />
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <Header {...pops.headerProps} screenTitle="Categorías" />
      <IonContent fullscreen className="dashboard-content">
        <div className="dashboard-container">
          {/* Header */}
          <div className="dashboard-header-section">
            <h1 className="dashboard-title">{isExpenseMode ? 'Categorías de Egresos' : 'Categorías'}</h1>
          </div>

          {/* Categories Grid */}
          <div className="dashboard-card">
            <IonCardHeader>
              <IonCardSubtitle>{isExpenseMode ? 'Categorías de Egresos Disponibles' : 'Categorías Disponibles'}</IonCardSubtitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="category-pick-list">
                {categories.map((category, index) => (
                  <IonCard
                    button
                    key={category.categoryId || index}
                    className="category-pick-card"
                    onClick={() => {
                      const route = isExpenseMode
                        ? `/expense-products/${category.categoryId}`
                        : `/product/${category.categoryId}`;
                      history.push(route);
                    }}
                  >
                    <div className="category-pick-row">
                      <div className="category-pick-thumb">
                        <IonImg src={category.image} />
                      </div>
                      <IonCardTitle className="category-pick-title">{category.name}</IonCardTitle>
                    </div>
                  </IonCard>
                ))}
              </div>
            </IonCardContent>
          </div>
        </div>
      </IonContent>

      <AlertPopover {...pops.alertPopoverProps} />
      <MailPopover {...pops.mailPopoverProps} />
    </IonPage>
  );
};

export default CategoryPage;