import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonButton } from '@ionic/angular/standalone';
import { MapDataService } from '../shared/services/map-data.service';
import { ExtendedMarker, MapMarkerService, MarkerProps } from '../shared/services/map-marker.service';
import { AdsbService } from '../shared/services/adsb.service';
import { AirplaneCardComponent } from '../common/cards/airplane-card/airplane-card.component';
import { EMPTY, Observable, catchError, map, take, tap } from 'rxjs';
import { routes } from '../app.routes';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { CommonModule } from '@angular/common';

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
  imports: [IonContent, IonHeader, IonIcon, IonToolbar, IonTitle, AirplaneCardComponent, CommonModule],
})
export class MainPage implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainerRef!: ElementRef;
  @ViewChild('cardContainer') cardContainerRef!: ElementRef;
  selectedAircraft?: selectedAircraft;
  flightView: Boolean = false;
  private mapInstance?: google.maps.Map;
  private updateInterval?: ReturnType<typeof setTimeout>;

  icons = addIcons({
    'arrow-back-outline': 'https://unpkg.com/ionicons@7.1.0/dist/svg/arrow-back-outline.svg',
  });


  constructor(private mapDataService: MapDataService, private adsbService: AdsbService, private mapMarkerService: MapMarkerService) { }

  async ngAfterViewInit(): Promise<void> {
    this.mapInstance = await this.mapDataService.initializeMap(this.mapContainerRef.nativeElement);

    setTimeout(() => {
      this.updatePlanesInView();
    }, 3000);
    this.setupAllPlanesUpdates();
    this.listenToMarkerClicks();
  }


  ngOnDestroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  private listenToMarkerClicks(): void {
    this.mapMarkerService.markerClicked$.subscribe(marker => {

      clearInterval(this.updateInterval);
      this.cardContainerRef.nativeElement.classList.remove('hidden');
      this.selectedAircraft = marker;

      if (marker.lat && marker.lng) {
        this.mapDataService.centerMapByLatLng(marker.lat, marker.lng);
      }

      this.createAircraftRoute(marker);
      this.mapMarkerService.clearAllOtherMarkers(marker.id);
      this.mapInstance?.setZoom(10);
      this.flightView = true;

      this.updateInterval = setInterval(() => {
        this.getAircraftPropsByIcao(marker.id).subscribe(data => {
          const selectedMarker = this.mapMarkerService.getSelectedMarker();


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
        };
      }),
    );
  }

  private setupAllPlanesUpdates(): void {

    this.updateInterval = setInterval(() => {
      this.updatePlanesInView();
      this.mapMarkerService.printAllPlaneTypes();
    }, 6000);
  }

  private updatePlanesInView(): void {
    if (!this.mapInstance) {
      return;
    }

    const bounds = this.mapInstance.getBounds();
    if (bounds) {
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const lat = (ne.lat() + sw.lat()) / 2;
      const lon = (ne.lng() + sw.lng()) / 2;
      const radiusInMeters = Math.max(ne.lat() - lat, ne.lng() - lon);
      const radiusInNM = radiusInMeters / 1852;
      let radius = radiusInNM;
      if (radius < 250) radius = 250;

      this.adsbService.getAircraftsByLocation(lat, lon, radius).subscribe(data => {
        this.mapMarkerService.updateMarkers(data.ac.map(ac => ({
          id: ac.hex,
          lat: ac.lat,
          lng: ac.lon,
          title: ac.flight,
          heading: ac.track,
          model: ac.t,
          registration: ac.r,
        })));
      });
    }
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
    this.cardContainerRef.nativeElement.classList.add('hidden');
    this.updatePlanesInView();
    this.setupAllPlanesUpdates();
    this.mapDataService.clearPolyline();
    this.mapInstance?.setZoom(6);
  }
}

