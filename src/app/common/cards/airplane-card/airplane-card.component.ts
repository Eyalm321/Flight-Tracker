import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonSpinner } from '@ionic/angular/standalone';
import { SelectedAircraft } from 'src/app/main/main.page';
import { AirplaneDataService } from 'src/app/shared/services/airplane-data.service';
import { MarkerProps } from 'src/app/shared/services/map-marker.service';

@Component({
  selector: 'app-airplane-card',
  templateUrl: './airplane-card.component.html',
  styleUrls: ['./airplane-card.component.scss'],
  standalone: true,
  imports: [CommonModule, IonSpinner, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCard]
})
export class AirplaneCardComponent implements OnChanges {
  @Input() aircraft?: SelectedAircraft;
  image?: string;
  imageLoaded = false;
  constructor(private airplaneDataService: AirplaneDataService, private cdr: ChangeDetectorRef) {
    if (this.aircraft) {
      this.image = this.airplaneDataService.retrieveAirplaneImage(this.aircraft.model);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['aircraft'] && changes['aircraft'].currentValue && this.aircraft) {
      this.image = this.airplaneDataService.retrieveAirplaneImage(this.aircraft.model);
    }
  }

  onImageLoad(event: any): void {
    event.target.style.visibility = 'visible';
    this.imageLoaded = true;
  }
}
