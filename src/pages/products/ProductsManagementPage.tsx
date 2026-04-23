import React, { useState, useEffect, useMemo } from 'react';
import {
  IonPage,
  IonContent,
  IonSearchbar,
  IonFab,
  IonFabButton,
  IonIcon,
  IonAlert,
  IonLoading,
} from '@ionic/react';
import { add, trash, pencil, funnelOutline, swapVerticalOutline } from 'ionicons/icons';
import Header from '../../components/Header';
import AlertPopover from '../../components/PopOver/AlertPopover';
import MailPopover from '../../components/PopOver/MailPopover';
import ProductForm from '../../components/ProductForm';
import ProductWizard from '../../components/ProductWizard/ProductWizard';
import { useProduct } from '../../context/ProductContext';
import { Product } from '../../data/type_products';
import './ProductsManagementPage.css';

type FilterType = 'all' | 'withBarcode' | 'noCategory';

const ProductsManagementPage: React.FC = () => {
  const { productsList, loading, error, fetchProducts, removeProduct } = useProduct();

  // ── UI state ──────────────────────────────────────────────────────────
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // ── Search / filter / sort state ──────────────────────────────────────
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortAsc, setSortAsc] = useState(true);

  // ── Popover state ─────────────────────────────────────────────────────
  const [popoverState, setPopoverState] = useState<{
    showAlertPopover: boolean;
    showMailPopover: boolean;
    event?: Event;
  }>({ showAlertPopover: false, showMailPopover: false });

  // ── Data fetch ────────────────────────────────────────────────────────
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ── Popover handlers ──────────────────────────────────────────────────
  const presentAlertPopover = (e: React.MouseEvent) =>
    setPopoverState({ ...popoverState, showAlertPopover: true, event: e.nativeEvent });
  const dismissAlertPopover = () =>
    setPopoverState({ ...popoverState, showAlertPopover: false });
  const presentMailPopover = (e: React.MouseEvent) =>
    setPopoverState({ ...popoverState, showMailPopover: true, event: e.nativeEvent });
  const dismissMailPopover = () =>
    setPopoverState({ ...popoverState, showMailPopover: false });

  // ── CRUD handlers ─────────────────────────────────────────────────────
  const handleDelete = (product: Product) => {
    setSelectedProduct(product);
    setShowDeleteAlert(true);
  };

  const confirmDelete = async () => {
    if (selectedProduct) {
      await removeProduct(selectedProduct.productId);
      setSelectedProduct(null);
    }
    setShowDeleteAlert(false);
  };

  const handleCreate = () => {
    setEditingProduct(null);
    setShowWizard(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingProduct(null);
  };

  const handleWizardClose = () => {
    setShowWizard(false);
  };

  // ── Filtered + sorted product list ────────────────────────────────────
  const filteredProducts = useMemo(() => {
    let result = [...productsList];

    // Text search: name, code, barcode
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.code && p.code.toLowerCase().includes(q)) ||
          (p.barCode && p.barCode.toLowerCase().includes(q))
      );
    }

    // Chip filter
    if (activeFilter === 'withBarcode') {
      result = result.filter((p) => p.barCode && p.barCode.trim() !== '');
    } else if (activeFilter === 'noCategory') {
      result = result.filter((p) => !p.categoryId || p.categoryId === 0);
    }

    // Sort by name
    result.sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, 'es');
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [productsList, searchText, activeFilter, sortAsc]);

  // ── Helpers ───────────────────────────────────────────────────────────
  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(price);

  return (
    <IonPage>
      <Header
        presentAlertPopover={presentAlertPopover}
        presentMailPopover={presentMailPopover}
        screenTitle="Productos"
        showBackButton={true}
        backButtonText="Menú"
        backButtonHref="/laundry"
      />

      <IonContent className="products-content">
        <IonLoading isOpen={loading} message="Cargando productos..." />

        {/* ── Search & Filter Section ── */}
        <div className="products-search-section">
          {/* Search bar + icon buttons row */}
          <div className="products-search-row">
            <IonSearchbar
              className="products-searchbar"
              placeholder="Buscar por nombre, código o código de barras"
              value={searchText}
              onIonInput={(e) => setSearchText(e.detail.value ?? '')}
              debounce={200}
              animated={false}
            />
            <button
              className={`products-icon-btn${sortAsc ? '' : ' active'}`}
              onClick={() => setSortAsc((prev) => !prev)}
              title={sortAsc ? 'Orden A→Z' : 'Orden Z→A'}
              aria-label="Cambiar orden"
            >
              <IonIcon icon={swapVerticalOutline} />
            </button>
            <button
              className="products-icon-btn"
              title="Filtros"
              aria-label="Filtros"
            >
              <IonIcon icon={funnelOutline} />
            </button>
          </div>

          {/* Filter chips */}
          <div className="products-chips-row">
            <button
              className={`products-chip${activeFilter === 'all' ? ' active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              Todos
            </button>
            <button
              className={`products-chip${activeFilter === 'withBarcode' ? ' active' : ''}`}
              onClick={() => setActiveFilter('withBarcode')}
            >
              Con código de barras
            </button>
            <button
              className={`products-chip${activeFilter === 'noCategory' ? ' active' : ''}`}
              onClick={() => setActiveFilter('noCategory')}
            >
              Sin categoría
            </button>
          </div>
        </div>

        {/* ── Results count ── */}
        {!loading && (
          <p className="products-results-count">
            {filteredProducts.length}{' '}
            {filteredProducts.length === 1 ? 'producto' : 'productos'}
            {searchText.trim() ? ` para "${searchText.trim()}"` : ''}
          </p>
        )}

        {/* ── Error banner ── */}
        {error && (
          <div className="products-error">⚠️ {error}</div>
        )}

        {/* ── Product list ── */}
        <div className="products-list">
          {!loading && filteredProducts.length === 0 ? (
            <div className="products-empty">
              <div className="products-empty-icon">📦</div>
              <p>No se encontraron productos</p>
              <span>
                {searchText.trim()
                  ? 'Intenta con otro término de búsqueda'
                  : 'Agrega tu primer producto con el botón +'}
              </span>
            </div>
          ) : (
            filteredProducts.map((product, index) => (
              <div key={product.productId || index} className="product-card">
                <div className="product-card-body">
                  {/* ── Left: info ── */}
                  <div className="product-card-info">
                    <h3 className="product-name">{product.name}</h3>

                    {product.description && (
                      <p className="product-description">{product.description}</p>
                    )}

                    {/* Metadata badges */}
                    <div className="product-meta-row">
                      <span className="product-meta-badge">
                        <span className="meta-label">Código</span>
                        <span className={`meta-value${!product.code ? ' empty' : ''}`}>
                          {product.code || '—'}
                        </span>
                      </span>

                      <span className="product-meta-badge">
                        <span className="meta-label">Barras</span>
                        <span className={`meta-value${!product.barCode ? ' empty' : ''}`}>
                          {product.barCode || '—'}
                        </span>
                      </span>

                      <span className="product-meta-badge">
                        <span className="meta-label">Categoría</span>
                        <span className={`meta-value${!product.categoryId ? ' empty' : ''}`}>
                          {product.category?.name || (product.categoryId ? `#${product.categoryId}` : '—')}
                        </span>
                      </span>
                    </div>

                    {/* Optional: price / stock details row */}
                    {product.details && product.details.length > 0 && (
                      <div className="product-details-row">
                        <span className="product-detail-badge price">
                          <span className="detail-label">Precio</span>
                          <span className="detail-value">
                            {formatPrice(product.details[0].salePrice)}
                          </span>
                        </span>
                        <span className="product-detail-badge stock">
                          <span className="detail-label">Stock</span>
                          <span className="detail-value">
                            {product.details[0].stockQuantity}
                          </span>
                        </span>
                        {product.details[0].unitPrice !== product.details[0].salePrice && (
                          <span className="product-detail-badge unit-price">
                            <span className="detail-label">Costo</span>
                            <span className="detail-value">
                              {formatPrice(product.details[0].unitPrice)}
                            </span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ── Right: action buttons ── */}
                  <div className="product-card-actions">
                    <button
                      className="product-action-btn edit"
                      onClick={() => handleEdit(product)}
                      title="Editar producto"
                      aria-label="Editar"
                    >
                      <IonIcon icon={pencil} />
                    </button>
                    <button
                      className="product-action-btn delete"
                      onClick={() => handleDelete(product)}
                      title="Eliminar producto"
                      aria-label="Eliminar"
                    >
                      <IonIcon icon={trash} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Spacer so last card isn't hidden behind FAB */}
        <div style={{ height: '88px' }} />

        {/* ── Floating Action Button ── */}
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={handleCreate} className="products-fab">
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        {/* ── Delete confirmation alert ── */}
        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Eliminar producto"
          message={`¿Estás seguro de que quieres eliminar "${selectedProduct?.name}"? Esta acción no se puede deshacer.`}
          buttons={[
            {
              text: 'Cancelar',
              role: 'cancel',
              handler: () => setShowDeleteAlert(false),
            },
            {
              text: 'Eliminar',
              role: 'destructive',
              handler: confirmDelete,
            },
          ]}
        />

        {/* ── Product create / edit form ── */}
        <ProductForm
          isOpen={showForm}
          onClose={handleFormClose}
          product={editingProduct}
        />

        <ProductWizard
          isOpen={showWizard}
          onClose={handleWizardClose}
          onSuccess={fetchProducts}
        />
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

export default ProductsManagementPage;
