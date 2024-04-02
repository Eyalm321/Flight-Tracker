import { Injectable } from '@angular/core';
import { GmapsService } from './gmaps.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MapDataService {
  private mapOptions?: google.maps.MapOptions;
  private mapId?: string;
  private defaultCenter?: google.maps.LatLngLiteral;
  private mapInstance?: google.maps.Map;

  constructor(private gmapsService: GmapsService) {
    this.initMapOptions();
  }

  private initMapOptions() {
    this.defaultCenter = { lat: 32.8998, lng: -96.6403 };
    this.mapId = '4aa5d613ffc8df24';

    this.mapOptions = {
      disableDefaultUI: true,
      center: this.defaultCenter,
      zoom: 10,
      mapId: this.mapId
    };
  }

  async initializeMap(element: HTMLElement): Promise<google.maps.Map | undefined> {
    try {
      await this.gmapsService.loadMapsLibrary();
    } catch (error) {
      console.error('Error initializing the Maps library:', error);
      return;
    }

    const mapInstance = new google.maps.Map(element, this.mapOptions);
    console.log('Map instance:', mapInstance);

    if (mapInstance.get("mapId") === "974efb6cdc45a3c5") {
      this.mapInstance = mapInstance;
    }

    return mapInstance;
  }

  getMapInstance(): google.maps.Map | undefined {
    if (this.mapInstance) return this.mapInstance;
    else console.error('No map instance available');
    return;
  }
}
