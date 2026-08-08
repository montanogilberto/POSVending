/**
 * ProfilePage — router shell only. Toda la implementación vive en
 * Profile/ (MVVM feature-based): View → useProfile() → components.
 *
 * "Ajustes generales" consolidado — un solo lugar para datos personales y
 * seguridad, antes repartidos entre ClientDashboardPage (tab Perfil) y
 * Setting.tsx (admin, biometría). Accesible para cualquier rol vía el menú
 * lateral ("Mi perfil").
 */
import React from 'react';
import './ProfilePage.css';
import ProfileView from './Profile/ProfileView';

const ProfilePage: React.FC = () => {
  return <ProfileView />;
};

export default ProfilePage;
