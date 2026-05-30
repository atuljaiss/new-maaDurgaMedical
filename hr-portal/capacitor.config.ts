import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.maadurga.hrportal',
  appName: 'HR Portal',
  webDir: 'dist',
  server: {
    url: 'https://nmdm.vercel.app/',
    cleartext: true
  }
};

export default config;
