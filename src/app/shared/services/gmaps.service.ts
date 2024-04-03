import { Injectable } from '@angular/core';
import { Loader } from '@googlemaps/js-api-loader';
import { BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class GmapsService {
  private loader: Loader | null = null;
  private mapsApiLoaded: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private markerApiLoaded: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  mapApiLoaded$ = this.mapsApiLoaded.asObservable();
  markerApiLoaded$ = this.markerApiLoaded.asObservable();

  constructor() {
    this.loadMapsLibrary();
    this.loadMarkerLibrary();
  }

  private async getLoader(): Promise<Loader> {
    if (!this.loader) {
      this.loader = new Loader({
        apiKey: environment.google.mapsApiKey,
        version: 'weekly',
        libraries: ['places', 'maps', 'marker', 'streetView']
      });
    }
    return this.loader;
  }

  public async loadMapsLibrary(): Promise<void> {
    if (!this.mapsApiLoaded.value) {
      await (await this.getLoader()).importLibrary("maps");
      this.mapsApiLoaded.next(true);
    }
  }

  public async loadMarkerLibrary(): Promise<void> {
    if (!this.markerApiLoaded.value) {
      await (await this.getLoader()).importLibrary("marker");
      this.markerApiLoaded.next(true);
    }
  }
}
