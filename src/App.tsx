import React, { useEffect, useState } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
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
  IonButton,
  IonButtons,
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
  peopleOutline,
  shieldCheckmarkOutline,
  personCircle,
  cogOutline,
  walletOutline,
  constructOutline,
  starOutline,
  chatbubblesOutline,
  chevronBackOutline,
  chevronForwardOutline,
}
  from 'ionicons/icons';
  

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
import ClientDashboardPage from './pages/ClientDashboardPage';
import LenderDashboardPage from './pages/LenderDashboardPage';
import ClientFollowUpPage from './pages/ClientFollowUpPage';
import PushNotificationPage from './pages/PushNotificationPage';
import P2PLendingPage from './pages/P2PLendingPage';
import BorrowerOnboardingPage from './pages/BorrowerOnboardingPage';
import LoanPaymentPage from './pages/LoanPaymentPage';
import ManufacturingPage from './pages/Manufacturing/ManufacturingPage';
import RewardsPage from './pages/RewardsPage';
import LoanChatPage from './pages/LoanChatPage';

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
  const [menuCollapsed, setMenuCollapsed] = useState(false);

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

  useEffect(() => {
    if (!userId || !Capacitor.isNativePlatform()) return;

    const registerPush = async () => {
      let permission = await PushNotifications.checkPermissions();
      if (permission.receive === 'prompt') {
        permission = await PushNotifications.requestPermissions();
      }
      if (permission.receive !== 'granted') return;

      PushNotifications.addListener('registration', async (token) => {
        const platform = Capacitor.getPlatform();
        try {
          await fetch(`${import.meta.env.VITE_API_URL ?? 'https://smartloansbackend.azurewebsites.net'}/registerDevice`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-worker-key': import.meta.env.VITE_WORKER_KEY ?? '',
            },
            body: JSON.stringify({
              userId,
              token: token.value,
              platform,
            }),
          });
        } catch {
          // registration failure is non-fatal
        }
      });

      PushNotifications.addListener('pushNotificationReceived', async (notification) => {
        await LocalNotifications.schedule({
          notifications: [{
            id: Date.now(),
            title: notification.title ?? 'Notificación',
            body: notification.body ?? '',
            channelId: 'push_notifications',
            smallIcon: 'ic_launcher',
          }],
        });
      });

      await PushNotifications.register();
    };

    registerPush();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [userId]);


  const handleLogout = () => {
    logout();
    history.push('/login');
  };

  const openMainMenu = async () => {
    await menuController.open('main-menu');
  };

  return (
    <IonSplitPane
      contentId="main"
      when="(min-width: 792px)"
      style={{
        '--side-width':     menuCollapsed ? '64px' : '280px',
        '--side-max-width': menuCollapsed ? '64px' : '280px',
        '--side-min-width': menuCollapsed ? '64px' : '280px',
        transition: 'all 0.25s ease',
      } as React.CSSProperties}
    >
      {/* Side menu */}
      <IonMenu menuId="main-menu" contentId="main" side="start" className={menuCollapsed ? 'menu-rail' : ''}>
        <IonHeader className="menu-header">
          <IonToolbar>
            {!menuCollapsed && <IonTitle>POS GMO</IonTitle>}
            <IonButtons slot="end">
              <IonButton fill="clear" size="small" onClick={() => setMenuCollapsed(c => !c)} className="menu-collapse-btn">
                <IonIcon icon={menuCollapsed ? chevronForwardOutline : chevronBackOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent>
          <div className={`profile-header ${menuCollapsed ? 'profile-header-collapsed' : ''}`}>
            <IonAvatar className="profile-avatar">
              <IonImg
                src={profileImageSrc}
                alt="Foto de perfil"
                onIonError={() => setProfileImageSrc(DEFAULT_AVATAR_URL)}
              />
            </IonAvatar>

            {!menuCollapsed && (
            <div className="profile-info">
              <h3 className="profile-name">{username || 'Usuario'}</h3>
              <p className="profile-role">
                {companyName
                  ? `${companyName}${branchName ? ` · ${branchName}` : ''} · ${roleName}`
                  : roleName || 'Usuario'}
              </p>
            </div>
            )}
          </div>

          <IonList>
            {!menuCollapsed && <IonItemDivider>Catálogo</IonItemDivider>}

            <IonMenuToggle autoHide={false}>
              {canAccess(roleCode, 'clients') && (
              <IonItem button routerLink="/clients" title="Clientes">
                <IonIcon icon={people} slot="start" />
                {!menuCollapsed && <IonLabel>Clientes</IonLabel>}
              </IonItem>
              )}
            </IonMenuToggle>

            <IonMenuToggle autoHide={false}>
              {canAccess(roleCode, 'clientFaceRecognitions') && (
              <IonItem button routerLink="/clientFaceRecognitions" title="Cliente Reconocimiento Facial">
                <IonIcon icon={personCircle} slot="start" />
                {!menuCollapsed && <IonLabel>Cliente Reconocimiento Facial</IonLabel>}
              </IonItem>
              )}
            </IonMenuToggle>

            <IonMenuToggle autoHide={false}>
              {canAccess(roleCode, 'products') && (
              <IonItem button routerLink="/products-management" title="Productos">
                <IonIcon icon={cube} slot="start" />
                {!menuCollapsed && <IonLabel>Productos</IonLabel>}
              </IonItem>
              )}
            </IonMenuToggle>

            <IonMenuToggle autoHide={false}>
              {canAccess(roleCode, 'pushNotifications') && (
              <IonItem button routerLink="/pushNotifications" title="Notificaciones Push">
                <IonIcon icon={shieldCheckmarkOutline} slot="start" />
                {!menuCollapsed && <IonLabel>Notificaciones Push</IonLabel>}
              </IonItem>
              )}
            </IonMenuToggle>

            <IonMenuToggle autoHide={false}>
              {canAccess(roleCode, 'categories') && (
              <IonItem button routerLink="/categories" title="Categorías">
                <IonIcon icon={grid} slot="start" />
                {!menuCollapsed && <IonLabel>Categorías</IonLabel>}
              </IonItem>
              )}
            </IonMenuToggle>

            <IonMenuToggle autoHide={false}>
              {canAccess(roleCode, 'suppliers') && (
              <IonItem button routerLink="/suppliers" title="Proveedores">
                <IonIcon icon={storefrontOutline} slot="start" />
                {!menuCollapsed && <IonLabel>Proveedores</IonLabel>}
              </IonItem>
              )}
            </IonMenuToggle>

            {!menuCollapsed && <IonItemDivider>Mensajes</IonItemDivider>}

            <IonMenuToggle autoHide={false}>
              {canAccess(roleCode, 'alerts') && (
              <IonItem button routerLink="/alerts" title="Alertas">
                <IonIcon icon={notifications} slot="start" />
                {!menuCollapsed && <IonLabel>Alertas</IonLabel>}
              </IonItem>
              )}
            </IonMenuToggle>

            <IonMenuToggle autoHide={false}>
              {canAccess(roleCode, 'emails') && (
              <IonItem button routerLink="/emails" title="Correos">
                <IonIcon icon={mail} slot="start" />
                {!menuCollapsed && <IonLabel>Correos</IonLabel>}
              </IonItem>
              )}
            </IonMenuToggle>

            {!menuCollapsed && <IonItemDivider>Administración</IonItemDivider>}

            <IonMenuToggle autoHide={false}>
              {canAccess(roleCode, 'users') && (
              <IonItem button routerLink="/users" title="Usuarios">
                <IonIcon icon={person} slot="start" />
                {!menuCollapsed && <IonLabel>Usuarios</IonLabel>}
              </IonItem>
              )}
            </IonMenuToggle>

            <IonMenuToggle autoHide={false}>
              {canAccess(roleCode, 'ingresos') && (
              <IonItem button routerLink="/ingresos" title="Ingresos">
                <IonIcon icon={barChart} slot="start" />
                {!menuCollapsed && <IonLabel>Ingresos</IonLabel>}
              </IonItem>
              )}
            </IonMenuToggle>

            <IonMenuToggle autoHide={false}>
              {canAccess(roleCode, 'egresos') && (
              <IonItem button routerLink="/egresos" title="Egresos">
                <IonIcon icon={barChart} slot="start" />
                {!menuCollapsed && <IonLabel>Egresos</IonLabel>}
              </IonItem>
              )}
            </IonMenuToggle>

            <IonMenuToggle autoHide={false}>
              {canAccess(roleCode, 'loans') && (
              <IonItem button routerLink="/loans" title="Préstamos">
                <IonIcon icon={cashOutline} slot="start" />
                {!menuCollapsed && <IonLabel>Préstamos</IonLabel>}
              </IonItem>
              )}
            </IonMenuToggle>

            <IonMenuToggle autoHide={false}>
              {canAccess(roleCode, 'manufacturing') && (
              <IonItem button routerLink="/manufacturing" title="Manufactura">
                <IonIcon icon={cogOutline} slot="start" />
                {!menuCollapsed && <IonLabel>Manufactura</IonLabel>}
              </IonItem>
              )}
            </IonMenuToggle>

            <IonMenuToggle autoHide={false}>
              {canAccess(roleCode, 'rewards') && (
              <IonItem button routerLink="/rewards" title="Recompensas">
                <IonIcon icon={starOutline} slot="start" />
                {!menuCollapsed && <IonLabel>Recompensas</IonLabel>}
              </IonItem>
              )}
            </IonMenuToggle>

            {!menuCollapsed && <IonItemDivider>Finanzas P2P</IonItemDivider>}

            <IonMenuToggle autoHide={false}>
              {canAccess(roleCode, 'clients') && (
              <IonItem button routerLink="/p2p-lending" title="Préstamos P2P">
                <IonIcon icon={walletOutline} slot="start" />
                {!menuCollapsed && <IonLabel>Préstamos P2P</IonLabel>}
              </IonItem>
              )}
            </IonMenuToggle>

            <IonMenuToggle autoHide={false}>
              {canAccess(roleCode, 'clients') && (
              <IonItem button routerLink="/borrower-onboarding" title="Registro Prestatario">
                <IonIcon icon={constructOutline} slot="start" />
                {!menuCollapsed && <IonLabel>Registro Prestatario</IonLabel>}
              </IonItem>
              )}
            </IonMenuToggle>

            <IonMenuToggle autoHide={false}>
              {canAccess(roleCode, 'loanChat') && (
              <IonItem button routerLink="/loan-chat/new" title="Chat de Préstamo">
                <IonIcon icon={chatbubblesOutline} slot="start" />
                {!menuCollapsed && <IonLabel>Chat de Préstamo</IonLabel>}
              </IonItem>
              )}
            </IonMenuToggle>

            {!menuCollapsed && <IonItemDivider>IOT</IonItemDivider>}

            <IonMenuToggle autoHide={false}>
              {canAccess(roleCode, 'iot') && (
              <IonItem button routerLink="/led-status" title="LED Status">
                <IonIcon icon={bulb} slot="start" />
                {!menuCollapsed && <IonLabel>LED Status</IonLabel>}
              </IonItem>
              )}
            </IonMenuToggle>

            <IonMenuToggle autoHide={false}>
              {canAccess(roleCode, 'iot') && (
              <IonItem button routerLink="/water-tanks" title="Water Tanks">
                <IonIcon icon={water} slot="start" />
                {!menuCollapsed && <IonLabel>Water Tanks</IonLabel>}
              </IonItem>
              )}
            </IonMenuToggle>

            {!menuCollapsed && <IonItemDivider>Sistema</IonItemDivider>}

            <IonMenuToggle autoHide={false}>
              {canAccess(roleCode, 'settings') && (
              <IonItem button routerLink="/setting" title="Configuración">
                <IonIcon icon={settings} slot="start" />
                {!menuCollapsed && <IonLabel>Configuración</IonLabel>}
              </IonItem>
              )}
            </IonMenuToggle>

            <IonMenuToggle autoHide={false}>
              <IonItem button onClick={handleLogout} title="Cerrar sesión">
                <IonIcon icon={logOutOutline} slot="start" color="danger" />
                {!menuCollapsed && <IonLabel color="danger">Cerrar sesión</IonLabel>}
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
            <PrivateRoute exact path="/client-dashboard/:clientId" component={ClientDashboardPage} />
            <PrivateRoute exact path="/lender-dashboard/:clientId" component={LenderDashboardPage} />
            <PrivateRoute exact path="/client-followup/:clientId" component={ClientFollowUpPage} />
            <PrivateRoute exact path="/p2p-lending" component={P2PLendingPage} />
            <PrivateRoute exact path="/borrower-onboarding" component={BorrowerOnboardingPage} />
            <PrivateRoute exact path="/payment" component={LoanPaymentPage} />
            <PrivateRoute exact path="/manufacturing" component={ManufacturingPage} />
            <PrivateRoute exact path="/rewards" component={RewardsPage} />
            <PrivateRoute exact path="/loan-chat/:conversationId" component={LoanChatPage} />
            <PrivateRoute exact path="/pushNotifications" component={PushNotificationPage} />
          </IonRouterOutlet>

          <IonTabBar slot="bottom" className="custom-tabbar">
            <IonTabButton tab="dashboard" href="/dashboard">
              <IonIcon aria-hidden="true" icon={home} />
              <IonLabel>Dashboard</IonLabel>
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