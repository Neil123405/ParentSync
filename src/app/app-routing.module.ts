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
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
