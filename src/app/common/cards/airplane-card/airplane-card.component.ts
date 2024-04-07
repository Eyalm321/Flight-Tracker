import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonSpinner } from '@ionic/angular/standalone';
import { SelectedAircraft } from 'src/app/main/main.page';
import { CardImageManagerService } from 'src/app/shared/services/card-image-manager.service';
import { MarkerProps } from 'src/app/shared/services/map-marker.service';

@Component({
  selector: 'app-airplane-card',
  templateUrl: './airplane-card.component.html',
  styleUrls: ['./airplane-card.component.scss'],
  standalone: true,
  imports: [CommonModule, IonSpinner, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCard]
})
export class AirplaneCardComponent {
  @Input() aircraft?: SelectedAircraft;
  image?: string;
  imageLoaded = false;
  constructor(private cardImageManagerService: CardImageManagerService, private cdr: ChangeDetectorRef) {
    if (this.aircraft) {
      this.image = this.cardImageManagerService.retrieveAirplaneImage(this.aircraft.model);
    }
  }

  loadDefaultImage(): void {
    if (this.aircraft) this.image = this.cardImageManagerService.getDefaultImage(this.aircraft?.model);
  }

  onImageLoad(event: any): void {
    event.target.style.visibility = 'visible';
    this.imageLoaded = true;
  }
}
