import { Routes } from '@angular/router';
import { AboutPage } from './about/about.page';

export const routes: Routes = [
  {
    path: 'main',
    loadComponent: () => import('./nav/nav.component').then((c) => c.NavComponent),
  },
  { path: 'main/about', component: AboutPage },
  {
    path: '',
    redirectTo: 'main',
    pathMatch: 'full',
  },
  {
    path: 'about',
    loadComponent: () => import('./about/about.page').then(m => m.AboutPage)
  },
];
