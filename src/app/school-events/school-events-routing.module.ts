import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SchoolEventsPage } from './school-events.page';

const routes: Routes = [
  {
    path: '',
    component: SchoolEventsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SchoolEventsPageRoutingModule {}
