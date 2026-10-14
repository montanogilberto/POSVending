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
import { barcodeOutline, closeOutline, swapVerticalOutline } from 'ionicons/icons';
import { useParams, useHistory } from 'react-router-dom';
import { getProducts } from '../../data/products';
import { Product } from '../../data/type_products';
import { useEffect, useState, useRef } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import Header from '../../components/layout/Header';
import AlertPopover from '../../components/popovers/AlertPopover';
import MailPopover from '../../components/popovers/MailPopover';
import { usePopovers } from '../../hooks/usePopovers';
import '../../styles/dashboard.css';
import './ProductListPage.css';

type SortOrder = 'az' | 'za';

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
  const [sortOrder, setSortOrder] = useState<SortOrder>('az');
  const hasFetched = useRef(false);
  const pops = usePopovers();

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

  // Accent/case-insensitive so "Árbol" sorts with the A's.
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const cmp = (a.name ?? '').localeCompare(b.name ?? '', 'es', { sensitivity: 'base' });
    return sortOrder === 'az' ? cmp : -cmp;
  });

  if (loading) {
    return (
      <IonPage>
        <Header
          {...pops.headerProps}
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
        {...pops.headerProps}
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
            {/* One-tap toggle instead of a segment row — vertical space is
                scarce on small phones. */}
            <IonButton
              fill="outline"
              shape="round"
              className="product-sort-toggle"
              aria-label={sortOrder === 'az' ? 'Orden A-Z, cambiar a Z-A' : 'Orden Z-A, cambiar a A-Z'}
              onClick={() => setSortOrder(sortOrder === 'az' ? 'za' : 'az')}
            >
              <IonIcon slot="start" icon={swapVerticalOutline} />
              {sortOrder === 'az' ? 'A-Z' : 'Z-A'}
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

              {sortedProducts.length > 0 ? (
                <IonGrid style={{ padding: 0 }}>
                  {sortedProducts.map((product) => (
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

      <AlertPopover {...pops.alertPopoverProps} />
      <MailPopover {...pops.mailPopoverProps} />
    </IonPage>
  );
};

export default ProductListPage;
