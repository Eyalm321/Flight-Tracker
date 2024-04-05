import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonButton, IonProgressBar, IonFooter } from '@ionic/angular/standalone';
import { MapDataService } from '../shared/services/map-data.service';
import { ExtendedMarker, MapMarkerService, MarkerProps } from '../shared/services/map-marker.service';
import { AdsbService, Aircraft } from '../shared/services/adsb.service';
import { AirplaneCardComponent } from '../common/cards/airplane-card/airplane-card.component';
import { EMPTY, Observable, Subject, catchError, combineLatest, forkJoin, map, mergeMap, of, take, takeUntil, tap } from 'rxjs';
import { routes } from '../app.routes';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { CommonModule } from '@angular/common';
import { ThemeWatcherService } from '../shared/services/theme-watcher.service';
import { OrientationService } from '../shared/services/orientation.service';

export interface selectedAircraft extends MarkerProps {
  flightDetails?: { flightNumber: string, callsign: string, airlineCode: string; };
  originAirport?: { iata: string, name: string, location: string; };
  destinationAirport?: { iata: string, name: string, location: string; };
}

@Component({
  selector: 'app-main',
  templateUrl: 'main.page.html',
  styleUrls: ['main.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonHeader, IonIcon, IonToolbar, IonTitle, AirplaneCardComponent, IonProgressBar, IonFooter],
})
export class MainPage implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainerRef!: ElementRef;
  selectedAircraft?: selectedAircraft;
  flightView: Boolean = false;
  isLoading = false;
  isPortrait = this.orientationService.getCurrentOrientation() === 'portrait';
  private mapInstance?: google.maps.Map;
  private updateInterval?: ReturnType<typeof setTimeout>;
  private destroy$ = new Subject<void>();


  icons = addIcons({
    'arrow-back-outline': 'https://unpkg.com/ionicons@7.1.0/dist/svg/arrow-back-outline.svg',
  });


  constructor(private mapDataService: MapDataService,
    private adsbService: AdsbService,
    private mapMarkerService: MapMarkerService,
    private themeWatcherService: ThemeWatcherService,
    private orientationService: OrientationService,
    private cdr: ChangeDetectorRef) { }

  async ngAfterViewInit(): Promise<void> {
    const isDarkTheme = window.matchMedia('(prefers-color-scheme: dark)');
    this.mapInstance = await this.mapDataService.initializeMap(this.mapContainerRef.nativeElement, isDarkTheme.matches);

    setTimeout(() => {
      this.updatePlanesInView();
    }, 500);

    this.setupAllPlanesUpdates();
    this.listenToMarkerClicks();
    this.listenToThemeChanges();
    this.orientationService.getOrientationChange().subscribe((orientation) => {
      this.isPortrait = orientation === 'portrait';
      console.log('Orientation changed:', orientation);

    });
  }


  ngOnDestroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  private listenToThemeChanges(): void {
    this.themeWatcherService.themeChanged$.subscribe(darkMode => {
      console.log('Dark mode changed:', darkMode);

      this.mapDataService.initializeMap(this.mapContainerRef.nativeElement, darkMode).then(mapInstance => {
        this.mapInstance = mapInstance;
      }
      );
    });
  }

  private listenToMarkerClicks(): void {
    this.mapMarkerService.markerClicked$.subscribe(marker => {

      clearInterval(this.updateInterval);
      this.selectedAircraft = marker;

      if (marker.lat && marker.lng) {
        this.mapDataService.centerMapByLatLng(marker.lat, marker.lng);
      }

      this.createAircraftRoute(marker);
      this.mapMarkerService.clearAllOtherMarkers(marker.id);
      this.mapInstance?.setZoom(10);
      this.flightView = true;

      this.updateInterval = setInterval(() => {
        this.getAircraftPropsByIcao(marker.id)
          .subscribe(data => {
            const selectedMarker = this.mapMarkerService.getSelectedMarker();
            this.cdr.detectChanges();
            if (!selectedMarker) return;

            this.mapDataService.centerMapByLatLng(data.lat, data.lng);
            this.mapMarkerService.transitionMarkerPosition(selectedMarker, data.lat, data.lng, data.heading);
            this.mapMarkerService.changePathMiddleWaypoints([{ lat: data.lat, lng: data.lng }]);

          });
      }, 3000);
    });
  }

  private getAircraftPropsByIcao(icao: string): Observable<MarkerProps> {
    return this.adsbService.getAircraftIcao(icao).pipe(
      take(1),
      map(data => {
        return {
          id: data.ac[0].hex,
          lat: data.ac[0].lat,
          lng: data.ac[0].lon,
          title: data.ac[0].flight,
          heading: data.ac[0].track,
          model: data.ac[0].t,
          registration: data.ac[0].r,
          altitude: data.ac[0].nav_altitude_mcp
        };
      }),
    );
  }

  private setupAllPlanesUpdates(): void {
    this.updateInterval = setInterval(() => {
      this.updatePlanesInView();
    }, 4000);
  }

  private updatePlanesInView(): void {
    if (!this.mapInstance) {
      return;
    }

    const bounds = this.mapInstance.getBounds();
    if (!bounds) {
      return;
    }
    this.isLoading = true;

    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const lat = (ne.lat() + sw.lat()) / 2;
    const lon = (ne.lng() + sw.lng()) / 2;
    const radiusInMeters = Math.max(ne.lat() - lat, ne.lng() - lon) * 1000; // Assuming degrees to meters conversion factor if needed
    const radiusInNM = Math.max(radiusInMeters / 1852, 250); // Ensure minimum radius is 250 NM

    // Utilizing combineLatest to make parallel requests
    combineLatest([
      this.adsbService.getAircraftsByLocation(lat, lon, radiusInNM).pipe(catchError(() => of({ ac: [] }))), // Fallback to empty array on error
      this.adsbService.getMilAircrafts().pipe(catchError(() => of({ ac: [] }))) // Fallback to empty array on error
    ]).pipe(
      map(([allAircraftData, milAircraftData]) => {
        const allMapped = this.mapAircraftData(allAircraftData.ac, 'civilian');
        const milMapped = this.mapAircraftData(milAircraftData.ac, 'military');

        return this.mergeAndCategorizeAircrafts(allMapped, milMapped);
      }),
      takeUntil(this.destroy$) // Assuming destroy$ is a Subject that emits when component is destroyed
    ).subscribe(combinedAircrafts => {
      this.mapMarkerService.updateMarkers(combinedAircrafts);
    });
  }

  private mapAircraftData(ac: any[], type: string): any[] {
    return ac.map(aircraft => ({
      id: aircraft.hex,
      lat: aircraft.lat,
      lng: aircraft.lon,
      title: aircraft.flight,
      heading: aircraft.track,
      model: aircraft.t,
      registration: aircraft.r,
      altitude: aircraft.nav_altitude_mcp,
      _type: type
    }));
  }

  private mergeAndCategorizeAircrafts(allMapped: any[], milMapped: any[]): any[] {
    const uniqueAircrafts = new Map<string, any>();

    allMapped.forEach(ac => uniqueAircrafts.set(ac.id, ac));
    milMapped.forEach(ac => {
      if (uniqueAircrafts.has(ac.id)) {
        const existingAc = uniqueAircrafts.get(ac.id);
        existingAc._type = 'military'; // Re-categorize to military if found in milMapped
      } else {
        uniqueAircrafts.set(ac.id, ac);
      }
    });
    this.isLoading = false;
    return Array.from(uniqueAircrafts.values());
  }

  createAircraftRoute(marker: MarkerProps): void {
    this.adsbService.getAircraftsRouteset([{ callsign: marker.title, lat: marker.lat, lon: marker.lng }])
      .pipe(
        take(1),
        tap(routes => {
          if (!this.selectedAircraft) return;
          this.selectedAircraft.flightDetails = {
            flightNumber: routes[0].number,
            callsign: routes[0].callsign,
            airlineCode: routes[0].airline_code,
          };
          this.selectedAircraft.originAirport = {
            iata: routes[0]._airports[0]?.iata,
            name: routes[0]._airports[0]?.name,
            location: routes[0]._airports[0]?.location,
          };
          this.selectedAircraft.destinationAirport = {
            iata: routes[0]._airports[1]?.iata,
            name: routes[0]._airports[1]?.name,
            location: routes[0]._airports[1]?.location,
          };
        }),
        map(routes => {
          if (!routes[0]?._airports || routes[0]._airports.length < 2) {
            throw new Error('Invalid route data received');
          }
          // Using optional chaining and providing a fallback value
          const origin = {
            lat: routes[0]._airports[0]?.lat ?? 0,
            lng: routes[0]._airports[0]?.lon ?? 0,
          };
          const destination = {
            lat: routes[0]._airports[1]?.lat ?? 0,
            lng: routes[0]._airports[1]?.lon ?? 0,
          };
          return { origin, destination };
        }),
        catchError(error => {
          console.error('Error fetching aircraft route:', error);
          return EMPTY;
        })
      )
      .subscribe({
        next: (route) => {
          this.addFlightpathPolyline(route.origin, route.destination, { lat: marker.lat, lng: marker.lng });
        },
        error: (error) => {
          console.error('Unexpected error:', error);
        },
      });
  }


  addFlightpathPolyline(origin: { lat: number, lng: number; }, destination: { lat: number, lng: number; }, plane: { lat: number, lng: number; }, waypoints?: { lat: number, lng: number; }[]): void {
    const waypointLatLngs = waypoints?.map(waypoint => ({ lat: waypoint.lat, lng: waypoint.lng })) ?? [];
    waypointLatLngs.unshift(plane);

    this.mapDataService.addFlightPathPolyline([origin, destination], waypointLatLngs);
  }

  onQuitFlightView(): void {
    clearInterval(this.updateInterval);
    this.flightView = false;
    this.updatePlanesInView();
    this.setupAllPlanesUpdates();
    this.mapDataService.clearPolyline();
    this.mapInstance?.setZoom(8);
  }
}

