// ForgotPassword.tsx
import React, { useState } from 'react';
import { IonContent, IonInput, IonButton, IonLabel, IonPage, IonCol, IonGrid, IonRow } from '@ionic/react';
import { useHistory } from 'react-router-dom';
//import './../../master.css'

interface ForgotPasswordProps {
  onPasswordReset: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onPasswordReset }) => {
  const history = useHistory();
  const [email, setEmail] = useState('');
  const [isEmailValid, setIsEmailValid] = useState(false);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    // Email validation logic
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    setIsEmailValid(emailRegex.test(value));
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Add logic to send a password reset email
    // ...

    // Assume the password reset was successful
    onPasswordReset();
    history.push('/login');


  };

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <IonGrid>
          <IonRow className="ion-justify-content-center">
            <IonCol size="12" sizeSm="8" sizeMd="6" sizeLg="4">
    
              <IonPage>

                  <h1 className="ion-text-center">Forgot Password</h1>
                  <form onSubmit={handleResetPassword}>
                    
                  <IonInput
                    type="text"
                    value={email}
                    placeholder='Email'
                    onIonChange={(e) => handleEmailChange(e.detail.value!)}
                    style={{
                        marginBottom: '15px',
                        padding: '10px',
                        border: `1px solid ${email && !isEmailValid ? 'red' : '#ccc'}`, // Apply red border if email is invalid and not empty
                        borderRadius: '4px',
                        borderBottom: `2px solid ${isEmailValid ? 'green' : 'transparent'}`, // Apply green bottom border if email is valid
                    }}
                    />
                    {email && !isEmailValid && <p style={{ color: 'red' }}>Invalid email structure.</p>}

                    <IonButton expand="full" type="submit">Reset Password</IonButton>
                  </form>

                  <div className="ion-text-center">
                    <p>
                      <a href="/login">Log in!</a>
                    </p>
                  </div>

              </IonPage>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default ForgotPassword;
