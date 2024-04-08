import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { SelectedAircraft } from 'src/app/main/main.page';
import { IonIcon, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonCardSubtitle } from "@ionic/angular/standalone";
import { addIcons } from 'ionicons';

@Component({
  selector: 'app-airplane-stats-card',
  templateUrl: './airplane-stats-card.html',
  styleUrls: ['./airplane-stats-card.scss'],
  standalone: true,
  imports: [IonIcon, CommonModule, IonCard, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonCardSubtitle]
})
export class AirplaneStatsCardComponent {
  @Input() selectedAircraft?: SelectedAircraft;

  icons = addIcons({
    'stopwatch-outline': 'https://unpkg.com/ionicons@7.1.0/dist/svg/stopwatch-outline.svg'
  });

  constructor() { }

}
