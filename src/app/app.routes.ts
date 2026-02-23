import { Routes } from '@angular/router';
import { ApartmentsListPage } from './apartments-list.page';
import { ApartmentCreatePage } from './apartment-create.page';
import { SummaryDashboardComponent } from './summary-dashboard';
import { SummaryDashboard2Component } from './summary-dashboard2';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'overview',
  },
  {
    path: 'dashboard',
    component: SummaryDashboardComponent,
  },
  {
    path: 'dashboard-dark',
    component: SummaryDashboard2Component,
  },
  {
    path: 'overview',
    component: ApartmentsListPage,
  },
  {
    path: 'overview/new',
    component: ApartmentCreatePage,
  },
  {
    path: '**',
    redirectTo: 'overview',
  },
];
