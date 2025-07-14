import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AllFormsPage } from './all-forms.page';

const routes: Routes = [
  {
    path: '',
    component: AllFormsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AllFormsPageRoutingModule {}
