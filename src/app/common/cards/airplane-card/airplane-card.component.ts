import { Component, Inject, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-airplane-card',
  templateUrl: './airplane-card.component.html',
  styleUrls: ['./airplane-card.component.scss'],
  standalone: true,
  imports: [IonicModule]
})
export class AirplaneCardComponent {
  @Input() airplane?: string;
  constructor() { }

}
