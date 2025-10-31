import React, { useState, useRef, useEffect } from 'react';
import {
  IonPage,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonFab,
  IonFabButton,
  IonAlert,
  IonInput,
  IonTextarea,
  IonModal,
  IonImg,
  IonGrid,
  IonRow,
  IonCol,
  IonLoading,
} from '@ionic/react';
import { add, create, trash, pencil, camera, images } from 'ionicons/icons';
import Header from '../components/Header';
import AlertPopover from '../components/PopOver/AlertPopover';
import MailPopover from '../components/PopOver/MailPopover';
import { fetchCategories, createCategory, updateCategory, deleteCategory, Category } from '../api/categoriesApi';

interface LocalCategory {
  id: number;
  name: string;
  description: string;
  image: string;
}

const CategoriesPage: React.FC = () => {
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
  const [popoverState, setPopoverState] = useState<{ showAlertPopover: boolean; showMailPopover: boolean; event?: Event }>({
    showAlertPopover: false,
    showMailPopover: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const presentAlertPopover = (e: React.MouseEvent) => {
    setPopoverState({ ...popoverState, showAlertPopover: true, event: e.nativeEvent });
  };

  const dismissAlertPopover = () => setPopoverState({ ...popoverState, showAlertPopover: false });

  const presentMailPopover = (e: React.MouseEvent) => {
    setPopoverState({ ...popoverState, showMailPopover: true, event: e.nativeEvent });
  };

  const dismissMailPopover = () => setPopoverState({ ...popoverState, showMailPopover: false });

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
        // Handle error (e.g., show toast)
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
      if (editingCategory) {
        // Update existing
        await updateCategory(editingCategory.id, formData.name, formData.image, 1);
        setCategories(categories.map(cat =>
          cat.id === editingCategory.id
            ? { ...cat, ...formData }
            : cat
        ));
      } else {
        // Create new
        await createCategory(formData.name, formData.image, 1);
        // Reload categories after create
        const fetchedCategories = await fetchCategories('1');
        setCategories(fetchedCategories.map(cat => ({
          id: cat.categoryId,
          name: cat.name,
          description: '', // API doesn't provide description, so leave empty
          image: cat.image,
        })));
      }
      setShowModal(false);
    } catch (error) {
      console.error('Error saving category:', error);
      // Handle error (e.g., show toast)
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

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const fetchedCategories = await fetchCategories('1'); // Assuming companyId is '1'
        setCategories(fetchedCategories.map(cat => ({
          id: cat.categoryId,
          name: cat.name,
          description: '', // API doesn't provide description, so leave empty
          image: cat.image,
        })));
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  return (
    <IonPage>
      <Header
        presentAlertPopover={presentAlertPopover}
        presentMailPopover={presentMailPopover}
        screenTitle="Categorías"
        showBackButton={true}
        backButtonText="Menú"
        backButtonHref="/Laundry"
      />

      <IonContent>
        <IonLoading isOpen={loading} message="Cargando categorías..." />
        <IonGrid>
          <IonRow>
            {categories.map((category) => (
              <IonCol size="12" sizeMd="6" sizeLg="4" key={category.id}>
                <IonCard>
                  <IonCardHeader>
                    <IonImg src={category.image} style={{ height: '150px', objectFit: 'cover' }} />
                    <IonCardTitle>{category.name}</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <p>{category.description}</p>
                    <IonButtons slot="end">
                      <IonButton fill="clear" color="primary" onClick={() => handleEdit(category)}>
                        <IonIcon icon={pencil} />
                      </IonButton>
                      <IonButton fill="clear" color="danger" onClick={() => handleDelete(category)}>
                        <IonIcon icon={trash} />
                      </IonButton>
                    </IonButtons>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            ))}
          </IonRow>
        </IonGrid>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={handleCreate}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowModal(false)}>Cancelar</IonButton>
                <IonButton onClick={handleSave}>Guardar</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
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
                  <IonImg src={formData.image} style={{ maxHeight: '200px', width: '100%', objectFit: 'contain' }} />
                </IonItem>
              )}
            </IonList>
          </IonContent>
        </IonModal>

        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Confirmar eliminación"
          message={`¿Estás seguro de que quieres eliminar la categoría: ${selectedCategory?.name}?`}
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
