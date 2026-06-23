import {
  IonPage,
  IonContent,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonButton,
  IonGrid,
  IonRow,
  IonCol,
  IonText,
  IonSearchbar,
  IonIcon,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
} from '@ionic/react';
import { barcodeOutline, closeOutline } from 'ionicons/icons';
import { useParams, useHistory } from 'react-router-dom';
import { getProducts } from '../../data/products';
import { Product } from '../../data/type_products';
import { useEffect, useState, useRef } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import Header from '../../components/Header';
import AlertPopover from '../../components/PopOver/AlertPopover';
import MailPopover from '../../components/PopOver/MailPopover';
import '../../styles/dashboard.css';

interface RouteParams {
  categoryId: string;
}

const ProductListPage: React.FC = () => {
  const { categoryId } = useParams<RouteParams>();
  const history = useHistory();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const hasFetched = useRef(false);
  const [popoverState, setPopoverState] = useState<{ showAlertPopover: boolean; showMailPopover: boolean; event?: Event }>({
    showAlertPopover: false,
    showMailPopover: false,
  });

  const presentAlertPopover = (e: React.MouseEvent) => setPopoverState({ ...popoverState, showAlertPopover: true, event: e.nativeEvent });
  const dismissAlertPopover = () => setPopoverState({ ...popoverState, showAlertPopover: false });
  const presentMailPopover = (e: React.MouseEvent) => setPopoverState({ ...popoverState, showMailPopover: true, event: e.nativeEvent });
  const dismissMailPopover = () => setPopoverState({ ...popoverState, showMailPopover: false });

  const categoryIdNumber = +categoryId;

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    const fetchData = async () => {
      try {
        const data = await getProducts(categoryIdNumber);
        setProducts(data);
      } catch {
        setError('No se pudieron cargar los productos.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [categoryIdNumber]);

  const handleScan = (result: string) => {
    setShowScanner(false);
    setSearchText(result);
  };

  const filteredProducts = searchText.trim()
    ? products.filter((p) => {
        const q = searchText.toLowerCase();
        return (
          p.name?.toLowerCase().includes(q) ||
          p.code?.toLowerCase().includes(q) ||
          p.barCode?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
        );
      })
    : products;

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
        screenTitle="Productos"
        showBackButton={true}
        backButtonText="Categoria Productos"
        backButtonHref="/Category"
      />

      <IonContent fullscreen className="dashboard-content">
        <div className="dashboard-container">

          {/* Search + Scan bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
            <IonSearchbar
              value={searchText}
              onIonInput={(e) => setSearchText(e.detail.value ?? '')}
              placeholder="Buscar por nombre, código o QR..."
              debounce={200}
              style={{ flex: 1, '--border-radius': '12px' }}
            />
            <IonButton
              fill="outline"
              shape="round"
              style={{ minWidth: '48px', minHeight: '48px' }}
              onClick={() => setShowScanner(true)}
            >
              <IonIcon icon={barcodeOutline} style={{ fontSize: '24px' }} />
            </IonButton>
          </div>

          {/* Products List */}
          <div className="dashboard-card">
            <IonCardHeader>
              <IonCardSubtitle>
                {searchText ? `${filteredProducts.length} resultado(s) para "${searchText}"` : 'Productos Disponibles'}
              </IonCardSubtitle>
            </IonCardHeader>
            <IonCardContent style={{ padding: '16px 24px' }}>
              {error && <p style={{ padding: '16px 0' }}>{error}</p>}

              {filteredProducts.length > 0 ? (
                <IonGrid style={{ padding: 0 }}>
                  {filteredProducts.map((product) => (
                    <IonRow key={product.productId}>
                      <IonCol>
                        <IonCard button={true} onClick={() => history.push(`/products/${product.productId}`, { product })}>
                          <IonCardContent style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ flex: 1 }}>
                                <h3 style={{ margin: 0, color: '#111827', fontSize: '18px', fontWeight: 'bold' }}>
                                  {product.name}
                                </h3>
                                <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
                                  {product.description}
                                </p>
                                {product.barCode && (
                                  <p style={{ margin: '2px 0 0 0', color: '#9ca3af', fontSize: '12px' }}>
                                    # {product.barCode}
                                  </p>
                                )}
                              </div>
                              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <p style={{ margin: 0, color: '#2563eb', fontSize: '16px', fontWeight: 'bold' }}>
                                  {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
                                    product.details && product.details.length > 0
                                      ? product.details[0].salePrice
                                      : 0
                                  )}
                                </p>
                                <IonText color="primary" style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                                  Ver detalles
                                </IonText>
                              </div>
                            </div>
                          </IonCardContent>
                        </IonCard>
                      </IonCol>
                    </IonRow>
                  ))}
                </IonGrid>
              ) : (
                <p style={{ padding: '16px 0' }}>
                  {searchText ? 'No se encontraron productos con ese código o nombre.' : 'No hay productos en esta categoría.'}
                </p>
              )}
            </IonCardContent>
          </div>
        </div>
      </IonContent>

      {/* QR / Barcode Scanner Modal */}
      <IonModal isOpen={showScanner} onDidDismiss={() => setShowScanner(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Escanear código</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowScanner(false)}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          {showScanner && (
            <Scanner
              onScan={(results) => {
                if (results?.[0]?.rawValue) handleScan(results[0].rawValue);
              }}
              styles={{ container: { height: '100%' } }}
            />
          )}
        </IonContent>
      </IonModal>

      <AlertPopover isOpen={popoverState.showAlertPopover} event={popoverState.event} onDidDismiss={dismissAlertPopover} />
      <MailPopover isOpen={popoverState.showMailPopover} event={popoverState.event} onDidDismiss={dismissMailPopover} />
    </IonPage>
  );
};

export default ProductListPage;
