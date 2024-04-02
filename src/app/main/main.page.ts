import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';
import { MapDataService } from '../common/map-data.service';

@Component({
  selector: 'app-main',
  templateUrl: 'main.page.html',
  styleUrls: ['main.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
})
export class MainPage implements AfterViewInit {
  @ViewChild('mapContainer', { read: ElementRef }) mapContainerRef!: ElementRef;
  private mapInstance?: google.maps.Map;

  constructor(private mapDataService: MapDataService) { }

  async ngAfterViewInit(): Promise<void> {
    this.mapInstance = await this.mapDataService.initializeMap(this.mapContainerRef.nativeElement);
  }
}
