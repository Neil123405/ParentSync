import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DayEventsPageRoutingModule } from './day-events-routing.module';

import { DayEventsPage } from './day-events.page';

import { FullCalendarModule } from '@fullcalendar/angular';

import { WeekCalendarComponent } from '../components/week-calendar/week-calendar.component';

@NgModule({
  imports: [
    FullCalendarModule,
    CommonModule,
    FormsModule,
    IonicModule,
    DayEventsPageRoutingModule
  ],
  declarations: [DayEventsPage, WeekCalendarComponent]
})
export class DayEventsPageModule {}
