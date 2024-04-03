import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';
import { MapDataService } from '../shared/services/map-data.service';
import { MapMarkerService } from '../shared/services/map-marker.service';
import { AdsbService } from '../shared/services/adsb.service';
import { OpenSkyService } from '../shared/services/open-sky.service';

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

  constructor(private mapDataService: MapDataService, private adsbService: AdsbService, private mapMarkerService: MapMarkerService, private openSkyService: OpenSkyService) { }

  async ngAfterViewInit(): Promise<void> {
    this.mapInstance = await this.mapDataService.initializeMap(this.mapContainerRef.nativeElement);

    setTimeout(() => {
      this.updatePlanesInViewOpenSky();
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
      this.updatePlanesInViewOpenSky();
    }, 7000);
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

  updatePlanesInViewOpenSky(): void {
    const se = this.mapInstance!.getBounds()!.getSouthWest();
    const ne = this.mapInstance!.getBounds()!.getNorthEast();
    const sw = this.mapInstance!.getBounds()!.getSouthWest();
    const nw = this.mapInstance!.getBounds()!.getNorthEast();
    const lamin = Math.min(se.lat(), ne.lat());
    const lomin = Math.min(se.lng(), ne.lng());
    const lamax = Math.max(sw.lat(), nw.lat());
    const lomax = Math.max(sw.lng(), nw.lng());

    this.openSkyService.getAllStateVectors({ lamin: lamin, lomin: lomin, lamax: lamax, lomax: lomax }).forEach(data => {
      data.states.forEach(state => {
        console.log('State:', state);
        this.mapMarkerService.removeMarker(state[0] as string);
        this.mapMarkerService.addNewMarker({
          id: state[0],
          lat: state[6] as number,
          lng: state[5] as number,
          title: state[1].trim(),
          heading: state[10] as number // Add type assertion here
        }, this.mapInstance!);
      });
    });
  }
}

