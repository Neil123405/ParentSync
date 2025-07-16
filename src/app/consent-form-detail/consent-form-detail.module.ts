import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ConsentFormDetailPageRoutingModule } from './consent-form-detail-routing.module';

import { ConsentFormDetailPage } from './consent-form-detail.page';
import { SignaturePadComponent } from '../components/signature-pad/signature-pad.component'; // <-- Add this


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ConsentFormDetailPageRoutingModule
  ],
  declarations: [ConsentFormDetailPage, SignaturePadComponent]
})
export class ConsentFormDetailPageModule {}
