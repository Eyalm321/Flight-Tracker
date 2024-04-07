import { Injectable } from '@angular/core';
import { GmapsService } from './gmaps.service';
import { MapDataService } from './map-data.service';
import { Observable, Subject } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';

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
  altitude: number;
  _type?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MapMarkerService {
  private markerClickedSubject: Subject<MarkerProps> = new Subject<MarkerProps>();
  private markers: { [id: string]: ExtendedMarker; } = {};

  markerClicked$: Observable<MarkerProps> = this.markerClickedSubject.asObservable();
  selectedMarker?: ExtendedMarker;
  private markerSize = 24;
  constructor(private gmapsService: GmapsService, private mapDataService: MapDataService, private sanitizer: DomSanitizer) { }

  async createMarker(props: MarkerProps, mapInstance: google.maps.Map): Promise<ExtendedMarker | undefined> {
    try {
      await this.gmapsService.loadMarkerLibrary();

      // Pre-configure the SVG element's properties to minimize reflows and repaints
      const svgElement = this.prepareSvgElement(props);

      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: new google.maps.LatLng(props.lat, props.lng),
        map: mapInstance,
        title: props.title,
        content: svgElement,
        zIndex: 1000,
        collisionBehavior: google.maps.CollisionBehavior.REQUIRED_AND_HIDES_OPTIONAL
      }) as ExtendedMarker;

      // Apply additional properties to the marker
      Object.assign(marker, {
        id: props.id,
        style: { cursor: 'pointer' },
        heading: props.heading,
        model: props.model
      });
      marker.addListener('click', () => this.onClickMarker(props));
      return marker;
    } catch (error) {
      console.error('Error initializing the Marker library:', error);
    }
    return undefined;
  }

  // Refactored out SVG element preparation to its own method
  private prepareSvgElement(props: MarkerProps): HTMLElement {
    const svgElement = document.createElement('img');
    svgElement.src = props._type === 'military' ? './assets/icons/airplane_green.svg' : './assets/icons/airplane_red.svg';
    const scale = this.getScaleByAltitude(props.altitude); // Fixed typo from 'Altitute' to 'Altitude'
    const size = this.markerSize;

    // Pre-set styles as a single assignment to minimize reflows
    Object.assign(svgElement.style, {
      width: `${size}px`,
      height: `${size}px`,
      position: 'absolute',
      top: `${-size / 2}px`,
      left: `${-size / 2}px`,
      transition: 'transform 3s ease-out',
      transform: `rotate(${props.heading}deg) scale(${scale})`
    });

    return svgElement;
  }

  async loadSvg() {
    const svgPath = './assets/icons/airplane.svg';
    const svgContent = await fetch(svgPath).then(response => response.text());
    return this.sanitizer.bypassSecurityTrustHtml(svgContent);
  }

  private onClickMarker(marker: MarkerProps): void {
    this.selectedMarker = this.markers[marker.id];
    this.markerClickedSubject.next(marker);
  }

  getVisibleMarkersAmount(): number {
    return Object.values(this.markers).length;
  }

  getSelectedMarker(): ExtendedMarker | undefined {
    return this.selectedMarker;
  }

  setSelectedMarker(marker: ExtendedMarker): void {
    this.selectedMarker = marker;
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
    if (!markerProps.lat || !markerProps.lng) return;
    const existingMarker = this.markers[markerProps.id];
    if (existingMarker) {
      // Smooth transition for position
      this.transitionMarkerPosition(existingMarker, markerProps.lat, markerProps.lng, markerProps.heading);

      // Smooth rotation transition
      if (existingMarker.content) {
        const airplaneElement = existingMarker.content as HTMLElement;

        airplaneElement.style.transform = `rotate(${markerProps.heading}deg)`;
        airplaneElement.style.scale = `${this.getScaleByAltitude(markerProps.altitude)}`;
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

  private getScaleByAltitude(altitude: number): number {
    if (altitude < 10000) {
      return 1;
    } else if (altitude >= 10000 && altitude < 20000) {
      return 1.2;
    } else if (altitude >= 20000 && altitude < 30000) {
      return 1.4;
    } else if (altitude >= 30000 && altitude < 40000) {
      return 1.5;
    } else {
      return 1.6;
    }
  }

  clearAllMarkers(): void {
    this.markers = {};
  }

  transitionMarkerPosition(marker: ExtendedMarker, lat: number, lng: number, newHeading: number): void {
    if (!marker || !marker.position) return;

    const startLat = Number(marker.position.lat);
    const startLng = Number(marker.position.lng);
    const duration = 4000;
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

  scaleSelectedMarker(scale: number = 1.5): void {
    if (!this.selectedMarker?.id) return;
    const markerContent = this.markers[this.selectedMarker.id].content;

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
