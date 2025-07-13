import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SchoolEventsPageRoutingModule } from './school-events-routing.module';

import { SchoolEventsPage } from './school-events.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SchoolEventsPageRoutingModule
  ],
  declarations: [SchoolEventsPage]
})
export class SchoolEventsPageModule {}
