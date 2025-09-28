// CreateAccount.tsx
import React, { useState } from 'react';
import { IonContent, IonPage, IonInput, IonGrid, IonRow, IonCol, IonLabel, IonToast, IonRouterLink, IonButton, IonText, IonItem, IonIcon  } from '@ionic/react';
import IonTooltip from '@ionic/react';
import { useHistory } from 'react-router-dom';
//import './../../master.css'
import './CreateAccount.css'; // You can create a CSS file for styling if needed
import { eye, eyeOff } from 'ionicons/icons';

const CreateAccount: React.FC = () => { // Removed the interface props
    const history = useHistory();
    const [email, setEmail] = useState('');
    const [isEmailValid, setIsEmailValid] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false); // State to toggle password visibility
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState('');
    const [showPasswordMessage, setShowPasswordMessage] = useState(false);
    const [passwordBorderColor, setPasswordBorderColor] = useState<string>('transparent');

    const [showEmailTooltip, setShowEmailTooltip] = useState(false);

    const id = 0;
    const action = 1;

    const calculatePasswordStrength = (password: string): string => {
        // Regular expression for password strength validation
        // Example: At least 8 characters, at least one uppercase letter, one lowercase letter, one number, and one special character
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

        if (password.length === 0) {
          return '';
        } else if (passwordRegex.test(password)) {
          return 'strong';
        } else if (password.length >= 8) {
          return 'medium';
        } else {
          return 'weak';
        }
    };

    const handlePasswordChange = (value: string) => {
        setPassword(value);
        setPasswordStrength(calculatePasswordStrength(value));
        const strength = calculatePasswordStrength(value);
        setPasswordStrength(strength);

        // Set border color based on password strength
        const borderColor = 
          strength === 'weak' ? 'red' :
          strength === 'medium' ? 'orange' :
          strength === 'strong' ? 'green' : 'transparent';
      
        setPasswordBorderColor(borderColor);
    };

    const handleMouseEnter = () => {
        setShowEmailTooltip(true);
    };

    const handleMouseLeave = () => {
        setShowEmailTooltip(false);
    };

    const handleEmailChange = (value: string) => {
        setEmail(value);
        // Email validation logic
        const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
        setIsEmailValid(emailRegex.test(value));
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const toggleConfirmPasswordVisibility = () => {
        setShowConfirmPassword(!showConfirmPassword);
    };

    const handleCreateAccount = async () => {

    // Validate password strength
    if (!calculatePasswordStrength(password)) {
        setMessage('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.');
        return;
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
        console.log()
        setMessage('Password and confirm password do not match.');
        return;
    }

    console.log('Creating account...'); // Log account creation attempt
    setLoading(true); // Set loading to true when account creation process starts


    try {

        const userData = {
            id,
            email,
            username,
            password,
            action
          };

        console.log('Data to be sent to the backend:', userData);

        const response = await fetch('https://smartloansbackend.azurewebsites.net/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            users: [userData],
        }),
      });

      // Extract response data
      const data = await response.json();
      console.log('Response from backend:', data);

      // Check if account creation was successful
      if (response.ok) {
        setMessage('Account created successfully.');
        // Removed the call to onCreateAccountSuccess(); as it was causing an error
        history.push('/login'); // Redirect to the login page after successful account creation
      } else {
        // Handle account creation failure
        setMessage(data.message || 'Failed to create account.');
      }
    } catch (error) {
      console.error('Error during account creation:', error);
      setMessage('An error occurred during account creation. Please try again.');
    } finally {
      setLoading(false); // Reset loading state
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
                placeholder='Email'
                onMouseLeave={handleMouseLeave}
                onMouseEnter={handleMouseEnter}
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
                
                <IonInput

                  type="text"
                  value={username}
                  placeholder='UserName'
                  onIonChange={(e) => setUsername(e.detail.value!)}
                  style={{ marginBottom: '15px', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
                ></IonInput>

                <IonInput
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    placeholder='Password'
                    onIonChange={(e) => handlePasswordChange(e.detail.value!)}
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
                    onClick={togglePasswordVisibility}
                    style={{ position: 'absolute', top: '46%', transform: 'translateY(-50%)', right: '10px', cursor: 'pointer', zIndex: 2 }}
                />
                <IonInput
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    placeholder='Confirm Password'
                    onIonChange={(e) => setConfirmPassword(e.detail.value!)}
                    style={{ marginBottom: '15px', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', position: 'relative', zIndex: 1 }}
                    />
                    <IonIcon
                    slot="end"
                    icon={showConfirmPassword ? eye : eyeOff}
                    onClick={toggleConfirmPasswordVisibility}
                    style={{ position: 'absolute', top: '71%', transform: 'translateY(-50%)', right: '10px', cursor: 'pointer', zIndex: 2 }}
                    />
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
