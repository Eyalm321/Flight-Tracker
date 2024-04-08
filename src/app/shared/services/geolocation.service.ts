import { Injectable } from '@angular/core';
import { Geolocation, Position } from '@capacitor/geolocation';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {

  constructor() { }

  getCurrentPosition(): Observable<Position> {
    return new Observable<Position>(observer => {
      Geolocation.getCurrentPosition()
        .then(coordinates => {
          observer.next(coordinates);
          observer.complete();
          console.log('Current position:', coordinates);
        })
        .catch(error => {
          console.error('Error getting location', error);
          observer.error(error);
        });
    });
  }
}
