import { Injectable } from '@angular/core';
import { fromEvent, Observable } from 'rxjs';
import { map, distinctUntilChanged, startWith } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class OrientationService {
  private orientationChange$: Observable<'landscape' | 'portrait'>;

  constructor() {
    this.orientationChange$ = fromEvent(window, 'resize').pipe(
      // Emit the current orientation immediately, and on resize
      startWith(this.getCurrentOrientation()),
      // Map to 'landscape' or 'portrait'
      map(() => this.getCurrentOrientation()),
      // Only emit when the orientation actually changes
      distinctUntilChanged()
    );
  }

  getCurrentOrientation(): 'landscape' | 'portrait' {
    const isLandscape = window.innerWidth > window.innerHeight;
    return isLandscape ? 'landscape' : 'portrait';
  }

  getOrientationChange(): Observable<'landscape' | 'portrait'> {
    return this.orientationChange$;
  }
}
