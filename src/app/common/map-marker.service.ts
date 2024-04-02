import { Injectable } from '@angular/core';
import { GmapsService } from './gmaps.service';

export interface ExtendedMarker extends google.maps.marker.AdvancedMarkerElement {
  id: string;
}

export interface MarkerProps {
  id: string;
  lat: number;
  lng: number;
  title: string;
}

@Injectable({
  providedIn: 'root'
})
export class MapMarkerService {
  private markers: ExtendedMarker[] = [];
  constructor(private gmapsService: GmapsService) { }

  async addNewMarker(marker: MarkerProps, mapInstance: google.maps.Map): Promise<void> {
    console.log('Adding marker:', marker);
    console.log('Map:', mapInstance);

    const newMarker = await this.createMarker(marker, mapInstance);
    if (newMarker) {
      this.markers?.push(newMarker);
    }
  }

  async createMarker(props: MarkerProps, mapInstance: google.maps.Map): Promise<ExtendedMarker | undefined> {
    try {
      await this.gmapsService.loadMarkerLibrary();
      const airplaneElement = document.createElement('img');
      airplaneElement.src = 'assets/images/airplane.png';
      airplaneElement.style.width = '32px';
      airplaneElement.style.height = '32px';
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: props.lat, lng: props.lng },
        map: mapInstance,
        title: props.title,
        content: airplaneElement
      }) as ExtendedMarker;

      marker.id = props.id;

      return marker;
    } catch (error) {
      console.error('Error initializing the Marker library:', error);
      return;
    }
  }


  removeMarker(markerId: string): void {
    const markerIndex = this.markers.findIndex((marker) => marker.id === markerId);
    console.log('Removing marker:', markerId);

    if (markerIndex !== -1) {
      this.markers.splice(markerIndex, 1);
    }
  }

}
