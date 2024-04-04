import { Injectable } from '@angular/core';
import { GmapsService } from './gmaps.service';
import { MapDataService } from './map-data.service';
import { Observable, Subject } from 'rxjs';

export interface ExtendedMarker extends google.maps.marker.AdvancedMarkerElement {
  id: string;
}

export interface MarkerProps {
  id: string;
  lat: number;
  lng: number;
  title: string;
  heading: number;
}

@Injectable({
  providedIn: 'root'
})
export class MapMarkerService {
  private markerClickedSubject: Subject<MarkerProps> = new Subject<MarkerProps>();
  private markers: { [id: string]: ExtendedMarker; } = {};

  markerClicked$: Observable<MarkerProps> = this.markerClickedSubject.asObservable();
  selectedMarker?: ExtendedMarker;
  constructor(private gmapsService: GmapsService, private mapDataService: MapDataService) { }

  async createMarker(props: MarkerProps, mapInstance: google.maps.Map): Promise<ExtendedMarker | undefined> {
    try {
      await this.gmapsService.loadMarkerLibrary();
      const airplaneElement = document.createElement('img');

      airplaneElement.src = 'assets/images/airplane.png';
      airplaneElement.style.width = '32px';
      airplaneElement.style.height = '32px';
      airplaneElement.style.position = 'absolute';
      airplaneElement.style.top = '-16px';
      airplaneElement.style.left = '-16px';
      airplaneElement.style.transform = `rotate(${props.heading}deg)`;
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: props.lat, lng: props.lng },
        map: mapInstance,
        title: props.title,
        content: airplaneElement,
        zIndex: 1000
      }) as ExtendedMarker;

      marker.id = `${props.id}`;
      marker.style.cursor = 'pointer';

      marker.addListener('click', () => this.onClickMarker(props));
      return marker;
    } catch (error) {
      console.error('Error initializing the Marker library:', error);
      return;
    }
  }

  private onClickMarker(marker: MarkerProps): void {
    this.scaleSelectedMarker(1);

    this.selectedMarker = this.markers[marker.id];
    this.markerClickedSubject.next(marker);

    this.scaleSelectedMarker();
  }

  getSelectedMarker(): ExtendedMarker | undefined {
    return this.selectedMarker;
  }

  changePathMiddleWaypoints(path: { lat: number, lng: number; }[]): void {
    const polyline = this.mapDataService.getPolyline();
    const renderedPath = polyline?.getPath().getArray() ?? [];
    console.log('path:', renderedPath);
    const origin = renderedPath[0];
    const destination = renderedPath[renderedPath.length - 1];
    const pathArray = [origin, ...path, destination];
    if (polyline) {
      polyline.setPath(pathArray);
    }
  }


  removeMarker(markerId: string): void {
    const marker = this.markers[markerId];
    if (marker) {
      // Assuming you have a method to actually remove the marker from the map
      marker.map = null; // Removes the marker from the Google Map
      delete this.markers[markerId]; // Remove the marker from the dictionary
    }
  }

  async addOrUpdateMarker(markerProps: MarkerProps): Promise<void> {
    const existingMarker = this.markers[markerProps.id];
    if (existingMarker) {
      // Update existing marker position and heading
      existingMarker.position = new google.maps.LatLng(markerProps.lat, markerProps.lng);
      // Assuming the marker's icon (airplaneElement) can be directly manipulated:
      if (existingMarker.content) {
        const airplaneElement = existingMarker.content as HTMLImageElement;
        airplaneElement.style.transform = `rotate(${markerProps.heading}deg)`;
      }

    } else {
      const mapInstance = this.mapDataService.getMapInstance();
      // Add new marker if it doesn't exist
      if (mapInstance) {
        const newMarker = await this.createMarker(markerProps, mapInstance);
        if (newMarker) {
          this.markers[markerProps.id] = newMarker;
        }
      }
    }
  }

  async updateMarkers(markerPropsArray: MarkerProps[]): Promise<void> {
    // Create a set of new data IDs for easier lookup
    const newDataIds = new Set(markerPropsArray.map(props => props.id));

    // Add or update markers based on the new data
    for (const markerProps of markerPropsArray) {
      await this.addOrUpdateMarker(markerProps);
    }

    // Identify markers to remove (those not in the new data)
    Object.keys(this.markers).forEach(markerId => {
      if (!newDataIds.has(markerId)) {
        this.removeMarker(markerId);
      }
    });
  }

  scaleSelectedMarker(scale: number = 2): void {
    if (!this.selectedMarker?.id) return;
    const markerContent = this.markers[this.selectedMarker.id];
    console.log('markerContent:', markerContent);
    const size = 32 * scale;
    if (markerContent && markerContent instanceof HTMLElement) {
      markerContent.style.width = `${size}px`;
      markerContent.style.height = `${size}px`;
      markerContent.style.top = `-${size / 2}px`;
      markerContent.style.left = `-${size / 2}px`;
    }
  }

  clearAllOtherMarkers(markerId: string): void {
    Object.keys(this.markers).forEach(id => {
      if (id !== markerId) {
        this.removeMarker(id);
      }
    });
  }

  positionMarker(marker: ExtendedMarker, lat: number, lon: number, heading: number): void {
    if (!marker) {
      console.error('No marker available');
      return;
    }
    const position = new google.maps.LatLng(lat, lon);
    marker.position = position;
    marker.style.transform = `rotate(${heading}deg)`;
  }
}
