import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CardImageManagerService {
  aircraftTypes = {
    A21N: 'airplane',
    CL30: 'business jet',
    A321: 'airplane',
    A20N: 'airplane',
    A320: 'airplane',
    PC12: 'airplane',
    B739: 'airplane',
    B763: 'airplane',
    B737: 'airplane',
    AS50: 'helicopter',
    B39M: 'airplane',
    LJ35: 'business jet',
    B407: 'helicopter',
    B738: 'airplane',
    C172: 'airplane',
    AT8T: 'airplane',
    C750: 'business jet',
    GLF4: 'business jet',
    B77L: 'airplane',
    E75L: 'airplane',
    B38M: 'airplane',
    GLEX: 'business jet',
    B752: 'airplane'
  };

  constructor() { }

  retrieveAirplaneImage(airplaneModel: string): string {
    return `assets/images/card/models/${airplaneModel}.png`;
  }

  getDefaultImage(airplaneModel: string): string {
    const typeofAircraft = this.aircraftTypes[airplaneModel as keyof typeof this.aircraftTypes];
    if (typeofAircraft === 'airplane' || typeofAircraft === 'business-jet' || typeofAircraft === 'helicopter' || typeofAircraft === 'military-jet') {
      return `assets/images/card/${typeofAircraft}-silhouette.png`;
    } else {
      return `assets/images/card/airplane-silhouette.png`;
    }
  }

  isModelExists(airplaneModel: string): boolean {
    return this.aircraftTypes.hasOwnProperty(airplaneModel);
  }
}