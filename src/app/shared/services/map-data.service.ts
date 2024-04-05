import { Injectable } from '@angular/core';
import { GmapsService } from './gmaps.service';
import { first, of, switchMap } from 'rxjs';
import { ThemeWatcherService } from './theme-watcher.service';
import { OrientationService } from './orientation.service';

@Injectable({
  providedIn: 'root'
})
export class MapDataService {
  private mapId: { light: string; dark: string; } = { light: '14ea4fe39938305f', dark: '4b22f24c4ce94fa2' };
  private mapOptions?: google.maps.MapOptions = {
    disableDefaultUI: true,
    center: { lat: 39.77222, lng: -101.7999 },
    zoom: 8,
    mapId: this.mapId.light,
  };

  private mapInstance?: google.maps.Map;
  private polyline?: google.maps.Polyline;


  constructor(private gmapsService: GmapsService, private orientationService: OrientationService) {

  }

  initNewMapInstance(): void {
    this.mapInstance = undefined;

  }

  getPolyline(): google.maps.Polyline | undefined {
    return this.polyline;
  }

  async initializeMap(element: HTMLElement, isDarkTheme: boolean): Promise<google.maps.Map | undefined> {
    return new Promise((resolve, reject) => {
      this.gmapsService.mapApiLoaded$.pipe(
        first(isLoaded => isLoaded),
        switchMap(() => {
          try {
            if (!this.mapOptions) return of(null);
            this.mapOptions.mapId = isDarkTheme ? this.mapId.dark : this.mapId.light;
            const mapInstance = new google.maps.Map(element, this.mapOptions);

            this.mapInstance = mapInstance;

            resolve(mapInstance);

            return of(null); // Add this line to return an observable
          } catch (error) {
            console.error('Error initializing the Maps library:', error);
            reject(error);
            return of(null); // Add this line to return an observable
          }
        })
      ).subscribe();
    });
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

  centerMapByLatLng(lat: number, lon: number): void {
    if (!this.mapInstance) {
      console.error('Map instance not available');
      return;
    }

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
  }


}
