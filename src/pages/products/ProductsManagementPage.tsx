import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  IonPage,
  IonContent,
  IonSearchbar,
  IonFab,
  IonFabButton,
  IonIcon,
  IonAlert,
  IonLoading,
  IonChip,
  IonButton,
  IonToast,
  useIonViewWillEnter,
} from '@ionic/react';
import { add, trash, pencil, funnelOutline, swapVerticalOutline, refreshOutline } from 'ionicons/icons';
import Header from '../../components/layout/Header';
import AlertPopover from '../../components/popovers/AlertPopover';
import MailPopover from '../../components/popovers/MailPopover';
import { usePopovers } from '../../hooks/usePopovers';
import { useToast } from '../../hooks/useToast';
import { onDataChanged, notifyDataChanged } from '../../utils/refreshBus';
import StatusBadge from '../../components/ui/StatusBadge';
import { PRODUCT_STATUS } from '../../components/ui/statusMaps';
import { fmtMXN } from '../../utils/format';
import ProductForm from '../../components/pos/ProductForm';
import ProductWizard from '../../components/pos/productWizard/ProductWizard';
import { useProduct } from '../../contexts/ProductContext';
import CategoryChips from '../../components/pos/CategoryChips';
import { useProductCategories, categoryIdsFor } from '../../hooks/useProductCategories';
import { Product } from '../../data/type_products';
import './ProductsManagementPage.css';

type FilterType = 'all' | 'withBarcode' | 'noCategory' | 'supplies' | 'inactive';

/** Admin list: supplies (bought, never sold) and deactivated products included. */
const ADMIN_LIST = { includeInactive: true, includeSupplies: true };
/** SQL bits arrive as true/false (FOR JSON) or 1/0 / '1'/'0' from older SPs. */
const isOn = (v: unknown) => v === true || v === 1 || v === '1';
const isInactive = (p: Product) => p.isActive !== undefined && p.isActive !== null && !isOn(p.isActive);

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'withBarcode', label: 'Con código de barras' },
  { value: 'noCategory', label: 'Sin categoría' },
  { value: 'supplies', label: 'Insumos' },
  { value: 'inactive', label: 'Inactivos' },
];

const ProductsManagementPage: React.FC = () => {
  const {
    productsList,
    productsDetail,
    loading,
    error,
    fetchProducts,
    fetchProductById,
    setProductActive,
  } = useProduct();
  const { showToast, toastProps } = useToast();

  // ── UI state ──────────────────────────────────────────────────────────
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  /** Product being deactivated/reactivated: drives the overlay text and blocks repeats. */
  const [statusBusy, setStatusBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [wizardMode, setWizardMode] = useState<'create' | 'view' | 'edit'>('create');
  const pendingEditProductIdRef = useRef<number | null>(null);

  // ── Search / filter / sort state ──────────────────────────────────────
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortAsc, setSortAsc] = useState(true);
  // Same category chips as the POS product list (/product). null = all.
  const { categories, reload: reloadCategories } = useProductCategories();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // ── Popover state ─────────────────────────────────────────────────────
  const pops = usePopovers();

  // ── Data fetch ────────────────────────────────────────────────────────
  const load = useCallback(() => {
    console.log('[Products][Management] load -> fetchProducts', ADMIN_LIST);
    return fetchProducts(ADMIN_LIST);
  }, [fetchProducts]);

  // Ionic keeps the page mounted: reload on every entry and after any mutation
  // elsewhere (e.g. a supply created from Nuevo Egreso emits 'product-created').
  useIonViewWillEnter(() => { void load(); });
  useEffect(() => onDataChanged(() => { void load(); }), [load]);

  useEffect(() => {
    console.log('[Products][Management] state:productsList', {
      count: productsList.length,
      ids: productsList.map((p) => p.productId),
    });
  }, [productsList]);

  useEffect(() => {
    console.log('[Products][Management] state:loading/error', { loading, error });
  }, [loading, error]);

  useEffect(() => {
    const pendingId = pendingEditProductIdRef.current;
    if (!pendingId || !productsDetail || productsDetail.productId !== pendingId) return;

    console.log('[Products][Management] action:edit:full-detail-loaded', {
      productId: productsDetail.productId,
      optionsCount: (productsDetail as any).productOptions?.length ?? productsDetail.options?.length ?? 0,
      detailsCount: (productsDetail as any).productDetails?.length ?? productsDetail.details?.length ?? 0,
      descriptionsCount: (productsDetail as any).productDescriptions?.length ?? productsDetail.descriptions?.length ?? 0,
    });

    setEditingProduct(productsDetail as Product);
    pendingEditProductIdRef.current = null;
  }, [productsDetail]);

  // ── CRUD handlers ─────────────────────────────────────────────────────
  const handleDelete = (product: Product) => {
    console.log('[Products][Management] action:deactivate:open-confirm', {
      productId: product.productId,
      name: product.name,
    });
    setSelectedProduct(product);
    setShowDeleteAlert(true);
  };

  const changeActive = async (product: Product, active: boolean) => {
    if (statusBusy) return;
    console.log('[Products][Management] action:set-active', { productId: product.productId, active });
    setStatusBusy(true);
    try {
      await setProductActive(product.productId, active);
      notifyDataChanged(active ? 'product-reactivated' : 'product-deactivated');
      showToast(active ? `«${product.name}» se reactivó.` : `«${product.name}» se desactivó.`, 'success');
    } catch (e) {
      console.error('[Products][Management] action:set-active:error', { productId: product.productId, error: e });
      showToast(e instanceof Error ? e.message : 'No se pudo actualizar el producto.', 'danger');
    } finally {
      setStatusBusy(false);
    }
  };

  const confirmDelete = async () => {
    const product = selectedProduct;
    setShowDeleteAlert(false);
    setSelectedProduct(null);
    if (product) await changeActive(product, false);
  };

  const handleCreate = () => {
    console.log('[Products][Management] action:create:open-wizard');
    setEditingProduct(null);
    setWizardMode('create');
    setShowWizard(true);
  };

  const handleEdit = async (product: Product) => {
    const resolvedProductId = Number((product as any)?.productId ?? (product as any)?.id ?? 0);

    if (!Number.isFinite(resolvedProductId) || resolvedProductId <= 0) {
      console.warn('[Products][Management] action:edit:invalid-product-id', {
        product,
      });
      return;
    }

    console.log('[Products][Management] action:edit:open-wizard', {
      productId: resolvedProductId,
      name: product.name,
    });

    const normalizedProduct = { ...product, productId: resolvedProductId } as Product;
    pendingEditProductIdRef.current = resolvedProductId;
    setEditingProduct(normalizedProduct);
    setWizardMode('edit');
    setShowWizard(true);

    try {
      await fetchProductById(resolvedProductId);
    } catch (e) {
      console.error('[Products][Management] action:edit:fetch-full:error', {
        productId: resolvedProductId,
        error: e,
      });
    }
  };

  const handleOpenDetails = async (product: Product) => {
    const resolvedProductId = Number((product as any)?.productId ?? (product as any)?.id ?? 0);

    if (!Number.isFinite(resolvedProductId) || resolvedProductId <= 0) {
      console.warn('[Products][Management] action:details:invalid-product-id', {
        product,
      });
      return;
    }

    console.log('[Products][Management] action:details:open-from-card:view-mode', {
      productId: resolvedProductId,
      name: product.name,
    });

    const normalizedProduct = { ...product, productId: resolvedProductId } as Product;
    pendingEditProductIdRef.current = resolvedProductId;
    setEditingProduct(normalizedProduct);
    setWizardMode('view');
    setShowWizard(true);

    try {
      await fetchProductById(resolvedProductId);
    } catch (e) {
      console.error('[Products][Management] action:details:fetch-full:error', {
        productId: resolvedProductId,
        error: e,
      });
    }
  };

  const handleFormClose = () => {
    console.log('[Products][Management] action:form:close', {
      hadEditingProduct: Boolean(editingProduct),
      editingProductId: editingProduct?.productId,
    });
    setShowForm(false);
    setEditingProduct(null);
    setWizardMode('create');
  };

  const handleWizardClose = () => {
    console.log('[Products][Management] action:wizard:close', {
      hadEditingProduct: Boolean(editingProduct),
      editingProductId: editingProduct?.productId,
    });
    pendingEditProductIdRef.current = null;
    setShowWizard(false);
    setEditingProduct(null);
    setWizardMode('create');
  };

  // ── Filtered + sorted product list ────────────────────────────────────
  const filteredProducts = useMemo(() => {
    console.log('[Products][Management] compute:filteredProducts:start', {
      totalProducts: productsList.length,
      searchText,
      activeFilter,
      sortAsc,
    });

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

    // Category chips (a category includes its subcategories)
    const categoryIds = categoryIdsFor(selectedCategoryId, categories);
    if (categoryIds) {
      result = result.filter((p) => categoryIds.has(Number(p.categoryId)));
    }

    // Chip filter. Inactive products only show under "Inactivos".
    if (activeFilter === 'inactive') {
      result = result.filter(isInactive);
    } else {
      result = result.filter((p) => !isInactive(p));
    }
    if (activeFilter === 'supplies') {
      result = result.filter((p) => isOn(p.isSupply));
    } else if (activeFilter === 'withBarcode') {
      result = result.filter((p) => p.barCode && p.barCode.trim() !== '');
    } else if (activeFilter === 'noCategory') {
      result = result.filter((p) => !p.categoryId || p.categoryId === 0);
    }

    // Sort by name
    result.sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, 'es');
      return sortAsc ? cmp : -cmp;
    });

    console.log('[Products][Management] compute:filteredProducts:end', {
      visibleCount: result.length,
    });
    return result;
  }, [productsList, searchText, activeFilter, sortAsc, selectedCategoryId, categories]);

  // ── Helpers ───────────────────────────────────────────────────────────
  return (
    <IonPage>
      <Header
        {...pops.headerProps}
        screenTitle="Productos"
        showBackButton={true}
        backButtonText="Menú"
        backButtonHref="/dashboard"
      />

      <IonContent className="products-content">
        <IonLoading isOpen={loading || statusBusy} message={statusBusy ? 'Actualizando producto...' : 'Cargando productos...'} />

        {/* ── Search & Filter Section ── */}
        <div className="products-search-section">
          <CategoryChips
            categories={categories}
            selectedId={selectedCategoryId}
            onSelect={(id) => {
              setSelectedCategoryId(id);
              // "Sin categoría" and a category are mutually exclusive.
              if (id !== null && activeFilter === 'noCategory') setActiveFilter('all');
            }}
          />

          {/* Search bar + icon buttons row */}
          <div className="products-search-row">
            <IonSearchbar
              className="products-searchbar"
              placeholder="Buscar por nombre, código o código de barras"
              value={searchText}
              onIonInput={(e) => {
                const value = e.detail.value ?? '';
                console.log('[Products][Management] action:search', { value });
                setSearchText(value);
              }}
              debounce={200}
              animated={false}
            />
            <button
              className={`products-icon-btn${sortAsc ? '' : ' active'}`}
              onClick={() =>
                setSortAsc((prev) => {
                  const next = !prev;
                  console.log('[Products][Management] action:toggle-sort', { previous: prev, next });
                  return next;
                })
              }
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
            {FILTERS.map((f) => (
              <IonChip
                key={f.value}
                className={`products-chip${activeFilter === f.value ? ' active' : ''}`}
                onClick={() => {
                  console.log('[Products][Management] action:set-filter', { filter: f.value });
                  setActiveFilter(f.value);
                  // "Sin categoría" and a category are mutually exclusive.
                  if (f.value === 'noCategory') setSelectedCategoryId(null);
                }}
              >
                {f.label}
              </IonChip>
            ))}
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
              <p>{activeFilter === 'inactive' ? 'No hay productos inactivos' : 'No se encontraron productos'}</p>
              <span>
                {searchText.trim()
                  ? 'Intenta con otro término de búsqueda'
                  : activeFilter === 'inactive'
                    ? 'Los productos que desactives aparecerán aquí para reactivarlos.'
                    : activeFilter === 'supplies'
                      ? 'Los insumos se crean al registrar un egreso con ticket.'
                      : 'Agrega tu primer producto con el botón +'}
              </span>
            </div>
          ) : (
            filteredProducts.map((product, index) => {
              const inactive = isInactive(product);
              return (
              <div key={product.productId ?? `${product.code || product.name || 'product'}-${index}`} className={`product-card${inactive ? ' inactive' : ''}`}>
                <div className="product-card-body">
                  {/* ── Left: info ── */}
                  <div
                    className="product-card-info"
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenDetails(product)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        void handleOpenDetails(product);
                      }
                    }}
                    aria-label={`Abrir detalles de ${product.name}`}
                  >
                    <h3 className="product-name">{product.name}</h3>
                    {(isOn(product.isSupply) || inactive) && (
                      <div className="product-status-row">
                        {isOn(product.isSupply) && <StatusBadge status="supply" map={PRODUCT_STATUS} />}
                        {inactive && <StatusBadge status="inactive" map={PRODUCT_STATUS} />}
                      </div>
                    )}

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
                            {fmtMXN(product.details[0].salePrice)}
                          </span>
                        </span>
                        <span className="product-detail-badge stock">
                          <span className="detail-label">Stock</span>
                          <span className="detail-value">
                            {product.stockQuantity ?? product.details[0].stockQuantity}
                            {product.stockUnit && product.stockUnit !== 'pz' ? ` ${product.stockUnit}` : ''}
                          </span>
                        </span>
                        {product.details[0].unitPrice !== product.details[0].salePrice && (
                          <span className="product-detail-badge unit-price">
                            <span className="detail-label">Costo</span>
                            <span className="detail-value">
                              {fmtMXN(product.details[0].unitPrice)}
                            </span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ── Right: action buttons ── */}
                  <div className="product-card-actions">
                    {inactive ? (
                      <IonButton
                        fill="clear"
                        className="product-action-btn restore"
                        disabled={statusBusy}
                        onClick={(e) => {
                          e.stopPropagation();
                          void changeActive(product, true);
                        }}
                        title="Reactivar producto"
                        aria-label="Reactivar"
                      >
                        <IonIcon slot="icon-only" icon={refreshOutline} />
                      </IonButton>
                    ) : (
                      <>
                        <IonButton
                          fill="clear"
                          className="product-action-btn edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleEdit(product);
                          }}
                          title="Editar producto"
                          aria-label="Editar"
                        >
                          <IonIcon slot="icon-only" icon={pencil} />
                        </IonButton>
                        <IonButton
                          fill="clear"
                          className="product-action-btn delete"
                          disabled={statusBusy}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(product);
                          }}
                          title="Desactivar producto"
                          aria-label="Desactivar"
                        >
                          <IonIcon slot="icon-only" icon={trash} />
                        </IonButton>
                      </>
                    )}
                  </div>
                </div>
              </div>
              );
            })
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
          onDidDismiss={() => {
            console.log('[Products][Management] action:delete-alert:dismiss');
            setShowDeleteAlert(false);
          }}
          header="Desactivar producto"
          message={`"${selectedProduct?.name}" dejará de aparecer en el POS, en los tickets y en Nuevo Egreso. Su historial se conserva y puedes reactivarlo desde el filtro "Inactivos".`}
          buttons={[
            {
              text: 'Cancelar',
              role: 'cancel',
              handler: () => {
                console.log('[Products][Management] action:delete:cancel');
                setShowDeleteAlert(false);
              },
            },
            {
              text: 'Desactivar',
              role: 'destructive',
              handler: () => { void confirmDelete(); },
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
          onSuccess={() => { void load(); reloadCategories(); }}
          product={editingProduct}
          mode={wizardMode}
        />
      </IonContent>

      <IonToast {...toastProps} />
      <AlertPopover {...pops.alertPopoverProps} />
      <MailPopover {...pops.mailPopoverProps} />
    </IonPage>
  );
};

export default ProductsManagementPage;
