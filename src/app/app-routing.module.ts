import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'children',
    loadChildren: () => import('./children/children.module').then( m => m.ChildrenPageModule)
  },
  {
    path: 'calendar',
    loadChildren: () => import('./calendar/calendar.module').then( m => m.CalendarPageModule)
  },
  {
    path: 'consent-forms/:studentId',
    loadChildren: () => import('./consent-forms/consent-forms.module').then( m => m.ConsentFormsPageModule)
  },
  {
    path: 'consent-form-detail/:formId/:studentId',
    loadChildren: () => import('./consent-form-detail/consent-form-detail.module').then( m => m.ConsentFormDetailPageModule)
  },
  {
    path: 'school-events/:studentId',
    loadChildren: () => import('./school-events/school-events.module').then( m => m.SchoolEventsPageModule)
  },
  {
  path: 'school-event-detail/:eventId/:studentId',
  loadChildren: () => import('./event-detail/event-detail.module').then( m => m.EventDetailPageModule)
  },
  {
    path: 'announcement-detail/:announcementId',
    loadChildren: () => import('./announcement-detail/announcement-detail.module').then( m => m.AnnouncementDetailPageModule)
  },
  {
    path: 'all-events',
    loadChildren: () => import('./all-events/all-events.module').then( m => m.AllEventsPageModule)
  },
  {
    path: 'all-forms',
    loadChildren: () => import('./all-forms/all-forms.module').then( m => m.AllFormsPageModule)
  },
  {
    path: 'event-detail/:eventId/:studentId',
    loadChildren: () => import('./event-detail/event-detail.module').then( m => m.EventDetailPageModule)
  },
  {
    path: 'day-events/:date',
    loadChildren: () => import('./day-events/day-events.module').then( m => m.DayEventsPageModule)
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
