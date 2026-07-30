import React, { useEffect, useRef, useState } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { Redirect, Route, useHistory, useLocation } from 'react-router-dom';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
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
  useIonAlert,
  setupIonicReact,
} from '@ionic/react';
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
  homeOutline,
  cardOutline,
  pulseOutline,
  personCircleOutline,
}
  from 'ionicons/icons';
  

//import Vending from './pages/dashboard/Vending';
import Setting from './pages/system/Setting';
//mport Sells from './pages/dashboard/Sells';
import Dashboard from './pages/Dashboard/Dashboard';
//import ScannerQR from './pages/dashboard/ScannerQR';
import Category from './pages/CategoryPage/CategoryPage';
import ProductListPage from './pages/products/ProductListPage';
import ProductDetailPage from './pages/products/ProductDetailPage';
import CartPage from './pages/CartPage/CartPage';
import MovementsPage from './pages/finance/MovementsPage';
import LedStatusPage from './pages/iot/LedStatusPage';
import ClientsPage from './pages/clients/ClientsPage';
import ProductsManagementPage from './pages/products/ProductsManagementPage';
import AlertsPage from './pages/messaging/AlertsPage';
import EmailsPage from './pages/messaging/EmailsPage';
import CategoriesPage from './pages/CategoryPage/CategoriesPage';
import UsersPage from './pages/admin/UsersPage';
import IncomesPage from './pages/finance/IncomesPage';
import ExpensesPage from './pages/finance/ExpensesPage';
import WaterTanksPage from './pages/iot/WaterTanksPage';
import WaterTanksHistoryPage from './pages/iot/WaterTanksHistoryPage';
import ReceiptPage from './pages/Receipt/ReceiptPage';
import Login from './pages/Authentication/Login';
import ForgotPassword from './pages/Authentication/ForgotPassword';
import CreateAccount from './pages/Authentication/CreateAccount';
import SupplierPage from './pages/admin/SupplierPage';
import LoanPage from './pages/loans/LoanPage';
// Lazy-loaded: pulls in the gated @azure/ai-vision-face-ui SDK, which isn't
// installable without private-feed credentials. Keeping it out of the eager
// bundle means environments without those credentials can still run the rest
// of the app; only this route fails to load.
const ClientFaceRecognitionPage = React.lazy(() => import('./pages/clients/ClientFaceRecognitionPage'));
import ClientDashboardPage from './pages/clients/ClientDashboardPage';
import ExpedienteDigitalPage from './pages/clients/ExpedienteDigitalPage';
import LenderDashboardPage from './pages/clients/LenderDashboardPage';
import ClientFollowUpPage from './pages/clients/ClientFollowUpPage';
import PushNotificationPage from './pages/messaging/PushNotificationPage';
import NotificationsInboxPage from './pages/messaging/NotificationsInboxPage';
import P2PLendingPage from './pages/loans/P2PLendingPage';
import BorrowerOnboardingPage from './pages/loans/BorrowerOnboardingPage';
import LoanPaymentPage from './pages/loans/LoanPaymentPage';
import ManufacturingPage from './pages/Manufacturing/ManufacturingPage';
import RewardsPage from './pages/finance/RewardsPage';
import LoanChatPage from './pages/loans/LoanChatPage';
import LoanChatListPage from './pages/loans/LoanChatListPage';

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
import BiometricLockScreen from './components/BiometricLockScreen';
import { isBiometricLockEnabled, authenticateBiometric, isBiometricPromptInProgress } from './utils/biometricAuth';
import { getPostLoginRoute } from './utils/postLoginRoute';

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
  const { logout, username, companyName, branchName, avatarUrl, userId, clientId, roleCode, roleName, setAvatarUrl } =
    useUser();
  const isSmartLoansRole = roleCode === 'borrower' || roleCode === 'lender';
  const history = useHistory();
  const location = useLocation();
  // ClientDashboardPage's 5 sections are ?tab=... on one route, not separate
  // routes — IonTabs matches tabs by path only (ignores query string), so a
  // plain href would treat all 5 buttons as "already on this tab" and never
  // navigate. Push manually and track the active one from the URL instead.
  const activeClientDashboardTab = new URLSearchParams(location.search).get('tab') || 'home';
  const goClientDashboardTab = (tab: string) => history.push(`/client-dashboard/${clientId}?tab=${tab}`);

  // Lenders get their OWN bottom nav (Inicio/Pagos/Invertir/Invitar) — the
  // borrower ?tab= tabs above are sections of the borrower dashboard and would
  // send a lender to the wrong page. Pagos scrolls to a section on the lender
  // dashboard; Invertir/Invitar are real routes.
  const isLender = roleCode === 'lender';
  const lenderSection = new URLSearchParams(location.search).get('section');
  const activeLenderTab =
    location.pathname.startsWith('/p2p-lending') ? 'invertir'
      : location.pathname.startsWith('/rewards') ? 'invitar'
      : lenderSection === 'pagos' ? 'pagos'
      : 'inicio';
  const goLenderTab = (tab: string) => {
    if (tab === 'invertir') return history.push('/p2p-lending');
    if (tab === 'invitar') return history.push('/rewards');
    if (tab === 'pagos') return history.push(`/lender-dashboard/${clientId}?section=pagos`);
    return history.push(`/lender-dashboard/${clientId}`); // inicio
  };
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

    let registrationHandle: PluginListenerHandle | undefined;
    let receivedHandle: PluginListenerHandle | undefined;
    let cancelled = false;

    const registerPush = async () => {
      let permission = await PushNotifications.checkPermissions();
      if (permission.receive === 'prompt') {
        permission = await PushNotifications.requestPermissions();
      }
      if (permission.receive !== 'granted' || cancelled) return;

      registrationHandle = await PushNotifications.addListener('registration', async (token) => {
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

      receivedHandle = await PushNotifications.addListener('pushNotificationReceived', async (notification) => {
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
      cancelled = true;
      registrationHandle?.remove();
      receivedHandle?.remove();
    };
  }, [userId]);

  const [presentLogoutAlert] = useIonAlert();

  const doLogout = () => {
    logout();
    history.push('/login');
  };

  // Ask before ending the session: close it, or keep continuing (stay logged in).
  const handleLogout = () => {
    presentLogoutAlert({
      header: 'Cerrar sesión',
      message: '¿Deseas cerrar la sesión o continuar?',
      buttons: [
        { text: 'Continuar', role: 'cancel' },
        { text: 'Cerrar sesión', role: 'destructive', handler: doLogout },
      ],
    });
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
            {!menuCollapsed && <IonTitle>{isSmartLoansRole ? 'SmartLoans' : 'POS GMO'}</IonTitle>}
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
              <IonItem button routerLink="/p2p-lending" title="SmartLoans">
                <IonIcon icon={walletOutline} slot="start" />
                {!menuCollapsed && <IonLabel>SmartLoans</IonLabel>}
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
              <IonItem
                button
                // Both roles land on the conversations LIST. New chats start
                // from an offer (P2P) or, for borrowers, from the AI-assistant
                // button inside the list — never a bare /loan-chat/new, which
                // used to mint lenderId=0 conversations whose pushes targeted
                // nobody.
                routerLink="/loan-chats"
                title="Chat de Préstamo"
              >
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
            
            <PrivateRoute exact path="/setting" component={Setting} />
            
            <PrivateRoute exact path="/dashboard" component={Dashboard} />
            

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
            <React.Suspense fallback={null}>
              <PrivateRoute exact path="/clientFaceRecognitions" component={ClientFaceRecognitionPage} />
            </React.Suspense>
            <PrivateRoute exact path="/client-dashboard/:clientId" component={ClientDashboardPage} />
            <PrivateRoute exact path="/client-expediente/:clientId" component={ExpedienteDigitalPage} />
            <PrivateRoute exact path="/lender-dashboard/:clientId" component={LenderDashboardPage} />
            <PrivateRoute exact path="/client-followup/:clientId" component={ClientFollowUpPage} />
            <PrivateRoute exact path="/p2p-lending" component={P2PLendingPage} />
            <PrivateRoute exact path="/borrower-onboarding" component={BorrowerOnboardingPage} />
            <PrivateRoute exact path="/payment" component={LoanPaymentPage} />
            <PrivateRoute exact path="/manufacturing" component={ManufacturingPage} />
            <PrivateRoute exact path="/rewards" component={RewardsPage} />
            <PrivateRoute exact path="/loan-chat/:conversationId" component={LoanChatPage} />
            <PrivateRoute exact path="/loan-chats" component={LoanChatListPage} />
            <PrivateRoute exact path="/pushNotifications" component={PushNotificationPage} />
            <PrivateRoute exact path="/notifications" component={NotificationsInboxPage} />
          </IonRouterOutlet>

          {/* Custom bottom nav (was IonTabBar/IonTabButton). The SmartLoans
              "tabs" are ?tab= query-param views on ONE route, not real Ionic tab
              routes, so IonTabs' tab-select fired on every tap and logged
              "[ion-tabs] Tab with id 'undefined' does not exist". A plain nav in
              the same slot="bottom" keeps IonTabs' layout + the look without
              that machinery. Navigation is the same onClick as before. */}
          <div slot="bottom" className="cd-tabbar">
            {isLender ? (
              <>
                <button type="button" className={`cd-tab${activeLenderTab === 'inicio' ? ' cd-tab--active' : ''}`} onClick={() => goLenderTab('inicio')}>
                  <IonIcon aria-hidden="true" icon={homeOutline} />
                  <span>Inicio</span>
                </button>
                <button type="button" className={`cd-tab${activeLenderTab === 'pagos' ? ' cd-tab--active' : ''}`} onClick={() => goLenderTab('pagos')}>
                  <IonIcon aria-hidden="true" icon={cardOutline} />
                  <span>Pagos</span>
                </button>
                <button type="button" className={`cd-tab${activeLenderTab === 'invertir' ? ' cd-tab--active' : ''}`} onClick={() => goLenderTab('invertir')}>
                  <IonIcon aria-hidden="true" icon={barChart} />
                  <span>Invertir</span>
                </button>
                <button type="button" className={`cd-tab${activeLenderTab === 'invitar' ? ' cd-tab--active' : ''}`} onClick={() => goLenderTab('invitar')}>
                  <IonIcon aria-hidden="true" icon={peopleOutline} />
                  <span>Invitar</span>
                </button>
              </>
            ) : isSmartLoansRole ? (
              <>
                <button type="button" className={`cd-tab${activeClientDashboardTab === 'home' ? ' cd-tab--active' : ''}`} onClick={() => goClientDashboardTab('home')}>
                  <IonIcon aria-hidden="true" icon={homeOutline} />
                  <span>Home</span>
                </button>
                <button type="button" className={`cd-tab${activeClientDashboardTab === 'loans' ? ' cd-tab--active' : ''}`} onClick={() => goClientDashboardTab('loans')}>
                  <IonIcon aria-hidden="true" icon={walletOutline} />
                  <span>Préstamos</span>
                </button>
                <button type="button" className={`cd-tab${activeClientDashboardTab === 'payments' ? ' cd-tab--active' : ''}`} onClick={() => goClientDashboardTab('payments')}>
                  <IonIcon aria-hidden="true" icon={cardOutline} />
                  <span>Pagos</span>
                </button>
                <button type="button" className={`cd-tab${activeClientDashboardTab === 'activity' ? ' cd-tab--active' : ''}`} onClick={() => goClientDashboardTab('activity')}>
                  <IonIcon aria-hidden="true" icon={pulseOutline} />
                  <span>Actividad</span>
                </button>
                <button type="button" className={`cd-tab${activeClientDashboardTab === 'profile' ? ' cd-tab--active' : ''}`} onClick={() => goClientDashboardTab('profile')}>
                  <IonIcon aria-hidden="true" icon={personCircleOutline} />
                  <span>Perfil</span>
                </button>
              </>
            ) : (
              <button type="button" className="cd-tab" onClick={() => history.push('/dashboard')}>
                <IonIcon aria-hidden="true" icon={home} />
                <span>Dashboard</span>
              </button>
            )}
          </div>
        </IonTabs>
      </IonPage>
    </IonSplitPane>
  );
};

// Biometric app-lock, rendered ONCE at the app root — not tied to any route,
// so it survives back/forward navigation and route remounts. It renders as an
// overlay on top of whatever page is currently showing.
//
// isBiometricPromptInProgress() (biometricAuth.ts) guards against a
// self-triggering loop: the native biometric prompt runs in its own
// Activity, so showing/dismissing it pauses/resumes the host app just like
// backgrounding it would. That guard is shared across every caller of
// authenticateBiometric() (not just this gate's own unlock flow) — pages
// like ClientFaceRecognitionPage or PaymentPage call it directly for their
// own confirmation prompts, and without a shared guard each of those would
// falsely read as the user backgrounding the app and re-lock mid-flow.
const BiometricLockGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, username, roleCode, clientId, logout } = useUser();
  const history = useHistory();
  const [isLocked, setIsLocked] = useState(false);
  // Why the lock was raised, so unlock knows where to send the user:
  //   'cold-start' — app launched fresh; there is no meaningful current screen,
  //     so route to the post-login dashboard.
  //   're-lock'    — app was backgrounded mid-session and came back; the user's
  //     screen (e.g. a half-finished expediente wizard) is still mounted under
  //     the lock overlay, so DON'T navigate — just dismiss and leave them
  //     exactly where they were. Navigating here was throwing away in-progress
  //     wizard state on every background/foreground.
  const lockOriginRef = useRef<'cold-start' | 're-lock'>('cold-start');

  useEffect(() => {
    console.log('[BiometricLockGate] effect running. isNative =', Capacitor.isNativePlatform(), 'isAuthenticated =', isAuthenticated);

    if (!Capacitor.isNativePlatform() || !isAuthenticated) {
      console.log('[BiometricLockGate] bailing out early (native/auth check failed), setIsLocked(false)');
      setIsLocked(false);
      return;
    }

    let cancelled = false;
    let stateChangeHandle: PluginListenerHandle | undefined;

    (async () => {
      const enabled = await isBiometricLockEnabled();
      console.log('[BiometricLockGate] cold-start check: enabled =', enabled, 'cancelled =', cancelled);
      if (!cancelled && enabled) {
        console.log('[BiometricLockGate] cold-start: setIsLocked(true)');
        lockOriginRef.current = 'cold-start';
        setIsLocked(true);
      }

      stateChangeHandle = await CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
        console.log('[BiometricLockGate] appStateChange fired. isActive =', isActive, 'isBiometricPromptInProgress =', isBiometricPromptInProgress());
        if (!isActive || isBiometricPromptInProgress()) {
          console.log('[BiometricLockGate] appStateChange: ignoring (inactive or mid-authenticate)');
          return;
        }
        const stillEnabled = await isBiometricLockEnabled();
        console.log('[BiometricLockGate] appStateChange: stillEnabled =', stillEnabled);
        if (stillEnabled) {
          console.log('[BiometricLockGate] appStateChange: setIsLocked(true) (re-lock)');
          lockOriginRef.current = 're-lock';
          setIsLocked(true);
        }
      });
      console.log('[BiometricLockGate] appStateChange listener attached');
    })();

    return () => {
      console.log('[BiometricLockGate] effect cleanup, removing listener');
      cancelled = true;
      stateChangeHandle?.remove();
    };
  }, [isAuthenticated]);

  // IMPORTANT: use history.push here, NOT window.location.href. A hard
  // navigation reloads the entire page — which remounts BiometricLockGate
  // itself from scratch, re-running the cold-start check and immediately
  // re-locking the app in an infinite loop (confirmed via device logs: close
  // → reload → re-lock → close → reload → re-lock...). history.push is a
  // normal in-SPA navigation and does not remount this component.
  const handleUnlock = async () => {
    console.log('[BiometricLockGate] handleUnlock: called');
    // authenticateBiometric() itself now sets the shared in-progress guard
    // (see biometricAuth.ts) — no need to manage it here.
    const ok = await authenticateBiometric('Desbloquea la app para continuar');
    console.log('[BiometricLockGate] handleUnlock: authenticateBiometric result =', ok);
    if (ok) {
      setIsLocked(false);
      if (lockOriginRef.current === 're-lock') {
        // Backgrounded mid-session — the screen the user was on is still
        // mounted under this overlay. Dismiss and stay put; navigating would
        // discard in-progress state (e.g. a half-finished wizard).
        console.log('[BiometricLockGate] handleUnlock: SUCCESS (re-lock) — staying on current screen');
        return;
      }
      // Cold start — route by role, same as Login.tsx. (Used to hardcode
      // '/dashboard' for everyone, which sent borrower/lender users to the POS
      // dashboard instead of their own client dashboard.)
      const targetRoute = getPostLoginRoute(roleCode, clientId);
      console.log('[BiometricLockGate] handleUnlock: SUCCESS (cold-start), roleCode =', roleCode, 'clientId =', clientId, '→ navigating to', targetRoute);
      history.push(targetRoute);
    } else {
      console.log('[BiometricLockGate] handleUnlock: FAILED/CANCELLED, staying locked');
    }
  };

  const handleLogout = () => {
    console.log('[BiometricLockGate] handleLogout: called');
    setIsLocked(false);
    logout();
    history.push('/login');
  };

  // handleClose removed: the lock screen no longer has a close/dismiss button.
  // Bypassing biometric auth by closing the screen defeated the lock, and the
  // only ways off it now are a successful unlock or an explicit logout.

  console.log('[BiometricLockGate] render. isLocked =', isLocked, 'isAuthenticated =', isAuthenticated);

  return (
    <>
      {children}
      {isLocked && (
        <BiometricLockScreen
          username={username}
          onUnlock={handleUnlock}
          onLogout={handleLogout}
        />
      )}
    </>
  );
};

const App: React.FC = () => {
  return (
    <IncomeProvider>
      <ProductProvider>
        <IonApp>
          <IonReactRouter>
            <BiometricLockGate>
              <IonRouterOutlet id="root-outlet">
                <Route exact path="/login" component={Login} />
                <Route exact path="/forgot-password" component={ForgotPassword} />
                <Route exact path="/create-account" component={CreateAccount} />

                <Route exact path="/">
                  <Redirect to="/login" />
                </Route>

                <Route component={AppShell} />
              </IonRouterOutlet>
            </BiometricLockGate>
          </IonReactRouter>
        </IonApp>
      </ProductProvider>
    </IncomeProvider>
  );
};

export default App;