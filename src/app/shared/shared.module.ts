import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { GlobalFooterComponent } from '../components/global-footer/global-footer.component';

@NgModule({
  declarations: [
    GlobalFooterComponent
  ],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [
    GlobalFooterComponent
  ]
})
export class SharedModule { }