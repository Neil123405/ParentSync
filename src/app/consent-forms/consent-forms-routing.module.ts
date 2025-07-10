import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ConsentFormsPage } from './consent-forms.page';

const routes: Routes = [
  {
    path: '',
    component: ConsentFormsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ConsentFormsPageRoutingModule {}
