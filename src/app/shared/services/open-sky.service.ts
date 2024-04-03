import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

interface StateVectorResponse {
  time: number;
  states: StateVector[]; // For simplicity, using any. Define a proper interface based on actual data structure.
}

interface FlightResponse {
  // Define this based on the actual structure of the flights response
}

interface TrackResponse {
  // Define this based on the actual structure of the track response
}

type StateVector = [
  icao24: string, // Unique ICAO 24-bit address of the transponder in hex string representation
  callsign: string, // Callsign of the vehicle. May have trailing spaces
  origin_country: string, // Country name inferred from the ICAO 24-bit address
  time_position: number | null, // Unix timestamp (seconds) for the last position update. Can be null
  last_contact: number, // Unix timestamp (seconds) for the last update in general
  longitude: number | null, // WGS-84 longitude in decimal degrees. Can be null
  latitude: number | null, // WGS-84 latitude in decimal degrees. Can be null
  baro_altitude: number | null, // Barometric altitude in meters. Can be null
  on_ground: boolean, // Boolean value indicating if the position was retrieved from a surface position report
  velocity: number | null, // Velocity over ground in m/s. Can be null
  true_track: number | null, // True track in decimal degrees clockwise from north (north=0°). Can be null
  vertical_rate: number | null, // Vertical rate in m/s. Can be null
  sensors: number[] | null, // IDs of the receivers which contributed to this state vector. Can be null
  geo_altitude: number | null, // Geometric altitude in meters. Can be null
  squawk: string | null, // The transponder code aka Squawk. Can be null
  spi: boolean, // Whether the flight status indicates special purpose indicator
  position_source: number // Origin of this state’s position: 0 = ADS-B, 1 = ASTERIX, 2 = MLAT, 3 = FLARM
];

@Injectable({
  providedIn: 'root',
})
export class OpenSkyService {
  private readonly baseUrl = 'https://opensky-network.org/api';

  constructor(private http: HttpClient) { }

  getAllStateVectors(opts: { time?: number, icao24?: string[], lamin?: number, lomin?: number, lamax?: number, lomax?: number; }): Observable<StateVectorResponse> {
    let params = new HttpParams();
    if (opts.time) {
      params = params.append('time', opts.time.toString());
    }
    if (opts.icao24 && opts.icao24.length) {
      opts.icao24.forEach(code => {
        params = params.append('icao24', code);
      });
    }
    if (opts.lamin !== undefined && opts.lomin !== undefined && opts.lamax !== undefined && opts.lomax !== undefined) {
      params = params.append('lamin', opts.lamin.toString())
        .append('lomin', opts.lomin.toString())
        .append('lamax', opts.lamax.toString())
        .append('lomax', opts.lomax.toString());
    }

    return this.http.get<StateVectorResponse>(`${this.baseUrl}/states/all`, { params });
  }

  getOwnStateVectors(time?: number, icao24?: string[], serials?: number[]): Observable<StateVectorResponse> {
    let params = new HttpParams();
    if (time) {
      params = params.append('time', time.toString());
    }
    if (icao24 && icao24.length) {
      icao24.forEach(code => {
        params = params.append('icao24', code);
      });
    }
    if (serials && serials.length) {
      serials.forEach(serial => {
        params = params.append('serials', serial.toString());
      });
    }

    return this.http.get<StateVectorResponse>(`${this.baseUrl}/states/own`, { params, withCredentials: true });
  }

  getFlights(begin: number, end: number): Observable<FlightResponse[]> {
    const params = new HttpParams()
      .set('begin', begin.toString())
      .set('end', end.toString());

    return this.http.get<FlightResponse[]>(`${this.baseUrl}/flights/all`, { params });
  }

  getFlightsByAircraft(icao24: string, begin: number, end: number): Observable<FlightResponse[]> {
    const params = new HttpParams()
      .set('icao24', icao24)
      .set('begin', begin.toString())
      .set('end', end.toString());

    return this.http.get<FlightResponse[]>(`${this.baseUrl}/flights/aircraft`, { params });
  }

  getArrivalsByAirport(airport: string, begin: number, end: number): Observable<FlightResponse[]> {
    const params = new HttpParams()
      .set('airport', airport)
      .set('begin', begin.toString())
      .set('end', end.toString());

    return this.http.get<FlightResponse[]>(`${this.baseUrl}/flights/arrival`, { params });
  }

  getDeparturesByAirport(airport: string, begin: number, end: number): Observable<FlightResponse[]> {
    const params = new HttpParams()
      .set('airport', airport)
      .set('begin', begin.toString())
      .set('end', end.toString());

    return this.http.get<FlightResponse[]>(`${this.baseUrl}/flights/departure`, { params });
  }

  getTrackByAircraft(icao24: string, time: number): Observable<TrackResponse> {
    const params = new HttpParams()
      .set('icao24', icao24.toLowerCase())
      .set('time', time.toString());

    return this.http.get<TrackResponse>(`${this.baseUrl}/tracks`, { params });
  }
}