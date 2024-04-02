import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';
import { MapDataService } from '../common/map-data.service';
import { OpenSkyService } from '../common/open-sky.service';
import { MapMarkerService } from '../common/map-marker.service';

@Component({
  selector: 'app-main',
  templateUrl: 'main.page.html',
  styleUrls: ['main.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
})
export class MainPage implements OnInit, AfterViewInit {
  @ViewChild('mapContainer', { read: ElementRef }) mapContainerRef!: ElementRef;
  private mapInstance?: google.maps.Map;

  constructor(private mapDataService: MapDataService, private openSkyService: OpenSkyService, private mapMarkerService: MapMarkerService) { }

  ngOnInit(): void {
    this.openSkyService.getAllStateVectors().subscribe(data => {
      data.states.forEach((state) => {
        if (!state[0] || !state[1] || !state[5] || !state[6]) return;
        this.mapMarkerService.addNewMarker({
          id: state[0],
          lat: state[6],
          lng: state[5],
          title: state[1]
        }, this.mapInstance!);
      });
    });
  }

  async ngAfterViewInit(): Promise<void> {
    this.mapInstance = await this.mapDataService.initializeMap(this.mapContainerRef.nativeElement);
  }
}
