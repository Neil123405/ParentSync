import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ConsentFormsPageRoutingModule } from './consent-forms-routing.module';

import { ConsentFormsPage } from './consent-forms.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ConsentFormsPageRoutingModule
  ],
  declarations: [ConsentFormsPage]
})
export class ConsentFormsPageModule {}
