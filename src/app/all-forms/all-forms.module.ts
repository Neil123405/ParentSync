import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AllFormsPageRoutingModule } from './all-forms-routing.module';

import { AllFormsPage } from './all-forms.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AllFormsPageRoutingModule
  ],
  declarations: [AllFormsPage]
})
export class AllFormsPageModule {}
