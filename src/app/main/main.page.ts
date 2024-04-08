import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonButton, IonProgressBar, IonFooter, IonFab, IonFabButton, IonFabList, IonToast, IonChip, IonButtons, IonNavLink, IonNav, NavController } from '@ionic/angular/standalone';
import { MapDataService } from '../shared/services/map-data.service';
import { ExtendedMarker, MapMarkerService, MarkerProps } from '../shared/services/map-marker.service';
import { AdsbService, Aircraft } from '../shared/services/adsb.service';
import { AirplaneCardComponent } from '../common/cards/airplane-card/airplane-card.component';
import { EMPTY, Observable, Subject, Subscription, catchError, combineLatest, filter, finalize, interval, map, of, startWith, switchMap, take, takeUntil, tap } from 'rxjs';
import { addIcons } from 'ionicons';
import { CommonModule } from '@angular/common';
import { ThemeWatcherService } from '../shared/services/theme-watcher.service';
import { OrientationService } from '../shared/services/orientation.service';
import { GeolocationService } from '../shared/services/geolocation.service';
import { AirplaneStatsCardComponent } from '../common/cards/airplane-stats-card/airplane-stats-card';
import { ToastController } from '@ionic/angular';
import { AboutPage } from '../about/about.page';
export interface SelectedAircraft extends MarkerProps {
  flightDetails?: { flightNumber: string, callsign: string, airlineCode: string; };
  originAirport?: { iata: string, name: string, location: string; };
  destinationAirport?: { iata: string, name: string, location: string; };
  dynamic?: { last_update: number, gs: number, geom_rate: number, rssi: number; altitude: number | string; };
}
@Component({
  selector: 'app-main',
  templateUrl: 'main.page.html',
  styleUrls: ['main.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [IonNav, IonNavLink, IonButtons, IonChip,
    CommonModule,
    IonHeader,
    IonContent,
    IonIcon,
    IonToolbar,
    IonTitle,
    IonToast,
    IonButton,
    IonProgressBar,
    IonFooter,
    IonFab,
    IonFabButton,
    IonFabList,
    AirplaneCardComponent,
    AirplaneStatsCardComponent,
    IonNav
  ],
})
export class MainPage implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainerRef!: ElementRef;
  selectedAircraft?: SelectedAircraft;
  flightView: boolean = false;
  isLoading = false;
  isPortrait = this.orientationService.getCurrentOrientation() === 'portrait';
  numVisiblePlanes = 0;

  private mapInstance?: google.maps.Map;
  private updateInterval?: Subscription;
  private destroy$ = new Subject<void>();

  icons = addIcons({
    'arrow-back': 'https://unpkg.com/ionicons@7.1.0/dist/svg/arrow-back.svg',
    'navigate': 'https://unpkg.com/ionicons@7.1.0/dist/svg/navigate.svg',
    'logo-github': 'https://unpkg.com/ionicons@7.1.0/dist/svg/logo-github.svg',
    'help-circle': 'https://unpkg.com/ionicons@7.1.0/dist/svg/help-circle.svg'
  });

  constructor(
    private mapDataService: MapDataService,
    private adsbService: AdsbService,
    private mapMarkerService: MapMarkerService,
    private themeWatcherService: ThemeWatcherService,
    private orientationService: OrientationService,
    private geolocationService: GeolocationService,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef,
    private navigationController: NavController
  ) { }

  ngAfterViewInit(): void {
    const isDarkTheme = window.matchMedia('(prefers-color-scheme: dark)');
    this.mapDataService.initializeMap(this.mapContainerRef.nativeElement, isDarkTheme.matches).pipe(
      take(1)
    ).subscribe((instance) => {
      if (!instance) return;
      this.mapInstance = instance;
      this.updateCurrentLocation();
      this.setupAllPlanesUpdates();
      this.listenToMarkerClicks();
      this.listenToThemeChanges();
      this.orientationService.getOrientationChange().subscribe((orientation) => {
        this.isPortrait = orientation === 'portrait';
        if (this.selectedAircraft) {
          this.mapDataService.centerMapByLatLng(this.selectedAircraft.lat, this.selectedAircraft.lng, this.flightView);
        }
      });
    });
  }

  navigateToAbout() {
    console.log('Navigating to about page');

    this.navigationController.navigateForward('main/about');
  }

  updateNumOfVisiblePlanes(): void {
    const num = this.mapMarkerService.getVisibleMarkersAmount();
    if (!num || num === 0) return;
    this.numVisiblePlanes = num;
    this.cdr.detectChanges();
  }

  updateCurrentLocation(): void {
    this.geolocationService.getCurrentPosition().pipe(
      take(1),
      filter(position => !!position),
      tap(position => {
        this.mapMarkerService.createMyPositionMarker(position.coords.latitude, position.coords.longitude);
      }),
      catchError(() => {
        console.error('Error getting current position');
        return EMPTY;
      })
    ).subscribe(position => {
      this.mapDataService.centerMapByLatLng(position.coords.latitude, position.coords.longitude, this.flightView);
    });
  }

  ngOnDestroy(): void {
    if (!this.updateInterval?.closed) this.updateInterval?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private listenToThemeChanges(): void {
    this.themeWatcherService.themeChanged$.pipe(
      switchMap(darkMode => {
        return this.mapDataService.initializeMap(this.mapContainerRef.nativeElement, darkMode).pipe(
          take(1),
          filter(instance => !!instance),
          tap(_ => {
            this.mapMarkerService.clearAllMarkers();
            this.mapDataService.clearPolyline();
            this.mapInstance?.unbindAll();
          })
        );
      }),
      switchMap(instance => {
        this.mapInstance = instance;
        if (this.selectedAircraft && this.mapInstance) {
          return this.mapMarkerService.createMarker(this.selectedAircraft, this.mapInstance).pipe(
            map((marker: ExtendedMarker | undefined) => {
              if (!marker || !this.selectedAircraft) return;
              this.handleMarkerClick(this.selectedAircraft);
              this.mapMarkerService.setSelectedMarker(marker);
              return marker;
            })
          );
        } else if (this.mapInstance) {
          this.updatePlanesInView();
        }
        return of(null);
      }),
      finalize(() => {
        this.mapMarkerService.removeMyPositionMarker();
        this.updateCurrentLocation();
      })
    ).subscribe();
  }

  private listenToMarkerClicks(): void {
    this.mapMarkerService.markerClicked$.subscribe(marker => this.handleMarkerClick(marker));
  }

  handleMarkerClick(marker: MarkerProps): void {
    if (!marker.lat || !marker.lng || !marker.id) return;
    const getAircraftByIcao = () => {
      this.getAircraftPropsByIcao(marker.id).subscribe(data => {
        const selectedMarker = this.mapMarkerService.getSelectedMarker();
        this.cdr.detectChanges();
        if (!selectedMarker || !data) {
          return;
        }

        this.updateDynamicData(data);
        this.mapDataService.centerMapByLatLng(data.lat, data.lng, this.flightView);
        this.mapMarkerService.transitionMarkerPosition(selectedMarker, data.lat, data.lng, data.heading);
        this.mapMarkerService.changePathMiddleWaypoints([{ lat: data.lat, lng: data.lng }]);
      });
    };

    if (!this.updateInterval?.closed) this.updateInterval?.unsubscribe();
    this.selectedAircraft = marker;
    this.flightView = true;
    this.cdr.detectChanges();
    this.createAircraftRoute(marker);
    this.mapMarkerService.clearAllOtherMarkers(marker.id);
    this.mapInstance?.setZoom(10);
    this.updateInterval = interval(3000).pipe(
      takeUntil(this.destroy$),
      startWith(0),
      tap(_ => {
        getAircraftByIcao();
      })
    ).subscribe();
  }

  private updateDynamicData(props: SelectedAircraft): void {
    this.selectedAircraft = { ...this.selectedAircraft, ...props };
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
    [500, 1500].forEach(delay =>
      setTimeout(() => this.updatePlanesInView(), delay)
    );

    this.updateInterval = interval(4000).pipe(
      startWith(0),
      tap(() => {
        this.startLoading();
        this.updatePlanesInView();
        this.updateNumOfVisiblePlanes();
      }),
      takeUntil(this.destroy$),
    ).subscribe();
  }

  private startLoading(): void {
    this.isLoading = true;
    setTimeout(() => {
      this.isLoading = false;
      this.cdr.detectChanges();
    }, Math.random() * 2000 + 500);
  }

  private updatePlanesInView(): void {
    if (!this.mapInstance) {
      return;
    }

    const bounds = this.mapInstance.getBounds();
    if (!bounds) {
      return;
    }

    const { lat, lon, radiusInNM } = this.calculateBoundsCenterAndRadius(bounds);

    combineLatest([
      this.adsbService.getAircraftsByLocation(lat, lon, radiusInNM).pipe(catchError(() => of({ ac: [] }))),
      this.adsbService.getMilAircrafts().pipe(catchError(() => of({ ac: [] })))
    ]).pipe(
      map(([allAircraftData, milAircraftData]) => {
        const uniqueAircrafts = [...allAircraftData.ac, ...milAircraftData.ac].reduce((acc: Aircraft[], aircraft) => {
          if (!acc.some(a => a.hex === aircraft.hex)) {
            acc.push(aircraft);
          }
          return acc;
        }, []);
        return this.mapAircraftData(uniqueAircrafts);
      }),
      tap(combinedAircrafts => this.mapMarkerService.updateMarkers(combinedAircrafts))
    ).subscribe();
  }

  private calculateBoundsCenterAndRadius(bounds: google.maps.LatLngBounds): { lat: number, lon: number, radiusInNM: number; } {
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const lat = (ne.lat() + sw.lat()) / 2;
    const lon = (ne.lng() + sw.lng()) / 2;
    const radiusInMeters = Math.max(ne.lat() - lat, ne.lng() - lon) * 1000;
    const radiusInNM = Math.max(radiusInMeters / 1852, 250);

    return { lat, lon, radiusInNM };
  }

  private mapAircraftData(ac: any[]): any[] {
    return ac.map(aircraft => ({
      id: aircraft.hex,
      lat: aircraft.lat,
      lng: aircraft.lon,
      title: aircraft.flight,
      heading: aircraft.track,
      model: aircraft.t,
      registration: aircraft.r,
      altitude: aircraft.nav_altitude_mcp
    }));
  }

  createAircraftRoute(marker: MarkerProps): void {
    const presentToast = async (position: 'top' | 'bottom' | 'middle', message: string) => {
      const toast = this.toastController.create({
        message,
        duration: 3000,
        position,
        color: 'warning',
      });

      (await toast).present();
    };

    this.adsbService.getAircraftsRouteset([{ callsign: marker.title, lat: marker.lat, lon: marker.lng }])
      .pipe(
        take(1),
        tap(async routes => {
          console.log('routes:', routes);

          if (!this.selectedAircraft || routes.length === 0 || routes[0]._airports.length < 1) {
            await presentToast('top', 'No route data found');
            throw new Error('No route data found');
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

          const origin = { lat: routes[0]._airports[0].lat, lng: routes[0]._airports[0].lon };
          const destination = { lat: routes[0]._airports[1].lat, lng: routes[0]._airports[1].lon };
          console.log('origin:', origin, 'destination:', destination);

          return { origin, destination };
        }),
        catchError(async () => {
          await presentToast('top', 'No route data found');
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
    if (!this.updateInterval?.closed) this.updateInterval?.unsubscribe();
    this.flightView = false;
    this.selectedAircraft = undefined;
    this.cdr.detectChanges();
    this.updatePlanesInView();
    this.setupAllPlanesUpdates();
    this.mapDataService.clearPolyline();
    this.mapInstance?.setZoom(8);
  }
}

