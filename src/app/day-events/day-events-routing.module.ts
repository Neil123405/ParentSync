import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DayEventsPage } from './day-events.page';

const routes: Routes = [
  {
    path: '',
    component: DayEventsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DayEventsPageRoutingModule {}
