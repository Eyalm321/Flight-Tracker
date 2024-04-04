import { Injectable } from '@angular/core';
import { GmapsService } from './gmaps.service';
import { MapDataService } from './map-data.service';
import { Observable, Subject } from 'rxjs';

export interface ExtendedMarker extends google.maps.marker.AdvancedMarkerElement {
  id: string;
  heading: number;
  model: string;
}

export interface MarkerProps {
  id: string;
  lat: number;
  lng: number;
  title: string;
  heading: number;
  model: string;
  registration: string;
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
      marker.heading = props.heading;
      marker.model = props.model;



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

  async addOrUpdateMarker(markerProps: MarkerProps) {
    const existingMarker = this.markers[markerProps.id];
    if (existingMarker) {
      // Smooth transition for position
      this.transitionMarkerPosition(existingMarker, markerProps.lat, markerProps.lng, markerProps.heading);

      // Smooth rotation transition
      if (existingMarker.content) {
        const airplaneElement = existingMarker.content as HTMLElement;
        airplaneElement.style.transition = 'transform 6s ease-out';
        airplaneElement.style.transform = `rotate(${markerProps.heading}deg)`;
      }
    } else {
      const mapInstance = this.mapDataService.getMapInstance();
      if (mapInstance) {
        const newMarker = await this.createMarker(markerProps, mapInstance);
        if (newMarker) {
          this.markers[markerProps.id] = newMarker;
        }
      }
    }
  }

  transitionMarkerPosition(marker: ExtendedMarker, lat: number, lng: number, newHeading: number): void {
    if (!marker || !marker.position) return;

    const startLat = Number(marker.position.lat);
    const startLng = Number(marker.position.lng);
    const duration = 6000;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsedTime = currentTime - startTime;
      const fraction = Math.min(elapsedTime / duration, 1);
      const nextLat = startLat + (lat - startLat) * fraction;
      const nextLng = startLng + (lng - startLng) * fraction;
      marker.position = new google.maps.LatLng(nextLat, nextLng);

      this.rotateMarker(marker, newHeading);

      if (fraction < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
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
    this.rotateMarker(marker, heading);
  }

  rotateMarker(marker: ExtendedMarker, heading: number): void {
    if (!marker) {
      console.error('No marker available');
      return;
    }
    const airplaneElement = marker.content as HTMLElement;
    airplaneElement.style.transform = `rotate(${heading}deg)`;
  }

  printAllPlaneTypes(): void {
    const types = Object.keys(this.markers).map(key => this.markers[key].model);

  }
}
