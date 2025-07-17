import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { GlobalFooterComponent } from '../components/global-footer/global-footer.component';

import { SimpleCalendarComponent } from '../components/simple-calendar/simple-calendar.component';



@NgModule({
  declarations: [
    GlobalFooterComponent, SimpleCalendarComponent
  ],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [
    GlobalFooterComponent, SimpleCalendarComponent
  ]
})
export class SharedModule { }