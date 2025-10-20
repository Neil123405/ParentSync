import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ChildrenPageRoutingModule } from './children-routing.module';

import { ChildrenPage } from './children.page';
import { ScrollingModule } from '@angular/cdk/scrolling'; // Import this

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ScrollingModule, // Add this
    IonicModule,
    ChildrenPageRoutingModule
  ],
  declarations: [ChildrenPage]
})
export class ChildrenPageModule {}
