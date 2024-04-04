import { Component, Inject, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CardImageManagerService } from 'src/app/shared/services/card-image-manager.service';
import { MarkerProps } from 'src/app/shared/services/map-marker.service';

@Component({
  selector: 'app-airplane-card',
  templateUrl: './airplane-card.component.html',
  styleUrls: ['./airplane-card.component.scss'],
  standalone: true,
  imports: [IonicModule]
})
export class AirplaneCardComponent implements OnChanges {
  @Input() airplane?: MarkerProps;
  image?: string;
  constructor(private cardImageManagerService: CardImageManagerService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.airplane && changes['airplane']) {
      console.log('airplane', this.airplane);
      this.image = this.cardImageManagerService.retrieveAirplaneImage(this.airplane.model);
    }
  }

  loadDefaultImage(): void {
    if (this.airplane) this.image = this.cardImageManagerService.getDefaultImage(this.airplane?.model);
  }
}
