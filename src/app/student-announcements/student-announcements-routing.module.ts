import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { StudentAnnouncementsPage } from './student-announcements.page';

const routes: Routes = [
  {
    path: '',
    component: StudentAnnouncementsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class StudentAnnouncementsPageRoutingModule {}
