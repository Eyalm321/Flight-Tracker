import { Component, Inject, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { MarkerProps } from 'src/app/shared/services/map-marker.service';

@Component({
  selector: 'app-airplane-card',
  templateUrl: './airplane-card.component.html',
  styleUrls: ['./airplane-card.component.scss'],
  standalone: true,
  imports: [IonicModule]
})
export class AirplaneCardComponent {
  @Input() airplane?: MarkerProps;
  constructor() { }

}
