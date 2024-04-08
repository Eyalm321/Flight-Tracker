import { Injectable } from '@angular/core';
import { GmapsService } from './gmaps.service';
import { Observable, catchError, first, map, of, switchMap } from 'rxjs';
import { ThemeWatcherService } from './theme-watcher.service';
import { OrientationService } from './orientation.service';
import { GeolocationService } from './geolocation.service';

@Injectable({
  providedIn: 'root'
})
export class MapDataService {
  private mapId: { light: string; dark: string; } = { light: '14ea4fe39938305f', dark: '4b22f24c4ce94fa2' };
  private defaultCenter: google.maps.LatLngLiteral = { lat: 39.77222, lng: -101.7999 };
  private mapOptions?: google.maps.MapOptions = {
    disableDefaultUI: true,
    center: this.defaultCenter,
    zoom: 8,
    mapId: this.mapId.light,
  };

  private mapInstance?: google.maps.Map;
  private polyline?: google.maps.Polyline;


  constructor(private gmapsService: GmapsService, private orientationService: OrientationService, private geolocationService: GeolocationService) { }

  initNewMapInstance(): void {
    this.mapInstance = undefined;

  }

  getPolyline(): google.maps.Polyline | undefined {
    return this.polyline;
  }

  initializeMap(element: HTMLElement, isDarkTheme: boolean): Observable<google.maps.Map | undefined> {
    return this.gmapsService.mapApiLoaded$.pipe(
      first(isLoaded => isLoaded),
      switchMap(() => this.geolocationService.getCurrentPosition()),
      map(position => {
        console.log('Position:', position);

        if (!this.mapOptions || !position) return undefined;
        this.mapOptions.center = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);

        console.log('Center:', this.mapOptions?.center);

        if (!this.mapOptions) return undefined;
        this.mapOptions.mapId = isDarkTheme ? this.mapId.dark : this.mapId.light;
        const mapInstance = new google.maps.Map(element, this.mapOptions);

        this.mapInstance = mapInstance;
        console.log('Map instance:', mapInstance);

        return mapInstance;
      }),
      catchError(error => {
        console.error('Error initializing the Maps library:', error);
        throw error;
      })
    );
  }


  addFlightPathPolyline(path: google.maps.LatLngLiteral[], waypoints: google.maps.LatLngLiteral[]): void {
    if (!this.mapInstance) {
      console.error('Map instance not available');
      return;
    }

    const fullPath = this.integrateWaypointsIntoPath(path, waypoints);


    const polyline = new google.maps.Polyline({
      path: fullPath,
      geodesic: true,
      strokeColor: '#248e47',
      strokeOpacity: 1.0,
      strokeWeight: 2,
      zIndex: 2
    });

    this.polyline = polyline;
    this.polyline.setMap(this.mapInstance);
  }


  integrateWaypointsIntoPath(path: google.maps.LatLngLiteral[], waypoints: google.maps.LatLngLiteral[]): google.maps.LatLngLiteral[] {
    // Assuming path has at least two points (start and end), and waypoints are additional points to be integrated
    let fullPath = [path[0], ...waypoints, path[path.length - 1]];

    return fullPath;
  }

  clearPolyline(): void {
    if (!this.mapInstance || !this.polyline) {
      console.error('Map instance or polyline not available');
      return;
    }

    this.polyline?.setMap(null);
    this.polyline = undefined;
  }

  getMapInstance(): google.maps.Map | undefined {
    if (!this.mapInstance) {
      console.error('Map instance not available');
    }
    return this.mapInstance;
  }

  centerMapByLatLng(lat: number, lon: number, isFlightView: boolean): void {
    if (!this.mapInstance) {
      console.error('Map instance not available');
      return;
    }

    if (isFlightView) {
      const offsetX = 0.3;
      const offsetY = 0.15;

      const orientation = this.orientationService.getCurrentOrientation();
      if (orientation === 'landscape') {
        const centerWithOffsetX = { lat: lat, lng: lon + offsetX };
        this.mapInstance.setCenter(centerWithOffsetX);
        return;
      }

      const centerWithOffsetY = { lat: lat - offsetY, lng: lon };
      this.mapInstance.setCenter(centerWithOffsetY);
    } else {
      this.mapInstance.setCenter({ lat: lat, lng: lon });
    }
  }


}
