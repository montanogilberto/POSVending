// responsive.tsx
import { useEffect, useState } from 'react';
import { toastController } from '@ionic/core';

const useInactivityTimer = (timeoutDuration: number = 300000) => {
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    let inactivityTimer = setTimeout(() => {
      if (isActive) {
        presentToast();
        setIsActive(false); // Prevent multiple toasts
      }
    }, timeoutDuration);

    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimer);
      if (!isActive) {
        setIsActive(true); // Re-activate the session if there is user interaction
      }
      inactivityTimer = setTimeout(() => {
        if (isActive) {
          presentToast();
          setIsActive(false);
        }
      }, timeoutDuration);
    };

    const presentToast = async () => {
      const toast = await toastController.create({
        message: 'Your session is about to expire. Do you want to stay logged in?',
        position: 'bottom',
        buttons: [
          {
            text: 'Stay Logged In',
            role: 'cancel',
            handler: () => {
              console.log('Session refreshed');
              setIsActive(true); // Reset session active status
            }
          }
        ],
        duration: 10000
      });
      toast.present();
    };

    // Add event listeners for user activity
    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('keypress', resetInactivityTimer);
    window.addEventListener('touchstart', resetInactivityTimer);

    // Cleanup function to remove event listeners and timer
    return () => {
      clearTimeout(inactivityTimer);
      window.removeEventListener('mousemove', resetInactivityTimer);
      window.removeEventListener('keypress', resetInactivityTimer);
      window.removeEventListener('touchstart', resetInactivityTimer);
    };
  }, [timeoutDuration, isActive]);

  return null; // This hook does not return anything
};

export default useInactivityTimer;
