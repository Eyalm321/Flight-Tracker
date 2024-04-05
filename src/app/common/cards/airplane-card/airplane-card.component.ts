import { Component, Inject, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle } from '@ionic/angular/standalone';
import { selectedAircraft } from 'src/app/main/main.page';
import { CardImageManagerService } from 'src/app/shared/services/card-image-manager.service';
import { MarkerProps } from 'src/app/shared/services/map-marker.service';

@Component({
  selector: 'app-airplane-card',
  templateUrl: './airplane-card.component.html',
  styleUrls: ['./airplane-card.component.scss'],
  standalone: true,
  imports: [IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCard]
})
export class AirplaneCardComponent implements OnChanges {
  @Input() aircraft?: selectedAircraft;
  image?: string;
  constructor(private cardImageManagerService: CardImageManagerService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.aircraft && changes['airplane']) {
      console.log('airplane', this.aircraft);
      this.image = this.cardImageManagerService.retrieveAirplaneImage(this.aircraft.model);
    }
  }

  loadDefaultImage(): void {
    if (this.aircraft) this.image = this.cardImageManagerService.getDefaultImage(this.aircraft?.model);
  }
}
