import { Inject, Injectable } from '@angular/core';
import { GmapsService } from './gmaps.service';
import { Observable, first, of, switchMap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MapDataService {
  private mapOptions?: google.maps.MapOptions;
  private mapId?: string;
  private defaultCenter?: google.maps.LatLngLiteral;
  private mapInstance?: google.maps.Map;
  private mapOverlay?: any;


  constructor(private gmapsService: GmapsService) {
    this.initMapOptions();
  }

  private initMapOptions() {
    this.defaultCenter = { lat: 39.77222, lng: -101.7999 };
    this.mapId = '4aa5d613ffc8df24';

    this.mapOptions = {
      disableDefaultUI: true,
      center: this.defaultCenter,
      zoom: 6,
      mapId: this.mapId
    };
  }

  async initializeMap(element: HTMLElement): Promise<google.maps.Map | undefined> {
    return new Promise((resolve, reject) => {
      this.gmapsService.mapApiLoaded$.pipe(
        first(isLoaded => isLoaded),
        switchMap(() => {
          try {
            const mapInstance = new google.maps.Map(element, this.mapOptions);
            if (mapInstance.get("mapId") === this.mapId) {
              this.mapInstance = mapInstance;
              setTimeout(() => {
                this.addOverlay();
              }, 500);
              resolve(mapInstance);
            } else {
              reject('Map ID does not match.');
            }
            return of(null); // Add this line to return an observable
          } catch (error) {
            console.error('Error initializing the Maps library:', error);
            reject(error);
            return of(null); // Add this line to return an observable
          }
        })
      ).subscribe();
    });
  }

  private addOverlay(): void {
    if (!this.mapInstance) {
      console.error('No map instance available');
      return;
    }

    const div = document.createElement('div');
    div.id = 'map-overlay';
    div.style.width = '100%';
    div.style.height = '100%';
    div.style.position = 'absolute';
    div.style.top = '0';
    div.style.left = '0';
    div.style.backgroundColor = '#000000';
    div.style.opacity = '0.6';
    div.style.zIndex = '1';
    div.style.pointerEvents = 'none';
    console.log(this.mapInstance.getDiv().getElementsByClassName('gm-style')[0].firstElementChild);
    this.mapInstance.getDiv().getElementsByClassName('gm-style')[0].firstElementChild?.appendChild(div);
  }

  getMapInstance(): google.maps.Map | undefined {
    if (!this.mapInstance) {
      console.error('Map instance not available');
    }
    return this.mapInstance;
  }
}

function createOverlayInstance(): any {
  return class extends google.maps.OverlayView {
    bounds_: any;
    image_: any;
    map_: any;
    div_: any;
    constructor(bounds: any, image: any, private map: google.maps.Map | google.maps.StreetViewPanorama | null) {
      super();
      // Initialize all properties.
      this.bounds_ = bounds;
      this.image_ = image;
      this.map_ = map;
      // Define a property to hold the image's div. We'll
      // actually create this div upon receipt of the onAdd()
      // method so we'll leave it null for now.
      this.div_ = null;
      // Explicitly call setMap on this overlay.
      this.setMap(map);
      this.set;
    }
    /**
     * onAdd is called when the map's panes are ready and the overlay has been
     * added to the map.
     */
    override onAdd() {
      const div = document.createElement('div');
      div.style.borderStyle = 'none';
      div.style.borderWidth = '0px';
      div.style.position = 'absolute';
      // Create the img element and attach it to the div.
      const img = document.createElement('img');
      img.src = this.image_;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.position = 'absolute';
      div.appendChild(img);
      this.div_ = div;
      // Add the element to the "overlayLayer" pane.
      const panes = this.getPanes();
      panes?.overlayLayer.appendChild(div);
    };
    override draw() {
      // We use the south-west and north-east
      // coordinates of the overlay to peg it to the correct position and size.
      // To do this, we need to retrieve the projection from the overlay.
      const overlayProjection = this.getProjection();
      // Retrieve the south-west and north-east coordinates of this overlay
      // in LatLngs and convert them to pixel coordinates.
      // We'll use these coordinates to resize the div.
      const sw = overlayProjection.fromLatLngToDivPixel(this.bounds_.getSouthWest());
      const ne = overlayProjection.fromLatLngToDivPixel(this.bounds_.getNorthEast());
      // Resize the image's div to fit the indicated dimensions.
      const div = this.div_;
      if (sw && ne) {
        div.style.left = sw.x + 'px';
        div.style.top = ne.y + 'px';
        div.style.width = (ne.x - sw.x) + 'px';
        div.style.height = (sw.y - ne.y) + 'px';
      }
    };
    // The onRemove() method will be called automatically from the API if
    // we ever set the overlay's map property to 'null'.
    override onRemove() {
      this.div_.parentNode.removeChild(this.div_);
      this.div_ = null;
    };
  };
}