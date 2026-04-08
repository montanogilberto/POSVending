import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  IonPage,
  IonContent,
  IonCard,
  IonCardTitle,
  IonImg,
  IonLoading,
  IonButton,
  IonIcon,
  IonAlert,
  IonFab,
  IonFabButton,
  IonModal,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonSearchbar,
} from '@ionic/react';
import { pencil, trash, add, camera, pricetagOutline } from 'ionicons/icons';
import { fetchCategories, Category, createCategory, updateCategory, deleteCategory } from '../../api/categoriesApi';
import { saveImage } from '../../api/saveImageApi';
import Header from '../../components/Header';
import AlertPopover from '../../components/PopOver/AlertPopover';
import MailPopover from '../../components/PopOver/MailPopover';
import { useUser } from '../../components/UserContext';
import './CategoriesPage.css';

interface LocalCategory {
  id: number;
  name: string;
  description: string;
  image: string;
  productsCount?: number;
}

type CategoryFilter = 'all' | 'withImage' | 'withoutImage';

const CategoriesPage: React.FC = () => {
<<<<<<< HEAD
  const { companyId } = useUser();
=======
  const companyId = 1;
>>>>>>> c73013ab (reverse several branches retail)
  const [categories, setCategories] = useState<LocalCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<LocalCategory | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<LocalCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
  });
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    const loadCategories = async () => {
      if (!companyId) {
        setCategories([]);
        setLoading(false);
        return;
      }

      try {
<<<<<<< HEAD
        const fetchedCategories = await fetchCategories(String(companyId));
        setCategories(
          fetchedCategories.map((cat: Category) => ({
            id: cat.categoryId,
            name: cat.name,
            description: '',
            image: cat.image,
            productsCount: 0,
          }))
        );
=======
        const fetchedCategories = await fetchCategories(companyId.toString());
        setCategories(fetchedCategories.map((cat: Category) => ({
          id: cat.categoryId,
          name: cat.name,
          description: '', // API doesn't provide description, so leave empty
          image: cat.image,
        })));
>>>>>>> c73013ab (reverse several branches retail)
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, [companyId]);

  const handleDelete = (category: LocalCategory) => {
    setSelectedCategory(category);
    setShowDeleteAlert(true);
  };

  const confirmDelete = async () => {
    if (selectedCategory) {
      try {
        await deleteCategory(selectedCategory.id);
        setCategories(categories.filter(c => c.id !== selectedCategory.id));
        setSelectedCategory(null);
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
    setShowDeleteAlert(false);
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '', image: '' });
    setShowModal(true);
  };

  const handleEdit = (category: LocalCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      image: category.image,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      let imagePath = formData.image;
      if (formData.image.startsWith('data:image')) {
        const base64Data = formData.image.split(',')[1];
        const filename = `category_${Date.now()}.png`;
        imagePath = await saveImage(filename, base64Data);
      }

      if (!companyId) {
        throw new Error('No company selected');
      }

      if (editingCategory) {
<<<<<<< HEAD
=======
        // Update existing
>>>>>>> c73013ab (reverse several branches retail)
        await updateCategory(editingCategory.id, formData.name, imagePath, companyId);
        setCategories(categories.map(cat =>
          cat.id === editingCategory.id
            ? { ...cat, name: formData.name, image: imagePath, description: formData.description }
            : cat
        ));
      } else {
<<<<<<< HEAD
        await createCategory(formData.name, imagePath, companyId);
        const fetchedCategories = await fetchCategories(String(companyId));
        setCategories(
          fetchedCategories.map((cat: Category) => ({
            id: cat.categoryId,
            name: cat.name,
            description: '',
            image: cat.image,
            productsCount: 0,
          }))
        );
=======
        // Create new
        await createCategory(formData.name, imagePath, companyId);
        // Reload categories after create
        const fetchedCategories = await fetchCategories(companyId.toString());
        setCategories(fetchedCategories.map((cat: Category) => ({
          id: cat.categoryId,
          name: cat.name,
          description: '', // API doesn't provide description, so leave empty
          image: cat.image,
        })));
>>>>>>> c73013ab (reverse several branches retail)
      }
      setShowModal(false);
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData({ ...formData, image: e.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const filteredCategories = useMemo(() => {
    let result = [...categories];

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      );
    }

    if (activeFilter === 'withImage') {
      result = result.filter((c) => !!c.image);
    } else if (activeFilter === 'withoutImage') {
      result = result.filter((c) => !c.image);
    }

    return result.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [categories, searchText, activeFilter]);

  return (
    <IonPage className="categories-page">
      <Header
        presentAlertPopover={presentAlertPopover}
        presentMailPopover={presentMailPopover}
        screenTitle="Categorías"
        showBackButton={true}
        backButtonText="Menú"
        backButtonHref="/laundry"
      />

      <IonContent className="categories-content">
        <IonLoading isOpen={loading} message="Cargando categorías..." />

        <div className="categories-search-section">
          <div className="categories-search-row">
            <IonSearchbar
              className="categories-searchbar"
              placeholder="Buscar por nombre o descripción"
              value={searchText}
              onIonInput={(e) => setSearchText(e.detail.value ?? '')}
              debounce={200}
              animated={false}
            />
          </div>

          <div className="categories-chips-row">
            <button
              className={`categories-chip${activeFilter === 'all' ? ' active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              Todas
            </button>
            <button
              className={`categories-chip${activeFilter === 'withImage' ? ' active' : ''}`}
              onClick={() => setActiveFilter('withImage')}
            >
              Con imagen
            </button>
            <button
              className={`categories-chip${activeFilter === 'withoutImage' ? ' active' : ''}`}
              onClick={() => setActiveFilter('withoutImage')}
            >
              Sin imagen
            </button>
          </div>
        </div>

        {!loading && (
          <p className="categories-results-count">
            {filteredCategories.length}{' '}
            {filteredCategories.length === 1 ? 'categoría' : 'categorías'}
            {searchText.trim() ? ` para "${searchText.trim()}"` : ''}
          </p>
        )}

        <div className="categories-list">
          {!loading && filteredCategories.length === 0 ? (
            <div className="categories-empty">
              <div className="categories-empty-icon">🏷️</div>
              <p>No se encontraron categorías</p>
              <span>
                {searchText.trim()
                  ? 'Intenta con otro término de búsqueda'
                  : 'Agrega tu primera categoría con el botón +'}
              </span>
            </div>
          ) : (
            filteredCategories.map((category) => (
              <IonCard key={category.id} className="category-card">
                <div className="category-card-body">
                  <div className="category-left">
                    {category.image ? (
                      <IonImg src={category.image} className="category-image" />
                    ) : (
                      <div className="category-fallback-icon">
                        <IonIcon icon={pricetagOutline} />
                      </div>
                    )}
                  </div>

                  <div className="category-main">
                    <IonCardTitle className="category-title">{category.name}</IonCardTitle>
                    <p className="category-description">
                      {category.description || 'Sin descripción registrada'}
                    </p>

                    <div className="category-meta-row">
                      <span className="category-meta-badge">
                        <span className="meta-label">Productos</span>
                        <span className="meta-value">{category.productsCount ?? 0}</span>
                      </span>
                      <span className="category-meta-badge">
                        <span className="meta-label">Imagen</span>
                        <span className="meta-value">{category.image ? 'Sí' : 'No'}</span>
                      </span>
                    </div>
                  </div>

                  <div className="category-actions">
                    <IonButton
                      fill="outline"
                      color="primary"
                      size="small"
                      className="category-action-btn edit"
                      onClick={() => handleEdit(category)}
                    >
                      <IonIcon icon={pencil} slot="start" />
                      Editar
                    </IonButton>
                    <IonButton
                      fill="outline"
                      color="danger"
                      size="small"
                      className="category-action-btn delete"
                      onClick={() => handleDelete(category)}
                    >
                      <IonIcon icon={trash} slot="start" />
                      Eliminar
                    </IonButton>
                  </div>
                </div>
              </IonCard>
            ))
          )}
        </div>

        <div style={{ height: '88px' }} />

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={handleCreate} className="categories-fab">
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <div className="categories-modal-title">
            {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
          </div>
          <div className="categories-modal-actions">
            <IonButton onClick={() => setShowModal(false)}>Cancelar</IonButton>
            <IonButton onClick={handleSave}>Guardar</IonButton>
          </div>
          <IonContent>
            <IonList>
              <IonItem>
                <IonLabel position="stacked">Nombre</IonLabel>
                <IonInput
                  value={formData.name}
                  onIonChange={(e) => setFormData({ ...formData, name: e.detail.value! })}
                  placeholder="Nombre de la categoría"
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Descripción</IonLabel>
                <IonTextarea
                  value={formData.description}
                  onIonChange={(e) => setFormData({ ...formData, description: e.detail.value! })}
                  placeholder="Descripción de la categoría"
                  rows={3}
                />
              </IonItem>
              <IonItem>
                <IonLabel>Imagen</IonLabel>
                <IonButton fill="clear" onClick={triggerFileInput}>
                  <IonIcon icon={camera} slot="start" />
                  {formData.image ? 'Cambiar imagen' : 'Seleccionar imagen'}
                </IonButton>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
              </IonItem>
              {formData.image && (
                <IonItem>
                  <IonImg src={formData.image} className="categories-image-preview" />
                </IonItem>
              )}
            </IonList>
          </IonContent>
        </IonModal>

        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Confirmar eliminación"
          message={`¿Estás seguro de que quieres eliminar la categoría ${selectedCategory?.name}?`}
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

export default CategoriesPage;
