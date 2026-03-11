// CreateAccount.tsx
import React, { useEffect, useState } from 'react';
import { IonContent, IonPage, IonInput, IonGrid, IonRow, IonCol, IonToast, IonRouterLink, IonButton, IonIcon } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import './CreateAccount.css';
import { eye, eyeOff } from 'ionicons/icons';
import { getAllCompanies, linkUserCompanies, Company } from '../../api/companiesApi';

const CreateAccount: React.FC = () => {
  const history = useHistory();
  const [email, setEmail] = useState('');
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordBorderColor, setPasswordBorderColor] = useState<string>('transparent');

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<number[]>([]);

  const id = 0;
  const action = 1;

  useEffect(() => {
    let mounted = true;
    const loadCompanies = async () => {
      try {
        const data = await getAllCompanies();
        if (mounted) setCompanies(data);
      } catch {
        if (mounted) setCompanies([]);
      }
    };
    loadCompanies();
    return () => {
      mounted = false;
    };
  }, []);

  const calculatePasswordStrength = (pwd: string): string => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (pwd.length === 0) return '';
    if (passwordRegex.test(pwd)) return 'strong';
    if (pwd.length >= 8) return 'medium';
    return 'weak';
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    const strength = calculatePasswordStrength(value);
    const borderColor =
      strength === 'weak' ? 'red' :
      strength === 'medium' ? 'orange' :
      strength === 'strong' ? 'green' : 'transparent';
    setPasswordBorderColor(borderColor);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    setIsEmailValid(emailRegex.test(value));
  };

  const toggleCompanySelection = (companyId: number) => {
    setSelectedCompanyIds(prev =>
      prev.includes(companyId)
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    );
  };

  const handleCreateAccount = async () => {
    if (!calculatePasswordStrength(password)) {
      setMessage('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Password and confirm password do not match.');
      return;
    }

    setLoading(true);

    try {
      const userData = { id, email, username, password, action };

      const response = await fetch('https://smartloansbackend.azurewebsites.net/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: [userData] }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || 'Failed to create account.');
        return;
      }

      const createdUserId =
        Number(data?.result?.[0]?.userId) ||
        Number(data?.result?.[0]?.id) ||
        Number(data?.userId) ||
        0;

      if (createdUserId > 0 && selectedCompanyIds.length > 0) {
        await linkUserCompanies(createdUserId, selectedCompanyIds);
      }

      setMessage('Account created successfully.');
      history.push('/login');
    } catch (error) {
      console.error('Error during account creation:', error);
      setMessage('An error occurred during account creation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <IonGrid>
          <IonRow className="ion-justify-content-center">
            <IonCol size="12" sizeSm="8" sizeMd="6" sizeLg="4">
              <h1 className="ion-text-center">Create Account</h1>
              <IonToast
                isOpen={!!message}
                message={message || ''}
                duration={3000}
                onDidDismiss={() => setMessage(null)}
                color="danger"
                position="top"
              />

              <form onSubmit={(e) => { e.preventDefault(); handleCreateAccount(); }}>
                <IonInput
                  type="text"
                  value={email}
                  placeholder="Email"
                  onIonChange={(e) => handleEmailChange(e.detail.value || '')}
                  style={{
                    marginBottom: '15px',
                    padding: '10px',
                    border: `1px solid ${email && !isEmailValid ? 'red' : '#ccc'}`,
                    borderRadius: '4px',
                    borderBottom: `2px solid ${isEmailValid ? 'green' : 'transparent'}`,
                  }}
                />
                {email && !isEmailValid && <p style={{ color: 'red' }}>Invalid email structure.</p>}

                <IonInput
                  type="text"
                  value={username}
                  placeholder="UserName"
                  onIonChange={(e) => setUsername(e.detail.value || '')}
                  style={{ marginBottom: '15px', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
                />

                <IonInput
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  placeholder="Password"
                  onIonChange={(e) => handlePasswordChange(e.detail.value || '')}
                  style={{
                    marginBottom: '15px',
                    padding: '10px',
                    borderBottom: `2px solid ${passwordBorderColor}`
                  }}
                />

                <p style={{ color: 'gray', fontSize: '0.8em', margin: '5px 0', display: 'inline-block' }}>
                  Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.
                </p>

                <IonIcon
                  slot="end"
                  icon={showPassword ? eye : eyeOff}
                  onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', top: '46%', transform: 'translateY(-50%)', right: '10px', cursor: 'pointer', zIndex: 2 }}
                />

                <IonInput
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  placeholder="Confirm Password"
                  onIonChange={(e) => setConfirmPassword(e.detail.value || '')}
                  style={{ marginBottom: '15px', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', position: 'relative', zIndex: 1 }}
                />

                <IonIcon
                  slot="end"
                  icon={showConfirmPassword ? eye : eyeOff}
                  onClick={() => setShowConfirmPassword(v => !v)}
                  style={{ position: 'absolute', top: '71%', transform: 'translateY(-50%)', right: '10px', cursor: 'pointer', zIndex: 2 }}
                />

                <div style={{ marginTop: '16px', marginBottom: '12px' }}>
                  <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>Link companies (optional)</p>
                  <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #ddd', borderRadius: 8, padding: 8 }}>
                    {companies.length === 0 ? (
                      <p style={{ margin: 0, color: '#666' }}>No companies available.</p>
                    ) : (
                      companies.map((company) => (
                        <label key={company.companyId} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <input
                            type="checkbox"
                            checked={selectedCompanyIds.includes(company.companyId)}
                            onChange={() => toggleCompanySelection(company.companyId)}
                          />
                          <span>{company.name} (ID: {company.companyId})</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <IonButton
                  type="submit"
                  expand="full"
                  disabled={loading}
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </IonButton>
              </form>

              <div className="ion-text-center">
                <p>
                  <IonRouterLink href="/login">Back to Login</IonRouterLink>
                </p>
              </div>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default CreateAccount;
