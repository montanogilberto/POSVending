import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lavanderia.gmo',
  appName: 'Factory AI GMO',
  webDir: 'dist',
  android: {
    allowMixedContent: true
  },
  plugins: {
    StatusBar: {
      style: 'default',
      backgroundColor: '#ffffff',
      overlaysWebView: false
    },
    PushNotifications: {
      // iOS: mostrar la notificación TAMBIÉN con la app abierta (foreground).
      // Sin esto iOS la suprime y el usuario nunca ve la negociación llegar.
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
