import type { CapacitorConfig } from '@capacitor/cli';
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.transgabon.connect',
  appName: 'TransGabon Connect',
  webDir: 'dist',
  // AJOUTEZ CE BLOC SERVER ICI :
  server: {
    cleartext: true
  }
};

export default config;

