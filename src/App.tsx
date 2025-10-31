import { Redirect, Route, useHistory, useLocation } from 'react-router-dom';
import {
  IonApp,
  IonCol,
  IonIcon,
  IonLabel,
  IonPage,
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
  setupIonicReact
} from '@ionic/react';
import Header from './components/Header';
import { IonReactRouter } from '@ionic/react-router';
import { cash, settings, barChart, shirt, qrCode, bulb, ellipsisHorizontal, menu, logOutOutline, people, cube, notifications, mail, grid, person } from 'ionicons/icons';
import { menuController } from '@ionic/core';
import POS from './pages/POS';
import Setting from './pages/Setting';
import Sells from './pages/Sells';
import Laundry from './pages/Laundry'; // 👈 Importamos tu nueva página
import ScannerQR from './pages/ScannerQR';
import Category from './pages/CategoryPage/CategoryPage';
import ProductSelection from './pages/ProductSelection';
import ProductListPage from './pages/products/ProductListPage';
import ProductDetailPage from './pages/products/ProductDetailPage';
import CartPage from './pages/CartPage';
import MovementsPage from './pages/MovementsPage';
import LedStatusPage from './pages/LedStatusPage';
import ClientsPage from './pages/ClientsPage';
import ProductsManagementPage from './pages/ProductsManagementPage';
import AlertsPage from './pages/AlertsPage';
import EmailsPage from './pages/EmailsPage';
import CategoriesPage from './pages/CategoriesPage';
import UsersPage from './pages/UsersPage';


/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
import '@ionic/react/css/palettes/dark.system.css';

/* Theme variables */
import './theme/variables.css';
import React, { useState } from 'react';


setupIonicReact();

const App: React.FC = () => {
  const location = useLocation();

  return (
    <IonApp>
      <IonReactRouter>
        <IonMenu menuId="main-menu" contentId="main-content">
          <IonHeader className="menu-header">
            <IonToolbar>
              <IonTitle>POS GMO</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <div className="profile-section">
              <IonAvatar className="profile-avatar">
                <img src="logo192.png" alt="Profile" />
              </IonAvatar>
              <div className="profile-info">
                <h3>admin</h3>
                <p>Administrator</p>
              </div>
            </div>
            <IonList>
              <IonItemDivider>Catalog</IonItemDivider>
              <IonItem button routerLink="/clients" onClick={() => menuController.close()}>
                <IonIcon icon={people} slot="start" />
                <IonLabel>Clientes</IonLabel>
              </IonItem>
              <IonItem button routerLink="/products-management" onClick={() => menuController.close()}>
                <IonIcon icon={cube} slot="start" />
                <IonLabel>Productos</IonLabel>
              </IonItem>
              <IonItem button routerLink="/categories" onClick={() => menuController.close()}>
                <IonIcon icon={grid} slot="start" />
                <IonLabel>Categorías</IonLabel>
              </IonItem>

              <IonItemDivider>Messages</IonItemDivider>
              <IonItem button routerLink="/alerts" onClick={() => menuController.close()}>
                <IonIcon icon={notifications} slot="start" />
                <IonLabel>Alertas</IonLabel>
              </IonItem>
              <IonItem button routerLink="/emails" onClick={() => menuController.close()}>
                <IonIcon icon={mail} slot="start" />
                <IonLabel>Correos</IonLabel>
              </IonItem>

              <IonItemDivider>Administration</IonItemDivider>
              <IonItem button routerLink="/users" onClick={() => menuController.close()}>
                <IonIcon icon={person} slot="start" />
                <IonLabel>Usuarios</IonLabel>
              </IonItem>

              <IonItemDivider>IOT</IonItemDivider>
              <IonItem button routerLink="/led-status" onClick={() => menuController.close()}>
                <IonIcon icon={bulb} slot="start" />
                <IonLabel>LED Status</IonLabel>
              </IonItem>

              <IonItemDivider>System</IonItemDivider>
              <IonItem button routerLink="/Setting" onClick={() => menuController.close()}>
                <IonIcon icon={settings} slot="start" />
                <IonLabel>Setting</IonLabel>
              </IonItem>
              <IonItem button routerLink="/Sells" onClick={() => menuController.close()}>
                <IonIcon icon={barChart} slot="start" />
                <IonLabel>Sells</IonLabel>
              </IonItem>
              <IonItem button onClick={() => {}}>
                <IonIcon icon={logOutOutline} slot="start" />
                <IonLabel>Sign Out</IonLabel>
              </IonItem>
            </IonList>
          </IonContent>
        </IonMenu>
        <IonPage id="main-content">
          <IonTabs>
            <IonRouterOutlet>
              <Route exact path="/POS">
                <POS />
              </Route>
              <Route exact path="/Setting">
                <Setting />
              </Route>
              <Route path="/Sells">
                <Sells />
              </Route>
              <Route path="/Laundry">
                <Laundry />
              </Route>
              <Route path="/ScannerQR">
                <ScannerQR />
              </Route>
              <Route path="/product-selection">
                <ProductSelection />
              </Route>
              <Route exact path="/category">
                <Category />
              </Route>
              <Route exact path="/CategoryPage">
                <Category />
              </Route>
              <Route exact path="/category">
                <Category />
              </Route>
              <Route exact path="/product/:categoryId" component={ProductListPage} />
              <Route exact path="/products/:productId" component={ProductDetailPage} />
              <Route exact path="/cart" component={CartPage} />
              <Route exact path="/movements" component={MovementsPage} />
              <Route exact path="/led-status" component={LedStatusPage} />
              <Route exact path="/clients" component={ClientsPage} />
              <Route exact path="/products-management" component={ProductsManagementPage} />
              <Route exact path="/categories" component={CategoriesPage} />
              <Route exact path="/alerts" component={AlertsPage} />
              <Route exact path="/emails" component={EmailsPage} />
              <Route exact path="/users" component={UsersPage} />
              <Route exact path="/">
                <Redirect to="/Laundry" />
              </Route>
            </IonRouterOutlet>
            <IonTabBar slot="bottom" className="custom-tabbar">
              <IonTabButton tab="Laundry" href="/Laundry">
                <IonIcon aria-hidden="true" icon={shirt} />
                <IonLabel>Laundry</IonLabel>
              </IonTabButton>
              <IonTabButton tab="ScannerQR" href="/ScannerQR">
                <IonIcon aria-hidden="true" icon={qrCode} />
                <IonLabel>Lector QR</IonLabel>
              </IonTabButton>
              <IonTabButton tab="POS" href="/POS">
                <IonIcon aria-hidden="true" icon={cash} />
                <IonLabel>Vending POS</IonLabel>
              </IonTabButton>
              <IonTabButton tab="Menu" href="#" onClick={(e) => e.preventDefault()}>
                <IonMenuToggle menu="main-menu">
                  <IonIcon aria-hidden="true" icon={menu} />
                  <IonLabel>Menu</IonLabel>
                </IonMenuToggle>
              </IonTabButton>
            </IonTabBar>
          </IonTabs>
        </IonPage>
      </IonReactRouter>
    </IonApp>
  );
};
export default App;


