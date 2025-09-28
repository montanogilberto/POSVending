import React, { useRef, useState } from 'react';
import { IonContent, IonPage, IonInput, IonGrid, IonRow, IonCol, IonLabel, IonToast, IonRouterLink, IonButton, IonIcon } from '@ionic/react';
import { useHistory } from 'react-router-dom';
//import './../../master.css';
import './Login.css';
import { eye, eyeOff } from 'ionicons/icons';
import { useUser } from '../../components/UserContext';


interface LoginProps {
  onLoginSuccess: () => void;
}


const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const history = useHistory();
  const usernameRef = useRef<string>('');
  const passwordRef = useRef<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { username, avatarUrl, setUsername, setAvatarUrl } = useUser();


  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const username = usernameRef.current;
    const password = passwordRef.current;

    const loginPayload = {
      logins: [
        { username, password },
      ],
    };

    console.log('Attempting login with payload:', loginPayload);

    try {
      const response = await fetch('https://smartloansbackend.azurewebsites.net/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginPayload),
      });

      console.log('Response received:', response);

      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Response JSON:', data);

      const loginMessage = data.result[0]?.msg;
      console.log('Login message:', loginMessage);

      if (loginMessage === 'User Invalid') {
        setMessage(loginMessage);
        console.error('Login failed:', loginMessage);
      } else {
        console.log('Login successful:', loginMessage);
        setUsername(username);  // Set the username in the global context
        setAvatarUrl(data.result[0]?.avatarUrl);  // Set the avatar URL in the global context
        
        onLoginSuccess();
        history.push('/Laundry');
      }
    } catch (error) {
      console.error('Error during login:', error);
      if (error instanceof Error) {
        setMessage(`Login failed: ${error.message}`);
      } else {
        setMessage('Login failed: An unknown error occurred');
      }
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
              <h1 className="ion-text-center">Login</h1>
              <IonToast
                isOpen={!!message}
                message={message || ''}
                duration={3000}
                onDidDismiss={() => setMessage(null)}
                color="danger"
                position="top"
              />
              <form onSubmit={handleLogin}>
                <IonLabel position="floating">Username</IonLabel>
                <IonInput
                  type="text"
                  onIonChange={e => usernameRef.current = e.detail.value!}
                  style={{ marginBottom: '15px', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <IonLabel position="floating">Password</IonLabel>
                <IonInput
                  type={showPassword ? 'text' : 'password'}
                  onIonChange={e => passwordRef.current = e.detail.value!}
                  style={{ marginBottom: '15px', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  <IonIcon
                    slot="end"
                    icon={showPassword ? eye : eyeOff}
                    onClick={togglePasswordVisibility}
                    style={{ position: 'absolute', top: '46%', transform: 'translateY(-50%)', right: '10px', cursor: 'pointer', zIndex: 2 }}
                  />
                </IonInput>
                <IonButton
                  type="submit"
                  expand="full"
                  disabled={loading}
                  style={{ width: '100%' }}
                >
                  {loading ? 'Logging in...' : 'Login'}
                </IonButton>
              </form>
              <div className="ion-text-center">
                <p><IonRouterLink href="/forgot-password">Forgot Password?</IonRouterLink></p>
                <p><IonRouterLink href="/create-account">Create Account</IonRouterLink></p>
              </div>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default Login;
