import React, { useState, useEffect } from 'react';
import { IonModal, IonContent, IonIcon, IonLoading } from '@ionic/react';
import { add, checkmarkCircle, chevronForward, chevronBack, business } from 'ionicons/icons';
import {
  getAllCompanies, createCompany, getBranchesByCompany, createBranch,
  Company, CompanyBranch,
} from '../../api/companiesApi';
import './CompanySelector.css';

export interface CompanySelectorProps {
  isOpen: boolean;
  /** Called with selected companyId, companyName, branchId, branchName */
  onConfirm: (companyId: number, companyName: string, branchId: number, branchName: string) => void;
}

type Screen = 'company' | 'branch';

const CompanySelector: React.FC<CompanySelectorProps> = ({ isOpen, onConfirm }) => {
  const [screen, setScreen]                     = useState<Screen>('company');
  const [companies, setCompanies]               = useState<Company[]>([]);
  const [branches, setBranches]                 = useState<CompanyBranch[]>([]);
  const [selectedCompany, setSelectedCompany]   = useState<Company | null>(null);
  const [selectedBranch, setSelectedBranch]     = useState<CompanyBranch | null>(null);
  const [loading, setLoading]                   = useState(false);
  const [showNewCompany, setShowNewCompany]      = useState(false);
  const [showNewBranch, setShowNewBranch]        = useState(false);
  const [newCompanyName, setNewCompanyName]      = useState('');
  const [newBranchName, setNewBranchName]        = useState('');
  const [error, setError]                        = useState('');

  useEffect(() => {
    if (isOpen) {
      setScreen('company');
      setSelectedCompany(null);
      setSelectedBranch(null);
      setShowNewCompany(false);
      setShowNewBranch(false);
      setNewCompanyName('');
      setNewBranchName('');
      setError('');
      loadCompanies();
    }
  }, [isOpen]);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const data = await getAllCompanies();
      setCompanies(data);
    } catch {
      setError('No se pudieron cargar las empresas');
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async (companyId: number) => {
    setLoading(true);
    try {
      const data = await getBranchesByCompany(companyId);
      setBranches(data);
    } catch {
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCompany = (company: Company) => {
    setSelectedCompany(company);
    setSelectedBranch(null);
    setBranches([]);
    loadBranches(company.companyId);
    setScreen('branch');
  };

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const created = await createCompany(newCompanyName.trim());
      // Reload list then auto-navigate to branch screen
      const updated = await getAllCompanies();
      setCompanies(updated);
      setShowNewCompany(false);
      setNewCompanyName('');
      // Find the newly created company by name if ID not returned
      const found = updated.find(c => c.name === newCompanyName.trim()) ?? created;
      if (found) handleSelectCompany(found);
    } catch {
      setError('Error al crear la empresa');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim() || !selectedCompany) return;
    setLoading(true);
    setError('');
    try {
      const created = await createBranch(newBranchName.trim(), selectedCompany.companyId);
      const updated = await getBranchesByCompany(selectedCompany.companyId);
      setBranches(updated);
      setShowNewBranch(false);
      setNewBranchName('');
      const found = updated.find(b => b.name === newBranchName.trim()) ?? created;
      if (found) setSelectedBranch(found);
    } catch {
      setError('Error al crear la sucursal');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedCompany) return;
    onConfirm(
      selectedCompany.companyId,
      selectedCompany.name,
      selectedBranch?.branchId ?? 0,
      selectedBranch?.name ?? ''
    );
  };

  // ── Company screen ─────────────────────────────────────────────────────

  const CompanyScreen = () => (
    <div>
      {error && <div className="cs-error">{error}</div>}

      <p className="cs-section-title">Empresas disponibles</p>

      <div className="cs-list">
        {companies.length === 0 && !loading && (
          <div className="cs-empty">No hay empresas registradas. Crea una nueva.</div>
        )}
        {companies.map(company => (
          <button
            key={company.companyId}
            className={`cs-item${selectedCompany?.companyId === company.companyId ? ' selected' : ''}`}
            onClick={() => handleSelectCompany(company)}
          >
            <div className="cs-item-icon">🏢</div>
            <div className="cs-item-text">
              <p className="cs-item-name">{company.name}</p>
              <p className="cs-item-meta">ID: {company.companyId}</p>
            </div>
            <IonIcon icon={chevronForward} style={{ color: '#9CA3AF', fontSize: 18 }} />
          </button>
        ))}
      </div>

      {showNewCompany ? (
        <div className="cs-create-form">
          <p className="cs-create-form-title">Nueva empresa</p>
          <div className="cs-create-row">
            <input
              className="cs-create-input"
              placeholder="Nombre de la empresa"
              value={newCompanyName}
              onChange={e => setNewCompanyName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateCompany()}
              autoFocus
            />
            <button
              className="cs-create-btn"
              onClick={handleCreateCompany}
              disabled={!newCompanyName.trim() || loading}
            >
              Crear
            </button>
          </div>
          <button className="cs-create-cancel" onClick={() => { setShowNewCompany(false); setNewCompanyName(''); }}>
            Cancelar
          </button>
        </div>
      ) : (
        <button className="cs-add-btn" onClick={() => setShowNewCompany(true)}>
          <IonIcon icon={add} /> Crear nueva empresa
        </button>
      )}
    </div>
  );

  // ── Branch screen ──────────────────────────────────────────────────────

  const BranchScreen = () => (
    <div>
      {error && <div className="cs-error">{error}</div>}

      <p className="cs-section-title">Sucursales de {selectedCompany?.name}</p>

      <div className="cs-list">
        {branches.length === 0 && !loading && (
          <div className="cs-empty">No hay sucursales. Puedes crear una o continuar sin sucursal.</div>
        )}
        {branches.map(branch => (
          <button
            key={branch.branchId}
            className={`cs-item${selectedBranch?.branchId === branch.branchId ? ' selected' : ''}`}
            onClick={() => setSelectedBranch(prev => prev?.branchId === branch.branchId ? null : branch)}
          >
            <div className="cs-item-icon">📍</div>
            <div className="cs-item-text">
              <p className="cs-item-name">{branch.name}</p>
              <p className="cs-item-meta">ID: {branch.branchId}</p>
            </div>
            {selectedBranch?.branchId === branch.branchId && (
              <IonIcon icon={checkmarkCircle} className="cs-item-check" />
            )}
          </button>
        ))}
      </div>

      {showNewBranch ? (
        <div className="cs-create-form">
          <p className="cs-create-form-title">Nueva sucursal</p>
          <div className="cs-create-row">
            <input
              className="cs-create-input"
              placeholder="Nombre de la sucursal"
              value={newBranchName}
              onChange={e => setNewBranchName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateBranch()}
              autoFocus
            />
            <button
              className="cs-create-btn"
              onClick={handleCreateBranch}
              disabled={!newBranchName.trim() || loading}
            >
              Crear
            </button>
          </div>
          <button className="cs-create-cancel" onClick={() => { setShowNewBranch(false); setNewBranchName(''); }}>
            Cancelar
          </button>
        </div>
      ) : (
        <button className="cs-add-btn" onClick={() => setShowNewBranch(true)}>
          <IonIcon icon={add} /> Crear nueva sucursal
        </button>
      )}

      <p className="cs-skip-hint">
        <button className="cs-skip-link" onClick={handleConfirm}>
          Continuar sin sucursal →
        </button>
      </p>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <IonModal isOpen={isOpen} className="company-modal" backdropDismiss={false}>
      <IonLoading isOpen={loading} message="Cargando..." />

      {/* Gradient header */}
      <div className="cs-header">
        <div className="cs-header-icon">
          {screen === 'company' ? '🏢' : '📍'}
        </div>
        <h2 className="cs-header-title">
          {screen === 'company' ? 'Selecciona tu empresa' : 'Selecciona una sucursal'}
        </h2>
        <p className="cs-header-subtitle">
          {screen === 'company'
            ? 'Elige la empresa con la que trabajarás en esta sesión'
            : `Empresa: ${selectedCompany?.name}`}
        </p>
      </div>

      {/* Breadcrumb */}
      <div className="cs-breadcrumb">
        <span className={`cs-breadcrumb-item${screen === 'company' ? ' active' : ''}`}>
          1. Empresa
        </span>
        <span className="cs-breadcrumb-sep">›</span>
        <span className={`cs-breadcrumb-item${screen === 'branch' ? ' active' : ''}`}>
          2. Sucursal
        </span>
      </div>

      <IonContent className="cs-content">
        <div className="cs-scroll">
          {screen === 'company' ? <CompanyScreen /> : <BranchScreen />}
        </div>
      </IonContent>

      {/* Footer */}
      <div className="cs-footer">
        {screen === 'branch' && (
          <button className="cs-footer-back" onClick={() => setScreen('company')}>
            <IonIcon icon={chevronBack} /> Atrás
          </button>
        )}
        <div className="cs-footer-spacer" />
        {screen === 'branch' && (
          <button
            className="cs-footer-confirm"
            onClick={handleConfirm}
            disabled={!selectedCompany}
          >
            ✓ Confirmar empresa
          </button>
        )}
      </div>
    </IonModal>
  );
};

export default CompanySelector;
