import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonButton, IonProgressBar, IonFooter, IonFab, IonFabButton, IonFabList, IonToast } from '@ionic/angular/standalone';
import { MapDataService } from '../shared/services/map-data.service';
import { MapMarkerService, MarkerProps } from '../shared/services/map-marker.service';
import { AdsbService } from '../shared/services/adsb.service';
import { AirplaneCardComponent } from '../common/cards/airplane-card/airplane-card.component';
import { EMPTY, Observable, Subject, catchError, combineLatest, map, of, take, takeUntil, tap } from 'rxjs';
import { addIcons } from 'ionicons';
import { CommonModule } from '@angular/common';
import { ThemeWatcherService } from '../shared/services/theme-watcher.service';
import { OrientationService } from '../shared/services/orientation.service';
import { GeolocationService } from '../shared/services/geolocation.service';
import { InfoContainerComponent } from '../common/info-container/info-container.component';
import { ToastController, LoadingController } from '@ionic/angular';


export interface SelectedAircraft extends MarkerProps {
  flightDetails?: { flightNumber: string, callsign: string, airlineCode: string; };
  originAirport?: { iata: string, name: string, location: string; };
  destinationAirport?: { iata: string, name: string, location: string; };
  dynamic?: { last_update: number, gs: number, geom_rate: number, rssi: number; altitude: number; };
}

@Component({
  selector: 'app-main',
  templateUrl: 'main.page.html',
  styleUrls: ['main.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, IonContent, IonHeader, IonIcon, IonToolbar, IonTitle, IonToast, IonButton, AirplaneCardComponent, IonProgressBar, IonFooter, IonFab, IonFabButton, IonFabList, InfoContainerComponent],
})
export class MainPage implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainerRef!: ElementRef;
  selectedAircraft?: SelectedAircraft;
  flightView: boolean = false;
  isLoading = false;
  isPortrait = this.orientationService.getCurrentOrientation() === 'portrait';
  numVisiblePlanes = 0;
  private positionMarker?: google.maps.marker.AdvancedMarkerElement;

  private mapInstance?: google.maps.Map;
  private updateInterval?: ReturnType<typeof setTimeout>;
  private destroy$ = new Subject<void>();


  icons = addIcons({
    'arrow-back': 'https://unpkg.com/ionicons@7.1.0/dist/svg/arrow-back.svg',
    'navigate': 'https://unpkg.com/ionicons@7.1.0/dist/svg/navigate.svg',
  });


  constructor(private mapDataService: MapDataService,
    private adsbService: AdsbService,
    private mapMarkerService: MapMarkerService,
    private themeWatcherService: ThemeWatcherService,
    private orientationService: OrientationService,
    private cdr: ChangeDetectorRef,
    private geolocationService: GeolocationService,
    private toastController: ToastController,
    private loadingController: LoadingController) { }

  async ngAfterViewInit(): Promise<void> {
    const isDarkTheme = window.matchMedia('(prefers-color-scheme: dark)');
    this.mapInstance = await this.mapDataService.initializeMap(this.mapContainerRef.nativeElement, isDarkTheme.matches);

    setTimeout(() => {
      this.updatePlanesInView();

    }, 500);
    this.updateCurrentLocation();
    this.setupAllPlanesUpdates();
    this.listenToMarkerClicks();
    this.listenToThemeChanges();
    this.orientationService.getOrientationChange().subscribe((orientation) => {
      this.isPortrait = orientation === 'portrait';
      if (this.selectedAircraft) {
        this.mapDataService.centerMapByLatLng(this.selectedAircraft.lat, this.selectedAircraft.lng, this.flightView);
      }
      console.log('Orientation changed:', orientation);

    });
  }

  updateNumOfVisiblePlanes(): void {
    const num = this.mapMarkerService.getVisibleMarkersAmount();
    if (!num || num === 0) return;
    this.numVisiblePlanes = num;
    this.cdr.detectChanges();
  }


  async updateCurrentLocation() {
    console.log('Updating current location');

    const position = await this.geolocationService.getCurrentPosition();
    console.log('Position:', position);

    if (!position) return;
    this.mapMarkerService.updateMyPositionMarker(position.coords.latitude, position.coords.longitude);
    this.mapDataService.centerMapByLatLng(position.coords.latitude, position.coords.longitude, this.flightView);
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
        if (this.mapInstance) {
          this.mapMarkerService.clearAllMarkers();
          this.mapDataService.clearPolyline();
          this.mapInstance.unbindAll();
        }
        this.mapInstance = mapInstance;
        if (this.selectedAircraft && this.mapInstance) {
          this.mapMarkerService.createMarker(this.selectedAircraft, this.mapInstance).then((marker) => {
            if (!marker || !this.selectedAircraft) return;
            this.handleMarkerClick(this.selectedAircraft);
            this.mapMarkerService.setSelectedMarker(marker);
            return marker;
          });
        } else if (this.mapInstance) {
          this.updatePlanesInView();
        }
      }
      );
    });
  }

  private listenToMarkerClicks(): void {
    this.mapMarkerService.markerClicked$.subscribe(marker => this.handleMarkerClick(marker));
  }
  async handleMarkerClick(marker: MarkerProps): Promise<void> {
    try {
      clearInterval(this.updateInterval);
      this.selectedAircraft = marker;
      this.flightView = true;
      this.cdr.detectChanges();

      if (marker.lat && marker.lng) {
        this.mapDataService.centerMapByLatLng(marker.lat, marker.lng, this.flightView);
      }
      await this.createAircraftRoute(marker);
      this.mapMarkerService.clearAllOtherMarkers(marker.id);
      this.mapInstance?.setZoom(10);

      // Assuming getAircraftPropsByIcao is an asynchronous operation,
      // you need to ensure it's completed before dismissing the loading
      this.updateInterval = setInterval(async () => {
        const data = await this.getAircraftPropsByIcao(marker.id).toPromise(); // assuming this is an Observable
        const selectedMarker = this.mapMarkerService.getSelectedMarker();
        this.cdr.detectChanges();
        if (!selectedMarker || !data) {
          return;
        }
        console.log('Updating dynamic data:', data);
        this.updateDynamicData(data);
        this.mapDataService.centerMapByLatLng(data.lat, data.lng, this.flightView);
        this.mapMarkerService.transitionMarkerPosition(selectedMarker, data.lat, data.lng, data.heading);
        this.mapMarkerService.changePathMiddleWaypoints([{ lat: data.lat, lng: data.lng }]);
      }, 3000);
    } catch (error) {
      console.error('Error handling marker click:', error);
    }
  }

  private updateDynamicData(props: SelectedAircraft): void {
    this.selectedAircraft = { ...this.selectedAircraft, ...props };
  }

  private getAircraftPropsByIcao(icao: string): Observable<MarkerProps> {
    return this.adsbService.getAircraftIcao(icao).pipe(
      take(1),
      map(data => {
        console.log('Aircraft data:', data);

        return {
          id: data.ac[0].hex,
          lat: data.ac[0].lat,
          lng: data.ac[0].lon,
          title: data.ac[0].flight,
          heading: data.ac[0].track,
          model: data.ac[0].t,
          registration: data.ac[0].r,
          altitude: data.ac[0].nav_altitude_mcp,
          dynamic: {
            last_update: data.ac[0].seen,
            gs: data.ac[0].gs,
            geom_rate: data.ac[0].geom_rate,
            rssi: data.ac[0].rssi,
            altitude: data.ac[0].alt_baro,
          }
        };
      }),
    );
  }

  private setupAllPlanesUpdates(): void {
    this.updateInterval = setInterval(() => {
      this.updatePlanesInView();
      this.updateNumOfVisiblePlanes();
      // this.mapMarkerService.printAircraftTypes();
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
        this.isLoading = false;
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
    return Array.from(uniqueAircrafts.values());
  }

  createAircraftRoute(marker: MarkerProps): void {
    const presentToast = async (position: 'top' | 'bottom' | 'middle', message: string) => {
      const toast = this.toastController.create({
        message,
        duration: 5000,
        position,
        color: 'warning',
      });

      (await toast).present();
    };

    this.adsbService.getAircraftsRouteset([{ callsign: marker.title, lat: marker.lat, lon: marker.lng }])
      .pipe(
        take(1),
        tap(async routes => {
          if (!this.selectedAircraft || routes.length === 0 || routes[0]._airports.length < 2) {
            await presentToast('top', 'No route data found'); // Simplify toast call for demonstration
            throw new Error('No route data found'); // This will be caught by catchError
          }
        }),
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
          // Assuming previous conditions are met, we can safely access the airports
          const origin = { lat: routes[0]._airports[0].lat, lng: routes[0]._airports[0].lon };
          const destination = { lat: routes[0]._airports[1].lat, lng: routes[0]._airports[1].lon };
          return { origin, destination };
        }),
        catchError(async error => {
          console.log('Error fetching route data:', error);

          await presentToast('top', 'Failed to fetch route data'); // Simplify toast call for demonstration
          return EMPTY;
        })
      )
      .subscribe({
        next: (route: { origin: { lat: number; lng: number; }; destination: { lat: number; lng: number; }; } | Observable<never>) => {
          if ('origin' in route && 'destination' in route) {
            const { origin, destination } = route;
            this.addFlightpathPolyline(origin, destination, { lat: marker.lat, lng: marker.lng });
          }
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
    this.selectedAircraft = undefined;
    this.cdr.detectChanges();
    this.updatePlanesInView();
    this.setupAllPlanesUpdates();
    this.mapDataService.clearPolyline();
    this.mapInstance?.setZoom(8);
  }
}

