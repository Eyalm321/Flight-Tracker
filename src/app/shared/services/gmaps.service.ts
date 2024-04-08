import { Injectable } from '@angular/core';
import { Loader } from '@googlemaps/js-api-loader';
import { BehaviorSubject, Observable, catchError, firstValueFrom, from, of, take } from 'rxjs';
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
    this.loadLibrary('maps')?.subscribe(() => {
      console.log('Maps library loaded');

    });
    this.loadLibrary('marker')?.subscribe();
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

  loadLibrary(libraryName: 'maps' | 'marker'): Observable<void> {
    const apiLoadedSubject = libraryName === 'maps' ? this.mapsApiLoaded : this.markerApiLoaded;

    if (!apiLoadedSubject.value) {
      return new Observable<void>(observer => {
        (async () => {
          try {
            await (await this.getLoader()).importLibrary(libraryName);
            apiLoadedSubject.next(true);
            observer.next();
            observer.complete();
          } catch (error) {
            console.error(`Error loading ${libraryName} library:`, error);
            observer.error(error);
          }
        })();
      });
    }

    return of();
  }

}
