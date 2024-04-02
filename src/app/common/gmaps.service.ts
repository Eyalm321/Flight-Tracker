import { Injectable } from '@angular/core';
import { Loader } from '@googlemaps/js-api-loader';
import { environment } from 'src/environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class GmapsService {
  private loader: Loader | null = null;
  private isMapsLibraryLoaded: boolean = false;

  constructor() { }

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
    if (!this.isMapsLibraryLoaded) {
      await (await this.getLoader()).importLibrary("maps");
      this.isMapsLibraryLoaded = true;
    }
  }
}
