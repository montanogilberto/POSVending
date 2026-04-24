import React, { Suspense } from 'react';
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
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import {
  cash,
  settings,
  barChart,
  shirt,
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
} from 'ionicons/icons';

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
import { menuController } from '@ionic/core/components';

const Vending = React.lazy(() => import('./pages/Vending'));
const Setting = React.lazy(() => import('./pages/Setting'));
const Sells = React.lazy(() => import('./pages/Sells'));
const Laundry = React.lazy(() => import('./pages/Laundry/Laundry'));
const ScannerQR = React.lazy(() => import('./pages/ScannerQR'));
const Category = React.lazy(() => import('./pages/CategoryPage/CategoryPage'));
const ProductListPage = React.lazy(() => import('./pages/products/ProductListPage'));
const ProductDetailPage = React.lazy(() => import('./pages/products/ProductDetailPage'));
const CartPage = React.lazy(() => import('./pages/CartPage/CartPage'));
const MovementsPage = React.lazy(() => import('./pages/MovementsPage'));
const LedStatusPage = React.lazy(() => import('./pages/LedStatusPage'));
const ClientsPage = React.lazy(() => import('./pages/ClientsPage'));
const ProductsManagementPage = React.lazy(() => import('./pages/products/ProductsManagementPage'));
const AlertsPage = React.lazy(() => import('./pages/AlertsPage'));
const EmailsPage = React.lazy(() => import('./pages/EmailsPage'));
const CategoriesPage = React.lazy(() => import('./pages/CategoryPage/CategoriesPage'));
const UsersPage = React.lazy(() => import('./pages/UsersPage'));
const IncomesPage = React.lazy(() => import('./pages/IncomesPage'));
const ExpensesPage = React.lazy(() => import('./pages/ExpensesPage'));
const WaterTanksPage = React.lazy(() => import('./pages/WaterTanksPage'));
const WaterTanksHistoryPage = React.lazy(() => import('./pages/WaterTanksHistoryPage'));
const ReceiptPage = React.lazy(() => import('./pages/Receipt/ReceiptPage'));
const Login = React.lazy(() => import('./pages/Authentication/Login'));
const ForgotPassword = React.lazy(() => import('./pages/Authentication/ForgotPassword'));
const CreateAccount = React.lazy(() => import('./pages/Authentication/CreateAccount'));

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
      render={() =>
        isAuthenticated ? <Component /> : <Redirect to="/login" />
      }
    />
  );
};

const openMenu = async () => {
  await menuController.open('main-menu');
};

const AppShell: React.FC = () => {
  const { logout, username, companyName, branchName } = useUser();
  const history = useHistory();

  const handleLogout = () => {
    logout();
    history.push('/login');
  };

  return (
    <IonSplitPane contentId="main" when="(min-width: 792px)">
      <IonMenu menuId="main-menu" contentId="main" side="start">
        <IonHeader className="menu-header">
          <IonToolbar>
            <IonTitle>POS GMO</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonContent>
          <div className="profile-header">
            <IonAvatar className="profile-avatar">
              <img src="logo192.png" alt="Profile" />
            </IonAvatar>

            <div className="profile-info">
              <h3 className="profile-name">{username || 'Usuario'}</h3>
              <p className="profile-role">
                {companyName
                  ? `${companyName}${branchName ? ` · ${branchName}` : ''}`
                  : 'Administrator'}
              </p>
            </div>
          </div>

          <IonList>
            <IonItemDivider>Catálogo</IonItemDivider>

            <IonMenuToggle autoHide={false}>
              <IonItem button routerLink="/clients" detail={false}>
                <IonIcon icon={people} slot="start" />
                <IonLabel>Clientes</IonLabel>
              </IonItem>
            </IonMenuToggle>

            <IonMenuToggle autoHide={false}>
              <IonItem button routerLink="/products-management" detail={false}>
                <IonIcon icon={cube} slot="start" />
                <IonLabel>Productos</IonLabel>
              </IonItem>
            </IonMenuToggle>

            <IonMenuToggle autoHide={false}>
              <IonItem button routerLink="/categories" detail={false}>
                <IonIcon icon={grid} slot="start" />
                <IonLabel>Categorías</IonLabel>
              </IonItem>
            </IonMenuToggle>

            <IonItemDivider>Mensajes</IonItemDivider>

            <IonMenuToggle autoHide={false}>
              <IonItem button routerLink="/alerts" detail={false}>
                <IonIcon icon={notifications} slot="start" />
                <IonLabel>Alertas</IonLabel>
              </IonItem>
            </IonMenuToggle>

            <IonMenuToggle autoHide={false}>
              <IonItem button routerLink="/emails" detail={false}>
                <IonIcon icon={mail} slot="start" />
                <IonLabel>Correos</IonLabel>
              </IonItem>
            </IonMenuToggle>

            <IonItemDivider>Administración</IonItemDivider>

            <IonMenuToggle autoHide={false}>
              <IonItem button routerLink="/users" detail={false}>
                <IonIcon icon={person} slot="start" />
                <IonLabel>Usuarios</IonLabel>
              </IonItem>
            </IonMenuToggle>

            <IonMenuToggle autoHide={false}>
              <IonItem button routerLink="/ingresos" detail={false}>
                <IonIcon icon={barChart} slot="start" />
                <IonLabel>Ingresos</IonLabel>
              </IonItem>
            </IonMenuToggle>

            <IonMenuToggle autoHide={false}>
              <IonItem button routerLink="/egresos" detail={false}>
                <IonIcon icon={barChart} slot="start" />
                <IonLabel>Egresos</IonLabel>
              </IonItem>
            </IonMenuToggle>

            <IonItemDivider>IOT</IonItemDivider>

            <IonMenuToggle autoHide={false}>
              <IonItem button routerLink="/led-status" detail={false}>
                <IonIcon icon={bulb} slot="start" />
                <IonLabel>LED Status</IonLabel>
              </IonItem>
            </IonMenuToggle>

            <IonMenuToggle autoHide={false}>
              <IonItem button routerLink="/water-tanks" detail={false}>
                <IonIcon icon={water} slot="start" />
                <IonLabel>Water Tanks</IonLabel>
              </IonItem>
            </IonMenuToggle>

            <IonItemDivider>Sistema</IonItemDivider>

            <IonMenuToggle autoHide={false}>
              <IonItem button routerLink="/setting" detail={false}>
                <IonIcon icon={settings} slot="start" />
                <IonLabel>Configuración</IonLabel>
              </IonItem>
            </IonMenuToggle>

            <IonMenuToggle autoHide={false}>
              <IonItem button routerLink="/sells" detail={false}>
                <IonIcon icon={barChart} slot="start" />
                <IonLabel>Ventas</IonLabel>
              </IonItem>
            </IonMenuToggle>

            <IonMenuToggle autoHide={false}>
              <IonItem button onClick={handleLogout} detail={false}>
                <IonIcon icon={logOutOutline} slot="start" color="danger" />
                <IonLabel color="danger">Cerrar sesión</IonLabel>
              </IonItem>
            </IonMenuToggle>
          </IonList>
        </IonContent>
      </IonMenu>

      <IonTabs>
        <IonRouterOutlet>
          <PrivateRoute exact path="/pos" component={Vending} />
          <PrivateRoute exact path="/setting" component={Setting} />
          <PrivateRoute exact path="/sells" component={Sells} />
          <PrivateRoute exact path="/laundry" component={Laundry} />
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

          <Redirect exact from="/" to="/laundry" />
        </IonRouterOutlet>

        <IonTabBar slot="bottom" className="custom-tabbar">
          <IonTabButton tab="laundry" href="/laundry">
            <IonIcon aria-hidden="true" icon={shirt} />
            <IonLabel>Laundry</IonLabel>
          </IonTabButton>

          <IonTabButton tab="scannerqr" href="/scannerqr">
            <IonIcon aria-hidden="true" icon={qrCode} />
            <IonLabel>Lector QR</IonLabel>
          </IonTabButton>

          <IonTabButton tab="pos" href="/pos">
            <IonIcon aria-hidden="true" icon={cash} />
            <IonLabel>Vending POS</IonLabel>
          </IonTabButton>

          <IonTabButton
            tab="menu"
            href="#"
            className="menu-tab"
            onClick={(e) => {
              e.preventDefault();
              openMenu();
            }}
          >
            <IonIcon aria-hidden="true" icon={menu} />
            <IonLabel>Menú</IonLabel>
          </IonTabButton>
        </IonTabBar>
      </IonTabs>
    </IonSplitPane>
  );
};

const App: React.FC = () => {
  return (
    <IncomeProvider>
      <ProductProvider>
        <IonApp>
          <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
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
          </Suspense>
        </IonApp>
      </ProductProvider>
    </IncomeProvider>
  );
};

export default App;