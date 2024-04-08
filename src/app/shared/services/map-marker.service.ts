import { Injectable } from '@angular/core';
import { GmapsService } from './gmaps.service';
import { MapDataService } from './map-data.service';
import { Observable, Subject, catchError, filter, of, switchMap, take, tap } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';
import { AirplaneDataService } from './airplane-data.service';

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
  private myPositionMarker?: google.maps.marker.AdvancedMarkerElement;
  private markerSize = 24;
  constructor(private gmapsService: GmapsService, private mapDataService: MapDataService, private sanitizer: DomSanitizer, private airplaneDataService: AirplaneDataService) { }

  createMarker(props: MarkerProps, mapInstance: google.maps.Map): Observable<ExtendedMarker | undefined> {
    return this.gmapsService.markerApiLoaded$.pipe(
      take(1),
      switchMap(() => {
        console.log('Creating marker:', props);

        const svgElement = this.prepareSvgElement(props);

        const marker = new google.maps.marker.AdvancedMarkerElement({
          position: new google.maps.LatLng(props.lat, props.lng),
          map: mapInstance,
          title: props.title,
          content: svgElement,
          zIndex: 1000,
        }) as ExtendedMarker;

        // Apply additional properties to the marker
        Object.assign(marker, {
          id: props.id,
          style: { cursor: 'pointer' },
          heading: props.heading,
          model: props.model
        });
        marker.addListener('click', () => this.onClickMarker(props));
        return of(marker);
      }),
      catchError(error => {
        console.error('Error creating marker:', error);
        return of(undefined);
      })
    );
  }

  // Refactored out SVG element preparation to its own method
  private prepareSvgElement(props: MarkerProps): HTMLElement {
    const svgElement = document.createElement('img');
    svgElement.src = this.airplaneDataService.getAircraftTypeMarkerIcon(props.model);
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

  addOrUpdateMarker(markerProps: MarkerProps): void {
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
        this.createMarker(markerProps, mapInstance).pipe(
          take(1),
          filter(newMarker => !!newMarker),
          tap(newMarker => console.log('New marker created:', newMarker)))
          .subscribe(
            marker => this.markers[markerProps.id] = marker as ExtendedMarker,
          );
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

  updateMarkers(markerPropsArray: MarkerProps[]): void {
    // Create a set of new data IDs for easier lookup
    const newDataIds = new Set(markerPropsArray.map(props => props.id));

    // Add or update markers based on the new data
    for (const markerProps of markerPropsArray) {
      this.addOrUpdateMarker(markerProps);
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

  createMyPositionMarker(lat: number, lon: number): google.maps.marker.AdvancedMarkerElement | undefined {
    const mapInstance = this.mapDataService.getMapInstance();
    if (!mapInstance) {
      console.error('Map instance not available');
      return;
    }
    const size = 18;
    const pinSvgPath = './assets/icons/blue-dot.svg';

    const pinSvgElement = document.createElement('img');
    pinSvgElement.src = pinSvgPath;
    console.log(pinSvgElement);

    Object.assign(pinSvgElement.style, {
      width: `${size}px`,
      height: `${size}px`,
      position: 'absolute',
      top: `${-size / 2}px`,
      left: `${-size / 2}px`,
    });


    const marker = new google.maps.marker.AdvancedMarkerElement({
      position: { lat, lng: lon },
      map: mapInstance,
      title: 'My Position',
      zIndex: 1001,
      content: pinSvgElement
    });



    return marker;
  }

  updateMyPositionMarker(lat: number, lon: number): void {
    if (!this.myPositionMarker) {
      this.myPositionMarker = this.createMyPositionMarker(lat, lon);
      return;
    } else {
      this.myPositionMarker.position = { lat, lng: lon };
    }
  };

  removeMyPositionMarker(): void {
    if (this.myPositionMarker) {
      this.myPositionMarker.map = null;
      this.myPositionMarker = undefined;
    }
  }

  printAircraftTypes(): void {
    const types = Object.keys(this.markers).map(key => this.markers[key].model);
    console.log('Aircraft types:', types);


  }

}
