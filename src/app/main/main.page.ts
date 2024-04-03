import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';
import { MapDataService } from '../shared/services/map-data.service';
import { MapMarkerService } from '../shared/services/map-marker.service';
import { AdsbService } from '../shared/services/adsb.service';
import { AirplaneCardComponent } from '../common/cards/airplane-card/airplane-card.component';
import { OpenSkyService } from '../shared/services/open-sky.service';

@Component({
  selector: 'app-main',
  templateUrl: 'main.page.html',
  styleUrls: ['main.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, AirplaneCardComponent],
})
export class MainPage implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainerRef!: ElementRef;
  @ViewChild('cardContainer') cardContainerRef!: ElementRef;
  selectedAircraft?: string;
  private mapInstance?: google.maps.Map;
  private updateInterval?: ReturnType<typeof setTimeout>;

  constructor(private mapDataService: MapDataService, private adsbService: AdsbService, private mapMarkerService: MapMarkerService, private openSkyService: OpenSkyService) { }

  async ngAfterViewInit(): Promise<void> {
    this.mapInstance = await this.mapDataService.initializeMap(this.mapContainerRef.nativeElement);

    setTimeout(() => {
      this.updatePlanesInView();
    }, 1000);
    this.setupPlaneUpdates();
    this.listenToMarkerClicks();
  }


  ngOnDestroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  private listenToMarkerClicks(): void {
    this.mapMarkerService.markerClicked$.subscribe(marker => {
      console.log('Marker clicked:', marker);

      this.cardContainerRef.nativeElement.classList.toggle('hidden');
      this.selectedAircraft = marker.id;
      this.mapDataService.centerMapByLatLng(marker.lat, marker.lng);
      this.openSkyService.getTrackByAircraft(marker.id).subscribe(data => {
        console.log('Track data:', data);
      }
      );
    });
  }

  private setupPlaneUpdates(): void {

    this.updateInterval = setInterval(() => {
      this.updatePlanesInView();
    }, 5000);
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
        data.ac.forEach(ac => {
          this.mapMarkerService.addOrUpdateMarker({
            id: ac.hex,
            lat: ac.lat,
            lng: ac.lon,
            title: ac.flight,
            heading: ac.track
          });
        });
      });
    }
  }
}

