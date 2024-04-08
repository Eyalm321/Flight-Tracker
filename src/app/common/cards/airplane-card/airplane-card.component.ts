import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonSpinner } from '@ionic/angular/standalone';
import { SelectedAircraft } from 'src/app/main/main.page';
import { AirplaneDataService } from 'src/app/shared/services/airplane-data.service';
import { MapMarkerService, MarkerProps } from 'src/app/shared/services/map-marker.service';

@Component({
  selector: 'app-airplane-card',
  templateUrl: './airplane-card.component.html',
  styleUrls: ['./airplane-card.component.scss'],
  standalone: true,
  imports: [CommonModule, IonSpinner, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCard]
})
export class AirplaneCardComponent implements OnInit {
  @Input() aircraft?: SelectedAircraft;
  image?: string;
  imageLoaded = false;
  constructor(private airplaneDataService: AirplaneDataService, private cdr: ChangeDetectorRef, private mapMarkerService: MapMarkerService) { }

  ngOnInit(): void {
    this.mapMarkerService.markerClicked$.subscribe((markerProps: MarkerProps) => {
      this.image = this.airplaneDataService.retrieveAirplaneImage(markerProps.model);
      this.cdr.detectChanges();
    });
  }

  onImageLoad(event: any): void {
    event.target.style.visibility = 'visible';
    this.imageLoaded = true;
  }
}
