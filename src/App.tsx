import { Redirect, Route } from 'react-router-dom';
import {
  IonApp,
  IonCol,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonRow,
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
  setupIonicReact
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import {
  cash, settings, barChart, shirt, qrCode, bulb,
  logOutOutline, people, cube, notifications, mail, grid, person, menu, water
} from 'ionicons/icons';

//test

import Vending from './pages/Vending'
import Setting from './pages/Setting';
import Sells from './pages/Sells';
import Laundry from './pages/Laundry/Laundry';
import ScannerQR from './pages/ScannerQR';
import Category from './pages/CategoryPage/CategoryPage';
import ProductListPage from './pages/Products/ProductListPage';
import ProductDetailPage from './pages/Products/ProductDetailPage';
import CartPage from './pages/CartPage/CartPage';
import MovementsPage from './pages/MovementsPage';
import LedStatusPage from './pages/LedStatusPage';
import ClientsPage from './pages/ClientsPage';
import ProductsManagementPage from './pages/Products/ProductsManagementPage';
import AlertsPage from './pages/AlertsPage';
import EmailsPage from './pages/EmailsPage';
import CategoriesPage from './pages/CategoryPage/CategoriesPage';
import UsersPage from './pages/UsersPage';
import IncomesPage from './pages/IncomesPage';
import ExpensesPage from './pages/ExpensesPage';
import WaterTanksPage from './pages/WaterTanksPage';
import WaterTanksHistoryPage from './pages/WaterTanksHistoryPage';

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

import React from 'react';
import { IncomeProvider } from './context/IncomeContext';
import { ProductProvider } from './context/ProductContext';
setupIonicReact();

const App: React.FC = () => {
  return (
    <IncomeProvider>
      <ProductProvider>
        <IonApp>
        <IonReactRouter>
        {/* SplitPane pins the menu at ≥792px and keeps it as a drawer on phones */}
        <IonSplitPane contentId="main" when="(min-width: 792px)">
          {/* Left menu */}
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
                  <h3 className="profile-name">admin</h3>
                  <p className="profile-role">Administrator</p>
                </div>
              </div>

              <IonList>
                <IonItemDivider>Catalog</IonItemDivider>
                <IonItem button routerLink="/clients">
                  <IonIcon icon={people} slot="start" />
                  <IonLabel>Clientes</IonLabel>
                </IonItem>
                <IonItem button routerLink="/products-management">
                  <IonIcon icon={cube} slot="start" />
                  <IonLabel>Productos</IonLabel>
                </IonItem>
                <IonItem button routerLink="/categories">
                  <IonIcon icon={grid} slot="start" />
                  <IonLabel>Categorías</IonLabel>
                </IonItem>

                <IonItemDivider>Messages</IonItemDivider>
                <IonItem button routerLink="/alerts">
                  <IonIcon icon={notifications} slot="start" />
                  <IonLabel>Alertas</IonLabel>
                </IonItem>
                <IonItem button routerLink="/emails">
                  <IonIcon icon={mail} slot="start" />
                  <IonLabel>Correos</IonLabel>
                </IonItem>

                <IonItemDivider>Administration</IonItemDivider>
                <IonItem button routerLink="/users">
                  <IonIcon icon={person} slot="start" />
                  <IonLabel>Usuarios</IonLabel>
                </IonItem>
                <IonItem button routerLink="/ingresos">
                  <IonIcon icon={barChart} slot="start" />
                  <IonLabel>Ingresos</IonLabel>
                </IonItem>
                <IonItem button routerLink="/egresos">
                  <IonIcon icon={barChart} slot="start" />
                  <IonLabel>Egresos</IonLabel>
                </IonItem>

                <IonItemDivider>IOT</IonItemDivider>
                <IonItem button routerLink="/led-status">
                  <IonIcon icon={bulb} slot="start" />
                  <IonLabel>LED Status</IonLabel>
                </IonItem>
                <IonItem button routerLink="/water-tanks">
                  <IonIcon icon={water} slot="start" />
                  <IonLabel>Water Tanks</IonLabel>
                </IonItem>

                <IonItemDivider>System</IonItemDivider>
                <IonItem button routerLink="/setting">
                  <IonIcon icon={settings} slot="start" />
                  <IonLabel>Setting</IonLabel>
                </IonItem>
                <IonItem button routerLink="/sells">
                  <IonIcon icon={barChart} slot="start" />
                  <IonLabel>Sells</IonLabel>
                </IonItem>
                <IonItem button>
                  <IonIcon icon={logOutOutline} slot="start" />
                  <IonLabel>Sign Out</IonLabel>
                </IonItem>
              </IonList>
            </IonContent>
          </IonMenu>

          {/* Main content that the SplitPane controls */}
          <IonPage id="main">
            <IonTabs>
              <IonRouterOutlet>
                <Route exact path="/pos" component={Vending} />
                <Route exact path="/setting" component={Setting} />
                <Route exact path="/sells" component={Sells} />
                <Route exact path="/laundry" component={Laundry} />
                <Route exact path="/scannerqr" component={ScannerQR} />

                <Route exact path="/category" component={Category} />
                <Route exact path="/products/:productId" component={ProductDetailPage} />
                <Route exact path="/product/:categoryId" component={ProductListPage} />
                <Route exact path="/cart" component={CartPage} />
                <Route exact path="/movements" component={MovementsPage} />
                <Route exact path="/led-status" component={LedStatusPage} />
                <Route exact path="/clients" component={ClientsPage} />
                <Route exact path="/products-management" component={ProductsManagementPage} />
                <Route exact path="/categories" component={CategoriesPage} />
                <Route exact path="/alerts" component={AlertsPage} />
                <Route exact path="/emails" component={EmailsPage} />
                <Route exact path="/users" component={UsersPage} />
                <Route exact path="/ingresos" component={IncomesPage} />
                <Route exact path="/egresos" component={ExpensesPage} />
                <Route exact path="/water-tanks" component={WaterTanksPage} />
                <Route exact path="/water-tanks-history/:tankId" component={WaterTanksHistoryPage} />

                <Route exact path="/">
                  <Redirect to="/laundry" />
                </Route>
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
                <IonTabButton tab="menu" href="#" className="menu-tab" onClick={(e) => e.preventDefault()}>
                  <IonMenuToggle menu="main-menu">
                    <IonIcon aria-hidden="true" icon={menu} />
                    <IonLabel>Menu</IonLabel>
                  </IonMenuToggle>
                </IonTabButton>
              </IonTabBar>
            </IonTabs>
          </IonPage>
        </IonSplitPane>
      </IonReactRouter>
        </IonApp>
      </ProductProvider>
    </IncomeProvider>
  );
};

export default App;