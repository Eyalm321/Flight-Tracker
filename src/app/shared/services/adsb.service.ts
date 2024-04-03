import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of, throwError } from 'rxjs';

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

  constructor(private http: HttpClient) { }

  getHeaders() {
    return new HttpHeaders({
      'Accept': 'application/json',
    });
  }

  getPiaAircrafts(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`/adsb/v2/pia`, { headers: this.getHeaders() });
  }

  getMilAircrafts(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.baseUrl}/mil`, { headers: this.getHeaders() });
  }

  getLaddAircrafts(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.baseUrl}/ladd`, { headers: this.getHeaders() });
  }

  getSquawkAircrafts(squawk: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.baseUrl}/squawk/${squawk}`, { headers: this.getHeaders() });
  }

  getAircraftType(type: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.baseUrl}/type/${type}`, { headers: this.getHeaders() });
  }

  getAircraftRegistration(registration: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.baseUrl}/registration/${registration}`, { headers: this.getHeaders() });
  }

  getAircraftIcao(icao: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.baseUrl}/icao/${icao}`, { headers: this.getHeaders() });
  }

  getAircraftsByCallsign(callsign: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.baseUrl}/callsign/${callsign}`, { headers: this.getHeaders() });
  }

  getAircraftsByLocation(lat: number, lon: number, radius: number = 250): Observable<ApiResponse> {
    let url = `${this.baseUrl}/lat/${lat}/lon/${lon}/dist/${radius}`;
    return this.http.get<ApiResponse>(url, { headers: this.getHeaders() }).pipe(
      catchError(err => {
        console.log('Error getting aircrafts by location:', err);
        return throwError(() => err);
      })
    );
  }

  getClosestAircraft(lat: number, lon: number, radius: number): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.baseUrl}/closest/${lat}/${lon}/${radius}`, { headers: this.getHeaders() });
  }
}