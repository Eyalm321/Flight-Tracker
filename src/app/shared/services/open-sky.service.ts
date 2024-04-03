import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Http } from '@capacitor-community/http';
import { Platform } from '@ionic/angular';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OpenSkyService {
  private baseUrl = 'https://opensky-network.org/api';
  private proxyPath = '/opensky/api';

  constructor(private platform: Platform, private httpClient: HttpClient) { }

  getHeaders() {
    return {
      'Accept': 'application/json',
    };
  }

  getTrackByAircraft(icao24: string): Observable<any> {
    const url = `/tracks?icao24=${icao24}`;
    return this.sendHttpRequest(url);
  }

  private sendHttpRequest(url: string): Observable<any> {
    if (this.platform.is('capacitor')) {
      return new Observable(subscriber => {
        Http.request({
          method: 'GET',
          url: `${this.baseUrl}${url}`,
          headers: this.getHeaders(),
        }).then(response => {
          subscriber.next(response.data);
          subscriber.complete();
        }).catch(error => {
          subscriber.error(error);
        });
      });
    } else {
      return this.httpClient.get<any>(`${this.proxyPath}${url}`);
    }
  }
}
