import { Inject, Injectable } from '@angular/core';
import { GmapsService } from './gmaps.service';
import { Observable, first, of, switchMap } from 'rxjs';
import { AirplaneCardComponent } from 'src/app/common/cards/airplane-card/airplane-card.component';
import { ExtendedMarker } from './map-marker.service';

@Injectable({
  providedIn: 'root'
})
export class MapDataService {
  private mapOptions?: google.maps.MapOptions;
  private mapId?: string;
  private defaultCenter?: google.maps.LatLngLiteral;
  private mapInstance?: google.maps.Map;
  private mapOverlay?: any;
  private polyline?: google.maps.Polyline;


  constructor(private gmapsService: GmapsService) {
    this.initMapOptions();
  }

  private initMapOptions() {
    this.defaultCenter = { lat: 39.77222, lng: -101.7999 };
    this.mapId = '4aa5d613ffc8df24';

    this.mapOptions = {
      disableDefaultUI: true,
      center: this.defaultCenter,
      zoom: 6,
      mapId: this.mapId
    };
  }

  async initializeMap(element: HTMLElement): Promise<google.maps.Map | undefined> {
    return new Promise((resolve, reject) => {
      this.gmapsService.mapApiLoaded$.pipe(
        first(isLoaded => isLoaded),
        switchMap(() => {
          try {
            const mapInstance = new google.maps.Map(element, this.mapOptions);
            if (mapInstance.get("mapId") === this.mapId) {
              this.mapInstance = mapInstance;
              setTimeout(() => {
                this.addOverlay();
              }, 500);
              resolve(mapInstance);
            } else {
              reject('Map ID does not match.');
            }
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

  private addOverlay(): void {
    if (!this.mapInstance) {
      console.error('No map instance available');
      return;
    }

    const div = document.createElement('div');
    div.id = 'map-overlay';
    div.style.width = '100%';
    div.style.height = '100%';
    div.style.position = 'absolute';
    div.style.top = '0';
    div.style.left = '0';
    div.style.backgroundColor = '#000000';
    div.style.opacity = '0.6';
    div.style.zIndex = '1';
    div.style.pointerEvents = 'none';
    console.log(this.mapInstance.getDiv().getElementsByClassName('gm-style')[0].firstElementChild);
    this.mapInstance.getDiv().getElementsByClassName('gm-style')[0].firstElementChild?.appendChild(div);
  }

  addFlightPathPolyline(path: google.maps.LatLngLiteral[], waypoints: google.maps.LatLngLiteral[]): void {
    if (!this.mapInstance) {
      console.error('Map instance not available');
      return;
    }

    const fullPath = this.integrateWaypointsIntoPath(path, waypoints);
    console.log('Full path:', fullPath);

    const polyline = new google.maps.Polyline({
      path: fullPath,
      geodesic: true,
      strokeColor: '#FF0000',
      strokeOpacity: 1.0,
      strokeWeight: 2,
    });
    console.log('Polyline:', polyline);
    this.polyline = polyline;
    this.polyline.setMap(this.mapInstance);
  }


  integrateWaypointsIntoPath(path: google.maps.LatLngLiteral[], waypoints: google.maps.LatLngLiteral[]): google.maps.LatLngLiteral[] {
    // Assuming path has at least two points (start and end), and waypoints are additional points to be integrated
    let fullPath = [path[0], ...waypoints, path[path.length - 1]];

    return fullPath;
  }

  clearPolyline(): void {
    if (!this.mapInstance) {
      console.error('Map instance not available');
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

    this.mapInstance.setCenter({ lat, lng: lon });
  }


}
