import { Injectable } from '@angular/core';
import { GmapsService } from './gmaps.service';
import { MapDataService } from './map-data.service';

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
  private markers: { [id: string]: ExtendedMarker; } = {};
  constructor(private gmapsService: GmapsService, private mapDataService: MapDataService) { }

  async addNewMarker(marker: MarkerProps, mapInstance: google.maps.Map): Promise<void> {
    const newMarker = await this.createMarker(marker, mapInstance);
    if (newMarker) {
      this.markers[marker.id] = newMarker;
    }
  }

  async createMarker(props: MarkerProps, mapInstance: google.maps.Map): Promise<ExtendedMarker | undefined> {
    try {
      await this.gmapsService.loadMarkerLibrary();
      const airplaneElement = document.createElement('img');
      airplaneElement.style.transform = `rotate(${props.heading}deg)`;
      airplaneElement.src = 'assets/images/airplane.png';
      airplaneElement.style.width = '32px';
      airplaneElement.style.height = '32px';
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: props.lat, lng: props.lng },
        map: mapInstance,
        title: props.title,
        content: airplaneElement,
        zIndex: 1000
      }) as ExtendedMarker;

      marker.id = `aircraft-${props.id}`;

      return marker;
    } catch (error) {
      console.error('Error initializing the Marker library:', error);
      return;
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
      const airplaneElement = existingMarker.content as HTMLImageElement;
      airplaneElement.style.transform = `rotate(${markerProps.heading}deg)`;
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
}
