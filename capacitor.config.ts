import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'parentSync',
  webDir: 'www',
  server: {
    cleartext: true,
    androidScheme: 'http', // <--- Add this line
    hostname: 'localhost'
  }
};

export default config;
