import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.relacrm',
  appName: 'RELACRM',
  webDir: 'dist',
  server: {
    url: 'http://192.168.0.59:3000',
    cleartext: true
  }
};

export default config;
