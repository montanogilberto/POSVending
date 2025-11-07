import {
  IonPage,
  IonContent,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonButton,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/react';
import { useParams, useHistory } from 'react-router-dom';
import { getProducts } from '../../data/products';
import { Product } from '../../data/type_products';
import { useEffect, useState, useRef } from 'react';
import Header from '../../components/Header';
import AlertPopover from '../../components/PopOver/AlertPopover';
import MailPopover from '../../components/PopOver/MailPopover';

interface RouteParams {
  categoryId: string;
}

const ProductListPage: React.FC = () => {
  const { categoryId } = useParams<RouteParams>();
  const history = useHistory();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);
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

  const categoryIdNumber = +categoryId;

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchData = async () => {
      try {
        const data = await getProducts(categoryIdNumber);
        setProducts(data);
      } catch (error) {
        setError('No se pudieron cargar los productos.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [categoryIdNumber]);

  // Since we're now fetching products by category, no need to filter
  const filteredProducts = products;

  if (loading) {
    return (
      <IonPage>
        <Header
          presentAlertPopover={presentAlertPopover}
          presentMailPopover={presentMailPopover}
          screenTitle=""
          showBackButton={true}
          backButtonText="Categorías"
          backButtonHref="/Category"
        />
        <IonContent className="ion-padding">
          <p>Cargando productos...</p>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <Header
        presentAlertPopover={presentAlertPopover}
        presentMailPopover={presentMailPopover}
        screenTitle=""
        showBackButton={true}
        backButtonText="Categorías"
        backButtonHref="/Category"
      />

      <IonContent>
        <IonGrid className="ion-padding">
          <IonRow className="ion-justify-content-center">
            <IonCol sizeMd="6" sizeLg="4" sizeXs="12">
              <IonCard className="dashboard-card">
                <IonCardHeader>
                  <IonCardSubtitle>Productos Disponibles</IonCardSubtitle>
                </IonCardHeader>
                <IonCardContent style={{ padding: '16px 24px' }}>
                  {error && <p style={{ padding: '16px 0' }}>{error}</p>}

                  {filteredProducts.length > 0 ? (
                    <div>
                      {filteredProducts.map((product, index) => (
                        <div
                          key={product.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '16px 0',
                            borderBottom: index < filteredProducts.length - 1 ? '1px solid #e5e7eb' : 'none',
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <h3 style={{ margin: 0, color: '#111827', fontSize: '18px', fontWeight: 'bold' }}>
                              {product.name}
                            </h3>
                            <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
                              {product.description}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <p style={{ margin: 0, color: '#2563eb', fontSize: '16px', fontWeight: 'bold' }}>
                              {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(product.price)}
                            </p>
                            <IonButton
                              fill="clear"
                              color="primary"
                              style={{ textTransform: 'uppercase', fontWeight: 'bold' }}
                              onClick={() => {
                                history.push(`/products/${product.id}`, { product });
                              }}
                            >
                              Ver detalles
                            </IonButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ padding: '16px 0' }}>No hay productos en esta categoría.</p>
                  )}
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>

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
    </IonPage>
  );
};

export default ProductListPage;
