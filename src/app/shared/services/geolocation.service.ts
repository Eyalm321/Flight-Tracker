import { Injectable } from '@angular/core';
import { Geolocation, Position } from '@capacitor/geolocation';

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {

  constructor() { }

  async getCurrentPosition(): Promise<Position | undefined> {
    try {
      const coordinates = await Geolocation.getCurrentPosition();
      return coordinates;
      console.log('Current position:', coordinates);
    } catch (e) {
      console.error('Error getting location', e);
    }
    return undefined;
  }
}
