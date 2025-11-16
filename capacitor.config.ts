import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lavanderia.gmo',
  appName: 'POS GMO',
  webDir: 'dist',
  android: {
    allowMixedContent: true
  },
  plugins: {
    StatusBar: {
      style: 'default',
      backgroundColor: '#ffffff',
      overlaysWebView: false
    }
  }
};

export default config;
