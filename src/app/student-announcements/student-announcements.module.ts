import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { StudentAnnouncementsPageRoutingModule } from './student-announcements-routing.module';

import { StudentAnnouncementsPage } from './student-announcements.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    StudentAnnouncementsPageRoutingModule
  ],
  declarations: [StudentAnnouncementsPage]
})
export class StudentAnnouncementsPageModule {}
