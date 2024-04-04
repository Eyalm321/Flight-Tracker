import { Inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeWatcherService {
  private themeChangedSubject: Subject<boolean> = new Subject<boolean>();
  themeChanged$: Observable<boolean> = this.themeChangedSubject.asObservable();

  constructor(@Inject(DOCUMENT) private document: Document) {
    this.checkPrefersColorScheme();
  }

  checkPrefersColorScheme() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    this.emitThemeChange(prefersDark.matches);
    // Listen for changes to the prefers-color-scheme media query
    prefersDark.addEventListener('change', (e) => this.emitThemeChange(e.matches));
  }

  private emitThemeChange(isDarkMode: boolean) {
    console.log(`Dark Mode: ${isDarkMode}`);
    this.themeChangedSubject.next(isDarkMode);
  }
}