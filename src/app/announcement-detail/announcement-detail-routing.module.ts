import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AnnouncementDetailPage } from './announcement-detail.page';

const routes: Routes = [
  {
    path: '',
    component: AnnouncementDetailPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AnnouncementDetailPageRoutingModule {}
