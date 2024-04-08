import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.eyalmizrachi.flighttracker',
  appName: 'FlightTracker',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  }
};

export default config;
