import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';
import { MapDataService } from '../shared/services/map-data.service';
import { MapMarkerService } from '../shared/services/map-marker.service';
import { AdsbService } from '../shared/services/adsb.service';

@Component({
  selector: 'app-main',
  templateUrl: 'main.page.html',
  styleUrls: ['main.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
})
export class MainPage implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { read: ElementRef }) mapContainerRef!: ElementRef;
  private mapInstance?: google.maps.Map;
  private updateInterval?: ReturnType<typeof setTimeout>;

  constructor(private mapDataService: MapDataService, private adsbService: AdsbService, private mapMarkerService: MapMarkerService) { }

  async ngAfterViewInit(): Promise<void> {
    this.mapInstance = await this.mapDataService.initializeMap(this.mapContainerRef.nativeElement);

    setTimeout(() => {
      this.updatePlanesInView();
    }, 1000);
    this.setupPlaneUpdates();
  }


  ngOnDestroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  // private getAllPlanes(): void {
  //   this.adsbService.getLaddAircrafts().subscribe(data => {
  //     data.ac.forEach(ac => {
  //       if (!ac.lat || !ac.lon) return;

  //       this.mapMarkerService.addNewMarker({
  //         id: ac.hex,
  //         lat: ac.lat,
  //         lng: ac.lon,
  //         title: ac.flight,
  //         heading: ac.true_heading
  //       }, this.mapInstance!);
  //     });
  //   });
  // }

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
      const lat = parseFloat(ne.lat().toFixed(2));
      const sw = bounds.getSouthWest();
      const lng = parseFloat(sw.lng().toFixed(2));
      const radiusInMeters = google.maps.geometry.spherical.computeDistanceBetween(ne, sw);
      const radiusInNM = radiusInMeters / 1852;
      let radius = Math.round(radiusInNM / 2); // why /2 ?
      if (radius > 250) radius = 250;
      this.adsbService.getAircraftsByLocation(lat, lng, radius).subscribe(data => {
        data.ac.forEach(ac => {
          this.mapMarkerService.removeMarker(ac.hex);
          this.mapMarkerService.addNewMarker({
            id: ac.hex,
            lat: ac.lat,
            lng: ac.lon,
            title: ac.flight,
            heading: ac.nav_heading
          }, this.mapInstance!);
        });
      });
    }
  }
}

