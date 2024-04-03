import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, forkJoin, from, map, of, throwError } from 'rxjs';
import { Http } from '@capacitor-community/http';
import { HttpResponse } from '@capacitor/core';

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
  private baseUrl = '/adsb/v2';

  constructor() { }

  getHeaders() {
    return {
      'Accept': 'application/json',
    };
  }

  getPiaAircrafts(): Observable<ApiResponse> {
    return from(
      Http.request({
        method: 'GET',
        url: '/adsb/v2/pia',
        headers: this.getHeaders(),
      }).then((response: HttpResponse) => response.data)
        .catch((err: HttpErrorResponse) => {
          console.log('Error getting PIA aircrafts:', err);
          throw err; // Adjust error handling as necessary
        })
    );
  }

  getMilAircrafts(): Observable<ApiResponse> {
    return from(
      Http.request({
        method: 'GET',
        url: `${this.baseUrl}/mil`,
        headers: this.getHeaders(),
      }).then((response: HttpResponse) => response.data)
        .catch((err: HttpErrorResponse) => {
          console.log('Error getting MIL aircrafts:', err);
          throw err; // Adjust error handling as necessary
        })
    );
  }

  getLaddAircrafts(): Observable<ApiResponse> {
    return from(
      Http.request({
        method: 'GET',
        url: `${this.baseUrl}/ladd`,
        headers: this.getHeaders(),
      }).then((response: HttpResponse) => response.data)
        .catch((err: HttpErrorResponse) => {
          console.log('Error getting LADD aircrafts:', err);
          throw err; // Adjust error handling as necessary
        })
    );
  }

  getSquawkAircrafts(squawk: string): Observable<ApiResponse> {
    return from(
      Http.request({
        method: 'GET',
        url: `${this.baseUrl}/squawk/${squawk}`,
        headers: this.getHeaders(),
      }).then((response: HttpResponse) => response.data)
        .catch((err: HttpErrorResponse) => {
          console.log('Error getting aircrafts by squawk:', err);
          throw err; // Adjust error handling as necessary
        })
    );
  }

  getAircraftType(type: string): Observable<ApiResponse> {
    return from(
      Http.request({
        method: 'GET',
        url: `${this.baseUrl}/type/${type}`,
        headers: this.getHeaders(),
      }).then((response: HttpResponse) => response.data)
        .catch((err: HttpErrorResponse) => {
          console.log('Error getting aircrafts by type:', err);
          throw err; // Adjust error handling as necessary
        })
    );
  }

  getAircraftRegistration(registration: string): Observable<ApiResponse> {
    return from(
      Http.request({
        method: 'GET',
        url: `${this.baseUrl}/registration/${registration}`,
        headers: this.getHeaders(),
      }).then((response: HttpResponse) => response.data)
        .catch((err: HttpErrorResponse) => {
          console.log('Error getting aircrafts by registration:', err);
          throw err; // Adjust error handling as necessary
        })
    );
  }

  getAircraftIcao(icao: string): Observable<ApiResponse> {
    return from(
      Http.request({
        method: 'GET',
        url: `${this.baseUrl}/icao/${icao}`,
        headers: this.getHeaders(),
      }).then((response: HttpResponse) => response.data)
        .catch((err: HttpErrorResponse) => {
          console.log('Error getting aircrafts by ICAO:', err);
          throw err; // Adjust error handling as necessary
        })
    );
  }

  getAircraftsByCallsign(callsign: string): Observable<ApiResponse> {
    return from(
      Http.request({
        method: 'GET',
        url: `${this.baseUrl}/callsign/${callsign}`,
        headers: this.getHeaders(),
      }).then((response: HttpResponse) => response.data)
        .catch((err: HttpErrorResponse) => {
          console.log('Error getting aircrafts by callsign:', err);
          throw err; // Adjust error handling as necessary
        })
    );
  }

  getAircraftsByLocation(lat: number, lon: number, radius: number = 250): Observable<ApiResponse> {
    let url = `${this.baseUrl}/lat/${lat}/lon/${lon}/dist/${radius}`;
    return from(
      Http.request({
        method: 'GET',
        url: url,
        headers: this.getHeaders(),
      }).then((response: HttpResponse) => response.data)
        .catch((err: HttpErrorResponse) => {
          console.log('Error getting aircrafts by location:', err);
          throw err; // Adjust error handling as necessary
        })
    );
  }

  getClosestAircraft(lat: number, lon: number, radius: number): Observable<ApiResponse> {
    return from(
      Http.request({
        method: 'GET',
        url: `${this.baseUrl}/closest/${lat}/${lon}/${radius}`,
        headers: this.getHeaders(),
      }).then((response: HttpResponse) => response.data)
        .catch((err: HttpErrorResponse) => {
          console.log('Error getting closest aircraft:', err);
          throw err; // Adjust error handling as necessary
        })
    );
  }
}