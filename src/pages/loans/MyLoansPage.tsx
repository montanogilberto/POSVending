/**
 * MyLoansPage — cartera de préstamos del usuario (prestamista o prestatario).
 * Rutas: /my-loans y /my-loans/:clientId
 * Shell de router: la vista está en MyLoans/MyLoansView.tsx (MVVM).
 */
import React from 'react';
import MyLoansView from './MyLoans/MyLoansView';
import './MyLoansPage.css';

const MyLoansPage: React.FC = () => <MyLoansView />;

export default MyLoansPage;
