import React, { useEffect, useState } from 'react';
import { Redirect, Route, useHistory } from 'react-router-dom';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  IonMenu,
  IonList,
  IonItem,
  IonItemDivider,
  IonMenuToggle,
  IonHeader,
  IonContent,
  IonToolbar,
  IonTitle,
  IonAvatar,
  IonSplitPane,
  IonPage,
  IonImg,
  setupIonicReact,
} from '@ionic/react';
import { menuController } from '@ionic/core';
import { IonReactRouter } from '@ionic/react-router';
import {
  cash,
  settings,
  barChart,
  home,
  qrCode,
  bulb,
  logOutOutline,
  people,
  cube,
  notifications,
  mail,
  grid,
  person,
  menu,
  water,
  storefrontOutline,
  cashOutline,
} from 'ionicons/icons';,
  peopleOutline,
}
  shieldCheckmarkOutline,
}
  

import Vending from './pages/Vending';
import Setting from './pages/Setting';
import Sells from './pages/Sells';
import Dashboard from './pages/Dashboard/Dashboard';
import ScannerQR from './pages/ScannerQR';
import Category from './pages/CategoryPage/CategoryPage';
import ProductListPage from './pages/products/ProductListPage';
import ProductDetailPage from './pages/products/ProductDetailPage';
import CartPage from './pages/CartPage/CartPage';
import MovementsPage from './pages/MovementsPage';
import LedStatusPage from './pages/LedStatusPage';
import ClientsPage from './pages/ClientsPage';
import ProductsManagementPage from './pages/products/ProductsManagementPage';
import AlertsPage from './pages/AlertsPage';
import EmailsPage from './pages/EmailsPage';
import CategoriesPage from './pages/CategoryPage/CategoriesPage';
import UsersPage from './pages/UsersPage';
import IncomesPage from './pages/IncomesPage';
import ExpensesPage from './pages/ExpensesPage';
import WaterTanksPage from './pages/WaterTanksPage';
import WaterTanksHistoryPage from './pages/WaterTanksHistoryPage';
import ReceiptPage from './pages/Receipt/ReceiptPage';
import Login from './pages/Authentication/Login';
import ForgotPassword from './pages/Authentication/ForgotPassword';
import CreateAccount from './pages/Authentication/CreateAccount';
import SupplierPage from './pages/SupplierPage';
import LoanPage from './pages/LoanPage';
import ClientFaceRecognitionPage from './pages/ClientFaceRecognitionPage';

/* Core/Theme CSS */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import '@ionic/react/css/palettes/dark.system.css';
import './theme/variables.css';

import { IncomeProvider } from './context/IncomeContext';
import { ProductProvider } from './context/ProductContext';
import { useUser } from './components/UserContext';
import { getOneUser, pickProfileImageUrl } from './api/usersApi';
import { canAccess } from './config/rolePermissions';
import { DEFAULT_AVATAR_URL, resolveAvatarUrl } from './utils/formatters';

setupIonicReact();

interface PrivateRouteProps {
  component: React.ComponentType<any>;
  path: string;
  exact?: boolean;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({
  component: Component,
  ...rest
}) => {
  const { isAuthenticated } = useUser();
  console.log("🔒 PrivateRoute check:", rest.path, "isAuthenticated:", isAuthenticated);

  return (
    <Route
      {...rest}
      render={(props) =>
        isAuthenticated ? <Component {...props} /> : <Redirect to="/login" />
      }
    />
  );
};

const AppShell: React.FC = () => {
  const { logout, username, companyName, branchName, avatarUrl, userId, roleCode, roleName, setAvatarUrl } =
    useUser();
  const history = useHistory();
  const [profileImageSrc, setProfileImageSrc] = useState(() =>
    resolveAvatarUrl(avatarUrl)
  );

  useEffect(() => {
    setProfileImageSrc(resolveAvatarUrl(avatarUrl));
  }, [avatarUrl]);

  // Refresh profile photo from /one_users (e.g. after backend adds imageUrl)
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    (async () => {
      try {
        const profile = await getOneUser(userId);
        const imageUrl = pickProfileImageUrl(profile);
        if (!cancelled && imageUrl && imageUrl !== avatarUrl) {
          setAvatarUrl(imageUrl);
        }
      } catch {
        /* keep stored avatar */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, avatarUrl, setAvatarUrl]);

  console.log("🏠 AppShell rendered for user:", username, companyName, branchName);

  const handleLogout = () => {
    logout();
    history.push('/login');
  };

  const openMainMenu = async () => {
    await menuController.open('main-menu');
  };

  return (
    <IonSplitPane contentId="main" when="(min-width: 792px)">
      {/* Side menu */}
      <IonMenu menuId="main-menu" contentId="main" side="start">
        <IonHeader className="menu-header">
          <IonToolbar>
            <IonTitle>POS GMO</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonContent>
          <div className="profile-header">
            <IonAvatar className="profile-avatar">
              <IonImg
                src={profileImageSrc}
                alt="Foto de perfil"
                onIonError={() => setProfileImageSrc(DEFAULT_AVATAR_URL)}
              />
            </IonAvatar>

            <div className="profile-info">
              <h3 className="profile-name">{username || 'Usuario'}</h3>
              <p className="profile-role">
                {companyName
                  ? `${companyName}${branchName ? ` · ${branchName}` : ''} · ${roleName}`
                  : roleName || 'Usuario'}
              </p>
            </div>
          </div>

          <IonList>
            <IonItemDivider>Catálogo</IonItemDivider>

            <IonMenuToggle autoHide={false}>
              {canAccess(roleCode, 'clients') && (
              <IonItem button routerLink="/clients">
                <IonIcon icon={people} slot="start" />
                <IonLabel>Clientes</IonLabel>
              </IonItem>
              )}
            </IonMenuToggle>

            <IonMenuToggle autoHide={false}>
              {canAccess(roleCode, 'products') && (
              <IonItem button routerLink="/products-management">
                <IonIcon icon={cube} slot="start" />
                <IonLabel>Productos</IonLabel>
              </IonItem>
              )}
            </IonMenuToggle>

            <IonMenuToggle autoHide={false}>
              {canAccess(roleCode, 'categories') && (
              <IonItem button routerLink="/categories">
                <IonIcon icon={grid} slot="start" />
                <IonLabel>Categorías</IonLabel>
              </IonItem>
              )}
            </IonMenuToggle>

            <IonMenuToggle autoHide={false}>
              {canAccess(roleCode, 'suppliers') && (
              <IonItem button routerLink="/suppliers">
                <IonIcon icon={storefrontOutline} slot="start" />
                <IonLabel>Proveedores</IonLabel>
              </IonItem>
              )}
            </IonMenuToggle>

            <IonItemDivider>Mensajes</IonItemDivider>

            <IonMenuToggle autoHide={false}>
              {canAccess(roleCode, 'alerts') && (
              <IonItem button routerLink="/alerts">
                <IonIcon icon={notifications} slot="start" />
                <IonLabel>Alertas</IonLabel>
              </IonItem>
              )}
            </IonMenuToggle>

            <IonMenuToggle autoHide={false}>
              {canAccess(roleCode, 'emails') && (
              <IonItem button routerLink="/emails">
                <IonIcon icon={mail} slot="start" />
                <IonLabel>Correos</IonLabel>
              </IonItem>
              )}
            </IonMenuToggle>

            <IonItemDivider>Administración</IonItemDivider>

            <IonMenuToggle autoHide={false}>
              {canAccess(roleCode, 'users') && (
              <IonItem button routerLink="/users">
                <IonIcon icon={person} slot="start" />
                <IonLabel>Usuarios</IonLabel>
              </IonItem>
              )}
            </IonMenuToggle>

            <IonMenuToggle autoHide={false}>
              {canAccess(roleCode, 'ingresos') && (
              <IonItem button routerLink="/ingresos">
                <IonIcon icon={barChart} slot="start" />
                <IonLabel>Ingresos</IonLabel>
              </IonItem>
              )}
            </IonMenuToggle>

            <IonMenuToggle autoHide={false}>
              {canAccess(roleCode, 'egresos') && (
              <IonItem button routerLink="/egresos">
                <IonIcon icon={barChart} slot="start" />
                <IonLabel>Egresos</IonLabel>
              </IonItem>
              )}
            </IonMenuToggle>

            <IonMenuToggle autoHide={false}>
              {canAccess(roleCode, 'loans') && (
              <IonItem button routerLink="/loans">
                <IonIcon icon={cashOutline} slot="start" />
                <IonLabel>Préstamos</IonLabel>
              </IonItem>
              )}
            </IonMenuToggle>

            <IonItemDivider>IOT</IonItemDivider>

            <IonMenuToggle autoHide={false}>
              {canAccess(roleCode, 'iot') && (
              <IonItem button routerLink="/led-status">
                <IonIcon icon={bulb} slot="start" />
                <IonLabel>LED Status</IonLabel>
              </IonItem>
              )}
            </IonMenuToggle>

            <IonMenuToggle autoHide={false}>
              {canAccess(roleCode, 'iot') && (
              <IonItem button routerLink="/water-tanks">
                <IonIcon icon={water} slot="start" />
                <IonLabel>Water Tanks</IonLabel>
              </IonItem>
              )}
            </IonMenuToggle>

            <IonItemDivider>Sistema</IonItemDivider>

            <IonMenuToggle autoHide={false}>
              {canAccess(roleCode, 'settings') && (
              <IonItem button routerLink="/setting">
                <IonIcon icon={settings} slot="start" />
                <IonLabel>Configuración</IonLabel>
              </IonItem>
              )}
            </IonMenuToggle>

            <IonMenuToggle autoHide={false}>
              <IonItem button onClick={handleLogout}>
                <IonIcon icon={logOutOutline} slot="start" color="danger" />
                <IonLabel color="danger">Cerrar sesión</IonLabel>
              </IonItem>
            </IonMenuToggle>
          </IonList>
        </IonContent>
      </IonMenu>

      {/* Main content */}
      <IonPage id="main">
        <IonTabs>
          <IonRouterOutlet>
            <PrivateRoute exact path="/pos" component={Vending} />
            <PrivateRoute exact path="/setting" component={Setting} />
            <PrivateRoute exact path="/sells" component={Sells} />
            <PrivateRoute exact path="/dashboard" component={Dashboard} />
            <PrivateRoute exact path="/scannerqr" component={ScannerQR} />

            <PrivateRoute exact path="/category" component={Category} />
            <PrivateRoute exact path="/products/:productId" component={ProductDetailPage} />
            <PrivateRoute exact path="/product/:categoryId" component={ProductListPage} />
            <PrivateRoute exact path="/cart" component={CartPage} />

            <PrivateRoute exact path="/expense-categories" component={Category} />
            <PrivateRoute exact path="/expense-products/:categoryId" component={ProductListPage} />
            <PrivateRoute exact path="/expense-cart" component={CartPage} />

            <PrivateRoute exact path="/movements" component={MovementsPage} />
            <PrivateRoute exact path="/led-status" component={LedStatusPage} />
            <PrivateRoute exact path="/clients" component={ClientsPage} />
            <PrivateRoute exact path="/products-management" component={ProductsManagementPage} />
            <PrivateRoute exact path="/categories" component={CategoriesPage} />
            <PrivateRoute exact path="/alerts" component={AlertsPage} />
            <PrivateRoute exact path="/emails" component={EmailsPage} />
            <PrivateRoute exact path="/users" component={UsersPage} />
            <PrivateRoute exact path="/ingresos" component={IncomesPage} />
            <PrivateRoute exact path="/egresos" component={ExpensesPage} />
            <PrivateRoute exact path="/water-tanks" component={WaterTanksPage} />
            <PrivateRoute exact path="/water-tanks-history/:tankId" component={WaterTanksHistoryPage} />
            <PrivateRoute exact path="/receipt" component={ReceiptPage} />
            <PrivateRoute exact path="/receipt/:incomeId" component={ReceiptPage} />

            <Route exact path="/">
              <Redirect to="/login" />
            </Route>
            <PrivateRoute exact path="/suppliers" component={SupplierPage} />
            <PrivateRoute exact path="/loans" component={LoanPage} />
            <PrivateRoute exact path="/clientFaceRecognitions" component={ClientFaceRecognitionPage} />
          </IonRouterOutlet>

          <IonTabBar slot="bottom" className="custom-tabbar">
            <IonTabButton tab="dashboard" href="/dashboard">
              <IonIcon aria-hidden="true" icon={home} />
              <IonLabel>Dashboard</IonLabel>
            </IonTabButton>

            <IonTabButton tab="scannerqr" href="/scannerqr">
              <IonIcon aria-hidden="true" icon={qrCode} />
              <IonLabel>Lector QR</IonLabel>
            </IonTabButton>

            <IonTabButton tab="pos" href="/pos">
              <IonIcon aria-hidden="true" icon={cash} />
              <IonLabel>Vending POS</IonLabel>
            </IonTabButton>

            <div
              className="menu-tab-slot menu-tab"
              role="button"
              tabIndex={0}
              aria-label="Abrir menú"
              onClick={openMainMenu}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openMainMenu();
                }
              }}
            >
              <IonIcon aria-hidden="true" icon={menu} />
              <IonLabel className="menu-tab-bar-label">Menú</IonLabel>
            </div>
          </IonTabBar>
        </IonTabs>
      </IonPage>
    </IonSplitPane>
  );
};

const App: React.FC = () => {
  return (
    <IncomeProvider>
      <ProductProvider>
        <IonApp>
          <IonReactRouter>
            <IonRouterOutlet id="root-outlet">
              <Route exact path="/login" component={Login} />
              <Route exact path="/forgot-password" component={ForgotPassword} />
              <Route exact path="/create-account" component={CreateAccount} />

              <Route exact path="/">
                <Redirect to="/login" />
              </Route>

              <Route component={AppShell} />
            </IonRouterOutlet>
          </IonReactRouter>
        </IonApp>
      </ProductProvider>
    </IncomeProvider>
  );
};

export default App;