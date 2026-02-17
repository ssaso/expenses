import { Routes } from '@angular/router';
import { ApartmentsListPage } from './apartments-list.page';
import { ApartmentCreatePage } from './apartment-create.page';
import { SummaryDashboardComponent } from './summary-dashboard';
import { SummaryDashboard2Component } from './summary-dashboard2';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'apartments',
  },
  {
    path: 'dashboard',
    component: SummaryDashboardComponent,
  },
  {
    path: 'dashboard2',
    component: SummaryDashboard2Component,
  },
  {
    path: 'apartments',
    component: ApartmentsListPage,
  },
  {
    path: 'apartments/new',
    component: ApartmentCreatePage,
  },
  {
    path: '**',
    redirectTo: 'apartments',
  },
];
