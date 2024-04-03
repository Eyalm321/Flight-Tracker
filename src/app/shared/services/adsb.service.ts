import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, forkJoin, from, map, of, throwError } from 'rxjs';
import { Http } from '@capacitor-community/http';
import { HttpResponse } from '@capacitor/core';
import { Platform } from '@ionic/angular';

interface Aircraft {
  alert: number;
  alt_baro: number;
  alt_geom: number;
  baro_rate: number;
  category: string;
  emergency: string;
  flight: string;
  gs: number;
  gva: number;
  hex: string;
  lat: number;
  lon: number;
  messages: number;
  mlat: string[];
  nac_p: number;
  nac_v: number;
  nav_altitude_mcp: number;
  nav_heading: number;
  nav_qnh: number;
  nic: number;
  nic_baro: number;
  r: string;
  rc: number;
  rssi: number;
  sda: number;
  seen: number;
  seen_pos: number;
  sil: number;
  sil_type: string;
  spi: number;
  squawk: string;
  t: string;
  tisb: string[];
  track: number;
  type: string;
  version: number;
  geom_rate: number;
  dbFlags: number;
  nav_modes: string[];
  true_heading: number;
  ias: number;
  mach: number;
  mag_heading: number;
  oat: number;
  roll: number;
  tas: number;
  tat: number;
  track_rate: number;
  wd: number;
  ws: number;
  gpsOkBefore: number;
  gpsOkLat: number;
  gpsOkLon: number;
  lastPosition: {
    lat: number;
    lon: number;
    nic: number;
    rc: number;
    seen_pos: number;
  };
  rr_lat: number;
  rr_lon: number;
  calc_track: number;
  nav_altitude_fms: number;
}

interface ApiResponse {
  ac: Aircraft[];
  ctime: number;
  msg: string;
  now: number;
  ptime: number;
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdsbService {
  private baseUrl = 'https://api.adsb.lol/v2';
  private proxyPath = '/adsb/v2';

  constructor(private httpClient: HttpClient, private platform: Platform) { }

  getHeaders() {
    return {
      'Accept': 'application/json',
    };
  }

  getPiaAircrafts(): Observable<ApiResponse> {
    return this.sendHttpRequest(`/pia`);
  }

  getMilAircrafts(): Observable<ApiResponse> {
    return this.sendHttpRequest(`/mil`);
  }

  getLaddAircrafts(): Observable<ApiResponse> {
    return this.sendHttpRequest(`/ladd`);
  }

  getSquawkAircrafts(squawk: string): Observable<ApiResponse> {
    return this.sendHttpRequest(`/squawk/${squawk}`);
  }

  getAircraftType(type: string): Observable<ApiResponse> {
    return this.sendHttpRequest(`/type/${type}`);
  }

  getAircraftRegistration(registration: string): Observable<ApiResponse> {
    return this.sendHttpRequest(`/registration/${registration}`);
  }

  getAircraftIcao(icao: string): Observable<ApiResponse> {
    return this.sendHttpRequest(`/icao/${icao}`);
  }

  getAircraftsByCallsign(callsign: string): Observable<ApiResponse> {
    return this.sendHttpRequest(`/callsign/${callsign}`);
  }

  getAircraftsByLocation(lat: number, lon: number, radius: number = 250): Observable<ApiResponse> {
    let url = `/lat/${lat}/lon/${lon}/dist/${radius}`;
    return this.sendHttpRequest(url);
  }

  getClosestAircraft(lat: number, lon: number, radius: number): Observable<ApiResponse> {
    return this.sendHttpRequest(`/closest/${lat}/${lon}/${radius}`);
  }

  private sendHttpRequest(url: string): Observable<ApiResponse> {
    if (this.platform.is('capacitor')) {
      return from(
        Http.request({
          method: 'GET',
          url: `${this.baseUrl}${url}`,
          headers: this.getHeaders(),
        }).then((response: HttpResponse) => response.data)
          .catch((err: HttpErrorResponse) => {
            console.log('Error sending HTTP request:', err);
            throw err; // Adjust error handling as necessary
          })
      );
    } else {
      return this.httpClient.get<ApiResponse>(`${this.proxyPath}${url}`);
    }
  }
}